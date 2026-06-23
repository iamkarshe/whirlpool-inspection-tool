#!/usr/bin/env python3
"""Load scripts/psql/config.toml and print shell exports."""

from __future__ import annotations

import os
import shlex
import sys


def load_toml(path: str) -> dict:
    try:
        import tomllib
    except ImportError:
        import tomli as tomllib

    with open(path, "rb") as f:
        return tomllib.load(f)


def export_db(prefix: str, db: dict, ssh: dict | None, default_host: str, default_port: int) -> dict[str, str]:
    ssh = ssh or {}
    return {
        f"{prefix}_HOST": db["host"],
        f"{prefix}_PORT": str(db["port"]),
        f"{prefix}_USER": db["user"],
        f"{prefix}_PASS": db["password"],
        f"{prefix}_DB": db["database"],
        f"{prefix}_SSH_ENABLED": str(bool(ssh.get("enabled", False))).lower(),
        f"{prefix}_SSH_HOST": ssh.get("host", ""),
        f"{prefix}_SSH_USER": ssh.get("user", ""),
        f"{prefix}_SSH_PORT": str(ssh.get("port", 22)),
        f"{prefix}_SSH_IDENTITY_FILE": ssh.get("identity_file", ""),
        f"{prefix}_SSH_LOCAL_PORT": str(ssh.get("local_port", "")),
        f"{prefix}_SSH_REMOTE_HOST": ssh.get("remote_host", default_host),
        f"{prefix}_SSH_REMOTE_PORT": str(ssh.get("remote_port", default_port)),
    }


def main() -> None:
    default_path = os.path.join(os.path.dirname(__file__), "config.toml")
    path = sys.argv[1] if len(sys.argv) > 1 else default_path

    if not os.path.isfile(path):
        print(f"config file not found: {path}", file=sys.stderr)
        sys.exit(1)

    cfg = load_toml(path)
    source = cfg["source"]
    target = cfg["target"]

    exports = {}
    exports.update(export_db("SRC", source, source.get("ssh"), source["host"], source["port"]))
    exports.update(export_db("TGT", target, target.get("ssh"), target["host"], target["port"]))

    for key, value in exports.items():
        print(f"export {key}={shlex.quote(str(value))}")


if __name__ == "__main__":
    main()
