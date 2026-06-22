import uuid as uuid_std

from pydantic import BaseModel, ConfigDict, EmailStr, Field

BULK_ONBOARD_EMAILS_JOB_EXAMPLE = {
    "job_name": "bulk_onboard_emails",
    "pending_count": 25,
    "sent_count": 23,
    "failed_count": 2,
    "message": "Bulk onboard emails finished: 23 sent, 2 failed, 25 pending at start.",
    "logged": True,
    "enqueued": False,
    "results": [
        {
            "user_uuid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
            "email": "susanta_palit@whirlpool.in",
            "name": "Susanta Palit",
            "welcome_email_sent": True,
            "error": None,
        },
        {
            "user_uuid": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
            "email": "bad@whirlpool.in",
            "name": "Bad User",
            "welcome_email_sent": False,
            "error": "Welcome email delivery failed after retries",
        },
    ],
}


class JobExecutionResponse(BaseModel):
    """Result of a cron-triggered GET job."""

    job_name: str = Field(..., description="Internal job identifier.")
    rows_updated: int = Field(
        ...,
        description="Number of database rows changed by this run.",
    )
    message: str = Field(..., description="Human-readable outcome summary.")
    logged: bool = Field(
        ...,
        description=(
            "True when a row was written to job_logs "
            "(failures or at least one row updated)."
        ),
    )


class BulkOnboardEmailItemResponse(BaseModel):
    """Per-user result when GET /jobs/bulk-onboard-emails runs inline."""

    user_uuid: uuid_std.UUID = Field(..., description="User UUID.")
    email: EmailStr = Field(..., description="User email.")
    name: str = Field(..., description="User display name.")
    welcome_email_sent: bool = Field(
        ...,
        description="True when the welcome onboarding email was delivered.",
    )
    error: str | None = Field(
        default=None,
        description="Present when onboarding or email delivery failed.",
    )


class BulkOnboardEmailsJobResponse(BaseModel):
    """Result of GET /jobs/bulk-onboard-emails."""

    model_config = ConfigDict(
        json_schema_extra={"examples": [BULK_ONBOARD_EMAILS_JOB_EXAMPLE]}
    )

    job_name: str = Field(
        ...,
        description="Internal job identifier.",
        examples=["bulk_onboard_emails"],
    )
    pending_count: int = Field(
        ...,
        description="Users matched for onboarding at job start.",
        examples=[25],
    )
    sent_count: int = Field(
        ...,
        description="Welcome emails delivered successfully.",
        examples=[23],
    )
    failed_count: int = Field(
        ...,
        description="Users that failed onboarding or email delivery.",
        examples=[2],
    )
    message: str = Field(..., description="Human-readable outcome summary.")
    logged: bool = Field(
        ...,
        description="True when a row was written to job_logs.",
    )
    enqueued: bool = Field(
        default=False,
        description=(
            "True when processing was queued to Celery. When true, results is empty "
            "and sent_count/failed_count stay 0 until the worker finishes."
        ),
    )
    results: list[BulkOnboardEmailItemResponse] = Field(
        default_factory=list,
        description="Per-user outcomes when the job ran inline (enqueued=false).",
    )
