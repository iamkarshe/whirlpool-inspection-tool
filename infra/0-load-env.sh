#!/usr/bin/env bash

# Simple loader: pull values from .env and do basic tool checks.
# .env is the single source of truth.

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$SCRIPT_DIR/.env"

if [ -f "$ENV_FILE" ]; then
  set -a
  # shellcheck disable=SC1090
  . "$ENV_FILE"
  set +a
fi

# Basic prechecks
command -v aws >/dev/null 2>&1 || { echo "aws CLI not found in PATH" >&2; exit 1; }
command -v pulumi >/dev/null 2>&1 || { echo "pulumi CLI not found in PATH" >&2; exit 1; }

# Ensure required variables are present (from .env)
: "${AWS_PROFILE:?AWS_PROFILE must be set in .env}"
: "${AWS_REGION:?AWS_REGION must be set in .env}"
: "${STATE_BUCKET:?STATE_BUCKET must be set in .env}"

export AWS_PROFILE AWS_REGION STATE_BUCKET