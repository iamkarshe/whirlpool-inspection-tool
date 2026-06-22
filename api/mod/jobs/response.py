from pydantic import BaseModel, Field


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
    user_uuid: str = Field(..., description="User UUID.")
    email: str = Field(..., description="User email.")
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
    job_name: str = Field(..., description="Internal job identifier.")
    pending_count: int = Field(
        ...,
        description="Users matched for onboarding at job start.",
    )
    sent_count: int = Field(..., description="Welcome emails delivered successfully.")
    failed_count: int = Field(..., description="Users that failed onboarding or email.")
    message: str = Field(..., description="Human-readable outcome summary.")
    logged: bool = Field(
        ...,
        description="True when a row was written to job_logs.",
    )
    enqueued: bool = Field(
        default=False,
        description="True when processing was queued to Celery instead of running inline.",
    )
    results: list[BulkOnboardEmailItemResponse] = Field(
        default_factory=list,
        description="Per-user outcomes when the job ran inline.",
    )
