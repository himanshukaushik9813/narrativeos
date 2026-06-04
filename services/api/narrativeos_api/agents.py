from __future__ import annotations

import asyncio
import html
import json
import re
from collections import Counter, defaultdict
from decimal import Decimal, InvalidOperation
from typing import Any

from web3 import Web3

from narrativeos_api.clients.sosovalue import SoSoValueClient
from narrativeos_api.models import (
    AgentContext,
    EvidenceItem,
    NarrativeTheme,
    PathContract,
    PathLeg,
    utc_now_iso,
)

TAG_STOPLIST = {
    "BTC",
    "ETH",
    "USDT",
    "USDC",
    "SEC",
    "CRYPTO",
    "MARKET",
    "PRICE",
}


async def run_agent_pipeline(client: SoSoValueClient) -> tuple[list[NarrativeTheme], AgentContext]:
    snapshot_time = utc_now_iso()
    currencies, news, btc_current, eth_current, btc_history, eth_history = await asyncio.gather(
        client.list_currencies(),
        client.featured_news(page_num=1, page_size=30),
        client.current_etf_metrics("us-btc-spot"),
        client.current_etf_metrics("us-eth-spot"),
        client.historical_inflow_chart("us-btc-spot"),
        client.historical_inflow_chart("us-eth-spot"),
    )

    data_agent = {
        "currencies": len(currencies),
        "featured_news": len(news),
        "etf_feeds": ["us-btc-spot", "us-eth-spot"],
        "sources": [
            "SoSoValue listed currencies",
            "SoSoValue featured news",
            "SoSoValue current ETF metrics",
            "SoSoValue historical ETF inflow chart",
        ],
    }

    themes = build_narratives(news, btc_current, eth_current, btc_history, eth_history, snapshot_time)
    narrative_agent = {
        "ranked_theme_ids": [theme.id for theme in themes],
        "dominant_theme": themes[0].title if themes else None,
        "confidence": themes[0].confidence if themes else 0,
    }
    risk_agent = {
        "risk_model": "100 - confidence, adjusted by evidence breadth",
        "theme_risks": {theme.id: theme.risk for theme in themes},
    }

    context = AgentContext(
        snapshot_time=snapshot_time,
        data_agent=data_agent,
        narrative_agent=narrative_agent,
        risk_agent=risk_agent,
        strategy_agent={"supported_structure": "linear", "leg_count": 3},
        explainability_agent={
            "style": "Market DNA",
            "evidence_rule": "Only fields returned by supported SoSoValue endpoints are cited.",
        },
    )
    return themes, context


def build_narratives(
    news: list[dict[str, Any]],
    btc_current: dict[str, Any],
    eth_current: dict[str, Any],
    btc_history: list[dict[str, Any]],
    eth_history: list[dict[str, Any]],
    snapshot_time: str,
) -> list[NarrativeTheme]:
    tag_counts: Counter[str] = Counter()
    currency_counts: Counter[str] = Counter()
    engagement: Counter[str] = Counter()
    evidence: dict[str, list[EvidenceItem]] = defaultdict(list)

    for item in news:
        title = _title(item)
        source_link = item.get("sourceLink")
        observed_at = _release_time(item)
        quote_score = _quote_score(item)

        for tag in _tags(item):
            key = f"tag:{tag}"
            tag_counts[tag] += 1
            engagement[key] += quote_score
            evidence[key].append(
                EvidenceItem(
                    source="SoSoValue featured news",
                    label=title or f"{tag} mention",
                    value=f"tag={tag}",
                    url=source_link,
                    observed_at=observed_at,
                )
            )

        for currency in _matched_currencies(item):
            symbol = currency.upper()
            key = f"currency:{symbol}"
            currency_counts[symbol] += 1
            engagement[key] += quote_score
            evidence[key].append(
                EvidenceItem(
                    source="SoSoValue featured news",
                    label=title or f"{symbol} mention",
                    value=f"matchedCurrency={symbol}",
                    url=source_link,
                    observed_at=observed_at,
                )
            )

    themes: list[NarrativeTheme] = []
    for tag, count in tag_counts.most_common(8):
        key = f"tag:{tag}"
        if tag.upper() in TAG_STOPLIST:
            continue
        themes.append(
            _theme_from_counts(
                key=key,
                title=f"{tag} narrative path",
                summary=(
                    f"SoSoValue featured news is clustering around {tag}. "
                    f"The v1 path uses tag frequency, source engagement, and category persistence as legs."
                ),
                count=count,
                engagement_score=engagement[key],
                evidence=evidence[key],
                snapshot_time=snapshot_time,
            )
        )

    for symbol, count in currency_counts.most_common(8):
        key = f"currency:{symbol}"
        themes.append(
            _theme_from_counts(
                key=key,
                title=f"{symbol} market path",
                summary=(
                    f"SoSoValue matched-currency evidence is concentrated on {symbol}. "
                    f"The v1 path converts that live attention into a 3-leg sequence contract."
                ),
                count=count,
                engagement_score=engagement[key],
                evidence=evidence[key],
                snapshot_time=snapshot_time,
            )
        )

    if btc_current or btc_history:
        themes.append(_theme_from_etf("BTC", btc_current, btc_history, snapshot_time))
    if eth_current or eth_history:
        themes.append(_theme_from_etf("ETH", eth_current, eth_history, snapshot_time))

    return sorted(
        [theme for theme in themes if theme.evidence],
        key=lambda item: (item.confidence, item.magnitude),
        reverse=True,
    )[:3]


def build_path_contract(
    theme: NarrativeTheme,
    stake_amount: str,
    creator: str | None,
    context: AgentContext,
) -> PathContract:
    metadata = theme.metadata
    kind = metadata.get("kind", "signal")
    key = metadata.get("key", theme.title)
    observed_count = int(metadata.get("count") or 1)
    engagement_score = int(metadata.get("engagement") or 0)
    etf_flow = _decimal_from_any(metadata.get("three_day_net_inflow"))

    if kind == "etf":
        asset = str(metadata.get("asset") or key)
        legs = [
            PathLeg(
                leg=1,
                condition=f"{asset} spot ETF daily net inflow remains positive",
                metric_source="SoSoValue current ETF data metrics",
                comparator=">",
                threshold="0 USD",
                window="24 hours",
                confidence=max(35, theme.confidence - 5),
                evidence=theme.evidence[:2],
            ),
            PathLeg(
                leg=2,
                condition=f"{asset} spot ETF 3-day net inflow holds above observed baseline",
                metric_source="SoSoValue historical ETF inflow chart",
                comparator=">=",
                threshold=f"{_format_usd(etf_flow)}",
                window="3 days",
                confidence=max(30, theme.confidence - 12),
                evidence=theme.evidence,
            ),
            PathLeg(
                leg=3,
                condition=f"{asset} remains a matched currency in SoSoValue featured news",
                metric_source="SoSoValue featured news",
                comparator=">=",
                threshold="1 mention",
                window="7 days",
                confidence=max(25, theme.confidence - 18),
                evidence=theme.evidence[:3],
            ),
        ]
    else:
        readable_key = key.replace("tag:", "").replace("currency:", "")
        legs = [
            PathLeg(
                leg=1,
                condition=f"{readable_key} appears in SoSoValue featured news evidence",
                metric_source="SoSoValue featured news",
                comparator=">=",
                threshold=f"{max(1, observed_count)} mentions",
                window="24 hours",
                confidence=max(35, theme.confidence - 4),
                evidence=theme.evidence[:2],
            ),
            PathLeg(
                leg=2,
                condition=f"{readable_key} source engagement stays above observed baseline",
                metric_source="SoSoValue quoteInfo engagement",
                comparator=">=",
                threshold=f"{max(1, engagement_score)} interactions",
                window="3 days",
                confidence=max(30, theme.confidence - 11),
                evidence=theme.evidence[:3],
            ),
            PathLeg(
                leg=3,
                condition=f"{readable_key} remains present across SoSoValue news categories",
                metric_source="SoSoValue featured news categories",
                comparator=">=",
                threshold=f"{max(1, observed_count // 2)} category-matched items",
                window="7 days",
                confidence=max(25, theme.confidence - 17),
                evidence=theme.evidence[:3],
            ),
        ]

    strategy_context = context.model_copy(
        update={
            "strategy_agent": {
                **context.strategy_agent,
                "suggested_contract": {
                    "title": f"{theme.title} - linear path",
                    "structure": "linear",
                    "payout_model": "graduated_per_leg",
                    "stake_token": "Arbitrum Sepolia ETH",
                },
            },
            "explainability_agent": {
                **context.explainability_agent,
                "summary": _market_dna(theme, legs),
            },
        }
    )

    payload_for_hash = {
        "title": f"{theme.title} - linear path",
        "theme": theme.title,
        "structure": "linear",
        "legs": [leg.model_dump(mode="json", by_alias=True) for leg in legs],
        "stakeAmount": stake_amount,
        "stakeToken": "Arbitrum Sepolia ETH",
        "creator": creator,
        "snapshotTime": context.snapshot_time,
    }
    terms_hash = "0x" + Web3.keccak(
        text=json.dumps(payload_for_hash, sort_keys=True, separators=(",", ":"))
    ).hex()
    path_id = f"PC-{terms_hash[2:10].upper()}"

    return PathContract(
        id=path_id,
        title=f"{theme.title} - linear path",
        theme=theme.title,
        legs=legs,
        confidence=theme.confidence,
        risk=theme.risk,
        stake_amount=stake_amount,
        creator=creator,
        terms_hash=terms_hash,
        status="draft",
        agent_context=strategy_context,
        market_dna=_market_dna(theme, legs),
    )


def _theme_from_counts(
    key: str,
    title: str,
    summary: str,
    count: int,
    engagement_score: int,
    evidence: list[EvidenceItem],
    snapshot_time: str,
) -> NarrativeTheme:
    confidence = min(92, 38 + min(34, count * 8) + min(20, engagement_score // 50))
    breadth_bonus = min(12, len({item.source for item in evidence}) * 4 + min(8, len(evidence)))
    confidence = min(94, confidence + breadth_bonus)
    risk = max(6, min(82, 100 - confidence + (10 if count < 2 else 0)))
    magnitude = min(100, count * 12 + min(45, engagement_score // 20))

    return NarrativeTheme(
        id=_slug(key),
        title=title,
        summary=summary,
        confidence=confidence,
        risk=risk,
        magnitude=magnitude,
        evidence=evidence[:5],
        metadata={
            "kind": "news",
            "key": key,
            "count": count,
            "engagement": engagement_score,
            "snapshot_time": snapshot_time,
        },
    )


def _theme_from_etf(
    asset: str,
    current: dict[str, Any],
    history: list[dict[str, Any]],
    snapshot_time: str,
) -> NarrativeTheme:
    daily = _nested_decimal(current, "dailyNetInflow")
    cumulative = _nested_decimal(current, "cumNetInflow")
    latest_rows = history[:3]
    three_day = sum((_decimal_from_any(row.get("totalNetInflow")) for row in latest_rows), Decimal("0"))
    direction = "inflow" if three_day >= 0 else "outflow"
    confidence = 52 + min(25, int(abs(three_day) / Decimal("50000000"))) if three_day else 48
    confidence = max(25, min(88, confidence))
    risk = max(12, min(78, 100 - confidence))

    evidence = [
        EvidenceItem(
            source="SoSoValue current ETF data metrics",
            label=f"{asset} daily net inflow",
            value=_format_usd(daily),
            observed_at=snapshot_time,
        ),
        EvidenceItem(
            source="SoSoValue historical ETF inflow chart",
            label=f"{asset} 3-day net {direction}",
            value=_format_usd(three_day),
            observed_at=snapshot_time,
        ),
        EvidenceItem(
            source="SoSoValue current ETF data metrics",
            label=f"{asset} cumulative net inflow",
            value=_format_usd(cumulative),
            observed_at=snapshot_time,
        ),
    ]
    return NarrativeTheme(
        id=f"{asset.lower()}-etf-flow",
        title=f"{asset} ETF flow path",
        summary=(
            f"SoSoValue ETF data shows a 3-day {direction} baseline of {_format_usd(three_day)}. "
            "The v1 path converts ETF flow persistence into a graduated linear contract."
        ),
        confidence=confidence,
        risk=risk,
        magnitude=min(100, int(abs(three_day) / Decimal("25000000"))) if three_day else 10,
        evidence=evidence,
        metadata={
            "kind": "etf",
            "asset": asset,
            "key": f"{asset} ETF",
            "three_day_net_inflow": str(three_day),
            "daily_net_inflow": str(daily),
            "snapshot_time": snapshot_time,
        },
    )


def _market_dna(theme: NarrativeTheme, legs: list[PathLeg]) -> str:
    drivers = "; ".join(item.label for item in theme.evidence[:3])
    leg_summary = " -> ".join(leg.metric_source for leg in legs)
    return (
        f"{theme.title} is supported by live SoSoValue evidence: {drivers}. "
        f"The proposed path evaluates {leg_summary}, with graduated settlement per confirmed leg."
    )


def _tags(item: dict[str, Any]) -> list[str]:
    tags = item.get("tags") or []
    clean = []
    for tag in tags:
        value = str(tag).strip()
        if value:
            clean.append(value.upper())
    return clean


def _matched_currencies(item: dict[str, Any]) -> list[str]:
    currencies = item.get("matchedCurrencies") or []
    symbols = []
    for currency in currencies:
        value = currency.get("name") or currency.get("currencyName") if isinstance(currency, dict) else None
        if value:
            symbols.append(str(value))
    return symbols


def _title(item: dict[str, Any]) -> str:
    contents = item.get("multilanguageContent") or []
    for content in contents:
        if isinstance(content, dict) and str(content.get("language")).lower() == "en":
            return _strip_html(str(content.get("title") or content.get("content") or ""))
    if contents and isinstance(contents[0], dict):
        return _strip_html(str(contents[0].get("title") or contents[0].get("content") or ""))
    return str(item.get("id") or "SoSoValue signal")


def _strip_html(value: str) -> str:
    text = re.sub(r"<[^>]+>", " ", html.unescape(value))
    return re.sub(r"\s+", " ", text).strip()


def _release_time(item: dict[str, Any]) -> str | None:
    value = item.get("releaseTime")
    return str(value) if value is not None else None


def _quote_score(item: dict[str, Any]) -> int:
    quote = item.get("quoteInfo") or {}
    total = 0
    for key in ("impressionCount", "likeCount", "replyCount", "retweetCount"):
        try:
            total += int(quote.get(key) or 0)
        except (TypeError, ValueError):
            continue
    return total


def _nested_decimal(payload: dict[str, Any], key: str) -> Decimal:
    value = payload.get(key)
    if isinstance(value, dict):
        return _decimal_from_any(value.get("value"))
    return _decimal_from_any(value)


def _decimal_from_any(value: Any) -> Decimal:
    if value is None or value == "":
        return Decimal("0")
    try:
        return Decimal(str(value))
    except (InvalidOperation, ValueError):
        return Decimal("0")


def _format_usd(value: Decimal) -> str:
    sign = "-" if value < 0 else ""
    absolute = abs(value)
    if absolute >= Decimal("1000000000"):
        return f"{sign}${absolute / Decimal('1000000000'):.2f}B"
    if absolute >= Decimal("1000000"):
        return f"{sign}${absolute / Decimal('1000000'):.2f}M"
    if absolute >= Decimal("1000"):
        return f"{sign}${absolute / Decimal('1000'):.2f}K"
    return f"{sign}${absolute:.2f}"


def _slug(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
