import time
from unittest.mock import MagicMock

import pytest
from fastapi import HTTPException

from utils.auth_rate_limit import (
    attempts_remaining_after_count,
    auth_rate_limit_client_key,
    check_and_record_auth_rate_limit_memory,
    clear_auth_rate_limit_for_client_key,
    reset_auth_rate_limit_state_for_tests,
)


@pytest.fixture(autouse=True)
def clear_rate_limit_state():
    reset_auth_rate_limit_state_for_tests()
    yield
    reset_auth_rate_limit_state_for_tests()


def test_client_key_prefers_forwarded_ip():
    request = MagicMock()
    request.headers = {"X-Forwarded-For": "203.0.113.1, 10.0.0.1"}
    request.client = MagicMock(host="127.0.0.1")
    assert auth_rate_limit_client_key(request) == "203.0.113.1"


def test_attempts_remaining_after_count():
    assert attempts_remaining_after_count(5, 1) == 4
    assert attempts_remaining_after_count(5, 5) == 0


def test_memory_limit_blocks_sixth_attempt():
    key = "test-ip"
    now = time.time()
    for expected_remaining in (4, 3, 2, 1, 0):
        remaining = check_and_record_auth_rate_limit_memory(
            key,
            max_attempts=5,
            window_seconds=1800,
            now=now,
        )
        assert remaining == expected_remaining
    with pytest.raises(HTTPException) as exc_info:
        check_and_record_auth_rate_limit_memory(
            key,
            max_attempts=5,
            window_seconds=1800,
            now=now,
        )
    assert exc_info.value.status_code == 429
    assert exc_info.value.headers.get("X-Attempt-Remaining") == "0"
    assert "Retry-After" in exc_info.value.headers


def test_clear_resets_attempt_count():
    key = "test-ip"
    now = time.time()
    check_and_record_auth_rate_limit_memory(
        key,
        max_attempts=5,
        window_seconds=1800,
        now=now,
    )
    clear_auth_rate_limit_for_client_key(key)
    remaining = check_and_record_auth_rate_limit_memory(
        key,
        max_attempts=5,
        window_seconds=1800,
        now=now,
    )
    assert remaining == 4
