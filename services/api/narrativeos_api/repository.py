from __future__ import annotations

from decimal import Decimal, InvalidOperation
from typing import Literal
from uuid import uuid4

from narrativeos_api.models import MarketAction, MarketActionRequest, PathContract, utc_now_iso
from narrativeos_api.sanitize import sanitize_path_contract


class PathContractRepository:
    def __init__(self) -> None:
        self._items: dict[str, PathContract] = {}
        self._actions: dict[str, list[MarketAction]] = {}

    def upsert(self, contract: PathContract) -> PathContract:
        sanitized = sanitize_path_contract(contract)
        self._items[sanitized.id] = sanitized
        return sanitized

    def get(self, path_id: str) -> PathContract | None:
        return self._items.get(path_id)

    def list(
        self,
        status: Literal["draft", "pending", "published", "resolving", "resolved", "failed"] | None = None,
    ) -> list[PathContract]:
        contracts = list(self._items.values())
        if status is not None:
            contracts = [contract for contract in contracts if contract.status == status]
        return sorted(contracts, key=lambda contract: contract.id, reverse=True)

    def record_market_action(self, contract_id: str, request: MarketActionRequest) -> MarketAction:
        action = MarketAction(
            id=f"act-{uuid4().hex[:12]}",
            contract_id=contract_id,
            action=request.action,
            user_address=request.user_address,
            leg_index=request.leg_index,
            amount=_normalize_amount(request.amount),
            tx_hash=request.tx_hash,
            comment=request.comment,
            created_at=utc_now_iso(),
        )
        self._actions.setdefault(contract_id, []).append(action)
        return action

    def actions_for(self, contract_id: str) -> list[MarketAction]:
        return list(self._actions.get(contract_id, []))

    def all_actions(self) -> list[MarketAction]:
        return [action for actions in self._actions.values() for action in actions]


def _normalize_amount(amount: str | None) -> str | None:
    if amount is None:
        return None
    try:
        value = Decimal(amount)
    except (InvalidOperation, ValueError):
        return amount
    if value <= 0:
        return "0"
    return format(value.normalize(), "f")


repository = PathContractRepository()
