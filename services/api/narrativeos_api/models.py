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
    terms_hash: str
    onchain_path_id: int | None = None
    tx_hash: str | None = None
    status: Literal["draft", "pending", "published", "resolving", "resolved", "failed"] = "draft"
    agent_context: AgentContext
    market_dna: str


class PathContractsResponse(ApiModel):
    contracts: list[PathContract]


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
