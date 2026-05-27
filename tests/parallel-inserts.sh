#!/usr/bin/env bash
#
# Bulk-insert inspections in parallel by invoking test-inspections.sh per run.
#
# Usage:
#   ./parallel-inserts.sh [count]
#   PARALLEL_JOBS=8 ./parallel-inserts.sh 50
#
# Each run writes its own payload and log under parallel-runs/<timestamp>/.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INSERT_SCRIPT="${SCRIPT_DIR}/test-inspections.sh"
COUNT="${1:-50}"
JOBS="${PARALLEL_JOBS:-10}"
LOG_DIR="${SCRIPT_DIR}/parallel-runs/$(date +%Y%m%d-%H%M%S)"

if [[ ! -f "$INSERT_SCRIPT" ]]; then
  echo "Missing insert script: $INSERT_SCRIPT"
  exit 1
fi

if ! [[ "$COUNT" =~ ^[0-9]+$ ]] || [[ "$COUNT" -lt 1 ]]; then
  echo "Count must be a positive integer (got: $COUNT)"
  exit 1
fi

if ! [[ "$JOBS" =~ ^[0-9]+$ ]] || [[ "$JOBS" -lt 1 ]]; then
  echo "PARALLEL_JOBS must be a positive integer (got: $JOBS)"
  exit 1
fi

mkdir -p "$LOG_DIR"

echo "Parallel bulk insert"
echo "  Runs:      $COUNT"
echo "  Job limit: $JOBS"
echo "  Log dir:   $LOG_DIR"
echo

running_jobs() {
  jobs -rp | wc -l
}

for ((run_index = 1; run_index <= COUNT; run_index++)); do
  while [[ "$(running_jobs)" -ge "$JOBS" ]]; do
    if ! wait -n 2>/dev/null; then
      wait || true
    fi
  done

  (
    payload_file="${LOG_DIR}/payload-${run_index}.json"
    log_file="${LOG_DIR}/run-${run_index}.log"
    status_file="${LOG_DIR}/run-${run_index}.status"

    if RUNTIME_PAYLOAD_FILE="$payload_file" bash "$INSERT_SCRIPT" >"$log_file" 2>&1; then
      echo "ok" >"$status_file"
    else
      echo "fail" >"$status_file"
      exit 1
    fi
  ) &
done

while [[ "$(running_jobs)" -gt 0 ]]; do
  if ! wait -n 2>/dev/null; then
    wait || true
  fi
done

success_count=0
fail_count=0

for ((run_index = 1; run_index <= COUNT; run_index++)); do
  status_file="${LOG_DIR}/run-${run_index}.status"
  if [[ -f "$status_file" ]] && [[ "$(cat "$status_file")" == "ok" ]]; then
    success_count=$((success_count + 1))
  else
    fail_count=$((fail_count + 1))
    echo "FAILED run ${run_index} — see ${LOG_DIR}/run-${run_index}.log"
  fi
done

echo
echo "Finished: ${success_count}/${COUNT} succeeded, ${fail_count} failed"
echo "Logs: ${LOG_DIR}"

if [[ "$fail_count" -gt 0 ]]; then
  exit 1
fi
