from __future__ import annotations

from decimal import Decimal

from eth_account import Account
from web3 import Web3
from web3.logs import DISCARD

from narrativeos_api.config import Settings
from narrativeos_api.models import PathContract

PATH_MARKET_ABI = [
    {
        "type": "event",
        "name": "PathCreated",
        "anonymous": False,
        "inputs": [
            {"name": "pathId", "type": "uint256", "indexed": True},
            {"name": "creator", "type": "address", "indexed": True},
            {"name": "termsHash", "type": "bytes32", "indexed": True},
            {"name": "legCount", "type": "uint8", "indexed": False},
            {"name": "creatorStake", "type": "uint256", "indexed": False},
        ],
    },
    {
        "type": "function",
        "name": "createLinearPath",
        "stateMutability": "payable",
        "inputs": [
            {"name": "termsHash", "type": "bytes32"},
            {"name": "legCount", "type": "uint8"},
        ],
        "outputs": [{"name": "pathId", "type": "uint256"}],
    },
    {
        "type": "function",
        "name": "stakeLeg",
        "stateMutability": "payable",
        "inputs": [
            {"name": "pathId", "type": "uint256"},
            {"name": "legIndex", "type": "uint8"},
            {"name": "support", "type": "bool"},
        ],
        "outputs": [],
    },
    {
        "type": "function",
        "name": "resolveLeg",
        "stateMutability": "nonpayable",
        "inputs": [
            {"name": "pathId", "type": "uint256"},
            {"name": "legIndex", "type": "uint8"},
            {"name": "confirmed", "type": "bool"},
            {"name": "evidenceHash", "type": "bytes32"},
        ],
        "outputs": [],
    },
]

PATH_MARKET_FACTORY_ABI = [
    {
        "type": "event",
        "name": "FactoryMarketCreated",
        "anonymous": False,
        "inputs": [
            {"name": "market", "type": "address", "indexed": True},
            {"name": "creator", "type": "address", "indexed": True},
            {"name": "pathId", "type": "uint256", "indexed": True},
            {"name": "termsHash", "type": "bytes32", "indexed": False},
            {"name": "legCount", "type": "uint8", "indexed": False},
            {"name": "settlementTimestamp", "type": "uint64", "indexed": False},
            {"name": "creatorStake", "type": "uint256", "indexed": False},
        ],
    },
    {
        "type": "function",
        "name": "createMarket",
        "stateMutability": "payable",
        "inputs": [
            {"name": "termsHash", "type": "bytes32"},
            {"name": "legCount", "type": "uint8"},
            {"name": "settlementTimestamp", "type": "uint64"},
        ],
        "outputs": [
            {"name": "marketAddress", "type": "address"},
            {"name": "pathId", "type": "uint256"},
        ],
    },
]


class SettlementExecutor:
    def __init__(self, settings: Settings):
        settings.require_settlement()
        self._settings = settings
        self._web3 = Web3(Web3.HTTPProvider(settings.settlement_rpc_url))
        self._account = Account.from_key(settings.oracle_private_key)
        self._contract = self._web3.eth.contract(
            address=Web3.to_checksum_address(settings.path_market_contract_address),
            abi=PATH_MARKET_ABI,
        )

    def publish_linear_path(self, contract: PathContract) -> tuple[str, int | None, str | None]:
        if self._settings.path_market_factory_address:
            return self._publish_via_factory(contract)

        stake_wei = int(Decimal(contract.stake_amount) * Decimal(10**18))
        transaction = self._contract.functions.createLinearPath(
            bytes.fromhex(contract.terms_hash.removeprefix("0x")), len(contract.legs)
        ).build_transaction(self._tx_base(value=stake_wei))
        tx_hash = self._sign_and_send(transaction)
        receipt = self._web3.eth.wait_for_transaction_receipt(tx_hash, timeout=120)
        events = self._contract.events.PathCreated().process_receipt(receipt, errors=DISCARD)
        path_id = int(events[0]["args"]["pathId"]) if events else None
        return tx_hash, path_id, self._settings.path_market_contract_address

    def _publish_via_factory(self, contract: PathContract) -> tuple[str, int | None, str | None]:
        stake_wei = int(Decimal(contract.stake_amount) * Decimal(10**18))
        factory = self._web3.eth.contract(
            address=Web3.to_checksum_address(self._settings.path_market_factory_address),
            abi=PATH_MARKET_FACTORY_ABI,
        )
        settlement_timestamp = self._settlement_timestamp()
        transaction = factory.functions.createMarket(
            bytes.fromhex(contract.terms_hash.removeprefix("0x")),
            len(contract.legs),
            settlement_timestamp,
        ).build_transaction(self._tx_base(value=stake_wei))
        tx_hash = self._sign_and_send(transaction)
        receipt = self._web3.eth.wait_for_transaction_receipt(tx_hash, timeout=120)
        events = factory.events.FactoryMarketCreated().process_receipt(receipt, errors=DISCARD)
        if not events:
            return tx_hash, None, None
        args = events[0]["args"]
        return tx_hash, int(args["pathId"]), str(args["market"])

    def resolve_leg(self, path_id: int, leg_index: int, confirmed: bool, evidence_hash: str) -> str:
        transaction = self._contract.functions.resolveLeg(
            path_id,
            leg_index,
            confirmed,
            bytes.fromhex(evidence_hash.removeprefix("0x")),
        ).build_transaction(self._tx_base())
        return self._sign_and_send(transaction)

    def _tx_base(self, value: int = 0) -> dict[str, int | str]:
        latest_block = self._web3.eth.get_block("latest")
        base_fee = int(latest_block.get("baseFeePerGas") or self._web3.eth.gas_price)
        priority_fee = max(int(getattr(self._web3.eth, "max_priority_fee", 1)), 1)
        return {
            "from": self._account.address,
            "value": value,
            "chainId": self._settings.settlement_chain_id,
            "nonce": self._web3.eth.get_transaction_count(self._account.address),
            "maxFeePerGas": (base_fee * 2) + priority_fee,
            "maxPriorityFeePerGas": priority_fee,
        }

    def _sign_and_send(self, transaction: dict[str, int | str]) -> str:
        gas = self._web3.eth.estimate_gas(transaction)
        signed = self._account.sign_transaction({**transaction, "gas": gas})
        tx_hash = self._web3.eth.send_raw_transaction(signed.raw_transaction)
        return self._web3.to_hex(tx_hash)

    @staticmethod
    def _settlement_timestamp() -> int:
        import time

        return int(time.time()) + (14 * 24 * 60 * 60)
