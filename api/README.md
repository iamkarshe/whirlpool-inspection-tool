# Whirlpool Inspection Tool API

This repo is a FastAPI backend using:

- **uv** for venv + dependency management
- **PostgreSQL** (remote UAT DB)
- **SQLAlchemy 2.x** models in `mod/model.py`
- **Alembic** migrations in `migrations/`
- **Soft delete** via `is_active`

Schema is created/updated **only** via Alembic migrations. The API must never call `create_all()`.

## Project layout

- `main.py` — FastAPI entry
- `utils/env.py` — loads `.env`
- `utils/db.py` — SQLAlchemy engine/session (reads DB config from `.env`) and sets DB session timezone
- `mod/model.py` — SQLAlchemy models (single source for schema)
- `migrations/` — Alembic migration scripts
- `scripts/seed_master_data.py` — idempotent seed (roles + product categories)
- `alembic.ini` — Alembic config (must live in project root)

## Environment setup

### 1) Create venv

```bash
uv venv
```

### 2) Install dependencies

```bash
uv sync
```

## Configure environment variables

Create `.env` in the project root (`API/.env`):

```env
DB_HOST=
DB_USER=
DB_PASS=
DB_NAME=
DB_PORT=

# [dev, prod]
APP_ENV=dev

LOG_LEVEL=INFO
```

Notes:

- This project uses a **remote UAT database**, so `DB_HOST` will be your UAT DB hostname/IP.
- All DB connections and Alembic migrations read from `.env`. There is no localhost assumption anywhere.

## Database session timezone

Every DB connection runs:

```sql
SET TIME ZONE 'Asia/Kolkata'
```

This makes `NOW()` return IST for `created_at` / `updated_at`.

## First-time migrations (initial schema)

These are the exact steps for **first-time schema creation**.

### Step A) Initialize Alembic (only once per repo)

If `migrations/` does not exist yet:

```bash
uv run alembic init migrations
```

Ensure:

- `alembic.ini` is in the project root.
- `alembic.ini` has `script_location = migrations`.

### Step B) Configure Alembic to use `.env`

In `migrations/env.py`, Alembic must:

- import `Base` from `mod/model.py`
- set `target_metadata = Base.metadata`
- build DB URL from `.env` values

(Already set up in this project.)

### Step C) Create the initial migration from models

Make sure your `.env` points to the correct remote UAT DB, then run:

```bash
uv run alembic revision --autogenerate -m "initial schema"
```

This creates a new file inside `migrations/versions/`.

### Step D) Apply migration to create tables

```bash
uv run alembic upgrade head
```

### Step E) Verify migration state

```bash
uv run alembic current
```

## Seed master data (roles + product categories)

After the schema exists (after `alembic upgrade head`), seed master data:

```bash
uv run python -m scripts.seed_master
```

### Run API in dev mode

```bash
uv run uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### When you change models (`mod/model.py`)

1. Generate a migration:

```bash
uv run alembic revision --autogenerate -m "initial migration"
```

2. Apply it:

```bash
uv run alembic upgrade head
```

3. After changes into `model.py` use following command to auto-generate the migration

```bash
alembic revision --autogenerate -m "add plants and warehouse location columns"
```

4. Apply it using:

```bash
alembic upgrade head
```

## Rules (must follow)

- Never run `Base.metadata.create_all()` in the API.
- DB config must always come from `.env`.
- Use Alembic migrations for all schema changes.
- Use `is_active` for soft delete. Avoid hard deletes unless explicitly required.

## Common commands

```bash
uv run alembic current
uv run alembic history
uv run alembic heads
uv run alembic upgrade head
uv run alembic downgrade -1
```

## JWT Secret Key

```bash
openssl rand -hex 32
```

## Background tasks (Celery + Redis)

Run these from the **API project root** (where `.env` lives). You need **three processes**: Redis, a **worker**, and optionally Flower. Flower alone does not execute tasks.

### 1) Redis

```bash
redis-server
```

Set in `.env`:

```env
REDIS_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND_URL=redis://localhost:6379/1
```

### 2) Celery worker (required)

Tasks are published to the `default` queue. Without a worker, API rows stay `queued` and Flower shows inspect warnings.

```bash
celery -A mod.tasks.worker.celery_app worker -Q default,celery --loglevel=info
```

You should see `mod.tasks.worker.execute_task` in the startup task list and `celery@... ready`.

### 3) Flower (optional monitoring)

Start **after** the worker is running, or inspect warnings (`stats`, `active`, etc.) are expected.

```bash
celery -A mod.tasks.worker.celery_app flower --port=5555 --basic-auth=admin:StrongPasswordHere
```

### Quick checks

```bash
redis-cli -n 0 LLEN default
celery -A mod.tasks.worker.celery_app inspect ping
celery -A mod.tasks.worker.celery_app inspect active_queues
```

If `LLEN default` is greater than 0 and the worker is running, the queue should drain. Purge stuck messages only if you intend to discard them: `celery -A mod.tasks.worker.celery_app purge`.

## Troubleshooting

### 1) Alembic cannot connect

- Confirm `.env` is present in project root.
- Confirm `DB_HOST/DB_USER/DB_PASS/DB_NAME/DB_PORT` are correct.
- Confirm UAT DB allows inbound connections from your IP/VPN.

### 2) Migration autogenerate produces unexpected diffs

- Ensure you are editing only `mod/model.py`.
- Ensure `migrations/env.py` points `target_metadata` to `Base.metadata` from the same file.
