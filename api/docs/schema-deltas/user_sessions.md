# Schema delta: `user_sessions` (maintainer migration)

Application code expects this table for revocable JWT sessions (`jti` on bearer tokens). **Agents do not add Alembic revisions**; apply an equivalent migration in each environment.

## Table: `user_sessions`

| Column | Type | Notes |
|--------|------|--------|
| `id` | integer PK | |
| `jti` | varchar(64) UNIQUE NOT NULL | matches JWT `jti` claim |
| `user_id` | FK → `users.id` ON DELETE CASCADE | indexed |
| `device_id` | FK → `devices.id` ON DELETE SET NULL | nullable, indexed |
| `is_active` | boolean NOT NULL DEFAULT true | |
| `expires_at` | timestamptz NOT NULL | |
| `created_at` | timestamptz NOT NULL DEFAULT now() | |

## Indexes

- `ix_user_sessions_jti` (unique on `jti`)
- `ix_user_sessions_user_active` (`user_id`, `is_active`)
- `ix_user_sessions_device_active` (`device_id`, `is_active`)

## Model

See `UserSession` in `mod/model.py`.
