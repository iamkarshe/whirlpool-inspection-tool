"""Per-IP rate limiting for unauthenticated auth routes (login, SSO token, forgot-password)."""

from __future__ import annotations

import threading
import time
import uuid

from fastapi import HTTPException, Request, Response, status
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response as StarletteResponse

from utils.env import get_env_optional
from utils.vpn_access import observed_client_ips

AUTH_RATE_LIMIT_MAX_DEFAULT = 5
AUTH_RATE_LIMIT_WINDOW_SECONDS_DEFAULT = 30 * 60
AUTH_ATTEMPT_REMAINING_HEADER = "X-Attempt-Remaining"

memory_rate_limit_attempts: dict[str, list[float]] = {}
memory_rate_limit_lock = threading.Lock()
redis_rate_limit_client = None
redis_rate_limit_init_attempted = False


def auth_rate_limit_enabled() -> bool:
    raw = (
        (get_env_optional("AUTH_RATE_LIMIT_ENABLED", "true") or "true").strip().lower()
    )
    return raw in {"1", "true", "yes", "on"}


def auth_rate_limit_max_attempts() -> int:
    raw = get_env_optional(
        "AUTH_RATE_LIMIT_MAX",
        str(AUTH_RATE_LIMIT_MAX_DEFAULT),
    )
    try:
        value = int(raw or AUTH_RATE_LIMIT_MAX_DEFAULT)
    except ValueError:
        return AUTH_RATE_LIMIT_MAX_DEFAULT
    return max(1, value)


def auth_rate_limit_window_seconds() -> int:
    raw = get_env_optional(
        "AUTH_RATE_LIMIT_WINDOW_SECONDS",
        str(AUTH_RATE_LIMIT_WINDOW_SECONDS_DEFAULT),
    )
    try:
        value = int(raw or AUTH_RATE_LIMIT_WINDOW_SECONDS_DEFAULT)
    except ValueError:
        return AUTH_RATE_LIMIT_WINDOW_SECONDS_DEFAULT
    return max(60, value)


def auth_rate_limit_client_key(request: Request) -> str:
    ips = observed_client_ips(request)
    return ips[0] if ips else "unknown"


def redis_rate_limit_key(client_key: str) -> str:
    return f"auth:rate_limit:{client_key}"


def get_redis_rate_limit_client():
    global redis_rate_limit_client, redis_rate_limit_init_attempted
    if redis_rate_limit_init_attempted:
        return redis_rate_limit_client
    redis_rate_limit_init_attempted = True
    redis_url = get_env_optional("REDIS_URL")
    if not redis_url:
        return None
    try:
        import redis

        client = redis.from_url(redis_url, decode_responses=True)
        client.ping()
        redis_rate_limit_client = client
    except Exception:
        redis_rate_limit_client = None
    return redis_rate_limit_client


def retry_after_seconds(
    oldest_timestamp: float, window_seconds: int, now: float
) -> int:
    remaining = (oldest_timestamp + window_seconds) - now
    return max(1, int(remaining) + 1)


def attempts_remaining_after_count(max_attempts: int, attempt_count: int) -> int:
    return max(0, max_attempts - attempt_count)


def set_auth_attempt_remaining_header(response: Response, remaining: int) -> None:
    response.headers[AUTH_ATTEMPT_REMAINING_HEADER] = str(remaining)


def raise_auth_rate_limited(retry_after: int) -> None:
    raise HTTPException(
        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
        detail="Too many authentication attempts. Try again later.",
        headers={
            "Retry-After": str(retry_after),
            AUTH_ATTEMPT_REMAINING_HEADER: "0",
        },
    )


def check_and_record_auth_rate_limit_memory(
    client_key: str,
    *,
    max_attempts: int,
    window_seconds: int,
    now: float,
) -> int:
    cutoff = now - window_seconds
    with memory_rate_limit_lock:
        attempts = [
            ts for ts in memory_rate_limit_attempts.get(client_key, []) if ts > cutoff
        ]
        if len(attempts) >= max_attempts:
            oldest_ts = min(attempts)
            raise_auth_rate_limited(retry_after_seconds(oldest_ts, window_seconds, now))
        attempts.append(now)
        memory_rate_limit_attempts[client_key] = attempts
        return attempts_remaining_after_count(max_attempts, len(attempts))


def check_and_record_auth_rate_limit_redis(
    client_key: str,
    *,
    max_attempts: int,
    window_seconds: int,
    now: float,
) -> int:
    redis_client = get_redis_rate_limit_client()
    if redis_client is None:
        return check_and_record_auth_rate_limit_memory(
            client_key,
            max_attempts=max_attempts,
            window_seconds=window_seconds,
            now=now,
        )

    key = redis_rate_limit_key(client_key)
    cutoff = now - window_seconds
    pipe = redis_client.pipeline()
    pipe.zremrangebyscore(key, 0, cutoff)
    pipe.zcard(key)
    count = pipe.execute()[1]

    if count >= max_attempts:
        oldest = redis_client.zrange(key, 0, 0, withscores=True)
        oldest_ts = oldest[0][1] if oldest else now
        raise_auth_rate_limited(retry_after_seconds(oldest_ts, window_seconds, now))

    member = f"{now}:{uuid.uuid4().hex}"
    redis_client.zadd(key, {member: now})
    redis_client.expire(key, window_seconds)
    attempt_count = redis_client.zcard(key)
    return attempts_remaining_after_count(max_attempts, attempt_count)


def record_auth_rate_limit_attempt(request: Request) -> int:
    if not auth_rate_limit_enabled():
        return auth_rate_limit_max_attempts()

    client_key = auth_rate_limit_client_key(request)
    max_attempts = auth_rate_limit_max_attempts()
    window_seconds = auth_rate_limit_window_seconds()
    now = time.time()

    if get_redis_rate_limit_client() is not None:
        return check_and_record_auth_rate_limit_redis(
            client_key,
            max_attempts=max_attempts,
            window_seconds=window_seconds,
            now=now,
        )
    return check_and_record_auth_rate_limit_memory(
        client_key,
        max_attempts=max_attempts,
        window_seconds=window_seconds,
        now=now,
    )


def clear_auth_rate_limit_for_client_key(client_key: str) -> None:
    with memory_rate_limit_lock:
        memory_rate_limit_attempts.pop(client_key, None)

    redis_client = get_redis_rate_limit_client()
    if redis_client is not None:
        redis_client.delete(redis_rate_limit_key(client_key))


def clear_auth_rate_limit_for_request(request: Request) -> None:
    if not auth_rate_limit_enabled():
        return
    clear_auth_rate_limit_for_client_key(auth_rate_limit_client_key(request))


def reset_auth_rate_limit_after_successful_login(
    request: Request,
    response: Response,
) -> None:
    clear_auth_rate_limit_for_request(request)
    remaining = auth_rate_limit_max_attempts()
    request.state.auth_attempt_remaining = remaining
    set_auth_attempt_remaining_header(response, remaining)


def require_auth_rate_limit(request: Request, response: Response) -> None:
    remaining = record_auth_rate_limit_attempt(request)
    request.state.auth_attempt_remaining = remaining
    set_auth_attempt_remaining_header(response, remaining)


class AuthAttemptRemainingMiddleware(BaseHTTPMiddleware):
    """Attach X-Attempt-Remaining on auth rate-limited responses (including 401/422)."""

    async def dispatch(self, request: Request, call_next) -> StarletteResponse:
        response = await call_next(request)
        remaining = getattr(request.state, "auth_attempt_remaining", None)
        if remaining is not None:
            response.headers[AUTH_ATTEMPT_REMAINING_HEADER] = str(remaining)
        return response


def reset_auth_rate_limit_state_for_tests() -> None:
    """Clear in-memory counters (tests only)."""
    global redis_rate_limit_client, redis_rate_limit_init_attempted
    with memory_rate_limit_lock:
        memory_rate_limit_attempts.clear()
    redis_rate_limit_client = None
    redis_rate_limit_init_attempted = False
