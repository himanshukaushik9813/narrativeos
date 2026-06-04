from __future__ import annotations

import copy
import json
import time
from dataclasses import dataclass
from typing import Any

import httpx

from narrativeos_api.config import Settings


class SoSoValueError(RuntimeError):
    def __init__(self, message: str, status_code: int | None = None):
        self.status_code = status_code
        super().__init__(message)


@dataclass
class _CachedPayload:
    payload: dict[str, Any]
    stored_at: float


_CACHE: dict[str, _CachedPayload] = {}


def clear_sosovalue_cache() -> None:
    _CACHE.clear()


class SoSoValueClient:
    def __init__(self, settings: Settings, client: httpx.AsyncClient | None = None):
        settings.require_sosovalue()
        self._settings = settings
        self._client = client

    @property
    def headers(self) -> dict[str, str]:
        return {
            "Content-Type": "application/json",
            "x-soso-api-key": self._settings.sosovalue_api_key or "",
        }

    async def list_currencies(self) -> list[dict[str, Any]]:
        payload = await self._post_openapi("/openapi/v1/data/default/coin/list", {})
        return list(payload.get("data") or [])

    async def featured_news(self, page_num: int = 1, page_size: int = 30) -> list[dict[str, Any]]:
        payload = await self._get_openapi(
            "/api/v1/news/featured",
            params={
                "pageNum": page_num,
                "pageSize": page_size,
                "categoryList": "1,2,3,4,5,6,7,9,10",
            },
        )
        return list((payload.get("data") or {}).get("list") or [])

    async def featured_news_by_currency(
        self, currency_id: str | int, page_num: int = 1, page_size: int = 15
    ) -> list[dict[str, Any]]:
        payload = await self._get_openapi(
            "/api/v1/news/featured/currency",
            params={
                "currencyId": currency_id,
                "pageNum": page_num,
                "pageSize": page_size,
                "categoryList": "1,2,3,4,5,6,7,9,10",
            },
        )
        return list((payload.get("data") or {}).get("list") or [])

    async def current_etf_metrics(self, etf_type: str) -> dict[str, Any]:
        payload = await self._post_etf("/openapi/v2/etf/currentEtfDataMetrics", {"type": etf_type})
        return dict(payload.get("data") or {})

    async def historical_inflow_chart(self, etf_type: str) -> list[dict[str, Any]]:
        payload = await self._post_etf("/openapi/v2/etf/historicalInflowChart", {"type": etf_type})
        data = payload.get("data") or {}
        if isinstance(data, list):
            return list(data)
        return list(data.get("list") or [])

    async def _get_openapi(self, path: str, params: dict[str, Any]) -> dict[str, Any]:
        return await self._request("GET", f"{self._settings.sosovalue_openapi_base}{path}", params=params)

    async def _post_openapi(self, path: str, json: dict[str, Any]) -> dict[str, Any]:
        return await self._request("POST", f"{self._settings.sosovalue_openapi_base}{path}", json=json)

    async def _post_etf(self, path: str, json: dict[str, Any]) -> dict[str, Any]:
        return await self._request("POST", f"{self._settings.sosovalue_etf_api_base}{path}", json=json)

    async def _request(self, method: str, url: str, **kwargs: Any) -> dict[str, Any]:
        cache_key = _cache_key(method, url, kwargs)
        cached = self._cached_payload(cache_key, allow_stale=False)
        if cached is not None:
            return cached

        try:
            if self._client:
                response = await self._client.request(method, url, headers=self.headers, **kwargs)
                payload = self._unwrap(response)
            else:
                async with httpx.AsyncClient(timeout=20.0) as client:
                    response = await client.request(method, url, headers=self.headers, **kwargs)
                    payload = self._unwrap(response)
        except SoSoValueError as exc:
            stale = self._cached_payload(cache_key, allow_stale=True)
            if exc.status_code == 429 and stale is not None:
                return stale
            raise

        _CACHE[cache_key] = _CachedPayload(payload=copy.deepcopy(payload), stored_at=time.monotonic())
        return payload

    def _cached_payload(self, cache_key: str, *, allow_stale: bool) -> dict[str, Any] | None:
        cached = _CACHE.get(cache_key)
        if cached is None:
            return None

        age = time.monotonic() - cached.stored_at
        fresh_ttl = max(0, self._settings.sosovalue_cache_ttl_seconds)
        stale_ttl = max(fresh_ttl, self._settings.sosovalue_stale_ttl_seconds)

        if fresh_ttl and age <= fresh_ttl:
            return copy.deepcopy(cached.payload)
        if allow_stale and age <= stale_ttl:
            return copy.deepcopy(cached.payload)
        return None

    @staticmethod
    def _unwrap(response: httpx.Response) -> dict[str, Any]:
        try:
            response.raise_for_status()
        except httpx.HTTPStatusError as exc:
            raise SoSoValueError(
                f"SoSoValue request failed with HTTP {response.status_code}",
                status_code=response.status_code,
            ) from exc

        payload = response.json()
        if payload.get("code") not in (0, "0", None):
            message = payload.get("msg") or "SoSoValue returned a failure response"
            raise SoSoValueError(str(message))
        return payload


def _cache_key(method: str, url: str, kwargs: dict[str, Any]) -> str:
    relevant = {
        "method": method.upper(),
        "url": url,
        "params": kwargs.get("params") or {},
        "json": kwargs.get("json") or {},
    }
    return json.dumps(relevant, sort_keys=True, separators=(",", ":"), default=str)
