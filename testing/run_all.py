import uuid
import sys
import time
import requests
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


def test_health(state: dict):
    log_info("Testing health endpoint", VERBOSE)
    resp = request("GET", "/system/health", state)
    payload = parse_json(resp)
    expect(resp.status_code == 200, f"Health status {resp.status_code}")
    assert_envelope(payload, expect_data=True)
    expect(payload["data"] is None, "Health data should be null")
    log_ok("Health endpoint OK", VERBOSE)


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
    refresh_token = payload["data"]["refresh_token"]
    expect(access_token, "Missing refreshed access token")
    expect(refresh_token, "Missing refreshed refresh token")

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

    log_ok("Auth flow OK", VERBOSE)
    return email, password, access_token, refresh_token


def test_user_data(access_token: str, state: dict):
    log_info("Testing user data endpoints", VERBOSE)
    item = {"key": "value", "nonce": str(uuid.uuid4())}
    resp = request(
        "POST",
        "/users/me/user-data",
        state,
        json={"item": item},
        headers=auth_headers(access_token),
    )
    payload = parse_json(resp)
    expect(resp.status_code == 200, f"Append user_data status {resp.status_code}")
    assert_envelope(payload, expect_data=True)
    expect(item in payload["data"]["user_data"], "Appended item not in user_data")

    resp = request(
        "DELETE",
        "/users/me/user-data",
        state,
        json={"item": item},
        headers=auth_headers(access_token),
    )
    payload = parse_json(resp)
    expect(resp.status_code == 200, f"Delete user_data status {resp.status_code}")
    assert_envelope(payload, expect_data=True)
    expect(item not in payload["data"]["user_data"], "Deleted item still in user_data")

    resp = request(
        "DELETE",
        "/users/me/user-data",
        state,
        json={"item": item},
        headers=auth_headers(access_token),
    )
    payload = parse_json(resp)
    expect(resp.status_code == 404, f"Delete missing item status {resp.status_code}")
    assert_error(payload, code="user_data_item_not_found")

    log_ok("User data endpoints OK", VERBOSE)


def test_impact_flow(access_token: str, state: dict):
    log_info("Testing impact endpoints", VERBOSE)
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

    resp = request(
        "POST",
        "/impact/generate",
        state,
        json={"topic": "Build a home composting setup"},
        headers=auth_headers(access_token),
    )
    payload = parse_json(resp)
    expect(resp.status_code == 200, f"Generate impact status {resp.status_code}")
    assert_envelope(payload, expect_data=True)
    impact = payload["data"]
    expect(impact["id"], "Missing impact id")
    expect(len(impact["steps"]) > 0, "Impact steps missing")
    for step in impact["steps"]:
        expect(step["icon"], "Step icon missing")
        expect(step.get("id"), "Step id missing")

    impact_id = impact["id"]
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

    log_ok("Impact endpoints OK", VERBOSE)


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
        test_user_data(access_token, state)
        test_impact_flow(access_token, state)
        if RUN_VOICE_TESTS:
            log_warn("Voice tests are enabled but not implemented in this script", VERBOSE)
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
