from __future__ import annotations

from typing import Any

import httpx

from narrativeos_api.config import Settings


class SoDEXClient:
    def __init__(self, settings: Settings, client: httpx.AsyncClient | None = None):
        self._settings = settings
        self._client = client

    async def spot_symbols(self) -> list[dict[str, Any]]:
        payload = await self._get(f"{self._settings.sodex_spot_endpoint}/markets/symbols")
        return list(payload.get("data") or [])

    async def spot_account_state(self, user_address: str) -> dict[str, Any]:
        payload = await self._get(f"{self._settings.sodex_spot_endpoint}/accounts/{user_address}/state")
        return dict(payload.get("data") or {})

    async def _get(self, url: str) -> dict[str, Any]:
        if self._client:
            response = await self._client.get(url, headers={"Accept": "application/json"})
            response.raise_for_status()
            return response.json()

        async with httpx.AsyncClient(timeout=20.0) as client:
            response = await client.get(url, headers={"Accept": "application/json"})
            response.raise_for_status()
            return response.json()
