#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
VERSION="$(tr -d '[:space:]' < "$ROOT/VERSION")"
LDFLAGS="-s -w -X main.version=${VERSION}"

CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -trimpath -ldflags="${LDFLAGS}" -o vpn-provisioner ./cmd/api
echo "built vpn-provisioner version=${VERSION}"

echo "Copy migrations and make sure you have data folder created"

echo "Make sure do sudo +x vpn-provisioner else it will not run"