import asyncio
import json

from fastapi import APIRouter, Depends, Query, Request, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session

from mod.api.middleware import auth_dependency
from mod.api.server_health.helper import (
    DEFAULT_POLL_INTERVAL_SECONDS,
    authenticate_websocket_superadmin,
    collect_server_health_snapshot,
    collect_server_health_snapshot_async,
    parse_websocket_client_message,
    resolve_poll_interval_from_message,
)
from mod.api.server_health.response import ServerHealthSnapshot
from utils.db import get_db
from utils.decorator import check_api_role, exception_handler_decorator

SERVER_HEALTH_API_ROLES = ["superadmin"]

router = APIRouter(
    tags=["Server Health"],
    prefix="/api",
)


@router.get(
    "/server-health/snapshot",
    name="get_server_health_snapshot",
    summary="Current server health snapshot",
    description=(
        "Returns one htop-style snapshot for the API host: CPU, memory, swap, load, "
        "disk usage, top processes, and slow processes. Superadmin only."
    ),
    response_model=ServerHealthSnapshot,
    responses={403: {"description": "Caller is not superadmin."}},
    dependencies=[Depends(auth_dependency)],
)
@exception_handler_decorator
@check_api_role(SERVER_HEALTH_API_ROLES)
def get_server_health_snapshot(request: Request) -> ServerHealthSnapshot:
    return collect_server_health_snapshot()


@router.websocket("/server-health/ws")
async def server_health_websocket(
    websocket: WebSocket,
    token: str = Query(..., description="Bearer access token for superadmin session."),
    db: Session = Depends(get_db),
) -> None:
    user = await authenticate_websocket_superadmin(websocket, db, token)
    if user is None:
        return

    await websocket.accept()
    poll_interval_seconds = DEFAULT_POLL_INTERVAL_SECONDS

    try:
        while True:
            snapshot = await collect_server_health_snapshot_async()
            await websocket.send_text(snapshot.model_dump_json())

            try:
                incoming = await asyncio.wait_for(
                    websocket.receive_text(),
                    timeout=poll_interval_seconds,
                )
            except asyncio.TimeoutError:
                continue

            message = parse_websocket_client_message(incoming)
            action = str(message.get("action") or "").strip().lower()
            if action == "ping":
                await websocket.send_text(json.dumps({"type": "pong"}))
                continue

            next_interval = resolve_poll_interval_from_message(message)
            if next_interval is not None:
                poll_interval_seconds = next_interval
    except WebSocketDisconnect:
        return
