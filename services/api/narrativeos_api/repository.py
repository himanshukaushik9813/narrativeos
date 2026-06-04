from __future__ import annotations

from typing import Literal

from narrativeos_api.models import PathContract


class PathContractRepository:
    def __init__(self) -> None:
        self._items: dict[str, PathContract] = {}

    def upsert(self, contract: PathContract) -> PathContract:
        self._items[contract.id] = contract
        return contract

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


repository = PathContractRepository()
