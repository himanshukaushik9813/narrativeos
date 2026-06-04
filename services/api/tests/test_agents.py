from narrativeos_api.agents import build_narratives, build_path_contract
from narrativeos_api.models import AgentContext


def test_agent_context_is_preserved_when_building_contract():
    news = [
        {
            "id": "n1",
            "sourceLink": "https://sosovalue.xyz/research/1",
            "releaseTime": 1710000000000,
            "tags": ["RWA", "ETF"],
            "matchedCurrencies": [{"name": "ETH"}],
            "quoteInfo": {"impressionCount": 500, "likeCount": 20},
            "multilanguageContent": [{"language": "en", "title": "RWA flows accelerate"}],
        },
        {
            "id": "n2",
            "sourceLink": "https://sosovalue.xyz/research/2",
            "releaseTime": 1710000001000,
            "tags": ["RWA"],
            "matchedCurrencies": [{"name": "ETH"}],
            "quoteInfo": {"impressionCount": 100},
            "multilanguageContent": [{"language": "en", "title": "RWA tokens gain attention"}],
        },
    ]
    themes = build_narratives(
        news=news,
        btc_current={},
        eth_current={"dailyNetInflow": {"value": 1000}, "cumNetInflow": {"value": 5000}},
        btc_history=[],
        eth_history=[{"totalNetInflow": 1000}, {"totalNetInflow": 2000}, {"totalNetInflow": -500}],
        snapshot_time="2026-05-24T00:00:00+00:00",
    )
    context = AgentContext(
        snapshot_time="2026-05-24T00:00:00+00:00",
        data_agent={"featured_news": 2},
        narrative_agent={"dominant_theme": themes[0].title},
        risk_agent={"theme_risks": {themes[0].id: themes[0].risk}},
        strategy_agent={"supported_structure": "linear"},
        explainability_agent={"style": "Market DNA"},
    )

    contract = build_path_contract(themes[0], "0.01", "0xabc", context)

    assert contract.structure == "linear"
    assert len(contract.legs) == 3
    assert contract.agent_context.data_agent["featured_news"] == 2
    assert contract.agent_context.strategy_agent["supported_structure"] == "linear"
    assert contract.agent_context.strategy_agent["suggested_contract"]["stake_token"] == "Arbitrum Sepolia ETH"
    assert contract.terms_hash.startswith("0x")
