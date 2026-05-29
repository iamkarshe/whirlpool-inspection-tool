import json
from pathlib import Path
from typing import Any

import boto3
from botocore.exceptions import BotoCoreError, ClientError
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from mod.api.integration.request import AwsS3UpdateRequest, OktaSsoUpdateRequest
from mod.api.integration.response import (
    AwsS3CredentialsResponse,
    AwsS3TestConnectionResponse,
    IntegrationCredentialsResponse,
    OktaSsoCredentialsResponse,
)
from mod.api.log.audit import log_integration_keys_updated

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
        raise HTTPException(
            status_code=500, detail="credentials.json contains invalid JSON"
        ) from exc

    if not isinstance(parsed, dict):
        raise HTTPException(
            status_code=500, detail="credentials.json has invalid structure"
        )

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


def map_masked_credentials_response(
    payload: dict[str, dict[str, str]],
) -> IntegrationCredentialsResponse:
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


def update_okta_credentials(
    db: Session,
    actor_user_id: int,
    update: OktaSsoUpdateRequest,
) -> IntegrationCredentialsResponse:
    payload = load_credentials_payload()
    payload["okta_sso"] = {
        "okta_domain": update.okta_domain,
        "client_id": update.client_id,
        "redirect_uri": update.redirect_uri,
        "client_secret": update.client_secret,
    }
    save_credentials_payload(payload)
    log_integration_keys_updated(
        db,
        actor_user_id=actor_user_id,
        integration="Okta SSO",
    )
    db.commit()
    return map_masked_credentials_response(payload)


def update_aws_s3_credentials(
    db: Session,
    actor_user_id: int,
    update: AwsS3UpdateRequest,
) -> IntegrationCredentialsResponse:
    payload = load_credentials_payload()
    payload["aws_s3"] = {
        "bucket_name": update.bucket_name,
        "region": update.region,
        "access_key_id": update.access_key_id,
        "secret_access_key": update.secret_access_key,
    }
    save_credentials_payload(payload)
    log_integration_keys_updated(
        db,
        actor_user_id=actor_user_id,
        integration="AWS S3",
    )
    db.commit()
    return map_masked_credentials_response(payload)


def resolve_aws_s3_credentials(
    override: AwsS3UpdateRequest | None,
) -> dict[str, str]:
    if override is not None:
        return {
            "bucket_name": override.bucket_name,
            "region": override.region,
            "access_key_id": override.access_key_id,
            "secret_access_key": override.secret_access_key,
        }

    stored = load_credentials_payload()["aws_s3"]
    return {
        "bucket_name": stored["bucket_name"].strip(),
        "region": stored["region"].strip(),
        "access_key_id": stored["access_key_id"].strip(),
        "secret_access_key": stored["secret_access_key"].strip(),
    }


def get_aws_s3_client_and_bucket() -> tuple[Any, str]:
    credentials = resolve_aws_s3_credentials(None)
    missing_fields = [field for field, value in credentials.items() if not value]
    if missing_fields:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                "AWS S3 is not configured: "
                f"missing {', '.join(missing_fields)}"
            ),
        )

    client = boto3.client(
        "s3",
        region_name=credentials["region"],
        aws_access_key_id=credentials["access_key_id"],
        aws_secret_access_key=credentials["secret_access_key"],
    )
    return client, credentials["bucket_name"]


def format_s3_client_error(exc: ClientError) -> str:
    error = exc.response.get("Error", {})
    code = str(error.get("Code", "Unknown") or "Unknown")
    message = str(error.get("Message", str(exc)) or str(exc))
    return f"{code}: {message}"


def test_aws_s3_connection(
    override: AwsS3UpdateRequest | None = None,
) -> AwsS3TestConnectionResponse:
    credentials = resolve_aws_s3_credentials(override)
    bucket_name = credentials["bucket_name"]
    region = credentials["region"]

    missing_fields = [
        field
        for field, value in credentials.items()
        if not value
    ]
    if missing_fields:
        return AwsS3TestConnectionResponse(
            success=False,
            message=f"Missing AWS S3 configuration: {', '.join(missing_fields)}",
            bucket_name=bucket_name or None,
            region=region or None,
        )

    try:
        client = boto3.client(
            "s3",
            region_name=region,
            aws_access_key_id=credentials["access_key_id"],
            aws_secret_access_key=credentials["secret_access_key"],
        )
        client.head_bucket(Bucket=bucket_name)
    except ClientError as exc:
        return AwsS3TestConnectionResponse(
            success=False,
            message=format_s3_client_error(exc),
            bucket_name=bucket_name,
            region=region,
        )
    except BotoCoreError as exc:
        return AwsS3TestConnectionResponse(
            success=False,
            message=str(exc),
            bucket_name=bucket_name,
            region=region,
        )

    return AwsS3TestConnectionResponse(
        success=True,
        message="Successfully connected to the S3 bucket.",
        bucket_name=bucket_name,
        region=region,
    )


def get_okta_credentials() -> OktaSsoCredentialsResponse:
    payload = load_credentials_payload()
    return OktaSsoCredentialsResponse(
        client_id=payload["okta_sso"]["client_id"],
        client_secret=payload["okta_sso"]["client_secret"],
        redirect_uri=payload["okta_sso"]["redirect_uri"],
        okta_domain=payload["okta_sso"]["okta_domain"],
    )
