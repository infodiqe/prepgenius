"""Shared test doubles for the AI gateway suite (Sprint-6A-01)."""
from __future__ import annotations

from typing import Any


class FakeResponse:
    """Minimal stand-in for ``httpx.Response`` used by provider adapter tests."""

    def __init__(self, status_code: int = 200, json_data: Any = None, text: str = "") -> None:
        self.status_code = status_code
        self._json_data = json_data
        self.text = text or ""

    def json(self) -> Any:
        if self._json_data is None:
            raise ValueError("no json body")
        return self._json_data


class FakeHTTPClient:
    """
    Fake ``httpx.Client`` capturing the last POST and returning a canned response
    (or raising a supplied exception). Lets adapters be tested without network.
    """

    def __init__(self, response: FakeResponse | None = None, raises: Exception | None = None) -> None:
        self._response = response
        self._raises = raises
        self.calls: list[dict[str, Any]] = []
        self.closed = False

    def post(self, url: str, *, headers=None, json=None, timeout=None) -> FakeResponse:
        self.calls.append({"url": url, "headers": headers, "json": json, "timeout": timeout})
        if self._raises is not None:
            raise self._raises
        assert self._response is not None
        return self._response

    def close(self) -> None:
        self.closed = True

    @property
    def last_call(self) -> dict[str, Any]:
        return self.calls[-1]
