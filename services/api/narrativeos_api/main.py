from __future__ import annotations

from typing import Literal

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from narrativeos_api.agents import build_path_contract, run_agent_pipeline
from narrativeos_api.chart import build_market_chart
from narrativeos_api.clients.sodex import SoDEXClient
from narrativeos_api.clients.sosovalue import SoSoValueClient, SoSoValueError
from narrativeos_api.config import MissingIntegrationConfig, Settings, get_settings
from narrativeos_api.execution import SettlementExecutor
from narrativeos_api.models import (
    DraftPathRequest,
    HealthResponse,
    MarketChartResponse,
    NarrativesResponse,
    PathContract,
    PathContractsResponse,
    PublishPathRequest,
    ResolveLegRequest,
    utc_now_iso,
)
from narrativeos_api.repository import repository

app = FastAPI(title="NarrativeOS Path Market API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


def settings_dep() -> Settings:
    return get_settings()


@app.exception_handler(MissingIntegrationConfig)
async def missing_config_handler(_, exc: MissingIntegrationConfig):
    return JSONResponse(
        status_code=503,
        content={
            "detail": {
                "message": "Live integration configuration is required",
                "missing": exc.missing,
            }
        },
    )


@app.exception_handler(SoSoValueError)
async def sosovalue_error_handler(_, exc: SoSoValueError):
    return JSONResponse(status_code=502, content={"detail": str(exc)})


@app.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    return HealthResponse(ok=True, timestamp=utc_now_iso())


@app.get("/api/narratives/top", response_model=NarrativesResponse)
async def top_narratives(settings: Settings = Depends(settings_dep)) -> NarrativesResponse:
    client = SoSoValueClient(settings)
    narratives, context = await run_agent_pipeline(client)
    return NarrativesResponse(narratives=narratives, snapshot_time=context.snapshot_time)


@app.get("/api/market-chart", response_model=MarketChartResponse)
async def market_chart(
    asset: str = "btc",
    points: int = 54,
    future_points: int = 28,
    settings: Settings = Depends(settings_dep),
) -> MarketChartResponse:
    normalized_asset = asset.lower()
    if normalized_asset not in {"btc", "eth"}:
        raise HTTPException(status_code=400, detail="Only btc and eth ETF chart feeds are supported")

    client = SoSoValueClient(settings)
    history = await client.historical_inflow_chart(f"us-{normalized_asset}-spot")
    return build_market_chart(
        history,
        symbol=normalized_asset.upper(),
        snapshot_time=utc_now_iso(),
        points=max(8, min(points, 90)),
        future_points=max(6, min(future_points, 45)),
    )


@app.post("/api/path-contracts/draft", response_model=PathContract)
async def draft_path_contract(
    request: DraftPathRequest, settings: Settings = Depends(settings_dep)
) -> PathContract:
    client = SoSoValueClient(settings)
    narratives, context = await run_agent_pipeline(client)
    theme = next((item for item in narratives if item.id == request.theme_id), None)
    if theme is None:
        raise HTTPException(status_code=404, detail="Narrative theme not found in current SoSoValue evidence")

    contract = build_path_contract(theme, request.stake_amount, request.creator, context)
    repository.upsert(contract)
    return contract


@app.post("/api/path-contracts/publish", response_model=PathContract)
async def publish_path_contract(
    request: PublishPathRequest, settings: Settings = Depends(settings_dep)
) -> PathContract:
    contract = request.contract.model_copy(deep=True)
    if request.creator:
        contract.creator = request.creator

    if request.tx_hash:
        contract.tx_hash = request.tx_hash
        contract.status = "published"
        contract.agent_context.execution_agent = {
            "mode": "wallet",
            "status": "submitted",
            "tx_hash": request.tx_hash,
        }
        return repository.upsert(contract)

    if not request.relay:
        raise HTTPException(
            status_code=400,
            detail="Provide txHash from a wallet transaction, or set relay=true for server-side testnet settlement publish",
        )

    executor = SettlementExecutor(settings)
    tx_hash, onchain_path_id = executor.publish_linear_path(contract)
    contract.tx_hash = tx_hash
    contract.onchain_path_id = onchain_path_id
    contract.status = "published"
    contract.agent_context.execution_agent = {
        "mode": "server-relay",
        "chain": settings.settlement_chain_name,
        "chain_id": settings.settlement_chain_id,
        "status": "submitted",
        "tx_hash": tx_hash,
        "onchain_path_id": onchain_path_id,
    }
    return repository.upsert(contract)


@app.get("/api/path-contracts", response_model=PathContractsResponse)
async def list_path_contracts(
    status: Literal["draft", "pending", "published", "resolving", "resolved", "failed"] | None = None,
) -> PathContractsResponse:
    return PathContractsResponse(contracts=repository.list(status=status))


@app.get("/api/path-contracts/{path_id}", response_model=PathContract)
async def get_path_contract(path_id: str) -> PathContract:
    contract = repository.get(path_id)
    if contract is None:
        raise HTTPException(status_code=404, detail="Path Contract not found")
    return contract


@app.get("/api/sodex/spot/symbols")
async def sodex_spot_symbols(settings: Settings = Depends(settings_dep)):
    return {"symbols": await SoDEXClient(settings).spot_symbols()}


@app.get("/api/sodex/accounts/{user_address}/state")
async def sodex_account_state(user_address: str, settings: Settings = Depends(settings_dep)):
    return {"state": await SoDEXClient(settings).spot_account_state(user_address)}


@app.post("/api/oracle/resolve")
async def resolve_leg(request: ResolveLegRequest, settings: Settings = Depends(settings_dep)):
    executor = SettlementExecutor(settings)
    tx_hash = executor.resolve_leg(
        request.path_id, request.leg_index, request.confirmed, request.evidence_hash
    )
    return {"txHash": tx_hash, "status": "submitted"}
