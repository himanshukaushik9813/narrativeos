import os

import pytest
from web3 import Web3

from narrativeos_api.clients.sodex import SoDEXClient
from narrativeos_api.clients.sosovalue import SoSoValueClient
from narrativeos_api.config import Settings

pytestmark = pytest.mark.live


def live_enabled() -> bool:
    return os.getenv("RUN_LIVE_INTEGRATION_TESTS") == "1"


@pytest.mark.asyncio
@pytest.mark.skipif(
    not live_enabled() or not os.getenv("SOSOVALUE_API_KEY"),
    reason="Set RUN_LIVE_INTEGRATION_TESTS=1 and SOSOVALUE_API_KEY",
)
async def test_live_sosovalue_supported_endpoints():
    client = SoSoValueClient(Settings())

    currencies = await client.list_currencies()
    news = await client.featured_news(page_size=5)
    btc_metrics = await client.current_etf_metrics("us-btc-spot")

    assert currencies
    assert isinstance(news, list)
    assert "dailyNetInflow" in btc_metrics or btc_metrics


@pytest.mark.asyncio
@pytest.mark.skipif(not live_enabled(), reason="Set RUN_LIVE_INTEGRATION_TESTS=1")
async def test_live_sodex_symbols_endpoint():
    symbols = await SoDEXClient(Settings()).spot_symbols()

    assert isinstance(symbols, list)


@pytest.mark.skipif(
    not live_enabled() or not (os.getenv("SETTLEMENT_RPC_URL") or os.getenv("VALUECHAIN_RPC_URL")),
    reason="Set RUN_LIVE_INTEGRATION_TESTS=1 and SETTLEMENT_RPC_URL",
)
def test_live_settlement_chain_id():
    settings = Settings()
    web3 = Web3(Web3.HTTPProvider(settings.settlement_rpc_url))

    assert web3.eth.chain_id == settings.settlement_chain_id
