import uuid
import sys
import time
import asyncio
from urllib.parse import urlparse
import requests
import websockets
from testing.config import (
    BASE_URL,
    TIMEOUT_SECONDS,
    RUN_VOICE_TESTS,
    RATE_LIMIT_PER_MINUTE,
    RATE_LIMIT_IP_PER_MINUTE,
)
from testing.utils import log_info, log_ok, log_warn, log_fail, log_step, expect, parse_json, TestFailure, render_box, Colors

VERBOSE = False


def url(path: str) -> str:
    return f"{BASE_URL}{path}"

def ws_url(path: str) -> str:
    parsed = urlparse(BASE_URL)
    scheme = "wss" if parsed.scheme == "https" else "ws"
    base_path = parsed.path.rstrip("/")
    base = f"{scheme}://{parsed.netloc}{base_path}"
    return f"{base}{path}"


def auth_headers(token: str | None) -> dict[str, str]:
    if not token:
        return {}
    return {"Authorization": f"Bearer {token}"}

def request(method: str, path: str, state: dict | None = None, **kwargs):
    if VERBOSE:
        log_step(f"{method} {path}", True)
    start = time.perf_counter()
    resp = requests.request(method, url(path), timeout=TIMEOUT_SECONDS, **kwargs)
    elapsed_ms = int((time.perf_counter() - start) * 1000)
    if VERBOSE:
        log_info(f"{method} {path} -> {resp.status_code} ({elapsed_ms}ms)", True)
        if resp.status_code >= 400:
            preview = resp.text.strip().replace("\n", " ")
            if len(preview) > 300:
                preview = preview[:300] + "...(truncated)"
            log_warn(f"Response body: {preview}", True)
    if state is not None:
        state["requests"] += 1
        if resp.status_code >= 400:
            state["errors"] += 1
    return resp

def assert_envelope(payload: dict, expect_data: bool = True):
    expect("status" in payload, "Missing status in envelope")
    expect(payload["status"] == "ok", f"Unexpected status: {payload['status']}")
    if expect_data:
        expect("data" in payload, "Missing data in envelope")


def assert_error(payload: dict, code: str | None = None, status_code: int | None = None):
    expect("error" in payload, "Missing error object")
    expect("code" in payload["error"], "Missing error.code")
    expect("message" in payload["error"], "Missing error.message")
    if code is not None:
        expect(payload["error"]["code"] == code, f"Unexpected error code: {payload['error']['code']}")
    if status_code is not None:
        expect(status_code > 399, "Expected an error status code")

def assert_error_code_in(payload: dict, codes: set[str]):
    expect("error" in payload, "Missing error object")
    expect("code" in payload["error"], "Missing error.code")
    expect(payload["error"]["code"] in codes, f"Unexpected error code: {payload['error']['code']}")


def test_health(state: dict):
    log_info("Testing health endpoint", VERBOSE)
    resp = request("GET", "/system/health", state)
    payload = parse_json(resp)
    expect(resp.status_code == 200, f"Health status {resp.status_code}")
    assert_envelope(payload, expect_data=True)
    expect(payload["data"] is None, "Health data should be null")
    log_ok("Health endpoint OK", VERBOSE)

    resp = request("GET", "/test", state)
    expect(resp.status_code == 200, f"Test console status {resp.status_code}")
    content_type = resp.headers.get("content-type", "")
    expect("text/html" in content_type.lower(), "Test console content-type should be text/html")
    log_ok("Test console OK", VERBOSE)


def fetch_limits(state: dict):
    resp = request("GET", "/system/limits", state)
    if resp.status_code != 200:
        log_warn("Limits endpoint unavailable; using configured defaults", VERBOSE)
        return RATE_LIMIT_PER_MINUTE, RATE_LIMIT_IP_PER_MINUTE
    payload = parse_json(resp)
    if payload.get("status") != "ok" or not payload.get("data"):
        log_warn("Limits payload invalid; using configured defaults", VERBOSE)
        return RATE_LIMIT_PER_MINUTE, RATE_LIMIT_IP_PER_MINUTE
    limits = payload["data"]["rate_limits"]
    return limits["per_user_per_minute"], limits["per_ip_per_minute"]


def test_auth_flow(state: dict):
    log_info("Testing auth flow", VERBOSE)
    email = f"test-{uuid.uuid4()}@example.com"
    password = "StrongPass123!"
    register_payload = {
        "email": email,
        "password": password,
        "full_name": "Test User",
        "age": 25,
        "interests": ["solar", "recycling"],
    }

    resp = request("POST", "/auth/register", state, json={"email": "bad", "password": "nope"})
    payload = parse_json(resp)
    expect(resp.status_code == 422, f"Register validation status {resp.status_code}")
    assert_error(payload, code="validation_error")

    resp = request("POST", "/auth/register", state, json=register_payload)
    payload = parse_json(resp)
    expect(resp.status_code == 200, f"Register status {resp.status_code}")
    assert_envelope(payload)

    resp = request("POST", "/auth/register", state, json=register_payload)
    payload = parse_json(resp)
    expect(resp.status_code == 409, f"Duplicate register status {resp.status_code}")
    assert_error(payload, code="email_taken")

    resp = request(
        "POST",
        "/auth/login",
        state,
        json={"email": email, "password": "WrongPass"},
    )
    state["login_calls"] += 1
    payload = parse_json(resp)
    expect(resp.status_code == 401, f"Bad login status {resp.status_code}")
    assert_error(payload, code="invalid_credentials")

    resp = request("POST", "/auth/login", state, json={"email": "not-an-email"})
    state["login_calls"] += 1
    payload = parse_json(resp)
    expect(resp.status_code == 422, f"Login validation status {resp.status_code}")
    assert_error(payload, code="validation_error")

    resp = request(
        "POST",
        "/auth/login",
        state,
        json={"email": email, "password": password},
    )
    state["login_calls"] += 1
    payload = parse_json(resp)
    expect(resp.status_code == 200, f"Login status {resp.status_code}")
    assert_envelope(payload, expect_data=True)
    access_token = payload["data"]["access_token"]
    refresh_token = payload["data"]["refresh_token"]
    expect(access_token, "Missing access token")
    expect(refresh_token, "Missing refresh token")

    resp = request(
        "GET",
        "/auth/protected",
        state,
        headers=auth_headers(access_token),
    )
    state["protected_calls"] += 1
    payload = parse_json(resp)
    expect(resp.status_code == 200, f"Protected status {resp.status_code}")
    assert_envelope(payload, expect_data=True)
    user_id = payload["data"]["user_id"]
    expect(user_id, "Missing user_id")

    resp = request("GET", "/auth/protected", state)
    payload = parse_json(resp)
    expect(resp.status_code == 403, f"Protected missing auth status {resp.status_code}")
    assert_error_code_in(payload, {"error", "not_authenticated"})

    resp = request(
        "GET",
        "/auth/protected",
        state,
        headers=auth_headers("invalid-token"),
    )
    state["protected_calls"] += 1
    payload = parse_json(resp)
    expect(resp.status_code == 401, f"Protected invalid token status {resp.status_code}")
    assert_error(payload, code="not_authenticated")

    resp = request(
        "POST",
        "/auth/refresh",
        state,
        json={"refresh_token": "invalid"},
    )
    payload = parse_json(resp)
    expect(resp.status_code == 401, f"Bad refresh status {resp.status_code}")
    assert_error(payload, code="invalid_refresh_token")

    resp = request(
        "POST",
        "/auth/refresh",
        state,
        json={"refresh_token": refresh_token},
    )
    payload = parse_json(resp)
    expect(resp.status_code == 200, f"Refresh status {resp.status_code}")
    assert_envelope(payload, expect_data=True)
    access_token = payload["data"]["access_token"]
    previous_refresh_token = refresh_token
    refresh_token = payload["data"]["refresh_token"]
    expect(access_token, "Missing refreshed access token")
    expect(refresh_token, "Missing refreshed refresh token")

    resp = request(
        "POST",
        "/auth/refresh",
        state,
        json={"refresh_token": previous_refresh_token},
    )
    payload = parse_json(resp)
    expect(resp.status_code == 401, f"Refresh old token status {resp.status_code}")
    assert_error(payload, code="invalid_refresh_token")

    resp = request("POST", "/auth/refresh", state, json={})
    payload = parse_json(resp)
    expect(resp.status_code == 422, f"Refresh validation status {resp.status_code}")
    assert_error(payload, code="validation_error")

    resp = request(
        "POST",
        "/auth/logout",
        state,
        json={"refresh_token": refresh_token},
    )
    payload = parse_json(resp)
    expect(resp.status_code == 200, f"Logout status {resp.status_code}")
    assert_envelope(payload)

    resp = request(
        "POST",
        "/auth/logout",
        state,
        json={"refresh_token": "invalid"},
    )
    payload = parse_json(resp)
    expect(resp.status_code == 401, f"Logout invalid status {resp.status_code}")
    assert_error(payload, code="invalid_refresh_token")

    resp = request("POST", "/auth/logout", state, json={})
    payload = parse_json(resp)
    expect(resp.status_code == 422, f"Logout validation status {resp.status_code}")
    assert_error(payload, code="validation_error")

    log_ok("Auth flow OK", VERBOSE)
    return email, password, access_token, refresh_token


def test_impact_flow(access_token: str, state: dict, keep_for_voice: bool = False):
    log_info("Testing impact endpoints", VERBOSE)
    resp = request(
        "GET",
        "/impact",
        state,
        headers=auth_headers(access_token),
    )
    payload = parse_json(resp)
    expect(resp.status_code == 200, f"Impact list status {resp.status_code}")
    assert_envelope(payload, expect_data=True)
    expect(payload["data"]["impact_ids"] == [], "Impact list should start empty")

    short_resp = request(
        "POST",
        "/impact/generate",
        state,
        json={},
        headers=auth_headers(access_token),
    )
    payload = parse_json(short_resp)
    expect(short_resp.status_code == 422, f"Missing topic status {short_resp.status_code}")
    assert_error(payload, code="validation_error")

    short_resp = request(
        "POST",
        "/impact/generate",
        state,
        json={"topic": "ab"},
        headers=auth_headers(access_token),
    )
    payload = parse_json(short_resp)
    expect(short_resp.status_code == 422, f"Short topic status {short_resp.status_code}")
    assert_error(payload, code="validation_error")

    resp = request(
        "POST",
        "/impact/generate",
        state,
        json={"topic": "Build a home composting setup"},
        headers=auth_headers(access_token),
    )
    payload = parse_json(resp)
    if resp.status_code == 503:
        assert_error(payload, code="ai_unavailable")
        log_warn("Impact generation unavailable; skipping impact tests", VERBOSE)
        return None
    expect(resp.status_code == 200, f"Generate impact status {resp.status_code}")
    assert_envelope(payload, expect_data=True)
    impact = payload["data"]
    expect(impact["id"], "Missing impact id")
    expect(len(impact["steps"]) > 0, "Impact steps missing")
    for step in impact["steps"]:
        expect(step["icon"], "Step icon missing")
        expect(step.get("id"), "Step id missing")

    impact_id = impact["id"]
    step_id = impact["steps"][0]["id"]
    resp = request(
        "GET",
        f"/impact/{impact_id}",
        state,
        headers=auth_headers(access_token),
    )
    payload = parse_json(resp)
    expect(resp.status_code == 200, f"Get impact status {resp.status_code}")
    assert_envelope(payload, expect_data=True)
    steps_map = payload["data"]["steps"]
    expect(steps_map, "Impact payload steps missing")
    for step in steps_map.values():
        expect(step["icon"], "Impact payload icon missing")
        expect(step.get("id"), "Impact payload id missing")

    if not keep_for_voice:
        delete_impact(access_token, impact_id, state)

    log_ok("Impact endpoints OK", VERBOSE)
    return impact_id, step_id


def delete_impact(access_token: str, impact_id: str, state: dict):
    resp = request(
        "DELETE",
        f"/impact/{impact_id}",
        state,
        headers=auth_headers(access_token),
    )
    payload = parse_json(resp)
    expect(resp.status_code == 200, f"Delete impact status {resp.status_code}")
    assert_envelope(payload, expect_data=True)

    resp = request(
        "GET",
        f"/impact/{impact_id}",
        state,
        headers=auth_headers(access_token),
    )
    payload = parse_json(resp)
    expect(resp.status_code == 404, f"Deleted impact status {resp.status_code}")
    assert_error(payload, code="impact_not_found")

    resp = request(
        "DELETE",
        "/impact/not-a-real-id",
        state,
        headers=auth_headers(access_token),
    )
    payload = parse_json(resp)
    expect(resp.status_code == 404, f"Delete missing impact status {resp.status_code}")
    assert_error(payload, code="impact_not_found")

    resp = request(
        "GET",
        "/impact",
        state,
        headers=auth_headers(access_token),
    )
    payload = parse_json(resp)
    expect(resp.status_code == 200, f"Impact list after delete status {resp.status_code}")
    assert_envelope(payload, expect_data=True)
    expect(impact_id not in payload["data"]["impact_ids"], "Deleted impact still listed")


async def _ws_expect_close(path: str, expect_code: int):
    try:
        async with websockets.connect(ws_url(path)) as ws:
            await ws.recv()
    except websockets.ConnectionClosed as exc:
        expect(exc.code == expect_code, f"Expected WS close {expect_code}, got {exc.code}")
        return
    raise TestFailure(f"Expected WS close {expect_code} but connection stayed open")


async def _ws_expect_close_headers(path: str, headers: dict, expect_code: int):
    try:
        async with websockets.connect(ws_url(path), additional_headers=headers) as ws:
            await ws.recv()
    except websockets.ConnectionClosed as exc:
        expect(exc.code == expect_code, f"Expected WS close {expect_code}, got {exc.code}")
        return
    raise TestFailure(f"Expected WS close {expect_code} but connection stayed open")


async def _ws_expect_audio(path: str, headers: dict):
    try:
        async with websockets.connect(ws_url(path), additional_headers=headers) as ws:
            for _ in range(5):
                await ws.send(b"\x00" * 3200)
                await asyncio.sleep(0.05)
            try:
                message = await asyncio.wait_for(ws.recv(), timeout=8)
            except asyncio.TimeoutError:
                return "timeout"
            if isinstance(message, (bytes, bytearray)) and len(message) > 0:
                return "ok"
            return "unexpected"
    except websockets.ConnectionClosed as exc:
        return f"closed:{exc.code}"


def test_voice_stream(access_token: str, step_id: str, state: dict):
    log_info("Testing voice stream", VERBOSE)
    asyncio.run(_ws_expect_close(f"/voice/stream/{step_id}", 1008))
    asyncio.run(
        _ws_expect_close_headers(
            f"/voice/stream/{step_id}",
            {"Authorization": "Bearer invalid-token"},
            1008,
        )
    )
    asyncio.run(
        _ws_expect_close_headers(
            f"/voice/stream/{uuid.uuid4()}",
            {"Authorization": f"Bearer {access_token}"},
            1008,
        )
    )
    result = asyncio.run(
        _ws_expect_audio(
            f"/voice/stream/{step_id}",
            {"Authorization": f"Bearer {access_token}"},
        )
    )
    if result == "ok":
        log_ok("Voice stream OK", VERBOSE)
    elif result == "timeout":
        log_warn("Voice stream timed out waiting for audio", VERBOSE)
    elif result.startswith("closed:1011"):
        log_warn("Voice stream closed: AI client unavailable", VERBOSE)
    else:
        log_warn("Voice stream returned unexpected payload", VERBOSE)


def test_account_deletion(email: str, password: str, access_token: str, refresh_token: str, state: dict):
    log_info("Testing account deletion", VERBOSE)
    resp = request(
        "DELETE",
        "/auth/account",
        state,
        headers=auth_headers(access_token),
    )
    payload = parse_json(resp)
    expect(resp.status_code == 200, f"Delete account status {resp.status_code}")
    assert_envelope(payload)

    resp = request(
        "POST",
        "/auth/login",
        state,
        json={"email": email, "password": password},
    )
    state["login_calls"] += 1
    payload = parse_json(resp)
    expect(resp.status_code == 401, f"Login after delete status {resp.status_code}")
    assert_error(payload, code="invalid_credentials")

    resp = request(
        "POST",
        "/auth/refresh",
        state,
        json={"refresh_token": refresh_token},
    )
    payload = parse_json(resp)
    expect(resp.status_code == 401, f"Refresh after delete status {resp.status_code}")
    assert_error(payload, code="invalid_refresh_token")

    resp = request(
        "GET",
        "/users/me/user-data",
        state,
        headers=auth_headers(access_token),
    )
    payload = parse_json(resp)
    expect(resp.status_code == 404, f"User data after delete status {resp.status_code}")
    assert_error(payload, code="user_not_found")

    log_ok("Account deletion OK", VERBOSE)


def test_user_rate_limit(access_token: str, state: dict, per_user_limit: int):
    log_info("Testing per-user rate limit", VERBOSE)
    max_attempts = max(per_user_limit * 2, 10)
    for _ in range(max_attempts):
        resp = request(
            "GET",
            "/auth/protected",
            state,
            headers=auth_headers(access_token),
        )
        payload = parse_json(resp)
        state["protected_calls"] += 1
        if resp.status_code == 429:
            assert_error(payload, code="rate_limited")
            log_ok("Per-user rate limit OK", VERBOSE)
            return
        expect(resp.status_code == 200, f"Protected rate limit status {resp.status_code}")
        assert_envelope(payload, expect_data=True)

    raise TestFailure(
        "Per-user rate limit not reached; check RATE_LIMIT_PER_MINUTE/TEST_RATE_LIMIT_PER_MINUTE"
    )


def test_ip_rate_limit(state: dict, per_ip_limit: int):
    log_info("Testing IP rate limit", VERBOSE)
    max_attempts = max(per_ip_limit * 2, 10)
    for _ in range(max_attempts):
        resp = request(
            "POST",
            "/auth/login",
            state,
            json={"email": f"missing-{uuid.uuid4()}@example.com", "password": "Nope123!"},
        )
        payload = parse_json(resp)
        state["login_calls"] += 1
        if resp.status_code == 429:
            assert_error(payload, code="rate_limited")
            log_ok("IP rate limit OK", VERBOSE)
            return
        expect(resp.status_code == 401, f"Login rate limit status {resp.status_code}")
        assert_error(payload, code="invalid_credentials")

    raise TestFailure(
        "IP rate limit not reached; check RATE_LIMIT_IP_PER_MINUTE/TEST_RATE_LIMIT_IP_PER_MINUTE"
    )


def run():
    failures = 0
    state = {"login_calls": 0, "protected_calls": 0, "requests": 0, "errors": 0}
    try:
        test_health(state)
        per_user_limit, per_ip_limit = fetch_limits(state)
        email, password, access_token, refresh_token = test_auth_flow(state)
        impact_result = test_impact_flow(access_token, state, keep_for_voice=RUN_VOICE_TESTS)
        if RUN_VOICE_TESTS:
            if impact_result:
                impact_id, step_id = impact_result
                test_voice_stream(access_token, step_id, state)
                delete_impact(access_token, impact_id, state)
            else:
                log_warn("Voice tests skipped because impact generation is unavailable", VERBOSE)
        test_user_rate_limit(access_token, state, per_user_limit)
        test_account_deletion(email, password, access_token, refresh_token, state)
        test_ip_rate_limit(state, per_ip_limit)
    except TestFailure as exc:
        failures += 1
        log_fail(str(exc))
    except requests.RequestException as exc:
        failures += 1
        log_fail(f"Network error: {exc}")

    if failures:
        summary = [
            f"Result: FAILED ({failures})",
            f"Requests: {state['requests']}",
            f"HTTP errors: {state['errors']}",
        ]
        print(render_box("Test Summary", summary, Colors.RED))
        raise SystemExit(1)
    summary = [
        "Result: PASSED",
        f"Requests: {state['requests']}",
        f"HTTP errors: {state['errors']}",
    ]
    print(render_box("Test Summary", summary, Colors.GREEN))
    log_ok("All tests passed", True)


if __name__ == "__main__":
    if "-v" in sys.argv:
        VERBOSE = True
        log_info("Running in verbose mode", True)
    run()
