#!/usr/bin/env python3
"""Pseudo-CI/CD deploy

Usage:
  python3 deploy.py --all
  python3 deploy.py --list
  python3 deploy.py --site scopt-direct
  python3 deploy.py --site client-vpn --dry-run
  python3 deploy.py --site scopt-direct --api-only
"""

from __future__ import annotations

import argparse
import json
import os
import re
import shlex
import shutil
import subprocess
import sys
import tempfile
import zipfile
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass
from pathlib import Path
from typing import Any

SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parent
RELEASE_JSON_PATH = SCRIPT_DIR / "release.json"
DEFAULT_CONFIG = SCRIPT_DIR / "deploy-sites.json"
EXAMPLE_CONFIG = SCRIPT_DIR / "deploy-sites.example.json"

API_ZIP_NAME = "api.zip"
UI_ZIP_NAME = "ui.zip"
UI_BUILD_COMMAND = ["pnpm", "build"]

COMMIT_TYPE_PATTERN = re.compile(
    r"^\[(feature|fix|update|improvement|chore)\]\s*", re.IGNORECASE
)
COMMIT_TYPE_MAP = {
    "feature": "feature",
    "fix": "fix",
    "update": "improvement",
    "improvement": "improvement",
    "chore": "chore",
}


@dataclass(frozen=True)
class GitCommit:
    full_hash: str
    short_hash: str
    committed_on: str
    subject: str


@dataclass(frozen=True)
class SiteArtifacts:
    site_id: str
    ui_zip: Path | None
    api_zip: Path | None


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


def parse_commit_feature(subject: str) -> tuple[str, str | None]:
    match = COMMIT_TYPE_PATTERN.match(subject.strip())
    if not match:
        return subject.strip(), None
    commit_type = COMMIT_TYPE_MAP.get(match.group(1).lower())
    text = subject[match.end() :].strip()
    return text or subject.strip(), commit_type


def run_git_log(repo_root: Path, *, since: str | None = None) -> list[GitCommit]:
    command = [
        "git",
        "log",
        "--format=%H%x00%h%x00%ad%x00%s",
        "--date=short",
    ]
    if since:
        command.append(f"{since}..HEAD")
    result = subprocess.run(
        command,
        cwd=repo_root,
        check=True,
        capture_output=True,
        text=True,
    )
    commits: list[GitCommit] = []
    for line in result.stdout.splitlines():
        if not line.strip():
            continue
        full_hash, short_hash, committed_on, subject = line.split("\0", 3)
        commits.append(
            GitCommit(
                full_hash=full_hash,
                short_hash=short_hash,
                committed_on=committed_on,
                subject=subject,
            )
        )
    return commits


def git_head_hash(repo_root: Path) -> str:
    result = subprocess.run(
        ["git", "rev-parse", "HEAD"],
        cwd=repo_root,
        check=True,
        capture_output=True,
        text=True,
    )
    return result.stdout.strip()


def load_release_document(path: Path) -> dict[str, Any]:
    if not path.is_file():
        return {"notes": []}
    raw_text = path.read_text(encoding="utf-8").strip()
    if not raw_text:
        return {"notes": []}
    payload = json.loads(raw_text)
    if not isinstance(payload, dict):
        raise DeployError(f"{path.name} must be a JSON object")
    payload.setdefault("notes", [])
    if not isinstance(payload["notes"], list):
        raise DeployError(f"{path.name} notes must be a list")
    return payload


def collect_known_hashes(notes: list[Any]) -> set[str]:
    known: set[str] = set()
    for note in notes:
        if not isinstance(note, dict):
            continue
        for feature in note.get("features") or []:
            if not isinstance(feature, dict):
                continue
            commit_hash = feature.get("hash")
            if commit_hash:
                known.add(str(commit_hash))
    return known


def newest_released_at(notes: list[Any]) -> str | None:
    dates = [
        str(note.get("released_at"))
        for note in notes
        if isinstance(note, dict) and note.get("released_at")
    ]
    return max(dates) if dates else None


def select_new_commits(
    commits: list[GitCommit],
    *,
    known_hashes: set[str],
    cutoff_date: str | None,
) -> list[GitCommit]:
    selected: list[GitCommit] = []
    for commit in commits:
        if commit.short_hash in known_hashes or commit.full_hash in known_hashes:
            continue
        if cutoff_date and commit.committed_on <= cutoff_date:
            continue
        selected.append(commit)
    selected.reverse()
    return selected


def group_commits_by_date(
    commits: list[GitCommit],
) -> list[tuple[str, list[GitCommit]]]:
    grouped: dict[str, list[GitCommit]] = {}
    for commit in commits:
        grouped.setdefault(commit.committed_on, []).append(commit)
    return sorted(grouped.items(), key=lambda item: item[0], reverse=True)


def build_feature_entry(commit: GitCommit) -> dict[str, Any]:
    text, feature_type = parse_commit_feature(commit.subject)
    entry: dict[str, Any] = {
        "text": text,
        "hash": commit.short_hash,
    }
    if feature_type:
        entry["type"] = feature_type
    return entry


def find_note_index(notes: list[Any], released_on: str) -> int | None:
    for index, note in enumerate(notes):
        if isinstance(note, dict) and str(note.get("released_at")) == released_on:
            return index
    return None


def append_commits_to_note(note: dict[str, Any], commits: list[GitCommit]) -> None:
    features = note.setdefault("features", [])
    if not isinstance(features, list):
        raise DeployError("release note features must be a list")
    existing_hashes = {
        str(item.get("hash"))
        for item in features
        if isinstance(item, dict) and item.get("hash")
    }
    for commit in commits:
        if commit.short_hash in existing_hashes:
            continue
        features.append(build_feature_entry(commit))
        existing_hashes.add(commit.short_hash)


def build_date_note(released_on: str, commits: list[GitCommit]) -> dict[str, Any]:
    return {
        "id": released_on,
        "version": released_on,
        "released_at": released_on,
        "title": f"Deploy {released_on}",
        "features": [build_feature_entry(commit) for commit in commits],
    }


def merge_release_notes(
    notes: list[Any], grouped_commits: list[tuple[str, list[GitCommit]]]
) -> list[Any]:
    merged = [note for note in notes if isinstance(note, dict)]
    for released_on, commits in grouped_commits:
        note_index = find_note_index(merged, released_on)
        if note_index is None:
            merged.insert(0, build_date_note(released_on, commits))
            continue
        append_commits_to_note(merged[note_index], commits)
    merged.sort(key=lambda note: str(note.get("released_at", "")), reverse=True)
    return merged


def write_release_document(path: Path, payload: dict[str, Any]) -> None:
    path.write_text(
        json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )


def release_commit_short(*, dry_run: bool = False) -> str:
    payload = load_release_document(RELEASE_JSON_PATH)
    last_commit = payload.get("last_commit")
    if last_commit:
        return str(last_commit)[:7]
    if dry_run:
        return "0000000"
    return git_head_hash(REPO_ROOT)[:7]


def site_api_base_url(site: dict[str, Any]) -> str:
    api_base_url = site.get("api_base_url")
    if not api_base_url:
        raise DeployError(
            f"Site {site.get('id')} missing api_base_url "
            "(public HTTPS URL for VITE_API_BASE_URL, not the SSH host/IP)"
        )
    return str(api_base_url).strip().rstrip("/")


def build_app_build(
    config: dict[str, Any], site: dict[str, Any], *, dry_run: bool
) -> str:
    mode = site.get("mode")
    if not mode:
        raise DeployError(f"Site {site.get('id')} missing mode (e.g. uat, prod)")
    major = str(config.get("major_version", "0")).strip()
    minor = str(config.get("minor_version", "0")).strip()
    commit = release_commit_short(dry_run=dry_run)
    return f"{major}.{minor}.{commit}-{mode}"


def update_dotenv_file(path: Path, updates: dict[str, str], *, dry_run: bool) -> None:
    if not path.is_file():
        raise DeployError(f"UI env file not found: {path}")

    lines = path.read_text(encoding="utf-8").splitlines()
    remaining = dict(updates)
    output: list[str] = []

    for line in lines:
        if not line or line.lstrip().startswith("#") or "=" not in line:
            output.append(line)
            continue
        key, _, value = line.partition("=")
        if key in remaining:
            output.append(f"{key}={remaining.pop(key)}")
        else:
            output.append(f"{key}={value}")

    for key, value in remaining.items():
        output.append(f"{key}={value}")

    content = "\n".join(output).rstrip() + "\n"
    print(
        f"update {path.name}: "
        + ", ".join(f"{key}={value}" for key, value in updates.items())
    )
    if dry_run:
        return
    path.write_text(content, encoding="utf-8")


def prepare_ui_production_env(
    ui_dir: Path,
    config: dict[str, Any],
    site: dict[str, Any],
    *,
    dry_run: bool,
) -> None:
    env_path = ui_dir / ".env.production"
    updates = {
        "VITE_API_BASE_URL": site_api_base_url(site),
        "VITE_APP_BUILD": build_app_build(config, site, dry_run=dry_run),
    }
    update_dotenv_file(env_path, updates, dry_run=dry_run)


def cleanup_ui_dist(ui_dir: Path, *, dry_run: bool) -> None:
    dist_dir = ui_dir / "dist"
    if not dist_dir.exists():
        return
    print(f"cleanup remove {dist_dir}")
    if dry_run:
        return
    shutil.rmtree(dist_dir)


def update_release_json(*, dry_run: bool = False) -> None:
    if not shutil.which("git"):
        raise DeployError("git is required to update release.json")
    if not (REPO_ROOT / ".git").is_dir():
        raise DeployError(f"Git repository not found at {REPO_ROOT}")

    payload = load_release_document(RELEASE_JSON_PATH)
    notes = payload["notes"]
    known_hashes = collect_known_hashes(notes)
    last_commit = payload.get("last_commit")
    since = str(last_commit) if last_commit else None

    commits = run_git_log(REPO_ROOT, since=since)
    cutoff_date = None
    if not since and not known_hashes:
        cutoff_date = newest_released_at(notes)

    new_commits = select_new_commits(
        commits,
        known_hashes=known_hashes,
        cutoff_date=cutoff_date,
    )
    if not new_commits:
        print("release.json: no new commits to append")
        return

    grouped = group_commits_by_date(new_commits)
    payload["notes"] = merge_release_notes(notes, grouped)
    payload["last_commit"] = git_head_hash(REPO_ROOT)

    added = len(new_commits)
    dates = ", ".join(released_on for released_on, _ in grouped)
    print(f"release.json: append {added} commit(s) grouped by date [{dates}]")
    if dry_run:
        return

    write_release_document(RELEASE_JSON_PATH, payload)


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
        if (
            not ssh.get("password")
            and not ssh.get("password_env")
            and not ssh.get("password_file")
        ):
            raise DeployError(
                f"{label}: auth=password requires password, password_env, or password_file"
            )
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
            proxy_command = (
                "SSHPASS="
                + shlex.quote(jump_password)
                + " "
                + " ".join(shlex.quote(part) for part in jump_ssh)
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
    command = [
        *prefix,
        "ssh",
        *ssh_transport_options(ssh),
        ssh_target(ssh),
        remote_command,
    ]
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


def enabled_sites(config: dict[str, Any]) -> list[dict[str, Any]]:
    return [site for site in config.get("sites", []) if site.get("enabled", True)]


def validate_site(site: dict[str, Any]) -> None:
    if not site.get("enabled", True):
        raise DeployError(f"Site is disabled: {site.get('id')}")
    ssh = site.get("ssh")
    if not isinstance(ssh, dict):
        raise DeployError(f"Site {site.get('id')} missing ssh block")
    validate_ssh_auth(ssh, label=f"site {site.get('id')}")


def prepare_api_zip(
    config: dict[str, Any],
    api_source: Path,
    zip_path: Path,
    *,
    dry_run: bool,
) -> None:
    api_assets = asset_paths(config, "api")
    package_assets(api_source, api_assets, zip_path, dry_run=dry_run)


def prepare_ui_zip(
    config: dict[str, Any],
    site: dict[str, Any],
    ui_source: Path,
    zip_path: Path,
    *,
    dry_run: bool,
) -> None:
    ui_assets = asset_paths(config, "ui")
    prepare_ui_production_env(ui_source, config, site, dry_run=dry_run)
    build_ui(ui_source, dry_run=dry_run)
    package_assets(
        ui_source,
        ui_assets,
        zip_path,
        flatten_dirs=ui_flatten_dirs(ui_source, ui_assets),
        dry_run=dry_run,
    )
    cleanup_ui_dist(ui_source, dry_run=dry_run)


def upload_site_artifacts(
    site: dict[str, Any],
    artifacts: SiteArtifacts,
    *,
    deploy_api_flag: bool,
    deploy_ui_flag: bool,
    dry_run: bool,
) -> None:
    site_id = str(site.get("id"))
    print(f"[{site_id}] upload start")

    if deploy_ui_flag and artifacts.ui_zip is not None:
        if dry_run or artifacts.ui_zip.is_file():
            deploy_zip(
                site,
                artifacts.ui_zip,
                UI_ZIP_NAME,
                str(site["remote"]["ui_dir"]),
                clean_before_extract=True,
                dry_run=dry_run,
            )

    if deploy_api_flag and artifacts.api_zip is not None:
        if dry_run or artifacts.api_zip.is_file():
            deploy_zip(
                site,
                artifacts.api_zip,
                API_ZIP_NAME,
                str(site["remote"]["api_dir"]),
                after_extract=site.get("after_api_extract") or [],
                dry_run=dry_run,
            )

    print(f"[{site_id}] upload done")


def prepare_site_artifacts(
    config: dict[str, Any],
    site: dict[str, Any],
    *,
    temp_path: Path,
    shared_api_zip: Path | None,
    deploy_api_flag: bool,
    deploy_ui_flag: bool,
    dry_run: bool,
) -> SiteArtifacts:
    site_id = str(site["id"])
    api_source = resolve_path(str(site.get("api", ".")), base=SCRIPT_DIR)
    ui_source = resolve_path(str(site.get("ui", "../ui")), base=SCRIPT_DIR)

    ui_zip: Path | None = None
    api_zip: Path | None = None

    if deploy_ui_flag:
        ui_zip = temp_path / f"{site_id}-{UI_ZIP_NAME}"
        print(f"[{site_id}] prepare ui")
        prepare_ui_zip(config, site, ui_source, ui_zip, dry_run=dry_run)

    if deploy_api_flag:
        if shared_api_zip is not None:
            api_zip = shared_api_zip
        else:
            api_zip = temp_path / f"{site_id}-{API_ZIP_NAME}"
            print(f"[{site_id}] prepare api")
            prepare_api_zip(config, api_source, api_zip, dry_run=dry_run)

    return SiteArtifacts(site_id=site_id, ui_zip=ui_zip, api_zip=api_zip)


def deploy_site(
    config: dict[str, Any],
    site: dict[str, Any],
    *,
    deploy_api_flag: bool,
    deploy_ui_flag: bool,
    dry_run: bool,
) -> None:
    validate_site(site)

    if not deploy_api_flag and not deploy_ui_flag:
        raise DeployError("Nothing selected to deploy (api/ui both off)")

    if deploy_api_flag or deploy_ui_flag:
        update_release_json(dry_run=dry_run)

    with tempfile.TemporaryDirectory(prefix="whirlpool-deploy-") as temp_dir:
        temp_path = Path(temp_dir)
        shared_api_zip: Path | None = None
        if deploy_api_flag:
            shared_api_zip = temp_path / API_ZIP_NAME
            prepare_api_zip(
                config,
                resolve_path(str(site.get("api", ".")), base=SCRIPT_DIR),
                shared_api_zip,
                dry_run=dry_run,
            )

        artifacts = prepare_site_artifacts(
            config,
            site,
            temp_path=temp_path,
            shared_api_zip=shared_api_zip,
            deploy_api_flag=deploy_api_flag,
            deploy_ui_flag=deploy_ui_flag,
            dry_run=dry_run,
        )
        upload_site_artifacts(
            site,
            artifacts,
            deploy_api_flag=deploy_api_flag,
            deploy_ui_flag=deploy_ui_flag,
            dry_run=dry_run,
        )


def deploy_all_enabled_sites(
    config: dict[str, Any],
    *,
    deploy_api_flag: bool,
    deploy_ui_flag: bool,
    dry_run: bool,
    max_workers: int | None = None,
) -> None:
    sites = enabled_sites(config)
    if not sites:
        raise DeployError("No enabled sites in deploy config")

    if not deploy_api_flag and not deploy_ui_flag:
        raise DeployError("Nothing selected to deploy (api/ui both off)")

    for site in sites:
        validate_site(site)

    site_ids = ", ".join(str(site["id"]) for site in sites)
    print(f"deploy all enabled sites ({len(sites)}): {site_ids}")

    if deploy_api_flag or deploy_ui_flag:
        update_release_json(dry_run=dry_run)

    with tempfile.TemporaryDirectory(prefix="whirlpool-deploy-all-") as temp_dir:
        temp_path = Path(temp_dir)

        shared_api_zip: Path | None = None
        if deploy_api_flag:
            shared_api_zip = temp_path / API_ZIP_NAME
            api_source = resolve_path(str(sites[0].get("api", ".")), base=SCRIPT_DIR)
            print("prepare shared api zip")
            prepare_api_zip(config, api_source, shared_api_zip, dry_run=dry_run)

        artifacts_by_site: dict[str, SiteArtifacts] = {}
        for site in sites:
            artifacts = prepare_site_artifacts(
                config,
                site,
                temp_path=temp_path,
                shared_api_zip=shared_api_zip,
                deploy_api_flag=deploy_api_flag,
                deploy_ui_flag=deploy_ui_flag,
                dry_run=dry_run,
            )
            artifacts_by_site[str(site["id"])] = artifacts

        workers = max_workers or len(sites)
        errors: list[str] = []

        with ThreadPoolExecutor(max_workers=workers) as pool:
            futures = {
                pool.submit(
                    upload_site_artifacts,
                    site,
                    artifacts_by_site[str(site["id"])],
                    deploy_api_flag=deploy_api_flag,
                    deploy_ui_flag=deploy_ui_flag,
                    dry_run=dry_run,
                ): str(site["id"])
                for site in sites
            }
            for future in as_completed(futures):
                site_id = futures[future]
                try:
                    future.result()
                except DeployError as exc:
                    errors.append(f"{site_id}: {exc}")
                except subprocess.CalledProcessError as exc:
                    errors.append(f"{site_id}: command failed with exit code {exc.returncode}")

        if errors:
            raise DeployError("One or more site uploads failed:\n" + "\n".join(errors))


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
    target = parser.add_mutually_exclusive_group()
    target.add_argument("--site", help="Deploy one site id from deploy-sites.json")
    target.add_argument(
        "--all",
        action="store_true",
        help="Deploy all enabled sites (uploads run in parallel)",
    )
    parser.add_argument("--list", action="store_true", help="List configured sites")
    parser.add_argument(
        "--dry-run", action="store_true", help="Print steps without executing"
    )
    parser.add_argument("--api-only", action="store_true", help="Deploy backend only")
    parser.add_argument("--ui-only", action="store_true", help="Deploy frontend only")
    parser.add_argument(
        "--jobs",
        type=int,
        default=None,
        help="Parallel upload workers for --all (default: number of enabled sites)",
    )
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

    if not args.site and not args.all:
        print("error: --site or --all is required (or use --list)", file=sys.stderr)
        return 1

    if args.api_only and args.ui_only:
        print(
            "error: --api-only and --ui-only cannot be used together", file=sys.stderr
        )
        return 1

    if not args.dry_run:
        for tool in ("git", "ssh", "scp", "unzip"):
            require_tool(tool)

    deploy_api_flag = not args.ui_only
    deploy_ui_flag = not args.api_only

    try:
        if args.all:
            deploy_all_enabled_sites(
                config,
                deploy_api_flag=deploy_api_flag,
                deploy_ui_flag=deploy_ui_flag,
                dry_run=args.dry_run,
                max_workers=args.jobs,
            )
        else:
            site = find_site(config, args.site)
            deploy_site(
                config,
                site,
                deploy_api_flag=deploy_api_flag,
                deploy_ui_flag=deploy_ui_flag,
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
