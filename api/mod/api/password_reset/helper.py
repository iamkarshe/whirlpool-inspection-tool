from mod.api.password_reset.response import PasswordResetRequestItemResponse
from mod.model import PasswordResetRequest, User


def map_password_reset_request_item(
    row: PasswordResetRequest,
    user: User | None,
) -> PasswordResetRequestItemResponse:
    return PasswordResetRequestItemResponse(
        uuid=row.uuid,
        attempted_email=row.attempted_email,
        user_uuid=user.uuid if user is not None else None,
        user_name=user.name if user is not None else None,
        user_email=user.email if user is not None else None,
        ip_address=str(row.ip_address) if row.ip_address else None,
        proxy_ip_address=str(row.proxy_ip_address) if row.proxy_ip_address else None,
        user_agent=row.user_agent,
        is_completed=bool(row.is_completed),
        is_disallowed=bool(row.is_disallowed),
        completed_at=row.completed_at,
        expires_at=row.expires_at,
        email_sent=bool(row.email_sent),
        created_at=row.created_at,
        updated_at=row.updated_at,
    )
