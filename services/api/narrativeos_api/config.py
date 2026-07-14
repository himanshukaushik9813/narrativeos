from functools import lru_cache
from typing import Sequence

from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class MissingIntegrationConfig(RuntimeError):
    def __init__(self, missing: Sequence[str]):
        self.missing = list(missing)
        super().__init__("Missing required integration configuration")


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore", populate_by_name=True)

    sosovalue_api_key: str | None = Field(default=None, validation_alias="SOSOVALUE_API_KEY")
    sosovalue_openapi_base: str = Field(
        default="https://openapi.sosovalue.com", validation_alias="SOSOVALUE_OPENAPI_BASE"
    )
    sosovalue_etf_api_base: str = Field(
        default="https://api.sosovalue.xyz", validation_alias="SOSOVALUE_ETF_API_BASE"
    )
    sosovalue_cache_ttl_seconds: int = Field(
        default=180, validation_alias="SOSOVALUE_CACHE_TTL_SECONDS"
    )
    sosovalue_stale_ttl_seconds: int = Field(
        default=1800, validation_alias="SOSOVALUE_STALE_TTL_SECONDS"
    )

    sodex_spot_endpoint: str = Field(
        default="https://testnet-gw.sodex.dev/api/v1/spot",
        validation_alias="SODEX_SPOT_ENDPOINT",
    )
    sodex_perps_endpoint: str = Field(
        default="https://testnet-gw.sodex.dev/api/v1/perps",
        validation_alias="SODEX_PERPS_ENDPOINT",
    )

    settlement_chain_name: str = Field(default="Arbitrum Sepolia", validation_alias="SETTLEMENT_CHAIN_NAME")
    settlement_chain_id: int = Field(
        default=421614,
        validation_alias=AliasChoices("SETTLEMENT_CHAIN_ID", "VALUECHAIN_CHAIN_ID"),
    )
    settlement_rpc_url: str | None = Field(
        default="https://sepolia-rollup.arbitrum.io/rpc",
        validation_alias=AliasChoices("SETTLEMENT_RPC_URL", "VALUECHAIN_RPC_URL"),
    )
    settlement_explorer_url: str = Field(
        default="https://sepolia.arbiscan.io",
        validation_alias="SETTLEMENT_EXPLORER_URL",
    )
    path_market_contract_address: str | None = Field(
        default=None, validation_alias="PATH_MARKET_CONTRACT_ADDRESS"
    )
    path_market_factory_address: str | None = Field(
        default=None, validation_alias="PATH_MARKET_FACTORY_ADDRESS"
    )
    oracle_private_key: str | None = Field(default=None, validation_alias="ORACLE_PRIVATE_KEY")

    def require_sosovalue(self) -> None:
        missing = []
        if not self.sosovalue_api_key:
            missing.append("SOSOVALUE_API_KEY")
        if missing:
            raise MissingIntegrationConfig(missing)

    def require_settlement(self) -> None:
        missing = []
        if not self.settlement_rpc_url:
            missing.append("SETTLEMENT_RPC_URL")
        if not self.path_market_contract_address:
            missing.append("PATH_MARKET_CONTRACT_ADDRESS")
        if not self.oracle_private_key:
            missing.append("ORACLE_PRIVATE_KEY")
        if missing:
            raise MissingIntegrationConfig(missing)


@lru_cache
def get_settings() -> Settings:
    return Settings()
