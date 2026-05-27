#!/usr/bin/env bash
set -euo pipefail

WITH_TESTS=0
WITH_DOCKER_UP=0

usage() {
  cat <<'EOF'
Usage: ./prechecks.sh [--with-tests] [--with-docker-up]

Checks local prerequisites to run vpn-provisioner:
  - Go toolchain present
  - Docker daemon reachable
  - docker compose available
  - .env exists and required variables set
  - data/ and wireguard-mock-data/ writable
  - migrations present

Optional:
  --with-tests       run: go test ./...
  --with-docker-up   run: docker compose up -d --build wireguard-mock
EOF
}

if [[ "$#" -gt 0 ]]; then
  for arg in "$@"; do
    case "$arg" in
      --with-tests) WITH_TESTS=1 ;;
      --with-docker-up) WITH_DOCKER_UP=1 ;;
      -h|--help) usage; exit 0 ;;
      *) echo "Unknown arg: $arg" >&2; usage; exit 2 ;;
    esac
  done
fi

ok() { printf 'OK   %s\n' "$*"; }
warn() { printf 'WARN %s\n' "$*" >&2; }
fail() { printf 'FAIL %s\n' "$*" >&2; exit 1; }

need_cmd() {
  command -v "$1" >/dev/null 2>&1 || fail "Missing command: $1"
}

in_repo_root() {
  [[ -f "go.mod" ]] || fail "Run from repo root (go.mod not found)."
}

check_go() {
  need_cmd go
  local ver
  ver="$(go version 2>/dev/null || true)"
  [[ -n "$ver" ]] || fail "Go not working"
  ok "$ver"
}

check_docker() {
  need_cmd docker
  if ! docker info >/dev/null 2>&1; then
    fail "Docker daemon not reachable. Start Docker and retry."
  fi
  ok "docker daemon reachable"
}

check_compose() {
  if docker compose version >/dev/null 2>&1; then
    ok "docker compose available"
    return 0
  fi
  if command -v docker-compose >/dev/null 2>&1; then
    ok "docker-compose available"
    return 0
  fi
  fail "Missing docker compose. Install Docker Compose v2 (docker compose) or docker-compose."
}

check_files() {
  [[ -f ".env" ]] || warn "No .env found. Create one (copy from .env.example)."
  [[ -f ".env.example" ]] || warn "No .env.example found."

  [[ -d "migrations" ]] || fail "migrations/ directory missing"
  [[ -f "migrations/001_create_devices.sql" ]] || fail "Missing migrations/001_create_devices.sql"
  [[ -f "migrations/002_create_audit_logs.sql" ]] || fail "Missing migrations/002_create_audit_logs.sql"
  ok "migrations present"

  mkdir -p data wireguard-mock-data
  [[ -w data ]] || fail "data/ is not writable"
  [[ -w wireguard-mock-data ]] || fail "wireguard-mock-data/ is not writable"
  ok "data dirs writable"
}

load_env() {
  if [[ ! -f ".env" ]]; then
    return 0
  fi
  set -a
  # shellcheck disable=SC1091
  source ".env"
  set +a
}

require_env() {
  local k="$1"
  local v="${!k:-}"
  [[ -n "${v// /}" ]] || fail "Missing required env var: $k (set it in .env)"
}

check_env() {
  load_env
  require_env APP_ADMIN_API_KEY
  require_env WG_SERVER_ENDPOINT
  require_env WG_BACKEND
  require_env WG_INTERFACE
  require_env WG_DOCKER_CONTAINER
  require_env APP_DB_PATH
  ok ".env required variables present"
}

check_compiles() {
  if ! go test ./... >/dev/null 2>&1; then
    warn "go test ./... currently fails (run with --with-tests to see output)."
  else
    ok "go test ./... passes"
  fi
}

docker_up_mock() {
  if [[ ! -f "docker-compose.yml" ]]; then
    fail "docker-compose.yml missing (WireGuard mock not set up yet)."
  fi

  if docker compose version >/dev/null 2>&1; then
    docker compose up -d --build wireguard-mock
  else
    docker-compose up -d --build wireguard-mock
  fi

ok "wireguard-mock started"
}

main() {
  in_repo_root
  check_go
  check_docker
  check_compose
  check_files
  check_env
  check_compiles

  if [[ "$WITH_TESTS" -eq 1 ]]; then
    go test ./...
  fi

  if [[ "$WITH_DOCKER_UP" -eq 1 ]]; then
    docker_up_mock
  fi

  cat <<'EOF'

Next steps:
  - Start WireGuard mock: docker compose up --build wireguard-mock
  - Run API:             go run ./cmd/api
  - Or with hot reload:  air
EOF
}

main

