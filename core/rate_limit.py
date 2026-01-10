from __future__ import annotations

import time
from collections import defaultdict, deque
from dataclasses import dataclass
from typing import Deque
from fastapi import HTTPException, status


@dataclass
class RateLimitConfig:
    limit: int
    window_seconds: int


class InMemoryRateLimiter:
    def __init__(self, config: RateLimitConfig):
        self._config = config
        self._buckets: dict[str, Deque[float]] = defaultdict(deque)

    def check(self, key: str):
        # In-memory limiter; resets on process restart/cold start.
        now = time.monotonic()
        window_start = now - self._config.window_seconds
        bucket = self._buckets[key]
        while bucket and bucket[0] < window_start:
            bucket.popleft()
        if len(bucket) >= self._config.limit:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail={
                    "code": "rate_limited",
                    "message": "Too many requests",
                },
            )
        bucket.append(now)
