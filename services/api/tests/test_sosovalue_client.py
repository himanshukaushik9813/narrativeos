import httpx
import pytest

from narrativeos_api.clients.sosovalue import SoSoValueClient, SoSoValueError, clear_sosovalue_cache
from narrativeos_api.config import Settings


@pytest.mark.asyncio
async def test_sosovalue_client_normalizes_supported_endpoint_shapes():
    clear_sosovalue_cache()

    def handler(request: httpx.Request) -> httpx.Response:
        assert request.headers["x-soso-api-key"] == "test-key"
        if request.url.path == "/openapi/v1/data/default/coin/list":
            return httpx.Response(
                200,
                json={
                    "code": 0,
                    "msg": None,
                    "data": [{"id": "1", "fullName": "Bitcoin", "name": "BTC"}],
                },
            )
        if request.url.path == "/api/v1/news/featured":
            return httpx.Response(
                200,
                json={
                    "code": 0,
                    "data": {
                        "list": [
                            {
                                "id": "news-1",
                                "tags": ["ETF"],
                                "matchedCurrencies": [{"id": "1", "name": "BTC"}],
                            }
                        ]
                    },
                },
            )
        if request.url.path == "/openapi/v2/etf/currentEtfDataMetrics":
            return httpx.Response(200, json={"code": 0, "data": {"dailyNetInflow": {"value": 12}}})
        if request.url.path == "/openapi/v2/etf/historicalInflowChart":
            return httpx.Response(200, json={"code": 0, "data": [{"totalNetInflow": 12}]})
        raise AssertionError(f"Unexpected request path {request.url.path}")

    transport = httpx.MockTransport(handler)
    async with httpx.AsyncClient(transport=transport) as http_client:
        client = SoSoValueClient(Settings(sosovalue_api_key="test-key"), client=http_client)

        assert (await client.list_currencies())[0]["name"] == "BTC"
        assert (await client.featured_news())[0]["id"] == "news-1"
        assert (await client.current_etf_metrics("us-btc-spot"))["dailyNetInflow"]["value"] == 12
        assert (await client.historical_inflow_chart("us-btc-spot"))[0]["totalNetInflow"] == 12


@pytest.mark.asyncio
async def test_sosovalue_client_reuses_fresh_verified_cache():
    clear_sosovalue_cache()
    calls = 0

    def handler(request: httpx.Request) -> httpx.Response:
        nonlocal calls
        calls += 1
        return httpx.Response(200, json={"code": 0, "data": [{"name": "BTC"}]})

    transport = httpx.MockTransport(handler)
    async with httpx.AsyncClient(transport=transport) as http_client:
        client = SoSoValueClient(Settings(sosovalue_api_key="test-key"), client=http_client)

        assert (await client.list_currencies())[0]["name"] == "BTC"
        assert (await client.list_currencies())[0]["name"] == "BTC"

    assert calls == 1


@pytest.mark.asyncio
async def test_sosovalue_client_uses_verified_stale_cache_on_rate_limit():
    clear_sosovalue_cache()
    calls = 0

    def handler(request: httpx.Request) -> httpx.Response:
        nonlocal calls
        calls += 1
        if calls == 1:
            return httpx.Response(200, json={"code": 0, "data": [{"name": "BTC"}]})
        return httpx.Response(429, json={"message": "rate limited"})

    transport = httpx.MockTransport(handler)
    async with httpx.AsyncClient(transport=transport) as http_client:
        client = SoSoValueClient(
            Settings(
                sosovalue_api_key="test-key",
                sosovalue_cache_ttl_seconds=0,
                sosovalue_stale_ttl_seconds=3600,
            ),
            client=http_client,
        )

        assert (await client.list_currencies())[0]["name"] == "BTC"
        assert (await client.list_currencies())[0]["name"] == "BTC"

    assert calls == 2


@pytest.mark.asyncio
async def test_sosovalue_client_fails_closed_when_rate_limited_without_verified_cache():
    clear_sosovalue_cache()

    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(429, json={"message": "rate limited"})

    transport = httpx.MockTransport(handler)
    async with httpx.AsyncClient(transport=transport) as http_client:
        client = SoSoValueClient(Settings(sosovalue_api_key="test-key"), client=http_client)

        with pytest.raises(SoSoValueError, match="HTTP 429"):
            await client.list_currencies()
