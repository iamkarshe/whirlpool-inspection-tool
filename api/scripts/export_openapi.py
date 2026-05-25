#!/usr/bin/env python3
"""Write FastAPI OpenAPI schema to ui/openapi.json for Orval code generation."""

import json
import sys
from pathlib import Path

API_ROOT = Path(__file__).resolve().parents[1]
UI_OPENAPI = API_ROOT.parent / "ui" / "openapi.json"


def main() -> int:
    sys.path.insert(0, str(API_ROOT))
    from main import app  # noqa: PLC0415

    schema = app.openapi()
    UI_OPENAPI.parent.mkdir(parents=True, exist_ok=True)
    UI_OPENAPI.write_text(
        json.dumps(schema, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    print(f"Wrote {UI_OPENAPI}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
