"""Task type handlers; only send_email is fully implemented."""

from __future__ import annotations

import smtplib

from email.message import EmailMessage
from email.utils import formataddr
from typing import Any, Callable

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
from sqlalchemy.orm import Session

from mod.model import Task
from mod.tasks.constants import CREDENTIAL_KEY_DEFAULT_SMTP
from mod.tasks.service import update_task_progress

Handler = Callable[[Session, Task], dict[str, Any]]


def handle_generate_report(db: Session, task: Task) -> dict[str, Any]:
    update_task_progress(db, task, 50, "Report handler placeholder")
    return {"status": "not_implemented", "task_type": "generate_report"}


def handle_process_file(db: Session, task: Task) -> dict[str, Any]:
    update_task_progress(db, task, 50, "File handler placeholder")
    return {"status": "not_implemented", "task_type": "process_file"}


def handle_send_webhook(db: Session, task: Task) -> dict[str, Any]:
    update_task_progress(db, task, 50, "Webhook handler placeholder")
    return {"status": "not_implemented", "task_type": "send_webhook"}


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


def handle_send_email(db: Session, task: Task) -> dict[str, Any]:
    payload = dict(task.payload or {})
    message = payload.get("message")
    if not isinstance(message, dict):
        raise ValueError("send_email payload requires message object")

    update_task_progress(db, task, 30, "Resolving SMTP configuration")
    smtp_config = resolve_smtp_config_from_payload(payload)

    update_task_progress(db, task, 60, "Sending email")
    send_task_email(smtp_config, message)

    to_email = str(message.get("to_email", "") or "").strip()
    return {
        "success": True,
        "to_email": to_email,
        "subject": str(message.get("subject", "") or "").strip(),
    }


TASK_HANDLERS: dict[str, Handler] = {
    "send_email": handle_send_email,
    "generate_report": handle_generate_report,
    "process_file": handle_process_file,
    "send_webhook": handle_send_webhook,
}
