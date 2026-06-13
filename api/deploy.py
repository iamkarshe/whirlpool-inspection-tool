#!/usr/bin/env python3
"""Pseudo-CI/CD deploy: build ui, zip assets, upload, extract; then api + hooks.

Reads deploy-sites.json (copy from deploy-sites.example.json).

Usage:
  python3 deploy.py --list
  python3 deploy.py --site scopt-direct
  python3 deploy.py --site client-vpn --dry-run
  python3 deploy.py --site scopt-direct --api-only
"""

from __future__ import annotations

import argparse
import json
import os
import shlex
import shutil
import subprocess
import sys
import tempfile
import zipfile
from pathlib import Path
from typing import Any

SCRIPT_DIR = Path(__file__).resolve().parent
DEFAULT_CONFIG = SCRIPT_DIR / "deploy-sites.json"
EXAMPLE_CONFIG = SCRIPT_DIR / "deploy-sites.example.json"

API_ZIP_NAME = "api.zip"
UI_ZIP_NAME = "ui.zip"
UI_BUILD_COMMAND = ["pnpm", "build"]


class DeployError(Exception):
    pass


def load_config(path: Path) -> dict[str, Any]:
    if not path.is_file():
        hint = f"Copy {EXAMPLE_CONFIG.name} to {path.name} and edit your sites."
        raise DeployError(f"Config not found: {path}\n{hint}")
    with path.open(encoding="utf-8") as handle:
        return json.load(handle)


def asset_paths(config: dict[str, Any], kind: str) -> list[str]:
    assets = config.get("assets", {}).get(kind)
    if not isinstance(assets, list) or not assets:
        raise DeployError(f"config.assets.{kind} must be a non-empty list")
    return [str(item) for item in assets]


def resolve_path(value: str, *, base: Path) -> Path:
    expanded = os.path.expanduser(value)
    path = Path(expanded)
    if not path.is_absolute():
        path = (base / path).resolve()
    return path


def require_tool(name: str) -> None:
    if shutil.which(name) is None:
        raise DeployError(f"Required command not found on PATH: {name}")


def resolve_password(ssh: dict[str, Any]) -> str:
    if plain := ssh.get("password"):
        return str(plain)
    if env_name := ssh.get("password_env"):
        value = os.environ.get(str(env_name))
        if not value:
            raise DeployError(f"Missing environment variable: {env_name}")
        return value
    if file_path := ssh.get("password_file"):
        path = Path(os.path.expanduser(str(file_path)))
        if not path.is_file():
            raise DeployError(f"Password file not found: {path}")
        return path.read_text(encoding="utf-8").strip()
    raise DeployError("auth=password requires password, password_env, or password_file")


def validate_ssh_auth(ssh: dict[str, Any], *, label: str) -> None:
    auth = str(ssh.get("auth", "key"))
    if auth == "key":
        if not ssh.get("key"):
            raise DeployError(f"{label}: auth=key requires key")
        return
    if auth == "password":
        if not ssh.get("password") and not ssh.get("password_env") and not ssh.get("password_file"):
            raise DeployError(f"{label}: auth=password requires password, password_env, or password_file")
        return
    raise DeployError(f"{label}: unsupported auth type: {auth}")


def ssh_transport_options(ssh: dict[str, Any]) -> list[str]:
    args: list[str] = ["-o", "StrictHostKeyChecking=accept-new"]

    auth = str(ssh.get("auth", "key"))
    if auth == "key":
        args.extend(["-i", os.path.expanduser(str(ssh["key"]))])

    port = int(ssh.get("port") or 22)
    if port != 22:
        args.extend(["-p", str(port)])

    jump = ssh.get("jump")
    if isinstance(jump, dict):
        validate_ssh_auth(jump, label="ssh.jump")
        jump_user = str(jump["user"])
        jump_host = str(jump["host"])
        jump_port = int(jump.get("port") or 22)

        if str(jump.get("auth", "key")) == "key":
            jump_ssh = [
                "ssh",
                "-i",
                os.path.expanduser(str(jump["key"])),
                "-o",
                "StrictHostKeyChecking=accept-new",
            ]
            if jump_port != 22:
                jump_ssh.extend(["-p", str(jump_port)])
            jump_ssh.extend(["-W", "%h:%p", f"{jump_user}@{jump_host}"])
            proxy_command = " ".join(shlex.quote(part) for part in jump_ssh)
            args.extend(["-o", f"ProxyCommand={proxy_command}"])
        else:
            jump_password = resolve_password(jump)
            jump_ssh = [
                "sshpass",
                "-e",
                "ssh",
                "-o",
                "StrictHostKeyChecking=accept-new",
            ]
            if jump_port != 22:
                jump_ssh.extend(["-p", str(jump_port)])
            jump_ssh.extend(["-W", "%h:%p", f"{jump_user}@{jump_host}"])
            proxy_command = "SSHPASS=" + shlex.quote(jump_password) + " " + " ".join(
                shlex.quote(part) for part in jump_ssh
            )
            args.extend(["-o", f"ProxyCommand={proxy_command}"])

    return args


def ssh_target(ssh: dict[str, Any]) -> str:
    return f"{ssh['user']}@{ssh['host']}"


def auth_wrapper(ssh: dict[str, Any]) -> tuple[list[str], dict[str, str]]:
    auth = str(ssh.get("auth", "key"))
    if auth == "password":
        require_tool("sshpass")
        return ["sshpass", "-e"], {"SSHPASS": resolve_password(ssh)}
    return [], {}


def run_local(
    command: list[str],
    *,
    cwd: Path | None = None,
    env: dict[str, str] | None = None,
    dry_run: bool = False,
    label: str = "",
) -> None:
    display = label or " ".join(shlex.quote(part) for part in command)
    print(display)
    if dry_run:
        return
    merged_env = os.environ.copy()
    if env:
        merged_env.update(env)
    subprocess.run(command, cwd=cwd, env=merged_env, check=True)


def ssh_run(
    ssh: dict[str, Any],
    remote_command: str,
    *,
    dry_run: bool = False,
) -> None:
    prefix, env = auth_wrapper(ssh)
    command = [*prefix, "ssh", *ssh_transport_options(ssh), ssh_target(ssh), remote_command]
    run_local(command, env=env, dry_run=dry_run)


def scp_upload(
    ssh: dict[str, Any],
    local_path: Path,
    remote_path: str,
    *,
    dry_run: bool = False,
) -> None:
    prefix, env = auth_wrapper(ssh)
    command = [
        *prefix,
        "scp",
        *ssh_transport_options(ssh),
        str(local_path),
        f"{ssh_target(ssh)}:{remote_path}",
    ]
    run_local(command, env=env, dry_run=dry_run)


def build_ui(ui_dir: Path, *, dry_run: bool) -> None:
    if not shutil.which(UI_BUILD_COMMAND[0]):
        raise DeployError(f"UI build tool not found: {UI_BUILD_COMMAND[0]}")
    run_local(
        UI_BUILD_COMMAND,
        cwd=ui_dir,
        dry_run=dry_run,
        label=f"{' '.join(UI_BUILD_COMMAND)}",
    )


def package_assets(
    source_dir: Path,
    assets: list[str],
    zip_path: Path,
    *,
    flatten_dirs: set[str] | None = None,
    dry_run: bool = False,
) -> None:
    flatten_dirs = flatten_dirs or set()
    missing = [asset for asset in assets if not (source_dir / asset).exists()]
    if missing:
        if dry_run:
            print(f"missing assets (dry-run): {', '.join(missing)}")
            return
        raise DeployError(f"Missing assets under {source_dir}: {', '.join(missing)}")

    flattened = [asset for asset in assets if asset in flatten_dirs]
    label = f"zip {zip_path.name} <- {', '.join(assets)}"
    if flattened:
        label += f" (contents of {', '.join(flattened)})"
    print(label)
    if dry_run:
        return

    with zipfile.ZipFile(zip_path, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        for asset in assets:
            path = source_dir / asset
            if path.is_file():
                archive.write(path, arcname=path.relative_to(source_dir).as_posix())
                continue

            for file_path in sorted(path.rglob("*")):
                if not file_path.is_file():
                    continue
                if asset in flatten_dirs:
                    arcname = file_path.relative_to(path).as_posix()
                else:
                    arcname = file_path.relative_to(source_dir).as_posix()
                archive.write(file_path, arcname=arcname)


def ui_flatten_dirs(source_dir: Path, assets: list[str]) -> set[str]:
    """Pack directory assets by their contents (local dist/ -> index.html at zip root)."""
    return {asset for asset in assets if (source_dir / asset).is_dir()}


def remote_shell(script_lines: list[str]) -> str:
    return "set -euo pipefail\n" + "\n".join(script_lines)


def deploy_zip(
    site: dict[str, Any],
    local_zip: Path,
    zip_name: str,
    remote_dir: str,
    *,
    after_extract: list[str] | None = None,
    clean_before_extract: bool = False,
    dry_run: bool,
) -> None:
    ssh = site["ssh"]
    staging_dir = str(site["remote"]["staging_dir"])
    remote_zip = f"{staging_dir}/{zip_name}"

    ssh_run(ssh, f"mkdir -p {shlex.quote(staging_dir)}", dry_run=dry_run)
    scp_upload(ssh, local_zip, remote_zip, dry_run=dry_run)

    extract_steps = [f"mkdir -p {shlex.quote(remote_dir)}"]
    if clean_before_extract:
        extract_steps.append(f"rm -rf {shlex.quote(remote_dir)}/*")
    extract_steps.extend(
        [
            f"cd {shlex.quote(remote_dir)}",
            f"unzip -o {shlex.quote(remote_zip)}",
        ]
    )
    ssh_run(ssh, remote_shell(extract_steps), dry_run=dry_run)

    if after_extract:
        hook_script = remote_shell([f"cd {shlex.quote(remote_dir)}", *after_extract])
        ssh_run(ssh, hook_script, dry_run=dry_run)


def find_site(config: dict[str, Any], site_id: str) -> dict[str, Any]:
    for site in config.get("sites", []):
        if site.get("id") == site_id:
            return site
    known = ", ".join(site.get("id", "?") for site in config.get("sites", []))
    raise DeployError(f"Unknown site id: {site_id}. Known sites: {known or '(none)'}")


def deploy_site(
    config: dict[str, Any],
    site: dict[str, Any],
    *,
    deploy_api_flag: bool,
    deploy_ui_flag: bool,
    dry_run: bool,
) -> None:
    if not site.get("enabled", True):
        raise DeployError(f"Site is disabled: {site.get('id')}")

    ssh = site.get("ssh")
    if not isinstance(ssh, dict):
        raise DeployError(f"Site {site.get('id')} missing ssh block")
    validate_ssh_auth(ssh, label=f"site {site.get('id')}")

    if not deploy_api_flag and not deploy_ui_flag:
        raise DeployError("Nothing selected to deploy (api/ui both off)")

    api_source = resolve_path(str(site.get("api", ".")), base=SCRIPT_DIR)
    ui_source = resolve_path(str(site.get("ui", "../ui")), base=SCRIPT_DIR)
    api_assets = asset_paths(config, "api")
    ui_assets = asset_paths(config, "ui")

    with tempfile.TemporaryDirectory(prefix="whirlpool-deploy-") as temp_dir:
        temp_path = Path(temp_dir)

        if deploy_ui_flag:
            build_ui(ui_source, dry_run=dry_run)

            ui_zip = temp_path / UI_ZIP_NAME
            ui_dir = str(site["remote"]["ui_dir"])
            package_assets(
                ui_source,
                ui_assets,
                ui_zip,
                flatten_dirs=ui_flatten_dirs(ui_source, ui_assets),
                dry_run=dry_run,
            )
            if dry_run or ui_zip.is_file():
                deploy_zip(
                    site,
                    ui_zip,
                    UI_ZIP_NAME,
                    ui_dir,
                    clean_before_extract=True,
                    dry_run=dry_run,
                )

        if deploy_api_flag:
            api_zip = temp_path / API_ZIP_NAME
            package_assets(api_source, api_assets, api_zip, dry_run=dry_run)
            if dry_run or api_zip.is_file():
                deploy_zip(
                    site,
                    api_zip,
                    API_ZIP_NAME,
                    str(site["remote"]["api_dir"]),
                    after_extract=site.get("after_api_extract") or [],
                    dry_run=dry_run,
                )


def list_sites(config: dict[str, Any]) -> None:
    for site in config.get("sites", []):
        enabled = "enabled" if site.get("enabled", True) else "disabled"
        ssh = site.get("ssh", {})
        host = ssh.get("host", "?")
        print(f"{site.get('id')}\t{host}\t{enabled}")


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Deploy api + ui to configured sites.")
    parser.add_argument(
        "--config",
        type=Path,
        default=DEFAULT_CONFIG,
        help=f"Path to deploy config (default: {DEFAULT_CONFIG.name})",
    )
    parser.add_argument("--site", help="Site id from deploy-sites.json")
    parser.add_argument("--list", action="store_true", help="List configured sites")
    parser.add_argument("--dry-run", action="store_true", help="Print steps without executing")
    parser.add_argument("--api-only", action="store_true", help="Deploy backend only")
    parser.add_argument("--ui-only", action="store_true", help="Deploy frontend only")
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv or sys.argv[1:])

    try:
        config = load_config(args.config.resolve())
    except DeployError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 1

    if args.list:
        list_sites(config)
        return 0

    if not args.site:
        print("error: --site is required (or use --list)", file=sys.stderr)
        return 1

    if args.api_only and args.ui_only:
        print("error: --api-only and --ui-only cannot be used together", file=sys.stderr)
        return 1

    if not args.dry_run:
        for tool in ("ssh", "scp", "unzip"):
            require_tool(tool)

    try:
        site = find_site(config, args.site)
        deploy_site(
            config,
            site,
            deploy_api_flag=not args.ui_only,
            deploy_ui_flag=not args.api_only,
            dry_run=args.dry_run,
        )
    except DeployError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 1
    except subprocess.CalledProcessError as exc:
        print(f"error: command failed with exit code {exc.returncode}", file=sys.stderr)
        return exc.returncode or 1

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
