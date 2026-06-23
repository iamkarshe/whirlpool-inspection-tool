from __future__ import annotations

import asyncio
import datetime
import json
import platform
import socket
from typing import Any

import psutil
from fastapi import WebSocket
from sqlalchemy.orm import Session, joinedload

from mod.app.helper import user_is_active_superadmin
from mod.auth.session import verify_user_session_active
from mod.model import User
from mod.api.server_health.response import (
    ServerCpuInfo,
    ServerDiskInfo,
    ServerHealthSnapshot,
    ServerHostInfo,
    ServerLoadAverage,
    ServerMemoryInfo,
    ServerProcessInfo,
    ServerSwapInfo,
)
from utils.jwt import decode_access_token_payload

DEFAULT_POLL_INTERVAL_SECONDS = 2
MIN_POLL_INTERVAL_SECONDS = 1
MAX_POLL_INTERVAL_SECONDS = 10
TOP_PROCESS_LIMIT = 20
SLOW_CPU_PERCENT_THRESHOLD = 5.0
SLOW_MEMORY_PERCENT_THRESHOLD = 5.0

_cpu_percent_primed = False


def prime_cpu_percent_sampler() -> None:
    global _cpu_percent_primed
    psutil.cpu_percent(interval=None)
    _cpu_percent_primed = True


def clamp_poll_interval_seconds(value: int | float | None) -> int:
    if value is None:
        return DEFAULT_POLL_INTERVAL_SECONDS
    try:
        interval = int(value)
    except (TypeError, ValueError):
        return DEFAULT_POLL_INTERVAL_SECONDS
    return max(MIN_POLL_INTERVAL_SECONDS, min(MAX_POLL_INTERVAL_SECONDS, interval))


def map_process_row(proc: psutil.Process) -> ServerProcessInfo | None:
    try:
        with proc.oneshot():
            cpu_percent = float(proc.cpu_percent(interval=None) or 0.0)
            memory_percent = float(proc.memory_percent() or 0.0)
            create_time_raw = proc.create_time()
            create_time = datetime.datetime.fromtimestamp(
                create_time_raw,
                tz=datetime.timezone.utc,
            )
            return ServerProcessInfo(
                pid=int(proc.pid),
                name=str(proc.name() or "unknown"),
                username=proc.username() if hasattr(proc, "username") else None,
                cpu_percent=round(cpu_percent, 2),
                memory_percent=round(memory_percent, 2),
                status=str(proc.status()),
                create_time=create_time,
            )
    except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
        return None


def collect_process_rows() -> list[ServerProcessInfo]:
    rows: list[ServerProcessInfo] = []
    for proc in psutil.process_iter():
        mapped = map_process_row(proc)
        if mapped is not None:
            rows.append(mapped)
    rows.sort(key=lambda row: (row.cpu_percent, row.memory_percent), reverse=True)
    return rows


def collect_disk_rows() -> list[ServerDiskInfo]:
    disks: list[ServerDiskInfo] = []
    seen_mountpoints: set[str] = set()

    for partition in psutil.disk_partitions(all=False):
        mountpoint = partition.mountpoint
        if mountpoint in seen_mountpoints:
            continue
        seen_mountpoints.add(mountpoint)

        try:
            usage = psutil.disk_usage(mountpoint)
        except (PermissionError, OSError):
            continue

        total_bytes = int(usage.total)
        used_bytes = int(usage.used)
        free_bytes = int(usage.free)
        percent = round((used_bytes / total_bytes) * 100, 2) if total_bytes else 0.0
        disks.append(
            ServerDiskInfo(
                mountpoint=mountpoint,
                device=partition.device,
                fstype=partition.fstype,
                total_bytes=total_bytes,
                used_bytes=used_bytes,
                free_bytes=free_bytes,
                percent=percent,
            )
        )

    disks.sort(key=lambda row: row.percent, reverse=True)
    return disks


def collect_server_health_snapshot() -> ServerHealthSnapshot:
    global _cpu_percent_primed
    if not _cpu_percent_primed:
        prime_cpu_percent_sampler()

    now = datetime.datetime.now(datetime.timezone.utc)
    boot_time = datetime.datetime.fromtimestamp(
        psutil.boot_time(),
        tz=datetime.timezone.utc,
    )
    uptime_seconds = max(0, int((now - boot_time).total_seconds()))

    virtual_memory = psutil.virtual_memory()
    swap_memory = psutil.swap_memory()
    load_1m, load_5m, load_15m = psutil.getloadavg()
    per_cpu_percent = [
        round(float(value), 2) for value in psutil.cpu_percent(interval=None, percpu=True)
    ]
    overall_cpu_percent = round(float(psutil.cpu_percent(interval=None)), 2)

    process_rows = collect_process_rows()
    top_processes = process_rows[:TOP_PROCESS_LIMIT]
    slow_processes = [
        row
        for row in process_rows
        if row.cpu_percent >= SLOW_CPU_PERCENT_THRESHOLD
        or row.memory_percent >= SLOW_MEMORY_PERCENT_THRESHOLD
    ][:TOP_PROCESS_LIMIT]

    return ServerHealthSnapshot(
        collected_at=now,
        host=ServerHostInfo(
            hostname=socket.gethostname(),
            platform=platform.platform(),
            boot_time=boot_time,
            uptime_seconds=uptime_seconds,
        ),
        cpu=ServerCpuInfo(
            percent=overall_cpu_percent,
            per_cpu_percent=per_cpu_percent,
            logical_cpu_count=int(psutil.cpu_count(logical=True) or 0),
        ),
        memory=ServerMemoryInfo(
            total_bytes=int(virtual_memory.total),
            used_bytes=int(virtual_memory.used),
            available_bytes=int(virtual_memory.available),
            percent=round(float(virtual_memory.percent), 2),
        ),
        swap=ServerSwapInfo(
            total_bytes=int(swap_memory.total),
            used_bytes=int(swap_memory.used),
            free_bytes=int(swap_memory.free),
            percent=round(float(swap_memory.percent), 2),
        ),
        load_average=ServerLoadAverage(
            load_1m=round(float(load_1m), 2),
            load_5m=round(float(load_5m), 2),
            load_15m=round(float(load_15m), 2),
        ),
        disks=collect_disk_rows(),
        processes=top_processes,
        slow_processes=slow_processes,
    )


async def collect_server_health_snapshot_async() -> ServerHealthSnapshot:
    return await asyncio.to_thread(collect_server_health_snapshot)


async def close_websocket_unauthorized(websocket: WebSocket) -> None:
    await websocket.close(code=4401, reason="Unauthorized")


async def close_websocket_forbidden(websocket: WebSocket) -> None:
    await websocket.close(code=4403, reason="Forbidden")


async def authenticate_websocket_superadmin(
    websocket: WebSocket,
    db: Session,
    token: str,
) -> User | None:
    raw_token = (token or "").strip()
    if not raw_token:
        await close_websocket_unauthorized(websocket)
        return None

    try:
        payload = decode_access_token_payload(raw_token)
        verify_user_session_active(db, payload.get("jti"))
        user_id = payload.get("sub")
        if user_id is None:
            await close_websocket_unauthorized(websocket)
            return None
    except Exception:
        await close_websocket_unauthorized(websocket)
        return None

    user = (
        db.query(User)
        .options(joinedload(User.role))
        .filter(
            User.id == int(user_id),
            User.is_active.is_(True),
        )
        .first()
    )
    if user is None:
        await close_websocket_unauthorized(websocket)
        return None
    if not user_is_active_superadmin(user):
        await close_websocket_forbidden(websocket)
        return None
    return user


def parse_websocket_client_message(raw_text: str) -> dict[str, Any]:
    try:
        payload = json.loads(raw_text)
    except json.JSONDecodeError:
        return {}
    if not isinstance(payload, dict):
        return {}
    return payload


def resolve_poll_interval_from_message(message: dict[str, Any]) -> int | None:
    action = str(message.get("action") or "").strip().lower()
    if action != "set_interval":
        return None
    return clamp_poll_interval_seconds(message.get("seconds"))
