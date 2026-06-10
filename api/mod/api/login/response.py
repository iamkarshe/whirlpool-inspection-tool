import uuid
from datetime import datetime
from typing import Any, List

from pydantic import BaseModel, Field


class LoginIpExternalLinksResponse(BaseModel):
    """Third-party pages to manually investigate a client IP address."""

    abuseipdb: str = Field(
        description=(
            "AbuseIPDB check URL for this IP. Open in a new browser tab to view "
            "abuse reports, confidence score, and ISP/country summary."
        ),
        examples=["https://www.abuseipdb.com/check/203.0.113.10"],
    )
    ipinfo: str = Field(
        description=(
            "IPinfo lookup URL for this IP. Open in a new browser tab to view "
            "geolocation, ASN, company, and hosted domains."
        ),
        examples=["https://ipinfo.io/203.0.113.10"],
    )


class LoginIpMetadataResponse(BaseModel):
    """Geolocation and ISP data resolved asynchronously for a client IP."""

    country_code: str | None = Field(
        default=None,
        description="ISO 3166-1 alpha-2 country code when lookup completed.",
        examples=["IN"],
    )
    country_name: str | None = Field(
        default=None,
        description="Human-readable country name when lookup completed.",
        examples=["India"],
    )
    region: str | None = Field(
        default=None,
        description="Region or state name from the geo provider.",
        examples=["Maharashtra"],
    )
    city: str | None = Field(
        default=None,
        description="City name from the geo provider.",
        examples=["Pune"],
    )
    isp: str | None = Field(
        default=None,
        description="Internet service provider or organization name.",
        examples=["Example ISP Pvt Ltd"],
    )
    lookup_status: str | None = Field(
        default=None,
        description=(
            "Geo lookup state: pending (queued), completed, failed, or skipped "
            "(private/local IP)."
        ),
        examples=["completed"],
    )


class LoginKpiResponse(BaseModel):
    total: int
    successful: int
    failed: int
    unique_users: int


class LoginListItemResponse(BaseModel):
    id: int
    uuid: uuid.UUID
    reference_id: str
    user_name: str
    email: str | None
    attempted_email: str | None = Field(
        default=None,
        description="Email submitted at login time (including failed attempts).",
    )
    login_method: str | None = Field(
        default=None,
        description="Authentication method, e.g. password or SSO token exchange.",
    )
    failure_reason: str | None = Field(
        default=None,
        description="Present when status is failed; explains why login was rejected.",
    )
    logged_at: datetime
    ip_address: str | None = Field(
        default=None,
        description="Client IP captured from the login request.",
    )
    proxy_ip_address: str | None = Field(
        default=None,
        description="Raw X-Forwarded-For value when the request passed through a proxy.",
    )
    ip_metadata: LoginIpMetadataResponse | None = Field(
        default=None,
        description="Cached geolocation for ip_address from ip_address_metadata.",
    )
    external_links: LoginIpExternalLinksResponse | None = Field(
        default=None,
        description=(
            "Ready-to-open AbuseIPDB and IPinfo URLs for ip_address. "
            "Null when this login row has no client IP."
        ),
    )
    device_source: str
    status: str = Field(
        description="Login outcome: successful or failed.",
        examples=["successful"],
    )


class LoginListResponse(BaseModel):
    data: List[LoginListItemResponse]
    total: int
    page: int
    per_page: int
    total_pages: int


class LoginIpSummaryItemResponse(BaseModel):
    ip_address: str = Field(description="Distinct client IP aggregated from login audit logs.")
    total_logins: int
    successful_logins: int
    failed_logins: int
    unique_users: int
    first_seen_at: datetime
    last_seen_at: datetime
    ip_metadata: LoginIpMetadataResponse | None = Field(
        default=None,
        description="Cached geolocation for this IP from ip_address_metadata.",
    )
    is_abusive: bool = Field(
        description="True when the IP matches one or more suspicious-login heuristics.",
    )
    abusive_reasons: List[str] = Field(
        default_factory=list,
        description=(
            "Heuristic codes when is_abusive is true: high_failed_attempts, "
            "high_failure_rate, high_volume_suspicious, or only_failures."
        ),
    )
    external_links: LoginIpExternalLinksResponse = Field(
        description="Third-party URLs to manually investigate this IP on AbuseIPDB and IPinfo.",
    )


class LoginIpSummaryListResponse(BaseModel):
    data: List[LoginIpSummaryItemResponse]
    total: int
    page: int
    per_page: int
    total_pages: int


class LoginIpHealthResponse(BaseModel):
    ip_address: str
    health_status: str = Field(
        description="healthy, suspicious, or abusive based on login patterns for this IP.",
        examples=["suspicious"],
    )
    total_logins: int
    successful_logins: int
    failed_logins: int
    unique_users: int
    first_seen_at: datetime | None = None
    last_seen_at: datetime | None = None
    ip_metadata: LoginIpMetadataResponse | None = Field(
        default=None,
        description="Cached geolocation for this IP from ip_address_metadata.",
    )
    is_abusive: bool = Field(
        description="True when the IP matches one or more suspicious-login heuristics.",
    )
    abusive_reasons: List[str] = Field(
        default_factory=list,
        description=(
            "Heuristic codes when is_abusive is true: high_failed_attempts, "
            "high_failure_rate, high_volume_suspicious, or only_failures."
        ),
    )
    external_links: LoginIpExternalLinksResponse = Field(
        description="Third-party URLs to manually investigate this IP on AbuseIPDB and IPinfo.",
    )


class LoginIpRecentUserResponse(BaseModel):
    user_uuid: uuid.UUID | None = None
    user_name: str
    email: str | None = None
    last_login_at: datetime
    login_count: int = Field(
        description="Number of login events from this IP for this user.",
    )


class LoginIpDetailResponse(BaseModel):
    health: LoginIpHealthResponse
    recent_logins: List[LoginListItemResponse] = Field(
        description="Up to 100 most recent login events from this IP.",
    )
    recent_users: List[LoginIpRecentUserResponse] = Field(
        description="Up to 10 distinct users by most recent login from this IP.",
    )
    metadata_refresh_queued: bool = Field(
        default=False,
        description=(
            "True when this request queued a background resolve_ip_metadata task. "
            "Poll again after a few seconds for updated country/ISP fields."
        ),
    )


class LoginInspectionResponse(BaseModel):
    id: int
    uuid: uuid.UUID
    inspection_type: str
    product_id: int
    created_at: datetime


class LoginDetailResponse(BaseModel):
    id: int
    uuid: uuid.UUID
    reference_id: str
    user_name: str
    email: str | None
    attempted_email: str | None = Field(
        default=None,
        description="Email submitted at login time (including failed attempts).",
    )
    login_method: str | None = Field(
        default=None,
        description="Authentication method, e.g. password or SSO token exchange.",
    )
    failure_reason: str | None = Field(
        default=None,
        description="Present when status is failed; explains why login was rejected.",
    )
    logged_at: datetime
    ip_address: str | None = Field(
        default=None,
        description="Client IP captured from the login request.",
    )
    proxy_ip_address: str | None = Field(
        default=None,
        description="Raw X-Forwarded-For value when the request passed through a proxy.",
    )
    ip_metadata: LoginIpMetadataResponse | None = Field(
        default=None,
        description="Cached geolocation for ip_address from ip_address_metadata.",
    )
    external_links: LoginIpExternalLinksResponse | None = Field(
        default=None,
        description=(
            "Ready-to-open AbuseIPDB and IPinfo URLs for ip_address. "
            "Null when this login row has no client IP."
        ),
    )
    device_source: str
    user_agent: str | None = None
    status: str = Field(
        description="Login outcome: successful or failed.",
        examples=["successful"],
    )
    device_info: Any
    inspections_done: int
    inspections: List[LoginInspectionResponse]
