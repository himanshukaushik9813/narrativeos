import pytest

from narrativeos_api.chart import build_market_chart
from narrativeos_api.clients.sosovalue import SoSoValueError


def test_market_chart_uses_sosovalue_history_without_seeded_fallback():
    history = [
        {
            "date": f"2026-05-{day:02d}",
            "totalNetAssets": 90_000_000_000 + day * 120_000_000,
            "cumNetInflow": 50_000_000_000 + day * 210_000_000,
            "totalNetInflow": (-1) ** day * 50_000_000,
        }
        for day in range(1, 12)
    ]

    chart = build_market_chart(
        history,
        symbol="BTC",
        snapshot_time="2026-05-31T00:00:00+00:00",
        points=8,
        future_points=6,
    )

    assert chart.source == "SoSoValue historical ETF inflow chart"
    assert chart.metric == "Cumulative Net Inflow"
    assert chart.data[0].actual == 50_000_000_000 + 4 * 210_000_000
    assert chart.data[chart.start_index].actual == chart.latest_value
    assert chart.data[chart.start_index].bull == chart.latest_value
    assert chart.data[-1].giga_bull is not None
    assert len(chart.data) == 13


def test_market_chart_fails_closed_when_sosovalue_history_is_empty():
    with pytest.raises(SoSoValueError):
        build_market_chart([], symbol="BTC", snapshot_time="2026-05-31T00:00:00+00:00")
