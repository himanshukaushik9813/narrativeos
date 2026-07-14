from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field


def to_camel(value: str) -> str:
    parts = value.split("_")
    return parts[0] + "".join(part.capitalize() for part in parts[1:])


class ApiModel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class EvidenceItem(ApiModel):
    source: str
    label: str
    value: str
    url: str | None = None
    observed_at: str | None = None


class NarrativeTheme(ApiModel):
    id: str
    title: str
    summary: str
    confidence: int = Field(ge=0, le=100)
    risk: int = Field(ge=0, le=100)
    magnitude: int = Field(ge=0, le=100)
    evidence: list[EvidenceItem]
    metadata: dict[str, Any] = Field(default_factory=dict)


class NarrativesResponse(ApiModel):
    narratives: list[NarrativeTheme]
    snapshot_time: str


class MarketChartPoint(ApiModel):
    t: str
    date: str
    actual: float | None = None
    giga_bull: float | None = None
    bull: float | None = None
    mild: float | None = None
    bear: float | None = None
    mega_bear: float | None = None
    custom: float | None = None


class MarketChartResponse(ApiModel):
    symbol: str
    title: str
    metric: str
    unit: str
    source: str
    snapshot_time: str
    data: list[MarketChartPoint]
    start_index: int
    latest_value: float
    latest_change_pct: float
    path_confidence: dict[str, int]
    source_note: str


class PathLeg(ApiModel):
    leg: int = Field(ge=1, le=10)
    condition: str
    metric_source: str
    comparator: Literal[">", ">=", "<", "<=", "="]
    threshold: str
    window: str
    confidence: int = Field(ge=0, le=100)
    evidence: list[EvidenceItem]


class AgentContext(ApiModel):
    snapshot_time: str
    data_agent: dict[str, Any]
    narrative_agent: dict[str, Any]
    risk_agent: dict[str, Any]
    strategy_agent: dict[str, Any]
    execution_agent: dict[str, Any] = Field(default_factory=dict)
    explainability_agent: dict[str, Any]


class PathContract(ApiModel):
    id: str
    title: str
    theme: str
    structure: Literal["linear"] = "linear"
    legs: list[PathLeg]
    confidence: int = Field(ge=0, le=100)
    risk: int = Field(ge=0, le=100)
    stake_amount: str
    stake_token: Literal["Arbitrum Sepolia ETH"] = "Arbitrum Sepolia ETH"
    creator: str | None = None
    market_address: str | None = None
    terms_hash: str
    onchain_path_id: int | None = None
    tx_hash: str | None = None
    status: Literal["draft", "pending", "published", "resolving", "resolved", "failed"] = "draft"
    agent_context: AgentContext
    market_dna: str


class PathContractsResponse(ApiModel):
    contracts: list[PathContract]


class ProbabilitySignal(ApiModel):
    label: str
    source: str
    score: int = Field(ge=-100, le=100)
    weight: float = Field(ge=0)
    evidence_count: int = Field(ge=0)
    detail: str


class ProbabilityBreakdown(ApiModel):
    signals: list[ProbabilitySignal]
    risk_adjustment: int = Field(ge=-100, le=0)
    raw_score: int = Field(ge=0, le=100)
    probability: int = Field(ge=0, le=100)
    confidence: int = Field(ge=0, le=100)
    risk: int = Field(ge=0, le=100)
    market_sentiment: Literal["bullish", "constructive", "neutral", "defensive", "stressed"]
    expected_reward: str
    historical_match: int = Field(ge=0, le=100)
    updated_at: str


class PricingQuote(ApiModel):
    model: str
    fair_probability: int = Field(ge=0, le=100)
    support_bid: str
    support_ask: str
    oppose_bid: str
    oppose_ask: str
    spread_bps: int = Field(ge=0)
    implied_reward: str
    default_stake_slippage_bps: int = Field(ge=0)
    liquidity_score: int = Field(ge=0, le=100)
    market_depth: Literal["No On-chain Depth", "Thin", "Developing", "Institutional"]
    feedback_loop: str


class LifecycleStage(ApiModel):
    name: Literal[
        "Draft",
        "Simulation",
        "Published",
        "Open For Staking",
        "Active",
        "Settlement",
        "Resolved",
        "Archived",
    ]
    state: Literal["complete", "current", "pending"]


class MarketActionRequest(ApiModel):
    action: Literal["support", "oppose", "watch", "bookmark", "comment", "share"]
    user_address: str | None = None
    leg_index: int | None = Field(default=None, ge=0)
    amount: str | None = None
    tx_hash: str | None = None
    comment: str | None = None


class MarketAction(ApiModel):
    id: str
    contract_id: str
    action: Literal["support", "oppose", "watch", "bookmark", "comment", "share"]
    user_address: str | None = None
    leg_index: int | None = None
    amount: str | None = None
    tx_hash: str | None = None
    comment: str | None = None
    created_at: str


class MarketOrder(ApiModel):
    id: str
    action: Literal["support", "oppose"]
    user_address: str | None = None
    leg_index: int | None = None
    amount: str
    tx_hash: str | None = None
    created_at: str
    direction_label: str
    explorer_url: str | None = None


class MarketPool(ApiModel):
    total_liquidity: str
    support_total: str
    oppose_total: str
    average_entry: str
    largest_position: str
    latest_stake: str
    participant_count: int = Field(ge=0)
    support_share: int = Field(ge=0, le=100)
    oppose_share: int = Field(ge=0, le=100)


class PathMarketView(ApiModel):
    contract_id: str
    title: str
    creator: str | None = None
    status: Literal[
        "Draft",
        "Simulation",
        "Published",
        "Open For Staking",
        "Active",
        "Settlement",
        "Resolved",
        "Archived",
    ]
    probability: int = Field(ge=0, le=100)
    volume: str
    open_interest: str
    total_stakes: str
    stake_token: str
    participants: int = Field(ge=0)
    pool: MarketPool
    latest_orders: list[MarketOrder]
    largest_orders: list[MarketOrder]
    time_remaining: str
    liquidity: Literal["Unavailable", "Low", "Medium", "High"]
    settlement_status: str
    watch_count: int = Field(ge=0)
    bookmark_count: int = Field(ge=0)
    comment_count: int = Field(ge=0)
    lifecycle: list[LifecycleStage]
    probability_breakdown: ProbabilityBreakdown
    pricing: PricingQuote
    evidence: list[EvidenceItem]
    contract: PathContract
    contract_address: str | None = None
    transaction_hash: str | None = None
    network: str
    settlement_block: int | None = None
    verification_status: Literal["Unpublished", "Pending", "Verified"]
    explorer_url: str | None = None
    updated_at: str


class SoDEXMarketContext(ApiModel):
    status: Literal["online", "degraded", "unavailable"]
    spot_symbols: int = Field(ge=0)
    perps_symbols: int = Field(ge=0)
    reference_symbols: list[str]
    note: str
    updated_at: str


class MarketSection(ApiModel):
    name: str
    markets: list[PathMarketView]


class MarketsResponse(ApiModel):
    markets: list[PathMarketView]
    sections: list[MarketSection]
    snapshot_time: str


class PortfolioPosition(ApiModel):
    contract_id: str
    title: str
    side: Literal["support", "oppose"]
    amount: str
    probability: int = Field(ge=0, le=100)
    status: str
    tx_hash: str | None = None


class PortfolioResponse(ApiModel):
    address: str
    active_positions: list[PortfolioPosition]
    resolved_positions: list[PortfolioPosition]
    pending_settlement: list[PortfolioPosition]
    total_staked: str
    roi: str
    win_rate: int = Field(ge=0, le=100)
    current_exposure: str
    portfolio_heatmap: dict[str, str]
    narrative_distribution: dict[str, int]


class CreatorReputation(ApiModel):
    creator: str
    accuracy: int = Field(ge=0, le=100)
    contracts_published: int = Field(ge=0)
    settlement_success: int = Field(ge=0, le=100)
    roi: str
    followers: int = Field(ge=0)
    reputation_score: int = Field(ge=0, le=100)
    consistency: int = Field(ge=0, le=100)
    top_narratives: list[str]
    historical_performance: list[str]


class CreatorLeaderboardResponse(ApiModel):
    creators: list[CreatorReputation]


class HistoricalLearningItem(ApiModel):
    contract_id: str
    outcome: str
    correct_signals: list[str]
    failed_signals: list[str]
    settlement_time: str | None = None
    historical_match: int = Field(ge=0, le=100)
    return_profile: str
    reason_for_success: str
    reason_for_failure: str


class HistoricalLearningResponse(ApiModel):
    history: list[HistoricalLearningItem]


class DraftPathRequest(ApiModel):
    theme_id: str
    stake_amount: str = "0.001"
    creator: str | None = None


class PublishPathRequest(ApiModel):
    contract: PathContract
    tx_hash: str | None = None
    creator: str | None = None
    relay: bool = False


class ResolveLegRequest(ApiModel):
    path_id: int
    leg_index: int
    confirmed: bool
    evidence_hash: str


class HealthResponse(ApiModel):
    ok: bool
    timestamp: str


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()
