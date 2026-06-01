import json
import smtplib
import socket
import ssl
import traceback
from email.message import EmailMessage
from email.utils import formataddr
from pathlib import Path
from typing import Any

import boto3
from botocore.exceptions import BotoCoreError, ClientError
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from mod.api.integration.request import (
    AwsS3UpdateRequest,
    OktaSsoUpdateRequest,
    SmtpEncryption,
    SmtpGatewayTestConnectionRequest,
    SmtpProvider,
    SmtpTestConnectionRequest,
    SmtpUpdateRequest,
)
from mod.api.integration.response import (
    AwsS3CredentialsResponse,
    AwsS3TestConnectionResponse,
    IntegrationCredentialsResponse,
    OktaSsoCredentialsResponse,
    SmtpCredentialsResponse,
    SmtpTestConnectionResponse,
)
from mod.api.log.audit import log_integration_keys_updated

credentials_file_path = Path(__file__).resolve().parents[3] / "credentials.json"

DEFAULT_SMTP_HOSTS: dict[SmtpProvider, str] = {
    SmtpProvider.google_workspace: "smtp.gmail.com",
}

# Matches a successful `swaks --port 25 --tls --tls-verify` gateway check.
GATEWAY_TEST_EMAIL_SUBJECT = "SMTP TLS verification test"
GATEWAY_TEST_EMAIL_BODY = "Testing SMTP with STARTTLS and no authentication."


def default_smtp_section() -> dict[str, Any]:
    return {
        "provider": "",
        "host": "",
        "port": 25,
        "encryption": SmtpEncryption.starttls.value,
        "auth_enabled": False,
        "username": "",
        "password": "",
        "from_email": "",
        "from_name": "",
        "timeout_seconds": 30,
    }


def default_credentials_payload() -> dict[str, Any]:
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
        "smtp": default_smtp_section(),
    }


def parse_smtp_provider(value: Any) -> SmtpProvider | None:
    raw = str(value or "").strip()
    if not raw:
        return None
    try:
        return SmtpProvider(raw)
    except ValueError:
        return None


def parse_smtp_encryption(value: Any) -> SmtpEncryption:
    raw = str(value or "").strip().lower()
    try:
        return SmtpEncryption(raw)
    except ValueError:
        return SmtpEncryption.starttls


def parse_smtp_port(value: Any) -> int:
    try:
        port = int(value)
    except (TypeError, ValueError):
        return 587
    return port if 1 <= port <= 65535 else 587


def parse_smtp_timeout(value: Any) -> int:
    try:
        timeout = int(value)
    except (TypeError, ValueError):
        return 30
    return timeout if 1 <= timeout <= 300 else 30


def parse_auth_enabled(value: Any, *, default: bool = True) -> bool:
    if isinstance(value, bool):
        return value
    if value is None:
        return default
    normalized = str(value).strip().lower()
    if normalized in {"false", "0", "no"}:
        return False
    if normalized in {"true", "1", "yes"}:
        return True
    return default


def mask_secret(secret_value: str) -> str:
    return "******" if secret_value else ""


def load_credentials_payload() -> dict[str, Any]:
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

    smtp = parsed.get("smtp", {})
    if isinstance(smtp, dict):
        provider = parse_smtp_provider(smtp.get("provider"))
        if "auth_enabled" in smtp:
            auth_enabled = parse_auth_enabled(smtp.get("auth_enabled"), default=True)
        else:
            auth_enabled = bool(str(smtp.get("username", "") or "").strip())
        payload["smtp"] = {
            "provider": provider.value if provider is not None else "",
            "host": str(smtp.get("host", "") or ""),
            "port": parse_smtp_port(smtp.get("port")),
            "encryption": parse_smtp_encryption(smtp.get("encryption")).value,
            "auth_enabled": auth_enabled,
            "username": str(smtp.get("username", "") or ""),
            "password": str(smtp.get("password", "") or ""),
            "from_email": str(smtp.get("from_email", "") or ""),
            "from_name": str(smtp.get("from_name", "") or ""),
            "timeout_seconds": parse_smtp_timeout(smtp.get("timeout_seconds")),
        }
    return payload


def save_credentials_payload(payload: dict[str, Any]) -> None:
    credentials_file_path.write_text(
        json.dumps(payload, ensure_ascii=True, indent=2),
        encoding="utf-8",
    )


def map_smtp_credentials_response(
    smtp: dict[str, Any],
    *,
    mask_password: bool = True,
) -> SmtpCredentialsResponse:
    password = str(smtp.get("password", "") or "")
    return SmtpCredentialsResponse(
        provider=parse_smtp_provider(smtp.get("provider")),
        host=str(smtp.get("host", "") or ""),
        port=parse_smtp_port(smtp.get("port")),
        encryption=parse_smtp_encryption(smtp.get("encryption")),
        auth_enabled=bool(smtp.get("auth_enabled", False)),
        username=str(smtp.get("username", "") or ""),
        password=mask_secret(password) if mask_password else password,
        from_email=str(smtp.get("from_email", "") or ""),
        from_name=str(smtp.get("from_name", "") or ""),
        timeout_seconds=parse_smtp_timeout(smtp.get("timeout_seconds")),
    )


def map_masked_credentials_response(
    payload: dict[str, Any],
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
        smtp=map_smtp_credentials_response(payload["smtp"]),
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


def update_smtp_credentials(
    db: Session,
    actor_user_id: int,
    update: SmtpUpdateRequest,
) -> IntegrationCredentialsResponse:
    payload = load_credentials_payload()
    payload["smtp"] = smtp_config_from_update(update)
    save_credentials_payload(payload)
    log_integration_keys_updated(
        db,
        actor_user_id=actor_user_id,
        integration="SMTP",
    )
    db.commit()
    return map_masked_credentials_response(payload)


def get_smtp_credentials(*, masked: bool = False) -> SmtpCredentialsResponse:
    payload = load_credentials_payload()
    return map_smtp_credentials_response(
        payload["smtp"],
        mask_password=masked,
    )


def smtp_config_from_update(update: SmtpUpdateRequest) -> dict[str, Any]:
    return {
        "provider": update.provider.value,
        "host": update.host,
        "port": update.port,
        "encryption": update.encryption.value,
        "auth_enabled": update.auth_enabled,
        "username": update.username,
        "password": update.password,
        "from_email": str(update.from_email),
        "from_name": update.from_name,
        "timeout_seconds": update.timeout_seconds,
    }


def resolve_smtp_credentials(
    override: SmtpUpdateRequest | None,
) -> dict[str, Any]:
    if override is not None:
        return smtp_config_from_update(override)
    return dict(load_credentials_payload()["smtp"])


def resolve_smtp_host(credentials: dict[str, Any]) -> str:
    host = str(credentials.get("host", "") or "").strip()
    if host:
        return host
    provider = parse_smtp_provider(credentials.get("provider"))
    if provider is None:
        return ""
    return DEFAULT_SMTP_HOSTS.get(provider, "")


def missing_smtp_fields_for_test(credentials: dict[str, Any]) -> list[str]:
    missing: list[str] = []
    provider = parse_smtp_provider(credentials.get("provider"))
    if provider is None:
        missing.append("provider")

    if not resolve_smtp_host(credentials):
        missing.append("host")

    if not str(credentials.get("from_email", "") or "").strip():
        missing.append("from_email")

    if parse_auth_enabled(credentials.get("auth_enabled"), default=True):
        if not str(credentials.get("username", "") or "").strip():
            missing.append("username")
        if not str(credentials.get("password", "") or "").strip():
            missing.append("password")

    return missing


def build_smtp_tls_context(*, verify: bool = True) -> ssl.SSLContext:
    """TLS context for STARTTLS (swaks --tls --tls-verify when verify=True)."""
    if verify:
        context = ssl.create_default_context()
        context.check_hostname = True
        context.verify_mode = ssl.CERT_REQUIRED
        return context
    context = ssl.create_default_context()
    context.check_hostname = False
    context.verify_mode = ssl.CERT_NONE
    return context


def smtp_ehlo_hostname(from_email: str, override: str | None = None) -> str:
    """EHLO name for relay gateways; swaks often matches the sender's domain."""
    explicit = str(override or "").strip()
    if explicit:
        return explicit
    if "@" in from_email:
        return from_email.rsplit("@", 1)[-1].strip()
    fqdn = socket.getfqdn()
    return fqdn if fqdn and fqdn != "localhost" else "localhost"


def build_swaks_style_test_message(
    *,
    from_email: str,
    to_email: str,
    subject: str,
    body: str,
) -> EmailMessage:
    """Minimal headers like swaks --from / --to (no display name on From)."""
    message = EmailMessage()
    message["Subject"] = subject
    message["From"] = from_email
    message["To"] = to_email
    message.set_content(body, subtype="plain")
    return message


def build_smtp_test_message(
    *,
    from_email: str,
    from_name: str,
    to_email: str,
    subject: str | None = None,
    body: str | None = None,
) -> EmailMessage:
    message = EmailMessage()
    message["Subject"] = subject or (
        "SMTP configuration test — Whirlpool Inspection Tool"
    )
    message["From"] = formataddr((from_name, from_email)) if from_name else from_email
    message["To"] = to_email
    message.set_content(
        body
        or (
            "This is a test email from the Whirlpool Inspection Tool.\n\n"
            "If you received this message, your SMTP integration settings are working."
        )
    )
    return message


def deliver_smtp_test_message(
    *,
    host: str,
    port: int,
    encryption: SmtpEncryption,
    auth_enabled: bool,
    username: str,
    password: str,
    to_email: str,
    from_email: str,
    from_name: str,
    timeout: int,
    tls_verify: bool = True,
    subject: str | None = None,
    body: str | None = None,
) -> None:
    email_message = build_smtp_test_message(
        from_email=from_email,
        from_name=from_name,
        to_email=to_email,
        subject=subject,
        body=body,
    )
    tls_context = build_smtp_tls_context(verify=tls_verify)

    if encryption == SmtpEncryption.ssl:
        server: smtplib.SMTP = smtplib.SMTP_SSL(
            host,
            port,
            timeout=timeout,
            context=tls_context,
        )
    else:
        server = smtplib.SMTP(host, port, timeout=timeout)

    try:
        server.ehlo()
        if encryption == SmtpEncryption.starttls:
            # smtplib passes server_hostname=self._host inside starttls (Py 3.10+).
            server.starttls(context=tls_context)
            server.ehlo()
        if auth_enabled:
            login_user = username.strip()
            if not login_user:
                raise ValueError("SMTP auth is enabled but username is empty")
            server.login(login_user, password)
        server.send_message(email_message)
    finally:
        try:
            server.quit()
        except smtplib.SMTPException:
            pass


def deliver_smtp_gateway_test_message(
    *,
    host: str,
    port: int,
    from_email: str,
    to_email: str,
    timeout: int,
    tls_verify: bool = True,
    ehlo_hostname: str | None = None,
    subject: str = GATEWAY_TEST_EMAIL_SUBJECT,
    body: str = GATEWAY_TEST_EMAIL_BODY,
) -> None:
    """Send like swaks: explicit MAIL FROM/RCPT TO, plain From, STARTTLS on port 25."""
    ehlo_name = smtp_ehlo_hostname(from_email, ehlo_hostname)
    email_message = build_swaks_style_test_message(
        from_email=from_email,
        to_email=to_email,
        subject=subject,
        body=body,
    )
    tls_context = build_smtp_tls_context(verify=tls_verify)
    server = smtplib.SMTP(
        host,
        port,
        timeout=timeout,
        local_hostname=ehlo_name,
    )

    try:
        server.ehlo()
        server.starttls(context=tls_context)
        server.ehlo()
        server.sendmail(from_email, [to_email], email_message.as_string())
    finally:
        try:
            server.quit()
        except smtplib.SMTPException:
            pass


def send_smtp_test_email(credentials: dict[str, Any], to_email: str) -> None:
    deliver_smtp_test_message(
        host=resolve_smtp_host(credentials),
        port=parse_smtp_port(credentials.get("port")),
        encryption=parse_smtp_encryption(credentials.get("encryption")),
        auth_enabled=parse_auth_enabled(credentials.get("auth_enabled"), default=True),
        username=str(credentials.get("username", "") or ""),
        password=str(credentials.get("password", "") or ""),
        to_email=to_email,
        from_email=str(credentials.get("from_email", "") or "").strip(),
        from_name=str(credentials.get("from_name", "") or "").strip(),
        timeout=parse_smtp_timeout(credentials.get("timeout_seconds")),
    )


def test_smtp_connection(
    payload: SmtpTestConnectionRequest,
) -> SmtpTestConnectionResponse:
    credentials = resolve_smtp_credentials(payload.smtp)
    to_email = str(payload.to_email)
    provider = parse_smtp_provider(credentials.get("provider"))
    host = resolve_smtp_host(credentials)
    port = parse_smtp_port(credentials.get("port"))

    missing_fields = missing_smtp_fields_for_test(credentials)
    if missing_fields:
        return SmtpTestConnectionResponse(
            success=False,
            message=f"Missing SMTP configuration: {', '.join(missing_fields)}",
            error_trace=None,
            provider=provider,
            host=host or None,
            port=port,
            to_email=to_email,
        )

    try:
        send_smtp_test_email(credentials, to_email)
    except Exception as exc:
        return SmtpTestConnectionResponse(
            success=False,
            message=str(exc) or exc.__class__.__name__,
            error_trace=traceback.format_exc(),
            provider=provider,
            host=host,
            port=port,
            to_email=to_email,
        )

    return SmtpTestConnectionResponse(
        success=True,
        message=f"Test email sent successfully to {to_email}.",
        error_trace=None,
        provider=provider,
        host=host,
        port=port,
        to_email=to_email,
    )


def resolve_smtp_gateway_host(host: str | None) -> str:
    explicit = str(host or "").strip()
    if explicit:
        return explicit
    stored = load_credentials_payload()["smtp"]
    return str(stored.get("host", "") or "").strip()


def resolve_smtp_gateway_from_email(from_email: str | None) -> str:
    explicit = str(from_email or "").strip()
    if explicit:
        return explicit
    stored = load_credentials_payload()["smtp"]
    return str(stored.get("from_email", "") or "").strip()


def test_smtp_gateway_connection(
    payload: SmtpGatewayTestConnectionRequest,
) -> SmtpTestConnectionResponse:
    to_email = str(payload.to_email)
    from_email = resolve_smtp_gateway_from_email(
        str(payload.from_email) if payload.from_email is not None else None
    )
    host = resolve_smtp_gateway_host(payload.host)
    port = payload.port
    encryption = payload.encryption
    auth_enabled = payload.auth_enabled
    timeout = payload.timeout_seconds
    tls_verify = payload.tls_verify

    if not host:
        return SmtpTestConnectionResponse(
            success=False,
            message="Missing SMTP gateway host (provide host or save it in SMTP settings).",
            error_trace=None,
            provider=None,
            host=None,
            port=port,
            to_email=to_email,
        )

    if not from_email:
        return SmtpTestConnectionResponse(
            success=False,
            message="Missing from_email (provide from_email or save it in SMTP settings).",
            error_trace=None,
            provider=None,
            host=host,
            port=port,
            to_email=to_email,
        )

    if encryption != SmtpEncryption.starttls:
        return SmtpTestConnectionResponse(
            success=False,
            message=(
                "Gateway test requires encryption=starttls "
                "(equivalent to swaks --tls on port 25, not --tls-on-connect)."
            ),
            error_trace=None,
            provider=None,
            host=host,
            port=port,
            to_email=to_email,
        )

    if auth_enabled:
        return SmtpTestConnectionResponse(
            success=False,
            message=(
                "Gateway test requires auth_enabled=false "
                "(equivalent to swaks without --auth-user)."
            ),
            error_trace=None,
            provider=None,
            host=host,
            port=port,
            to_email=to_email,
        )

    try:
        deliver_smtp_gateway_test_message(
            host=host,
            port=port,
            from_email=from_email,
            to_email=to_email,
            timeout=timeout,
            tls_verify=tls_verify,
            ehlo_hostname=payload.ehlo_hostname,
        )
    except smtplib.SMTPResponseException as exc:
        hint = ""
        if exc.smtp_code == 550:
            hint = (
                " Confirm from_email/to_email match your working swaks --from/--to "
                f"(MAIL FROM=<{from_email}>, RCPT TO=<{to_email}>)."
            )
        return SmtpTestConnectionResponse(
            success=False,
            message=f"{exc}{hint}",
            error_trace=traceback.format_exc(),
            provider=None,
            host=host,
            port=port,
            to_email=to_email,
        )
    except Exception as exc:
        return SmtpTestConnectionResponse(
            success=False,
            message=str(exc) or exc.__class__.__name__,
            error_trace=traceback.format_exc(),
            provider=None,
            host=host,
            port=port,
            to_email=to_email,
        )

    ehlo_name = smtp_ehlo_hostname(from_email, payload.ehlo_hostname)
    verify_label = "tls-verify on" if tls_verify else "tls-verify off"
    return SmtpTestConnectionResponse(
        success=True,
        message=(
            f"Test email sent via gateway {host}:{port} "
            f"(STARTTLS, {verify_label}, EHLO={ehlo_name}, no auth) to {to_email}."
        ),
        error_trace=None,
        provider=None,
        host=host,
        port=port,
        to_email=to_email,
    )


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
            detail=(f"AWS S3 is not configured: missing {', '.join(missing_fields)}"),
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

    missing_fields = [field for field, value in credentials.items() if not value]
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
