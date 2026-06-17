from __future__ import annotations

import base64
import smtplib
from email.message import EmailMessage
from email.utils import formataddr
from typing import Any

from mod.api.integration.helper import (
    build_smtp_tls_context,
    load_credentials_payload,
    parse_auth_enabled,
    parse_smtp_encryption,
    parse_smtp_port,
    parse_smtp_timeout,
    resolve_smtp_host,
)
from mod.api.integration.request import SmtpEncryption
from mod.tasks.constants import CREDENTIAL_KEY_DEFAULT_SMTP


def resolve_smtp_config_from_payload(payload: dict[str, Any]) -> dict[str, Any]:
    credential_key = str(payload.get("credential_key", "") or "").strip()
    if credential_key:
        if credential_key != CREDENTIAL_KEY_DEFAULT_SMTP:
            raise ValueError(f"Unsupported credential_key: {credential_key}")
        stored = load_credentials_payload().get("smtp", {})
        if not isinstance(stored, dict):
            raise ValueError("SMTP credentials are not configured")
        return dict(stored)

    smtp_section = payload.get("smtp")
    if not isinstance(smtp_section, dict):
        raise ValueError("payload must include smtp or credential_key")
    return dict(smtp_section)


def parse_content_type(content_type: str) -> tuple[str, str]:
    maintype, _, subtype = content_type.partition("/")
    if not maintype or not subtype:
        return "application", "octet-stream"
    return maintype, subtype


def add_message_attachments(
    email_message: EmailMessage,
    attachments: Any,
) -> None:
    if not isinstance(attachments, list):
        return

    for attachment in attachments:
        if not isinstance(attachment, dict):
            continue

        filename = str(attachment.get("filename", "") or "").strip()
        content_type = str(attachment.get("content_type", "") or "").strip()
        content_b64 = attachment.get("content_b64")
        if not filename or not isinstance(content_b64, str) or not content_b64:
            continue

        content = base64.b64decode(content_b64.encode("ascii"))
        maintype, subtype = parse_content_type(content_type)
        email_message.add_attachment(
            content,
            maintype=maintype,
            subtype=subtype,
            filename=filename,
        )


def build_task_email_message(message: dict[str, Any]) -> EmailMessage:
    from_email = str(message.get("from_email", "") or "").strip()
    to_email = str(message.get("to_email", "") or "").strip()
    subject = str(message.get("subject", "") or "").strip()
    body_text = str(message.get("body_text", "") or "").strip()
    body_html = str(message.get("body_html", "") or "").strip()
    from_name = str(message.get("from_name", "") or "").strip()
    reply_to = str(message.get("reply_to", "") or "").strip()

    if not from_email or not to_email or not subject:
        raise ValueError("from_email, to_email, and subject are required")
    if not body_text and not body_html:
        raise ValueError("body_text or body_html is required")

    email_message = EmailMessage()
    email_message["Subject"] = subject
    email_message["From"] = (
        formataddr((from_name, from_email)) if from_name else from_email
    )
    email_message["To"] = to_email
    if reply_to:
        email_message["Reply-To"] = reply_to

    if body_text:
        email_message.set_content(body_text, subtype="plain")
    if body_html:
        if body_text:
            email_message.add_alternative(body_html, subtype="html")
        else:
            email_message.set_content(body_html, subtype="html")

    add_message_attachments(email_message, message.get("attachments"))

    return email_message


def send_task_email(smtp_config: dict[str, Any], message: dict[str, Any]) -> None:
    email_message = build_task_email_message(message)
    encryption_raw = str(smtp_config.get("encryption", "starttls") or "starttls")
    if encryption_raw == "ssl_tls":
        encryption = SmtpEncryption.ssl
    else:
        encryption = parse_smtp_encryption(encryption_raw)

    host = resolve_smtp_host(smtp_config)
    port = parse_smtp_port(smtp_config.get("port"))
    timeout = parse_smtp_timeout(smtp_config.get("timeout_seconds"))
    auth_enabled = parse_auth_enabled(smtp_config.get("auth_enabled"), default=True)
    username = str(smtp_config.get("username", "") or "")
    password = str(smtp_config.get("password", "") or "")
    tls_context = build_smtp_tls_context(verify=True)

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
