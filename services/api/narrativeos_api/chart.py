from __future__ import annotations

import math
from datetime import datetime, timedelta
from decimal import Decimal, InvalidOperation
from typing import Any

from narrativeos_api.clients.sosovalue import SoSoValueError
from narrativeos_api.models import MarketChartPoint, MarketChartResponse

PATH_KEYS = ("giga_bull", "bull", "mild", "bear", "mega_bear", "custom")


def build_market_chart(
    history: list[dict[str, Any]],
    *,
    symbol: str = "BTC",
    snapshot_time: str,
    points: int = 54,
    future_points: int = 28,
) -> MarketChartResponse:
    rows = _normalize_rows(history)
    if len(rows) < 6:
        raise SoSoValueError("SoSoValue historical ETF inflow chart returned insufficient data")

    observed = rows[-max(8, min(points, 90)) :]
    values = [row["value"] for row in observed]
    dates = [row["date"] for row in observed]
    latest = values[-1]
    previous = values[-2]
    latest_change_pct = float(((latest - previous) / previous) * Decimal(100)) if previous else 0.0
    start_index = len(observed) - 1

    path_values = _build_paths(observed, future_points)
    chart_points = [
        MarketChartPoint(t=_label_for_date(day), date=day.isoformat(), actual=float(value))
        for day, value in zip(dates[:-1], values[:-1], strict=True)
    ]

    for index in range(future_points):
        day = dates[-1] + timedelta(days=index)
        chart_points.append(
            MarketChartPoint(
                t=_label_for_date(day) if index else "START",
                date=day.isoformat(),
                actual=float(latest) if index == 0 else None,
                giga_bull=float(path_values["giga_bull"][index]),
                bull=float(path_values["bull"][index]),
                mild=float(path_values["mild"][index]),
                bear=float(path_values["bear"][index]),
                mega_bear=float(path_values["mega_bear"][index]),
                custom=float(path_values["custom"][index]),
            )
        )

    return MarketChartResponse(
        symbol=f"{symbol.upper()} ETF",
        title=f"{symbol.upper()} Spot ETF Flow Projection",
        metric="Cumulative Net Inflow",
        unit="USD",
        source="SoSoValue historical ETF inflow chart",
        snapshot_time=snapshot_time,
        data=chart_points,
        start_index=start_index,
        latest_value=float(latest),
        latest_change_pct=latest_change_pct,
        path_confidence=_path_confidence(observed),
        source_note=(
            "Historical line uses SoSoValue ETF cumNetInflow. Future paths are deterministic "
            "NarrativeOS projections derived from the same observed flow range, volatility, and net-inflow bias."
        ),
    )


def _normalize_rows(history: list[dict[str, Any]]) -> list[dict[str, Any]]:
    normalized: list[dict[str, Any]] = []
    for row in history:
        day = _date_from_any(row.get("date") or row.get("timestamp") or row.get("time"))
        value = _decimal_from_any(row.get("cumNetInflow"))
        if value is None:
            value = _decimal_from_any(row.get("totalNetAssets"))
        if day and value is not None and value > 0:
            normalized.append(
                {
                    "date": day,
                    "value": value,
                    "net_inflow": _decimal_from_any(row.get("totalNetInflow")) or Decimal(0),
                }
            )

    deduped = {row["date"]: row for row in normalized}
    return [deduped[day] for day in sorted(deduped)]


def _build_paths(observed: list[dict[str, Any]], future_points: int) -> dict[str, list[Decimal]]:
    values = [row["value"] for row in observed]
    latest = values[-1]
    observed_range = max(values) - min(values)
    range_band = max(observed_range, latest * Decimal("0.015"))
    avg_abs_return = _average_abs_return(values)
    volatility_band = max(range_band * Decimal("0.06"), latest * avg_abs_return * Decimal("2.5"))

    recent_rows = observed[-5:]
    recent_flow = sum((row["net_inflow"] for row in recent_rows), Decimal(0)) / Decimal(len(recent_rows))
    flow_bias = _clamp_decimal(recent_flow / max(range_band, Decimal(1)), Decimal("-0.22"), Decimal("0.22"))
    seven_day_slope = (values[-1] - values[max(0, len(values) - 8)]) / Decimal(min(7, len(values) - 1))
    trend_bias = _clamp_decimal(seven_day_slope / max(range_band, Decimal(1)), Decimal("-0.12"), Decimal("0.12"))

    drift = {
        "giga_bull": Decimal("0.92"),
        "bull": Decimal("0.48"),
        "mild": Decimal("0.10"),
        "bear": Decimal("-0.36"),
        "mega_bear": Decimal("-0.84"),
        "custom": Decimal("0.24"),
    }
    phase = {
        "giga_bull": 0.3,
        "bull": 1.1,
        "mild": 2.2,
        "bear": 3.0,
        "mega_bear": 4.1,
        "custom": 5.2,
    }

    paths: dict[str, list[Decimal]] = {key: [] for key in PATH_KEYS}
    for key in PATH_KEYS:
        for index in range(future_points):
            progress = Decimal(index) / Decimal(max(1, future_points - 1))
            curve = progress ** Decimal("1.18")
            wave = Decimal(str(math.sin(index * 0.88 + phase[key]))) * volatility_band
            micro = Decimal(str(math.cos(index * 0.37 + phase[key]))) * volatility_band * Decimal("0.32")
            direction = drift[key] + flow_bias + trend_bias
            value = latest + (range_band * direction * curve) + (wave + micro) * progress
            paths[key].append(max(Decimal("0.01"), value.quantize(Decimal("0.01"))))
        paths[key][0] = latest.quantize(Decimal("0.01"))

    return paths


def _path_confidence(observed: list[dict[str, Any]]) -> dict[str, int]:
    positive_flow_days = sum(1 for row in observed[-8:] if row["net_inflow"] >= 0)
    latest = observed[-1]["value"]
    earliest = observed[max(0, len(observed) - 8)]["value"]
    momentum = 1 if latest >= earliest else -1
    base = max(38, min(82, 48 + positive_flow_days * 4 + momentum * 6))
    return {
        "gigaBull": min(92, base + 8),
        "bull": min(88, base + 3),
        "mild": max(35, base - 6),
        "bear": max(28, 100 - base),
        "megaBear": max(22, 92 - base),
        "custom": max(35, base - 2),
    }


def _average_abs_return(values: list[Decimal]) -> Decimal:
    returns = [
        abs((current - previous) / previous)
        for previous, current in zip(values, values[1:], strict=False)
        if previous
    ]
    if not returns:
        return Decimal("0.003")
    return max(Decimal("0.0015"), min(sum(returns) / Decimal(len(returns)), Decimal("0.06")))


def _date_from_any(value: Any):
    if value is None:
        return None
    if isinstance(value, (int, float)) or (isinstance(value, str) and value.isdigit()):
        numeric = int(value)
        if numeric > 10_000_000_000:
            numeric //= 1000
        return datetime.utcfromtimestamp(numeric).date()
    try:
        return datetime.fromisoformat(str(value).replace("Z", "+00:00")).date()
    except ValueError:
        return None


def _decimal_from_any(value: Any) -> Decimal | None:
    if isinstance(value, dict):
        value = value.get("value")
    try:
        return Decimal(str(value))
    except (InvalidOperation, TypeError, ValueError):
        return None


def _label_for_date(value) -> str:
    return value.strftime("%b %d").upper()


def _clamp_decimal(value: Decimal, minimum: Decimal, maximum: Decimal) -> Decimal:
    return max(minimum, min(maximum, value))
