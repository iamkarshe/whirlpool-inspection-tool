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
