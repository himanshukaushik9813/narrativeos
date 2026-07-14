import json

from fastapi.testclient import TestClient

from narrativeos_api.config import Settings
from narrativeos_api.main import app, settings_dep
from narrativeos_api.models import AgentContext, PathContract, PathLeg
from narrativeos_api.repository import repository


def _contract(contract_id: str = "PC-PROTOCOL") -> PathContract:
    return PathContract(
        id=contract_id,
        title="BTC ETF Protocol Market",
        theme="BTC market path",
        legs=[
            PathLeg(
                leg=1,
                condition="BTC spot ETF daily net inflow remains positive",
                metric_source="SoSoValue current ETF data metrics",
                comparator=">",
                threshold="0 USD",
                window="24 hours",
                confidence=78,
                evidence=[
                    {
                        "source": "SoSoValue current ETF data metrics",
                        "label": "BTC spot ETF daily net inflow",
                        "value": "dailyNetInflow=positive",
                    }
                ],
            ),
            PathLeg(
                leg=2,
                condition="BTC remains a matched currency in featured news",
                metric_source="SoSoValue featured news",
                comparator=">=",
                threshold="1 mention",
                window="7 days",
                confidence=72,
                evidence=[
                    {
                        "source": "SoSoValue featured news",
                        "label": "BTC market evidence",
                        "value": "matchedCurrency=BTC",
                    }
                ],
            ),
        ],
        confidence=76,
        risk=24,
        stake_amount="0.001",
        creator="0x1111111111111111111111111111111111111111",
        terms_hash="0x" + "1" * 64,
        onchain_path_id=4,
        tx_hash="0x" + "2" * 64,
        status="published",
        agent_context=AgentContext(
            snapshot_time="2026-06-04T00:00:00+00:00",
            data_agent={"sources": ["SoSoValue"]},
            narrative_agent={"confidence": 76},
            risk_agent={"risk": 24},
            strategy_agent={"supported_structure": "linear"},
            explainability_agent={"style": "Market DNA"},
        ),
        market_dna="Evidence-backed BTC ETF market",
    )


def test_marketplace_probability_and_lifecycle_are_explainable():
    repository.upsert(_contract())
    app.dependency_overrides[settings_dep] = lambda: Settings(
        sosovalue_api_key=None,
        path_market_contract_address="0xc9f3bcb09b41057a105A7b0598962D8738c4cf8A",
        oracle_private_key="0x" + "1" * 64,
    )

    try:
        response = TestClient(app).get("/api/markets?include_live_candidates=false")
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 200
    market = next(item for item in response.json()["markets"] if item["contractId"] == "PC-PROTOCOL")
    assert market["status"] == "Open For Staking"
    assert market["probability"] > 50
    assert market["probabilityBreakdown"]["signals"]
    assert market["pricing"]["model"] == "Evidence-weighted binary path quote v1"
    assert market["pricing"]["supportAsk"]
    assert market["pricing"]["spreadBps"] > 0
    assert market["verificationStatus"] == "Verified"


def test_market_actions_update_portfolio_state():
    repository.upsert(_contract("PC-ACTION"))
    client = TestClient(app)

    action = client.post(
        "/api/markets/PC-ACTION/actions",
        json={
            "action": "support",
            "userAddress": "0x2222222222222222222222222222222222222222",
            "legIndex": 0,
            "amount": "0.002",
            "txHash": "0x" + "3" * 64,
        },
    )
    assert action.status_code == 200

    portfolio = client.get("/api/portfolio/0x2222222222222222222222222222222222222222")
    assert portfolio.status_code == 200
    assert portfolio.json()["totalStaked"] == "0.002"
    assert portfolio.json()["activePositions"][0]["contractId"] == "PC-ACTION"

    market = client.get("/api/markets/PC-ACTION")
    assert market.status_code == 200
    payload = market.json()
    assert payload["pool"]["totalLiquidity"] == "0.002"
    assert payload["pricing"]["liquidityScore"] > 0
    assert "confirmed stake" in payload["pricing"]["feedbackLoop"]


def test_marketplace_response_is_english_only_for_live_sosovalue_names():
    contract = _contract("PC-ENGLISH")
    contract.title = "三星电子 narrative path - linear path"
    contract.theme = "三星电子 narrative path"
    contract.legs[0].condition = "三星电子 appears in SoSoValue featured news evidence"
    contract.legs[0].evidence[0].label = "三星电子 live evidence"
    contract.market_dna = "三星电子 narrative path is supported by live SoSoValue evidence."
    repository.upsert(contract)

    response = TestClient(app).get("/api/markets?include_live_candidates=false")

    assert response.status_code == 200
    market = next(item for item in response.json()["markets"] if item["contractId"] == "PC-ENGLISH")
    serialized = json.dumps(market, ensure_ascii=False)
    assert "三星" not in serialized
    assert market["title"] == "SoSoValue Narrative Path - Linear Path"
    assert market["contract"]["theme"] == "SoSoValue Narrative Path"
