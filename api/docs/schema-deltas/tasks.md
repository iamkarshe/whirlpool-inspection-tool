# Schema delta: background tasks (`tasks`, `task_logs`) and `job_logs.metadata`

Maintainer: add one Alembic revision covering the following.

## Enum `task_status`

Values: `queued`, `processing`, `completed`, `failed`, `retrying`, `cancelled` (native_enum=false, length 30).

## Table `tasks`

| Column | Type | Notes |
|--------|------|--------|
| id | integer PK | |
| uuid | uuid unique not null | |
| task_type | varchar(100) not null | index |
| status | task_status not null | default queued, index |
| queue_name | varchar(100) not null | default `default`, index |
| celery_task_id | varchar(255) nullable | index |
| payload | jsonb not null | default `{}` |
| result | jsonb nullable | |
| error_message | text nullable | |
| attempts | integer not null | default 0 |
| max_attempts | integer not null | default 3 |
| progress_percent | integer not null | default 0 |
| progress_message | text nullable | |
| created_by | varchar(255) nullable | |
| tenant_id | integer nullable | index |
| started_at | timestamptz nullable | |
| completed_at | timestamptz nullable | |
| failed_at | timestamptz nullable | |
| cancelled_at | timestamptz nullable | |
| is_active | boolean not null | default true |
| created_at | timestamptz not null | server default now() |
| updated_at | timestamptz not null | server default now() |

Indexes: `ix_tasks_task_type`, `ix_tasks_status`, `ix_tasks_queue_name`, `ix_tasks_celery_task_id`, `ix_tasks_created_at`, unique on `uuid`.

## Table `task_logs`

| Column | Type | Notes |
|--------|------|--------|
| id | integer PK | |
| task_id | integer FK → tasks.id ON DELETE CASCADE | index |
| level | varchar(30) not null | default `info` |
| message | text not null | |
| context | jsonb nullable | |
| created_at | timestamptz not null | server default now() |

## Alter `job_logs`

Add column `metadata` (jsonb, nullable) for structured cron/task context (task_uuid, attempted_email, etc.).
