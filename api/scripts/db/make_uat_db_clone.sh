#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_FILE="${CONFIG_FILE:-${SCRIPT_DIR}/config.toml}"
DUMP_FILE="${SCRIPT_DIR}/db_uat.dump"
SSH_TUNNEL_PIDS=()

eval "$(python3 "${SCRIPT_DIR}/read_config.py" "${CONFIG_FILE}")"

cleanup() {
  local pid
  for pid in "${SSH_TUNNEL_PIDS[@]}"; do
    if kill -0 "${pid}" 2>/dev/null; then
      kill "${pid}" 2>/dev/null || true
      wait "${pid}" 2>/dev/null || true
    fi
  done
}
trap cleanup EXIT

pick_free_port() {
  python3 -c 'import socket; s = socket.socket(); s.bind(("", 0)); print(s.getsockname()[1]); s.close()'
}

wait_for_port() {
  local host="$1"
  local port="$2"
  local attempts=30

  for _ in $(seq 1 "${attempts}"); do
    if python3 -c "import socket; s = socket.create_connection(('${host}', ${port}), 1); s.close()" 2>/dev/null; then
      return 0
    fi
    sleep 0.5
  done

  echo "Timed out waiting for SSH tunnel on ${host}:${port}" >&2
  return 1
}

psql_target() {
  PGPASSWORD="${TGT_PASS}" psql \
    -h "${TGT_PG_HOST}" \
    -p "${TGT_PG_PORT}" \
    -U "${TGT_USER}" \
    "$@"
}

pg_server_version_num() {
  local host="$1"
  local port="$2"
  local user="$3"
  local pass="$4"
  local db="$5"

  PGPASSWORD="${pass}" psql \
    -h "${host}" \
    -p "${port}" \
    -U "${user}" \
    -d "${db}" \
    -tAc "SHOW server_version_num;"
}

pg_client_major_version() {
  pg_dump --version | sed -E 's/.* ([0-9]+).*/\1/'
}

resolve_connection() {
  local label="$1"
  local prefix="$2"
  local host_var="$3"
  local port_var="$4"

  local ssh_enabled="${prefix}_SSH_ENABLED"
  local db_host="${prefix}_HOST"
  local db_port="${prefix}_PORT"
  local ssh_host="${prefix}_SSH_HOST"
  local ssh_user="${prefix}_SSH_USER"
  local ssh_port="${prefix}_SSH_PORT"
  local ssh_identity="${prefix}_SSH_IDENTITY_FILE"
  local ssh_local_port="${prefix}_SSH_LOCAL_PORT"
  local ssh_remote_host="${prefix}_SSH_REMOTE_HOST"
  local ssh_remote_port="${prefix}_SSH_REMOTE_PORT"

  if [[ "${!ssh_enabled}" != "true" ]]; then
    printf -v "${host_var}" '%s' "${!db_host}"
    printf -v "${port_var}" '%s' "${!db_port}"
    return
  fi

  if [[ -z "${!ssh_host}" || -z "${!ssh_user}" ]]; then
    echo "${label}: SSH is enabled but ssh.host or ssh.user is missing in ${CONFIG_FILE}" >&2
    exit 1
  fi

  local local_port="${!ssh_local_port:-$(pick_free_port)}"
  local ssh_args=(
    -N
    -o ExitOnForwardFailure=yes
    -o ServerAliveInterval=30
    -L "${local_port}:${!ssh_remote_host}:${!ssh_remote_port}"
    -p "${!ssh_port}"
  )

  if [[ -n "${!ssh_identity}" ]]; then
    ssh_args+=(-i "${!ssh_identity/#\~/$HOME}")
  fi

  echo "${label}: opening SSH tunnel via ${!ssh_user}@${!ssh_host}:${!ssh_port} -> ${!ssh_remote_host}:${!ssh_remote_port} (local ${local_port})..."
  ssh "${ssh_args[@]}" "${!ssh_user}@${!ssh_host}" &
  SSH_TUNNEL_PIDS+=("$!")

  wait_for_port 127.0.0.1 "${local_port}"

  printf -v "${host_var}" '%s' "127.0.0.1"
  printf -v "${port_var}" '%s' "${local_port}"
}

ensure_target_database() {
  local exists
  exists="$(psql_target -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname = '${TGT_DB}'")"

  if [[ "${exists}" == "1" ]]; then
    echo "Target database ${TGT_DB} already exists."
    return
  fi

  echo "Creating target database ${TGT_DB}..."
  psql_target -d postgres -v ON_ERROR_STOP=1 -c "CREATE DATABASE \"${TGT_DB}\";"
}

strip_pg17_session_settings() {
  local sql_file="$1"
  sed -i \
    -e '/transaction_timeout/d' \
    -e '/^SET idle_in_transaction_session_timeout/d' \
    "${sql_file}"
}

restore_dump() {
  local target_major="$1"
  local restore_args=(
    --clean
    --if-exists
    --no-owner
    --no-acl
  )

  if [[ "${target_major}" -lt 17 ]]; then
    echo "Target is PostgreSQL ${target_major}; converting dump to SQL and removing PG17-only session settings..."
    local sql_file
    sql_file="$(mktemp)"
    trap 'rm -f "${sql_file}"' RETURN

    pg_restore "${restore_args[@]}" -f "${sql_file}" "${DUMP_FILE}"
    strip_pg17_session_settings "${sql_file}"

    psql_target -d "${TGT_DB}" -v ON_ERROR_STOP=1 -f "${sql_file}"
    rm -f "${sql_file}"
    trap - RETURN
    return
  fi

  set +e
  PGPASSWORD="${TGT_PASS}" pg_restore \
    -h "${TGT_PG_HOST}" \
    -p "${TGT_PG_PORT}" \
    -U "${TGT_USER}" \
    -d "${TGT_DB}" \
    "${restore_args[@]}" \
    "${DUMP_FILE}"
  local restore_status=$?
  set -e

  if [[ "${restore_status}" -gt 1 ]]; then
    echo "pg_restore failed with exit code ${restore_status}" >&2
    exit "${restore_status}"
  fi

  if [[ "${restore_status}" -eq 1 ]]; then
    echo "pg_restore completed with warnings." >&2
  fi
}

print_restore_summary() {
  local db_count table_count
  db_count="$(psql_target -d postgres -tAc "SELECT count(*) FROM pg_database WHERE datistemplate = false")"
  table_count="$(psql_target -d "${TGT_DB}" -tAc "SELECT count(*) FROM information_schema.tables WHERE table_schema NOT IN ('pg_catalog', 'information_schema')")"

  echo "Target server databases: ${db_count}"
  echo "Tables in ${TGT_DB}: ${table_count}"
  psql_target -d postgres -c "\l"
}

SRC_PG_HOST=""
SRC_PG_PORT=""
TGT_PG_HOST=""
TGT_PG_PORT=""

resolve_connection "source" "SRC" SRC_PG_HOST SRC_PG_PORT
resolve_connection "target" "TGT" TGT_PG_HOST TGT_PG_PORT

SRC_SERVER_VERSION_NUM="$(pg_server_version_num "${SRC_PG_HOST}" "${SRC_PG_PORT}" "${SRC_USER}" "${SRC_PASS}" "${SRC_DB}")"
TGT_SERVER_VERSION_NUM="$(pg_server_version_num "${TGT_PG_HOST}" "${TGT_PG_PORT}" "${TGT_USER}" "${TGT_PASS}" "postgres")"
SRC_SERVER_MAJOR=$((SRC_SERVER_VERSION_NUM / 10000))
TGT_SERVER_MAJOR=$((TGT_SERVER_VERSION_NUM / 10000))
PG_CLIENT_MAJOR="$(pg_client_major_version)"

echo "Source server: PostgreSQL ${SRC_SERVER_MAJOR} (source DB: ${SRC_DB})"
echo "Target server: PostgreSQL ${TGT_SERVER_MAJOR} (target DB: ${TGT_DB})"
echo "Local pg_dump client: ${PG_CLIENT_MAJOR}"

if [[ "${TGT_SERVER_MAJOR}" -lt "${SRC_SERVER_MAJOR}" ]]; then
  echo "Warning: target PostgreSQL is older than source; restore may fail on newer SQL features." >&2
fi

if [[ "${PG_CLIENT_MAJOR}" -ge 17 && "${TGT_SERVER_MAJOR}" -lt 17 ]]; then
  echo "Note: pg_dump ${PG_CLIENT_MAJOR} -> PostgreSQL ${TGT_SERVER_MAJOR} requires stripping PG17-only settings during restore." >&2
fi

ensure_target_database

echo "Backing up source database ${SRC_DB} from ${SRC_HOST}:${SRC_PORT}..."
PGPASSWORD="${SRC_PASS}" pg_dump \
  -h "${SRC_PG_HOST}" \
  -p "${SRC_PG_PORT}" \
  -U "${SRC_USER}" \
  -d "${SRC_DB}" \
  -Fc -f "${DUMP_FILE}"

echo "Restoring into target database ${TGT_DB} at ${TGT_HOST}:${TGT_PORT}..."
restore_dump "${TGT_SERVER_MAJOR}"

echo "Target database ${TGT_DB} synced from ${SRC_DB}."
print_restore_summary
