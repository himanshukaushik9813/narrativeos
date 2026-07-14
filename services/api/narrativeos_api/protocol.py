from __future__ import annotations

from decimal import Decimal, InvalidOperation
from typing import Iterable

from narrativeos_api.config import Settings
from narrativeos_api.models import (
    CreatorLeaderboardResponse,
    CreatorReputation,
    EvidenceItem,
    HistoricalLearningItem,
    HistoricalLearningResponse,
    LifecycleStage,
    MarketAction,
    MarketOrder,
    MarketPool,
    MarketSection,
    MarketsResponse,
    PathContract,
    PathMarketView,
    PricingQuote,
    PortfolioPosition,
    PortfolioResponse,
    ProbabilityBreakdown,
    ProbabilitySignal,
    utc_now_iso,
)
from narrativeos_api.repository import PathContractRepository
from narrativeos_api.sanitize import sanitize_path_contract


LIFECYCLE = [
    "Draft",
    "Simulation",
    "Published",
    "Open For Staking",
    "Active",
    "Settlement",
    "Resolved",
    "Archived",
]


def build_markets_response(
    contracts: list[PathContract],
    repository: PathContractRepository,
    settings: Settings,
) -> MarketsResponse:
    markets = [build_market_view(contract, repository.actions_for(contract.id), settings) for contract in contracts]
    return MarketsResponse(
        markets=markets,
        sections=[
            MarketSection(name="Trending Contracts", markets=_sort(markets, "probability")[:6]),
            MarketSection(name="Highest Volume", markets=_sort_by_decimal(markets, "volume")[:6]),
            MarketSection(name="Highest Confidence", markets=sorted(markets, key=lambda item: item.probability_breakdown.confidence, reverse=True)[:6]),
            MarketSection(name="Most Staked", markets=_sort_by_decimal(markets, "total_stakes")[:6]),
            MarketSection(name="Newest", markets=sorted(markets, key=lambda item: item.updated_at, reverse=True)[:6]),
            MarketSection(name="Ending Soon", markets=sorted(markets, key=lambda item: _window_rank(item.time_remaining))[:6]),
            MarketSection(name="Highest Accuracy", markets=sorted(markets, key=lambda item: item.probability_breakdown.historical_match, reverse=True)[:6]),
            MarketSection(name="Most Profitable Creators", markets=_sort_by_decimal(markets, "open_interest")[:6]),
        ],
        snapshot_time=utc_now_iso(),
    )


def build_market_view(
    contract: PathContract,
    actions: list[MarketAction],
    settings: Settings,
) -> PathMarketView:
    contract = sanitize_path_contract(contract)
    breakdown = probability_breakdown(contract, actions)
    support = sum(_amount(action.amount) for action in actions if action.action == "support")
    oppose = sum(_amount(action.amount) for action in actions if action.action == "oppose")
    total_stakes = support + oppose
    stake_actions = [action for action in actions if action.action in {"support", "oppose"}]
    participants = {
        action.user_address.lower()
        for action in actions
        if action.user_address and action.action in {"support", "oppose", "watch", "bookmark", "comment"}
    }
    status = lifecycle_status(contract, actions)
    updated_at = _latest_update(contract, actions)
    liquidity_score = _liquidity_score(total_stakes, len(participants), len(stake_actions), bool(contract.onchain_path_id), support, oppose)
    pricing = pricing_quote(breakdown, support, oppose, stake_actions, liquidity_score, bool(contract.onchain_path_id))
    explorer_url = (
        f"{settings.settlement_explorer_url.rstrip('/')}/tx/{contract.tx_hash}"
        if contract.tx_hash
        else None
    )

    return PathMarketView(
        contract_id=contract.id,
        title=contract.title,
        creator=contract.creator,
        status=status,
        probability=breakdown.probability,
        volume=_format_amount(total_stakes),
        open_interest=_format_amount(abs(support - oppose)),
        total_stakes=_format_amount(total_stakes),
        stake_token=contract.stake_token,
        participants=len(participants),
        pool=_pool(support, oppose, stake_actions),
        latest_orders=_orders(stake_actions, settings)[:10],
        largest_orders=sorted(
            _orders(stake_actions, settings),
            key=lambda item: _amount(item.amount),
            reverse=True,
        )[:5],
        time_remaining=_time_remaining(contract),
        liquidity=_liquidity_from_score(liquidity_score),
        settlement_status=_settlement_status(contract, status),
        watch_count=sum(1 for action in actions if action.action == "watch"),
        bookmark_count=sum(1 for action in actions if action.action == "bookmark"),
        comment_count=sum(1 for action in actions if action.action == "comment"),
        lifecycle=_lifecycle(status),
        probability_breakdown=breakdown,
        pricing=pricing,
        evidence=_contract_evidence(contract),
        contract=contract,
        contract_address=contract.market_address or settings.path_market_contract_address,
        transaction_hash=contract.tx_hash,
        network=settings.settlement_chain_name,
        settlement_block=None,
        verification_status="Verified" if contract.tx_hash else ("Pending" if contract.status == "published" else "Unpublished"),
        explorer_url=explorer_url,
        updated_at=updated_at,
    )


def probability_breakdown(contract: PathContract, actions: list[MarketAction]) -> ProbabilityBreakdown:
    evidence = _contract_evidence(contract)
    etf_evidence = [item for item in evidence if "ETF" in item.source.upper() or "ETF" in item.value.upper()]
    news_evidence = [item for item in evidence if "NEWS" in item.source.upper()]
    matched_asset_evidence = [
        item for item in evidence if "matchedCurrency" in item.value or "currency" in item.value.lower()
    ]
    support = sum(_amount(action.amount) for action in actions if action.action == "support")
    oppose = sum(_amount(action.amount) for action in actions if action.action == "oppose")
    total_stakes = support + oppose
    support_ratio = Decimal("0.5") if total_stakes == 0 else support / total_stakes

    leg_confidence = (
        sum(leg.confidence for leg in contract.legs) / len(contract.legs)
        if contract.legs
        else contract.confidence
    )
    onchain_depth = _depth_factor(total_stakes, len([action for action in actions if action.action in {"support", "oppose"}]))
    evidence_quality = min(100, round(len(evidence) * 9 + leg_confidence * 0.34))
    etf_component = min(100, round(len(etf_evidence) * 18 + leg_confidence * 0.35))
    velocity_component = min(100, round(len(news_evidence) * 12 + contract.confidence * 0.32))
    asset_component = min(100, round(len(matched_asset_evidence) * 18 + contract.confidence * 0.24))
    agent_component = min(100, round((contract.confidence * 0.7) + (evidence_quality * 0.3)))
    market_component = round(float(support_ratio) * 100)

    market_weight = min(0.22, onchain_depth * 0.22)
    evidence_weight = 0.34
    agent_weight = 0.28
    etf_weight = 0.08 if etf_evidence else 0.03
    velocity_weight = 0.12
    asset_weight = 0.08 if matched_asset_evidence else 0.03
    base_weight = evidence_weight + agent_weight + etf_weight + velocity_weight + asset_weight + market_weight
    weighted_probability = (
        (evidence_quality * evidence_weight)
        + (agent_component * agent_weight)
        + (etf_component * etf_weight)
        + (velocity_component * velocity_weight)
        + (asset_component * asset_weight)
        + (market_component * market_weight)
    ) / base_weight
    risk_adjustment = -min(18, round(contract.risk * 0.14))
    raw_score = max(0, min(100, round(weighted_probability + 8 + risk_adjustment)))
    probability = max(3, min(97, raw_score))
    confidence = max(0, min(100, round(contract.confidence * 0.64 + evidence_quality * 0.21 + (onchain_depth * 100) * 0.15)))
    risk = max(0, min(100, round(contract.risk * 0.72 + (100 - confidence) * 0.28)))

    signals = [
        ProbabilitySignal(
            label="ETF Flow",
            source="SoSoValue ETF metrics and historical ETF inflows",
            score=round(etf_component - 50),
            weight=etf_weight,
            evidence_count=len(etf_evidence),
            detail="Deterministic score from cited ETF metric count and leg confidence; no external ETF assumptions.",
        ),
        ProbabilitySignal(
            label="Narrative Velocity",
            source="SoSoValue featured news",
            score=round(velocity_component - 50),
            weight=velocity_weight,
            evidence_count=len(news_evidence),
            detail="Measures repeated SoSoValue featured-news tags, categories, and source persistence.",
        ),
        ProbabilitySignal(
            label="Matched Asset Persistence",
            source="SoSoValue matched currencies",
            score=round(asset_component - 50),
            weight=asset_weight,
            evidence_count=len(matched_asset_evidence),
            detail="Rewards recurring matched-currency evidence.",
        ),
        ProbabilitySignal(
            label="On-chain Market Feedback",
            source="Confirmed testnet stake transactions",
            score=round((market_component - 50) * onchain_depth),
            weight=market_weight,
            evidence_count=len(actions),
            detail="Weights support/oppose ratio only when confirmed stake depth exists, limiting thin-market distortion.",
        ),
        ProbabilitySignal(
            label="Agent Evidence Quality",
            source="Multi-agent confidence and evidence breadth",
            score=round(agent_component - 50),
            weight=agent_weight,
            evidence_count=len(evidence),
            detail="Combines agent confidence with cited evidence breadth; this is explicit, deterministic, and auditable.",
        ),
    ]

    return ProbabilityBreakdown(
        signals=signals,
        risk_adjustment=risk_adjustment,
        raw_score=raw_score,
        probability=probability,
        confidence=confidence,
        risk=risk,
        market_sentiment=_sentiment(probability),
        expected_reward=_reward_multiple(Decimal(probability) / Decimal(100)),
        historical_match=max(0, min(100, round(contract.confidence + len(evidence) * 1.2 - contract.risk * 0.15))),
        updated_at=utc_now_iso(),
    )


def pricing_quote(
    breakdown: ProbabilityBreakdown,
    support: Decimal,
    oppose: Decimal,
    stake_actions: list[MarketAction],
    liquidity_score: int,
    is_onchain: bool,
) -> PricingQuote:
    probability = Decimal(breakdown.probability) / Decimal(100)
    total = support + oppose
    imbalance = Decimal(0) if total == 0 else abs(support - oppose) / total
    depth_penalty = Decimal(100 - liquidity_score) * Decimal("8")
    imbalance_penalty = imbalance * Decimal(650)
    spread_bps = int(max(80, min(2500, Decimal(120) + depth_penalty + imbalance_penalty)))
    half_spread = Decimal(spread_bps) / Decimal(20000)
    support_bid = _clamp_price(probability - half_spread)
    support_ask = _clamp_price(probability + half_spread)
    oppose_mid = Decimal(1) - probability
    oppose_bid = _clamp_price(oppose_mid - half_spread)
    oppose_ask = _clamp_price(oppose_mid + half_spread)
    slippage_bps = _slippage_bps(Decimal("0.001"), total, liquidity_score)
    depth = _market_depth(liquidity_score, is_onchain)
    return PricingQuote(
        model="Evidence-weighted binary path quote v1",
        fair_probability=breakdown.probability,
        support_bid=_format_price(support_bid),
        support_ask=_format_price(support_ask),
        oppose_bid=_format_price(oppose_bid),
        oppose_ask=_format_price(oppose_ask),
        spread_bps=spread_bps,
        implied_reward=_reward_multiple(support_ask),
        default_stake_slippage_bps=slippage_bps,
        liquidity_score=liquidity_score,
        market_depth=depth,
        feedback_loop=_feedback_loop(total, stake_actions, liquidity_score),
    )


def lifecycle_status(contract: PathContract, actions: list[MarketAction]):
    if contract.status == "resolved":
        return "Resolved"
    if contract.status == "resolving":
        return "Settlement"
    if contract.status == "failed":
        return "Archived"
    if actions and any(action.action in {"support", "oppose"} for action in actions):
        return "Active"
    if contract.status == "published" and contract.onchain_path_id:
        return "Open For Staking"
    if contract.status == "published":
        return "Published"
    return "Simulation" if contract.legs else "Draft"


def portfolio_for(address: str, repository: PathContractRepository, settings: Settings) -> PortfolioResponse:
    normalized = address.lower()
    markets = [
        build_market_view(contract, repository.actions_for(contract.id), settings)
        for contract in repository.list()
    ]
    positions: list[PortfolioPosition] = []
    for market in markets:
        for action in repository.actions_for(market.contract_id):
            if action.user_address and action.user_address.lower() == normalized and action.action in {"support", "oppose"}:
                positions.append(
                    PortfolioPosition(
                        contract_id=market.contract_id,
                        title=market.title,
                        side=action.action,
                        amount=action.amount or "0",
                        probability=market.probability,
                        status=market.status,
                        tx_hash=action.tx_hash,
                    )
                )
    total = sum(_amount(position.amount) for position in positions)
    active = [position for position in positions if position.status in {"Open For Staking", "Active", "Published"}]
    pending = [position for position in positions if position.status == "Settlement"]
    resolved = [position for position in positions if position.status in {"Resolved", "Archived"}]
    distribution: dict[str, int] = {}
    for position in positions:
        distribution[position.title] = distribution.get(position.title, 0) + 1
    heatmap = {
        "support": _format_amount(sum(_amount(position.amount) for position in positions if position.side == "support")),
        "oppose": _format_amount(sum(_amount(position.amount) for position in positions if position.side == "oppose")),
        "active": str(len(active)),
        "pending": str(len(pending)),
    }
    return PortfolioResponse(
        address=address,
        active_positions=active,
        resolved_positions=resolved,
        pending_settlement=pending,
        total_staked=_format_amount(total),
        roi="0.00x" if not resolved else "1.00x",
        win_rate=0 if not resolved else 50,
        current_exposure=_format_amount(total),
        portfolio_heatmap=heatmap,
        narrative_distribution=distribution,
    )


def creator_leaderboard(repository: PathContractRepository) -> CreatorLeaderboardResponse:
    creators: dict[str, list[PathContract]] = {}
    for contract in repository.list():
        creator = contract.creator or "server-relay"
        creators.setdefault(creator, []).append(contract)

    reputations = []
    for creator, contracts in creators.items():
        published = [contract for contract in contracts if contract.status in {"published", "resolving", "resolved"}]
        avg_confidence = round(sum(contract.confidence for contract in contracts) / max(1, len(contracts)))
        avg_risk = round(sum(contract.risk for contract in contracts) / max(1, len(contracts)))
        reputations.append(
            CreatorReputation(
                creator=creator,
                accuracy=max(0, min(100, avg_confidence - round(avg_risk * 0.25))),
                contracts_published=len(published),
                settlement_success=0 if not published else 100,
                roi="0.00x",
                followers=sum(len(repository.actions_for(contract.id)) for contract in contracts),
                reputation_score=max(0, min(100, avg_confidence + len(published) * 3 - avg_risk // 5)),
                consistency=max(0, min(100, 100 - avg_risk)),
                top_narratives=[contract.theme for contract in contracts[:3]],
                historical_performance=[
                    f"{contract.id}: {contract.status}, confidence {contract.confidence}%"
                    for contract in contracts[:5]
                ],
            )
        )
    return CreatorLeaderboardResponse(
        creators=sorted(reputations, key=lambda item: item.reputation_score, reverse=True)
    )


def historical_learning(repository: PathContractRepository) -> HistoricalLearningResponse:
    items = []
    for contract in repository.list():
        if contract.status not in {"resolved", "failed"}:
            continue
        evidence_labels = [item.label for item in _contract_evidence(contract)]
        items.append(
            HistoricalLearningItem(
                contract_id=contract.id,
                outcome="resolved" if contract.status == "resolved" else "failed",
                correct_signals=evidence_labels[:3],
                failed_signals=[] if contract.status == "resolved" else evidence_labels[-3:],
                settlement_time=None,
                historical_match=max(0, min(100, contract.confidence - contract.risk // 4)),
                return_profile="Derived from claimable PathMarket outcome after oracle resolution.",
                reason_for_success="Resolved legs matched their cited SoSoValue evidence." if contract.status == "resolved" else "",
                reason_for_failure="One or more legs failed against cited evidence." if contract.status == "failed" else "",
            )
        )
    return HistoricalLearningResponse(history=items)


def _contract_evidence(contract: PathContract) -> list[EvidenceItem]:
    evidence: list[EvidenceItem] = []
    seen = set()
    for leg in contract.legs:
        for item in leg.evidence:
            key = (item.source, item.label, item.value, item.url)
            if key not in seen:
                evidence.append(item)
                seen.add(key)
    return evidence


def _lifecycle(current: str) -> list[LifecycleStage]:
    current_index = LIFECYCLE.index(current)
    stages = []
    for index, name in enumerate(LIFECYCLE):
        state = "current" if index == current_index else "complete" if index < current_index else "pending"
        stages.append(LifecycleStage(name=name, state=state))
    return stages


def _settlement_status(contract: PathContract, status: str) -> str:
    if status == "Resolved":
        return "Resolved by oracle"
    if status == "Settlement":
        return "Oracle review in progress"
    if contract.tx_hash:
        return "Pending oracle evidence"
    return "Publish required"


def _time_remaining(contract: PathContract) -> str:
    windows = []
    for leg in contract.legs:
        digits = "".join(character for character in leg.window if character.isdigit())
        if digits:
            windows.append(int(digits))
    if not windows:
        return "Evidence window unset"
    return f"{max(windows)} days"


def _latest_update(contract: PathContract, actions: list[MarketAction]) -> str:
    if actions:
        return max(action.created_at for action in actions)
    return contract.agent_context.snapshot_time


def _liquidity_from_score(score: int):
    if score == 0:
        return "Unavailable"
    if score >= 75:
        return "High"
    if score >= 42:
        return "Medium"
    return "Low"


def _liquidity_score(
    total: Decimal,
    participants: int,
    order_count: int,
    is_onchain: bool,
    support: Decimal,
    oppose: Decimal,
) -> int:
    if not is_onchain:
        return 0
    depth = min(42, int((total / Decimal("0.025")) * Decimal(42))) if total > 0 else 0
    crowd = min(24, participants * 4)
    activity = min(18, order_count * 3)
    balance = 0
    if total > 0:
        support_share = support / total
        balance = max(0, 16 - int(abs(support_share - Decimal("0.5")) * Decimal(32)))
    return max(1, min(100, depth + crowd + activity + balance))


def _depth_factor(total: Decimal, order_count: int) -> float:
    if total <= 0 or order_count <= 0:
        return 0.0
    total_factor = min(1.0, float(total / Decimal("0.02")))
    order_factor = min(1.0, order_count / 8)
    return max(0.0, min(1.0, (total_factor * 0.62) + (order_factor * 0.38)))


def _market_depth(score: int, is_onchain: bool):
    if not is_onchain:
        return "No On-chain Depth"
    if score >= 78:
        return "Institutional"
    if score >= 45:
        return "Developing"
    return "Thin"


def _feedback_loop(total: Decimal, actions: list[MarketAction], liquidity_score: int) -> str:
    order_count = len([action for action in actions if action.action in {"support", "oppose"}])
    if total == 0 or order_count == 0:
        return "No confirmed stake feedback yet; quote is driven by SoSoValue evidence and agent confidence only."
    return (
        f"{order_count} confirmed stake transaction{'s' if order_count != 1 else ''} "
        f"feed back into probability with liquidity score {liquidity_score}/100."
    )


def _slippage_bps(default_stake: Decimal, total: Decimal, liquidity_score: int) -> int:
    if total <= 0:
        return 2500
    depth_ratio = default_stake / (total + default_stake)
    liquidity_discount = Decimal(100 - liquidity_score) / Decimal(100)
    return int(max(15, min(2500, (depth_ratio * Decimal(10000) * (Decimal("0.35") + liquidity_discount)))))


def _reward_multiple(price: Decimal) -> str:
    clamped = _clamp_price(price)
    return f"{(Decimal(1) / clamped).quantize(Decimal('0.01'))}x"


def _clamp_price(value: Decimal) -> Decimal:
    return max(Decimal("0.01"), min(Decimal("0.99"), value))


def _format_price(value: Decimal) -> str:
    return format(_clamp_price(value).quantize(Decimal("0.0001")), "f")


def _pool(support: Decimal, oppose: Decimal, actions: list[MarketAction]) -> MarketPool:
    total = support + oppose
    stake_actions = [action for action in actions if _amount(action.amount) > 0]
    largest = max((_amount(action.amount) for action in stake_actions), default=Decimal(0))
    latest = _amount(stake_actions[-1].amount) if stake_actions else Decimal(0)
    average = total / Decimal(len(stake_actions)) if stake_actions else Decimal(0)
    support_share = 0 if total == 0 else round((support / total) * 100)
    oppose_share = 0 if total == 0 else 100 - support_share
    participants = {
        action.user_address.lower()
        for action in stake_actions
        if action.user_address
    }
    return MarketPool(
        total_liquidity=_format_amount(total),
        support_total=_format_amount(support),
        oppose_total=_format_amount(oppose),
        average_entry=_format_amount(average),
        largest_position=_format_amount(largest),
        latest_stake=_format_amount(latest),
        participant_count=len(participants),
        support_share=support_share,
        oppose_share=oppose_share,
    )


def _orders(actions: list[MarketAction], settings: Settings) -> list[MarketOrder]:
    explorer = settings.settlement_explorer_url.rstrip("/")
    orders = [
        MarketOrder(
            id=action.id,
            action=action.action,  # type: ignore[arg-type]
            user_address=action.user_address,
            leg_index=action.leg_index,
            amount=action.amount or "0",
            tx_hash=action.tx_hash,
            created_at=action.created_at,
            direction_label="Support Thesis" if action.action == "support" else "Oppose Thesis",
            explorer_url=f"{explorer}/tx/{action.tx_hash}" if action.tx_hash else None,
        )
        for action in actions
        if action.action in {"support", "oppose"}
    ]
    return sorted(orders, key=lambda item: item.created_at, reverse=True)


def _sentiment(probability: int):
    if probability >= 75:
        return "bullish"
    if probability >= 62:
        return "constructive"
    if probability >= 45:
        return "neutral"
    if probability >= 30:
        return "defensive"
    return "stressed"


def _sort(markets: list[PathMarketView], field: str) -> list[PathMarketView]:
    return sorted(markets, key=lambda item: getattr(item, field), reverse=True)


def _sort_by_decimal(markets: list[PathMarketView], field: str) -> list[PathMarketView]:
    return sorted(markets, key=lambda item: _amount(getattr(item, field)), reverse=True)


def _window_rank(value: str) -> int:
    digits = "".join(character for character in value if character.isdigit())
    return int(digits) if digits else 999


def _format_amount(value: Decimal) -> str:
    if value == 0:
        return "0"
    return format(value.quantize(Decimal("0.000001")).normalize(), "f")


def _amount(value: str | None) -> Decimal:
    if not value:
        return Decimal(0)
    try:
        return Decimal(value)
    except (InvalidOperation, ValueError):
        return Decimal(0)
