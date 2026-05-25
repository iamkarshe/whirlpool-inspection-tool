#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

if ! command -v zip >/dev/null 2>&1; then
  echo "error: zip is not installed" >&2
  exit 1
fi

# ZIP_NAME="deploy-$(date +%Y%m%d-%H%M%S).zip"
ZIP_NAME="www.zip"

zip -r -q "$ZIP_NAME" \
  mod \
  template \
  utils \
  main.py \
  pyproject.toml \
  requirements.txt \
  -x "*.DS_Store" "__MACOSX/*"

echo "Created: $SCRIPT_DIR/$ZIP_NAME"
