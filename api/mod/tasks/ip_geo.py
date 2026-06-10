"""Resolve IP geolocation for ``ip_address_metadata`` rows."""

from __future__ import annotations

import json
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from sqlalchemy.orm import Session

from mod.api.ip_metadata.helper import (
    apply_ip_geo_lookup_result,
    mark_ip_metadata_lookup_failed,
    normalize_ip_address,
)
from utils.env import get_env_optional

LOOKUP_SOURCE = "ip-api"
DEFAULT_LOOKUP_URL_TEMPLATE = "http://ip-api.com/json/{ip}?fields=status,message,country,countryCode,regionName,city,isp,query"


def ip_geo_lookup_enabled() -> bool:
    raw = (get_env_optional("IP_GEO_LOOKUP_ENABLED", "true") or "true").strip().lower()
    return raw not in {"0", "false", "no", "off"}


def ip_geo_lookup_url(ip_address: str) -> str | None:
    if not ip_geo_lookup_enabled():
        return None
    template = (
        get_env_optional("IP_GEO_LOOKUP_URL", DEFAULT_LOOKUP_URL_TEMPLATE)
        or DEFAULT_LOOKUP_URL_TEMPLATE
    )
    return template.format(ip=ip_address)


def fetch_ip_geo_payload(ip_address: str) -> dict[str, Any]:
    lookup_url = ip_geo_lookup_url(ip_address)
    if lookup_url is None:
        raise RuntimeError("IP geolocation lookup is disabled")

    request = Request(
        lookup_url,
        headers={"Accept": "application/json", "User-Agent": "whirlpool-pdi-api/1.0"},
    )
    with urlopen(request, timeout=10) as response:
        body = response.read().decode("utf-8")
    payload = json.loads(body)
    if not isinstance(payload, dict):
        raise ValueError("Lookup provider returned non-object JSON")
    return payload


def execute_resolve_ip_metadata(db: Session, payload: dict[str, Any]) -> dict[str, Any]:
    ip_address = normalize_ip_address(str(payload.get("ip_address", "")).strip())
    if ip_address is None:
        raise ValueError("resolve_ip_metadata payload requires ip_address")

    try:
        provider_payload = fetch_ip_geo_payload(ip_address)
    except (HTTPError, URLError, TimeoutError, json.JSONDecodeError, ValueError) as exc:
        mark_ip_metadata_lookup_failed(
            db,
            ip_address=ip_address,
            lookup_source=LOOKUP_SOURCE,
            error_message=str(exc),
        )
        raise

    status = str(provider_payload.get("status", "")).strip().lower()
    if status != "success":
        message = str(provider_payload.get("message", "lookup failed")).strip()
        mark_ip_metadata_lookup_failed(
            db,
            ip_address=ip_address,
            lookup_source=LOOKUP_SOURCE,
            error_message=message or "lookup failed",
            raw_response=provider_payload,
        )
        raise ValueError(message or "IP geolocation lookup failed")

    row = apply_ip_geo_lookup_result(
        db,
        ip_address=ip_address,
        lookup_source=LOOKUP_SOURCE,
        country_code=_clean_text(provider_payload.get("countryCode"), max_len=8),
        country_name=_clean_text(provider_payload.get("country"), max_len=128),
        region=_clean_text(provider_payload.get("regionName"), max_len=128),
        city=_clean_text(provider_payload.get("city"), max_len=128),
        isp=_clean_text(provider_payload.get("isp"), max_len=255),
        raw_response=provider_payload,
    )
    return {
        "success": True,
        "ip_address": str(row.ip_address),
        "country_code": row.country_code,
        "country_name": row.country_name,
        "region": row.region,
        "city": row.city,
        "isp": row.isp,
    }


def _clean_text(value: Any, *, max_len: int) -> str | None:
    if value is None:
        return None
    text = str(value).strip()
    if not text:
        return None
    return text[:max_len]
