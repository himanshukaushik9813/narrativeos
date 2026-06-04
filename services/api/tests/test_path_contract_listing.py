from fastapi.testclient import TestClient

from narrativeos_api.main import app
from narrativeos_api.models import AgentContext, PathContract, PathLeg
from narrativeos_api.repository import repository


def test_published_path_contracts_are_listed_for_order_execution():
    contract = PathContract(
        id="PC-LISTED",
        title="Listed Market",
        theme="Listed theme",
        legs=[
            PathLeg(
                leg=1,
                condition="BTC ETF flow remains positive",
                metric_source="SoSoValue historical ETF inflow chart",
                comparator=">",
                threshold="0 USD",
                window="24 hours",
                confidence=75,
                evidence=[],
            )
        ],
        confidence=75,
        risk=25,
        stake_amount="0.001",
        creator="0x1111111111111111111111111111111111111111",
        terms_hash="0x" + "1" * 64,
        onchain_path_id=42,
        tx_hash="0x" + "2" * 64,
        status="published",
        agent_context=AgentContext(
            snapshot_time="2026-06-04T00:00:00+00:00",
            data_agent={},
            narrative_agent={},
            risk_agent={},
            strategy_agent={},
            explainability_agent={},
        ),
        market_dna="Listed for user staking",
    )
    repository.upsert(contract)

    response = TestClient(app).get("/api/path-contracts?status=published")

    assert response.status_code == 200
    listed = response.json()["contracts"]
    assert any(item["id"] == "PC-LISTED" and item["onchainPathId"] == 42 for item in listed)
