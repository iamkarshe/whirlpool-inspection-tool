# Schema delta: `ip_address_metadata`

Maintainer: add one Alembic revision covering the following.

## Enum `ip_lookup_status`

Values: `pending`, `completed`, `failed`, `skipped` (native_enum=false, length 20).

## Table `ip_address_metadata`

| Column | Type | Notes |
|--------|------|--------|
| id | integer PK | |
| ip_address | inet not null | unique (`uq_ip_address_metadata_ip`), index |
| country_code | varchar(8) nullable | e.g. `IN` |
| country_name | varchar(128) nullable | e.g. `India` |
| region | varchar(128) nullable | state / region |
| city | varchar(128) nullable | |
| isp | varchar(255) nullable | |
| lookup_status | ip_lookup_status not null | default `pending` |
| lookup_source | varchar(64) nullable | e.g. `ip-api` |
| lookup_error | text nullable | last lookup failure message |
| raw_response | jsonb nullable | provider payload snapshot |
| looked_up_at | timestamptz nullable | |
| created_at | timestamptz not null | server default now() |
| updated_at | timestamptz not null | server default now() |

Used by login audit logs: client IP is stored in `logs.log_value` (`ip` field) and enriched asynchronously via Celery task `resolve_ip_metadata`.

## Operations

- **On login:** `schedule_ip_metadata_lookup` enqueues one `resolve_ip_metadata` task per new public IP.
- **On demand:** `GET /api/logins/ip/{ip_address}` queues `resolve_ip_metadata` when metadata is `pending` or `failed` (or when `refresh_metadata=true`). Response includes `metadata_refresh_queued`; poll the endpoint after a few seconds for updated geo fields.
- **Backfill / retry:** cron job `GET /jobs/resolve-pending-ip-metadata` (header `x-job-execute-token`) or Celery beat task `resolve_pending_ip_metadata` seeds IPs from login logs and enqueues lookups for rows with `lookup_status` `pending` or `failed` (batch size `IP_GEO_BATCH_LIMIT`).
- **Failure tracking:** permanent Celery failures write `job_logs` with `job_name` `task:resolve_ip_metadata` and `metadata.ip_address`; batch runs write `job_name` `resolve_pending_ip_metadata`.
