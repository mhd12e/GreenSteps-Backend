import os

BASE_URL = os.getenv(
    "TEST_BASE_URL",
    "https://greensteps-api.devlix.org",
).rstrip("/")
TIMEOUT_SECONDS = float(os.getenv("TEST_TIMEOUT_SECONDS", "15"))
RUN_VOICE_TESTS = os.getenv("TEST_VOICE", "0") == "1"
RATE_LIMIT_PER_MINUTE = int(os.getenv("TEST_RATE_LIMIT_PER_MINUTE", "60"))
RATE_LIMIT_IP_PER_MINUTE = int(os.getenv("TEST_RATE_LIMIT_IP_PER_MINUTE", "30"))
VERBOSE = False
