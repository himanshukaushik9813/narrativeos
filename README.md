# NarrativeOS Path Market MVP

NarrativeOS is an AI-powered path intelligence MVP for on-chain markets, built strictly around the supplied product documentation for SoSoValue data, SoDEX context, agent scoring, and 3-leg linear Path Contracts.

This local demo uses Arbitrum Sepolia as the settlement chain because a public ValueChain testnet gas faucet was not available. The UI labels this honestly as Arbitrum Sepolia/test ETH settlement; SoSoValue signals, agent evidence, and Path Contract logic remain unchanged.

## Workspace

- `apps/web` - Next.js App Router product UI with RainbowKit/wagmi.
- `services/api` - FastAPI service for SoSoValue ingestion, v1 agent pipeline, settlement/oracle actions, and path status.
- `contracts` - Solidity `PathMarket` contract and Foundry tests.

## Runtime Boundary

The app does not fall back to seeded or fake market data. If required live integration settings are missing, endpoints return configuration errors and the UI shows a setup state.

Required env is documented in `.env.example`.

## Local Commands

```bash
npm install
npm run web:dev
npm run web:build

cd services/api
python3 -m venv .venv
. .venv/bin/activate
pip install -e ".[test]"
pytest
uvicorn narrativeos_api.main:app --reload --port 8000

cd contracts
forge test
```

## Official Integration Sources

- SoSoValue auth and public endpoints: https://sosovalue.gitbook.io/soso-value-api-doc
- SoDEX REST/WebSocket endpoints and signing: https://sodex.com/documentation/api/api
- Arbitrum Sepolia chain details: https://docs.arbitrum.io/for-devs/dev-tools-and-resources/chain-info
