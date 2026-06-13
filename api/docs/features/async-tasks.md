# Feature: Generic Background Tasks Using Celery

## Goal

Add a simple generic background task feature to the existing FastAPI project.

The project already has FastAPI, PostgreSQL, Alembic, database sessions, settings, and routing conventions configured. Do not recreate the project structure. Add only the minimum files and logic required for background tasks.

The feature should allow the API to queue any supported task type, immediately return a `task_uuid`, and allow the UI to check task status/result using that UUID.

## What This Feature Solves

Some actions should not block the API response, for example:

```text
Sending email
Generating reports
Processing uploaded files
Calling external webhooks
Long-running imports
```

Instead of making the user wait, the API should:

```text
Create a task record
Queue the task in Celery
Return task_uuid immediately
Let the UI poll task status
Store final result or error in PostgreSQL
```

## Naming Convention

Use `tasks` for this feature because the project already uses `jobs` for cronjob/scheduled jobs.

Use this vocabulary consistently:

```text
tasks
task_logs
task_uuid
task_type
task_status
task_result
```

Avoid these names for this feature:

```text
jobs
background_jobs
job_uuid
job_type
```

## Simple Flow

```text
User/API calls endpoint
  ↓
FastAPI creates tasks row with status queued
  ↓
FastAPI sends task_uuid to Celery
  ↓
Celery worker executes task
  ↓
Worker updates status/result/error in tasks table
  ↓
UI checks result using task_uuid
```

## Required Tech

Use the existing project setup and add:

```text
Celery
Redis broker
Flower for monitoring
Generic tasks table in PostgreSQL
```

Install packages:

```bash
pip install celery redis flower
```

## Important Rule

The UI and external callers should know only this:

```text
task_uuid
```

Do not expose Celery task IDs as the main tracking ID.

Celery task ID can be stored internally only for debugging and Flower correlation.

## Task Status Values

Use these statuses:

```text
queued
processing
completed
failed
retrying
cancelled
```

## Task Types

Start with these task types:

```text
send_email
notify_inspection_review_managers
resolve_ip_metadata
```

## Task Model

Add one generic ORM model using the existing SQLAlchemy model conventions.

Model name:

```text
Task
```

Table name:

```text
tasks
```

Fields:

```text
id
uuid
task_type
status
queue_name
celery_task_id
payload
result
error_message
attempts
max_attempts
progress_percent
progress_message
created_by
tenant_id
started_at
completed_at
failed_at
cancelled_at
created_at
updated_at
```

Recommended SQLAlchemy model shape:

```python
from sqlalchemy import BigInteger, DateTime, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Task(Base):
    __tablename__ = "tasks"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    uuid = mapped_column(UUID(as_uuid=True), unique=True, nullable=False, index=True)
    task_type: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    status: Mapped[str] = mapped_column(String(30), nullable=False, default="queued", index=True)
    queue_name: Mapped[str] = mapped_column(String(100), nullable=False, default="default", index=True)
    celery_task_id: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)
    payload = mapped_column(JSONB, nullable=False, default=dict)
    result = mapped_column(JSONB, nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    attempts: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    max_attempts: Mapped[int] = mapped_column(Integer, nullable=False, default=3)
    progress_percent: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    progress_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_by: Mapped[str | None] = mapped_column(String(255), nullable=True)
    tenant_id: Mapped[int | None] = mapped_column(BigInteger, nullable=True, index=True)
    started_at = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at = mapped_column(DateTime(timezone=True), nullable=True)
    failed_at = mapped_column(DateTime(timezone=True), nullable=True)
    cancelled_at = mapped_column(DateTime(timezone=True), nullable=True)
    created_at = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())
```

Use Alembic autogenerate if the project already supports it:

```bash
alembic revision --autogenerate -m "add generic tasks table"
alembic upgrade head
```

If the existing project already has helper fields such as `is_active`, `created_by`, `updated_by`, or tenant/admin fields, follow existing project conventions.

## Optional Task Logs Model

Only add this if detailed progress logs are required.

Model name:

```text
TaskLog
```

Table name:

```text
task_logs
```

Recommended fields:

```text
id
task_id
level
message
context
created_at
```

Recommended SQLAlchemy model shape:

```python
from sqlalchemy import BigInteger, DateTime, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class TaskLog(Base):
    __tablename__ = "task_logs"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    task_id: Mapped[int] = mapped_column(ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False, index=True)
    level: Mapped[str] = mapped_column(String(30), nullable=False, default="info")
    message: Mapped[str] = mapped_column(Text, nullable=False)
    context = mapped_column(JSONB, nullable=True)
    created_at = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())

    task = relationship("Task")
```

## Minimal Config Needed

Add these settings to the existing settings system:

```text
REDIS_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND_URL=redis://localhost:6379/1
```

## Celery App

Add a Celery app file using the existing settings module.

Example:

```python
from celery import Celery

from app.core.config import settings

celery_app = Celery(
    "app_worker",
    broker=settings.REDIS_URL,
    backend=settings.CELERY_RESULT_BACKEND_URL,
)

celery_app.conf.update(
    task_track_started=True,
    task_time_limit=300,
    task_soft_time_limit=240,
    result_expires=3600,
    worker_prefetch_multiplier=1,
    task_acks_late=True,
    task_reject_on_worker_lost=True,
    timezone="Asia/Kolkata",
    enable_utc=False,
)
```

Adjust imports to match the existing project.

## Task Creation API

Add one generic endpoint:

```text
POST /tasks
```

Request:

```json
{
  "task_type": "send_email",
  "payload": {},
  "queue_name": "default",
  "max_attempts": 3
}
```

Response:

```json
{
  "success": true,
  "task_uuid": "uuid-here",
  "status": "queued"
}
```

Functional behavior:

```text
Validate task_type
Create tasks row
Dispatch Celery task with task_uuid
Store Celery task ID internally
Return task_uuid
```

## Task Status API

Add:

```text
GET /tasks/{task_uuid}
```

Response should include:

```json
{
  "uuid": "uuid-here",
  "task_type": "send_email",
  "status": "processing",
  "progress_percent": 40,
  "progress_message": "Sending email",
  "attempts": 1,
  "max_attempts": 3,
  "result": null,
  "error_message": null,
  "created_at": "",
  "updated_at": ""
}
```

## Task Result API

Add:

```text
GET /tasks/{task_uuid}/result
```

If completed:

```json
{
  "success": true,
  "task_uuid": "uuid-here",
  "status": "completed",
  "result": {}
}
```

If not completed:

```json
{
  "success": false,
  "task_uuid": "uuid-here",
  "status": "processing",
  "message": "Task result is not available yet."
}
```

## Task Payload Design

Keep payload JSON-based.

For email task:

```json
{
  "smtp": {
    "provider": "custom_smtp",
    "host": "mailhost.domain.com",
    "port": 25,
    "encryption": "starttls",
    "auth_enabled": false,
    "username": "",
    "password": "",
    "timeout_seconds": 30
  },
  "message": {
    "from_email": "xyz@domain.com",
    "from_name": "Your App",
    "to_email": "user@example.com",
    "reply_to": "runtime-reply@example.com",
    "subject": "Test email",
    "body_text": "This is a test email.",
    "body_html": "<p>This is a test email.</p>"
  }
}
```

For production, if credentials already exist in your config table or credentials JSON, prefer this shape:

```json
{
  "credential_key": "default_smtp",
  "message": {
    "from_email": "xyz@domain.com",
    "to_email": "user@example.com",
    "reply_to": "runtime-reply@example.com",
    "subject": "Test email",
    "body_text": "This is a test email.",
    "body_html": "<p>This is a test email.</p>"
  }
}
```

Then the worker should resolve SMTP credentials internally.

## Celery Task Behavior

Create one generic Celery task:

```text
execute_task(task_uuid)
```

Functional behavior:

```text
Load task from database by UUID
Mark task as processing
Find handler based on task_type
Run handler
Save result if successful
Mark completed
If failed, save error
Retry if attempts are still available
Mark failed permanently when retries are exhausted
```

## Handler Pattern

Create a simple handler map:

```python
TASK_HANDLERS = {
    "send_email": handle_send_email,
    "resolve_ip_metadata": handle_resolve_ip_metadata,
    "notify_inspection_review_managers": handle_notify_inspection_review_managers,
}
```

## Email Handler Behavior

The email handler should:

```text
Read SMTP config from payload or credential reference
Build email message
Use STARTTLS if encryption is starttls
Skip login if auth_enabled is false
Send email
Return simple success result
```

For the current SMTP server from PM:

```text
host: mailhost.domain.com
port: 25
encryption: starttls
auth_enabled: false
from_email: xyz@domain.com
```

No username/password should be used.

## Email Sending Logic

Use Python `smtplib`.

Expected behavior:

```text
server.ehlo()
server.starttls()
server.ehlo()
server.send_message(message)
```

Do not call `server.login()` when `auth_enabled` is false.

## Retry Rules

For now:

```text
max_attempts default: 3
retry delay: exponential backoff
retry jitter: enabled
final status: failed
```

Avoid infinite retries.

## Flower

Add Flower only for operational monitoring.

Start Flower:

```bash
celery -A path.to.celery_app.celery_app flower --port=5555
```

Use actual project import path.

Flower is for developers/admins.

The UI should still use the tasks API, not Flower.

## Commands

Start Redis:

```bash
redis-server
```

Start API using existing project command.

Start worker:

```bash
celery -A path.to.celery_app.celery_app worker --loglevel=info
```

Start Flower:

```bash
celery -A path.to.celery_app.celery_app flower --port=5555
```

## UI Behavior

After queueing task, UI gets `task_uuid`.

UI should call:

```text
GET /tasks/{task_uuid}
```

Suggested polling:

```text
Every 2 seconds while queued/processing/retrying
Stop polling when completed/failed/cancelled
```

UI status display:

```text
queued      Show pending
processing  Show loader/progress
retrying    Show retrying warning
completed   Show success and result
failed      Show error message
cancelled   Show cancelled
```

## Validation Rules

Validate:

```text
task_type is supported
payload is valid for selected task type
max_attempts is between 1 and 5
queue_name is safe string
```

For email payload validate:

```text
to_email required
from_email required
subject required
body_text or body_html required
smtp host required if credential_key is not provided
smtp port required if credential_key is not provided
encryption must be starttls, ssl_tls, or none
auth_enabled must be boolean
```

## Security Rules

```text
Do not allow arbitrary function names from payload
Do not execute dynamic code from payload
Do not expose internal tracebacks to normal UI
Do not store large files in payload/result
Do not store credentials in payload if a safer credential reference exists
Restrict task visibility by tenant/user if project has tenancy
```

## Acceptance Criteria

- API can queue a generic task.
- API returns `task_uuid` immediately.
- UI can check task status using UUID.
- UI can fetch result using UUID.
- Celery worker processes the task.
- Task moves from queued to processing to completed.
- Failed tasks store error message.
- Retryable tasks retry up to max_attempts.
- Flower shows the Celery task.
- PostgreSQL `tasks` table is the source of truth.
- Email sending works with port 25, STARTTLS, and no authentication.

## First Implementation Scope

Implement only this first:

```text
tasks model
tasks Alembic migration
Task create/status/result APIs
Celery app
Generic execute_task Celery task
send_email handler
Flower command
```

Do not build dashboards yet.

Do not build advanced scheduler yet.

Do not build cancellation yet.

Do not add separate tables for each task type.

Do not restructure the existing project.

## Cursor Instruction

Use the existing project conventions.

Do not generate a new FastAPI project.

Do not change existing Alembic configuration.

Do not change existing database session setup.

Do not introduce unnecessary abstractions.

Use ORM model code instead of raw SQL migration code in the feature implementation notes.

Add this feature in the smallest clean way possible.

Focus on functionality first:

```text
Queue task
Process task
Track task
Return result
```
