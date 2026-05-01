import json
from pathlib import Path
from typing import Any

from fastapi import HTTPException

from mod.api.integration.request import AwsS3UpdateRequest, OktaSsoUpdateRequest
from mod.api.integration.response import (
    AwsS3CredentialsResponse,
    IntegrationCredentialsResponse,
    OktaSsoCredentialsResponse,
)

credentials_file_path = Path(__file__).resolve().parents[3] / "credentials.json"


def default_credentials_payload() -> dict[str, dict[str, str]]:
    return {
        "okta_sso": {
            "okta_domain": "",
            "client_id": "",
            "redirect_uri": "",
            "client_secret": "",
        },
        "aws_s3": {
            "bucket_name": "",
            "region": "",
            "access_key_id": "",
            "secret_access_key": "",
        },
    }


def mask_secret(secret_value: str) -> str:
    return "******" if secret_value else ""


def load_credentials_payload() -> dict[str, dict[str, str]]:
    payload = default_credentials_payload()
    if not credentials_file_path.exists():
        return payload

    raw = credentials_file_path.read_text(encoding="utf-8").strip()
    if not raw:
        return payload

    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=500, detail="credentials.json contains invalid JSON") from exc

    if not isinstance(parsed, dict):
        raise HTTPException(status_code=500, detail="credentials.json has invalid structure")

    okta = parsed.get("okta_sso", {})
    aws = parsed.get("aws_s3", {})
    if isinstance(okta, dict):
        payload["okta_sso"].update(
            {
                "okta_domain": str(okta.get("okta_domain", "") or ""),
                "client_id": str(okta.get("client_id", "") or ""),
                "redirect_uri": str(okta.get("redirect_uri", "") or ""),
                "client_secret": str(okta.get("client_secret", "") or ""),
            }
        )
    if isinstance(aws, dict):
        payload["aws_s3"].update(
            {
                "bucket_name": str(aws.get("bucket_name", "") or ""),
                "region": str(aws.get("region", "") or ""),
                "access_key_id": str(aws.get("access_key_id", "") or ""),
                "secret_access_key": str(aws.get("secret_access_key", "") or ""),
            }
        )
    return payload


def save_credentials_payload(payload: dict[str, Any]) -> None:
    credentials_file_path.write_text(
        json.dumps(payload, ensure_ascii=True, indent=2),
        encoding="utf-8",
    )


def map_masked_credentials_response(payload: dict[str, dict[str, str]]) -> IntegrationCredentialsResponse:
    return IntegrationCredentialsResponse(
        okta_sso=OktaSsoCredentialsResponse(
            okta_domain=payload["okta_sso"]["okta_domain"],
            client_id=payload["okta_sso"]["client_id"],
            redirect_uri=payload["okta_sso"]["redirect_uri"],
            client_secret=mask_secret(payload["okta_sso"]["client_secret"]),
        ),
        aws_s3=AwsS3CredentialsResponse(
            bucket_name=payload["aws_s3"]["bucket_name"],
            region=payload["aws_s3"]["region"],
            access_key_id=payload["aws_s3"]["access_key_id"],
            secret_access_key=mask_secret(payload["aws_s3"]["secret_access_key"]),
        ),
    )


def get_integration_credentials() -> IntegrationCredentialsResponse:
    payload = load_credentials_payload()
    return map_masked_credentials_response(payload)


def update_okta_credentials(update: OktaSsoUpdateRequest) -> IntegrationCredentialsResponse:
    payload = load_credentials_payload()
    payload["okta_sso"] = {
        "okta_domain": update.okta_domain,
        "client_id": update.client_id,
        "redirect_uri": update.redirect_uri,
        "client_secret": update.client_secret,
    }
    save_credentials_payload(payload)
    return map_masked_credentials_response(payload)


def update_aws_s3_credentials(update: AwsS3UpdateRequest) -> IntegrationCredentialsResponse:
    payload = load_credentials_payload()
    payload["aws_s3"] = {
        "bucket_name": update.bucket_name,
        "region": update.region,
        "access_key_id": update.access_key_id,
        "secret_access_key": update.secret_access_key,
    }
    save_credentials_payload(payload)
    return map_masked_credentials_response(payload)
