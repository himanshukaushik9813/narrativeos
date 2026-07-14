from __future__ import annotations

from narrativeos_api.models import AgentContext, EvidenceItem, PathContract, PathLeg
from narrativeos_api.text import english_json, english_text, english_title


def sanitize_path_contract(contract: PathContract) -> PathContract:
    safe_title = english_title(contract.title, "SoSoValue Narrative Path - Linear Path")
    safe_theme = english_title(contract.theme, "SoSoValue Narrative Path")

    safe_legs = [_sanitize_leg(leg) for leg in contract.legs]
    safe_context = _sanitize_context(contract.agent_context, safe_title, safe_theme)

    return contract.model_copy(
        update={
            "title": safe_title,
            "theme": safe_theme,
            "legs": safe_legs,
            "agent_context": safe_context,
            "market_dna": english_text(
                contract.market_dna,
                "Live SoSoValue evidence supports this Path Contract.",
            ),
        },
        deep=True,
    )


def _sanitize_leg(leg: PathLeg) -> PathLeg:
    return leg.model_copy(
        update={
            "condition": english_text(leg.condition, "Configured SoSoValue evidence condition"),
            "metric_source": english_text(leg.metric_source, "SoSoValue evidence source"),
            "threshold": english_text(leg.threshold, "observed threshold"),
            "window": english_text(leg.window, "evidence window"),
            "evidence": [_sanitize_evidence(item) for item in leg.evidence],
        },
        deep=True,
    )


def _sanitize_evidence(item: EvidenceItem) -> EvidenceItem:
    return item.model_copy(
        update={
            "source": english_text(item.source, "SoSoValue evidence"),
            "label": english_text(item.label, "SoSoValue evidence"),
            "value": english_text(item.value, "SoSoValue evidence"),
        },
        deep=True,
    )


def _sanitize_context(context: AgentContext, title: str, theme: str) -> AgentContext:
    strategy_agent = english_json(context.strategy_agent)
    if isinstance(strategy_agent, dict):
        suggested = strategy_agent.get("suggested_contract")
        if isinstance(suggested, dict):
            suggested["title"] = title

    narrative_agent = english_json(context.narrative_agent)
    if isinstance(narrative_agent, dict):
        narrative_agent["dominant_theme"] = english_title(
            narrative_agent.get("dominant_theme"),
            theme,
        )

    return context.model_copy(
        update={
            "data_agent": english_json(context.data_agent),
            "narrative_agent": narrative_agent,
            "risk_agent": english_json(context.risk_agent),
            "strategy_agent": strategy_agent,
            "execution_agent": english_json(context.execution_agent),
            "explainability_agent": english_json(context.explainability_agent),
        },
        deep=True,
    )
