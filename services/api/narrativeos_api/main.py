from __future__ import annotations

from typing import Literal

import httpx
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
    CreatorLeaderboardResponse,
    HistoricalLearningResponse,
    MarketAction,
    MarketActionRequest,
    MarketChartResponse,
    MarketsResponse,
    NarrativesResponse,
    PathContract,
    PathContractsResponse,
    PortfolioResponse,
    PublishPathRequest,
    ResolveLegRequest,
    SoDEXMarketContext,
    utc_now_iso,
)
from narrativeos_api.protocol import (
    build_markets_response,
    creator_leaderboard,
    historical_learning,
    portfolio_for,
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
        contract.market_address = contract.market_address or settings.path_market_contract_address
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
    tx_hash, onchain_path_id, market_address = executor.publish_linear_path(contract)
    contract.tx_hash = tx_hash
    contract.onchain_path_id = onchain_path_id
    contract.market_address = market_address
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


@app.get("/api/markets", response_model=MarketsResponse)
async def list_markets(
    include_live_candidates: bool = True,
    settings: Settings = Depends(settings_dep),
) -> MarketsResponse:
    contracts = repository.list()
    if include_live_candidates and not contracts:
        try:
            client = SoSoValueClient(settings)
            narratives, context = await run_agent_pipeline(client)
            for theme in narratives[:3]:
                candidate = build_path_contract(theme, "0.001", None, context)
                existing = repository.get(candidate.id)
                if existing is None or existing.status == "draft":
                    repository.upsert(candidate)
        except (SoSoValueError, MissingIntegrationConfig):
            if not contracts:
                raise

    return build_markets_response(repository.list(), repository, settings)


@app.get("/api/markets/{contract_id}")
async def get_market(contract_id: str, settings: Settings = Depends(settings_dep)):
    contract = repository.get(contract_id)
    if contract is None:
        raise HTTPException(status_code=404, detail="Path market not found")
    return build_markets_response([contract], repository, settings).markets[0]


@app.post("/api/markets/{contract_id}/actions", response_model=MarketAction)
async def record_market_action(contract_id: str, request: MarketActionRequest) -> MarketAction:
    contract = repository.get(contract_id)
    if contract is None:
        raise HTTPException(status_code=404, detail="Path market not found")
    if request.action in {"support", "oppose"}:
        if contract.status != "published" or not contract.onchain_path_id:
            raise HTTPException(status_code=400, detail="Stake actions require a published on-chain path")
        if not request.amount:
            raise HTTPException(status_code=400, detail="Stake actions require an amount")
        if not request.tx_hash:
            raise HTTPException(status_code=400, detail="Stake actions require a settlement transaction hash")
    if request.action == "comment" and not request.comment:
        raise HTTPException(status_code=400, detail="Comment actions require comment text")
    return repository.record_market_action(contract_id, request)


@app.get("/api/portfolio/{address}", response_model=PortfolioResponse)
async def get_portfolio(address: str, settings: Settings = Depends(settings_dep)) -> PortfolioResponse:
    return portfolio_for(address, repository, settings)


@app.get("/api/creators/leaderboard", response_model=CreatorLeaderboardResponse)
async def get_creator_leaderboard() -> CreatorLeaderboardResponse:
    return creator_leaderboard(repository)


@app.get("/api/history/learning", response_model=HistoricalLearningResponse)
async def get_historical_learning() -> HistoricalLearningResponse:
    return historical_learning(repository)


@app.get("/api/sodex/spot/symbols")
async def sodex_spot_symbols(settings: Settings = Depends(settings_dep)):
    return {"symbols": await SoDEXClient(settings).spot_symbols()}


@app.get("/api/sodex/context", response_model=SoDEXMarketContext)
async def sodex_market_context(settings: Settings = Depends(settings_dep)) -> SoDEXMarketContext:
    client = SoDEXClient(settings)
    try:
        spot_symbols = await client.spot_symbols()
        try:
            perps_symbols = await client.perps_symbols()
            status: Literal["online", "degraded", "unavailable"] = "online"
        except httpx.HTTPError:
            perps_symbols = []
            status = "degraded"
    except httpx.HTTPError:
        return SoDEXMarketContext(
            status="unavailable",
            spot_symbols=0,
            perps_symbols=0,
            reference_symbols=[],
            note="SoDEX context is unavailable. Path Contract settlement remains on the configured EVM contract; no synthetic exchange data is used.",
            updated_at=utc_now_iso(),
        )

    reference_symbols = _symbol_names(spot_symbols + perps_symbols)[:8]
    return SoDEXMarketContext(
        status=status,
        spot_symbols=len(spot_symbols),
        perps_symbols=len(perps_symbols),
        reference_symbols=reference_symbols,
        note="SoDEX is used as live exchange context for spot/perps availability. Path Contracts publish and settle through the EVM PathMarket contract, not a fabricated SoDEX endpoint.",
        updated_at=utc_now_iso(),
    )


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


def _symbol_names(symbols: list[dict]) -> list[str]:
    names: list[str] = []
    seen = set()
    for symbol in symbols:
        value = (
            symbol.get("symbol")
            or symbol.get("name")
            or symbol.get("market")
            or symbol.get("pair")
        )
        if value is None:
            continue
        text = str(value)
        if text and text not in seen:
            names.append(text)
            seen.add(text)
    return names
