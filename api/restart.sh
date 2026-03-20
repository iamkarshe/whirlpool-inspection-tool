#!/usr/bin/env bash
set -Eeuo pipefail
IFS=$'\n\t'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

APP_NAME="whirlpool-app"   # Unique app identifier
FASTAPI_PORT=8210          # Unique FastAPI port
WORKERS=4

LOG_DIR="$SCRIPT_DIR/logs"
mkdir -p "$LOG_DIR"

RUN_TS="$(date -u +"%Y%m%dT%H%M%SZ")"
RESTART_LOG="$LOG_DIR/restart-${RUN_TS}.log"
FASTAPI_LOG="$LOG_DIR/fastapi-${RUN_TS}.log"

log() {
  # Log to both console and the restart log.
  # shellcheck disable=SC2059
  printf '%s %s\n' "$(date -u +"%Y-%m-%dT%H:%M:%SZ")" "$*"
}

exec > >(tee -a "$RESTART_LOG") 2>&1

on_error() {
  local exit_code=$?
  local line_no=$1
  echo "ERROR: restart.sh failed (exit_code=${exit_code}) at line=${line_no}."
  echo "ERROR: Command: '${BASH_COMMAND}'"
  echo "ERROR: Restart log: ${RESTART_LOG}"
  echo "ERROR: FastAPI log (if created): ${FASTAPI_LOG}"
}

on_exit() {
  local exit_code=$?
  if [[ $exit_code -eq 0 ]]; then
    echo "restart.sh completed successfully."
  else
    echo "restart.sh exiting with code ${exit_code}."
  fi
}

trap 'on_error $LINENO' ERR
trap 'on_exit' EXIT

VENV_ACTIVATE="${SCRIPT_DIR}/.venv/bin/activate"
if [[ ! -f "$VENV_ACTIVATE" ]]; then
  echo "ERROR: virtualenv activate script not found at: ${VENV_ACTIVATE}"
  exit 1
fi

log "Activating virtual environment..."
# Activate virtual environment
# shellcheck disable=SC1090
. "$VENV_ACTIVATE"

log "Stopping FastAPI for ${APP_NAME} on port ${FASTAPI_PORT}..."

# Best-effort stop by command pattern (keep your original target as a hint).
pkill -f "whirlpool.scoptanalytics.in/.venv/bin/fastapi" >/dev/null 2>&1 || true

# Best-effort stop by port (prefer lsof when available).
if command -v lsof >/dev/null 2>&1; then
  pids="$(lsof -t -iTCP:"$FASTAPI_PORT" -sTCP:LISTEN 2>/dev/null || true)"
  if [[ -n "${pids:-}" ]]; then
    log "Found PIDs listening on port ${FASTAPI_PORT}: ${pids}"
    kill -TERM $pids >/dev/null 2>&1 || true
    sleep 2
    pids="$(lsof -t -iTCP:"$FASTAPI_PORT" -sTCP:LISTEN 2>/dev/null || true)"
    if [[ -n "${pids:-}" ]]; then
      log "Still listening after TERM; sending KILL: ${pids}"
      kill -KILL $pids >/dev/null 2>&1 || true
    fi
  else
    log "No process currently listening on port ${FASTAPI_PORT}."
  fi
else
  log "WARN: lsof not found; skipping port-based stop."
fi

log "Starting FastAPI server for ${APP_NAME} on port ${FASTAPI_PORT}..."
nohup "${SCRIPT_DIR}/.venv/bin/uvicorn" main:app \
  --host 0.0.0.0 \
  --port "$FASTAPI_PORT" \
  --workers "$WORKERS" \
  >"$FASTAPI_LOG" 2>&1 &
FASTAPI_PID=$!
log "Start command issued (pid=${FASTAPI_PID}). FastAPI log: ${FASTAPI_LOG}"

log "Verifying FastAPI is listening on port ${FASTAPI_PORT}..."
sleep 1

listening=false
# This section uses best-effort checks. Avoid triggering ERR-trap due to expected
# "not listening yet" / "no match" cases.
set +e
if command -v lsof >/dev/null 2>&1; then
  if lsof -t -iTCP:"$FASTAPI_PORT" -sTCP:LISTEN >/dev/null 2>&1; then
    listening=true
  fi
elif command -v ss >/dev/null 2>&1; then
  # ss output includes local address in the 4th column; match the configured port.
  ss -ltnp 2>/dev/null | awk -v p=":${FASTAPI_PORT}\$" '$4 ~ p {found=1} END{exit (found?0:1)}'
  if [[ $? -eq 0 ]]; then
    listening=true
  fi
fi
set -e

if [[ "$listening" != "true" ]]; then
  echo "ERROR: FastAPI does not appear to be listening on port ${FASTAPI_PORT}."
  echo "ERROR: Check: ${FASTAPI_LOG}"
  exit 1
fi

log "FastAPI restarted for ${APP_NAME}."
