# NarrativeOS

> **An AI-powered Path Intelligence Operating System for prediction markets.**
>
> NarrativeOS turns live SoSoValue market intelligence into structured, evidence-backed Path Contracts: multi-step futures that users can review, publish, and trade on testnet.

<p align="center">
  <img alt="NarrativeOS cinematic boot banner" src="docs/assets/narrativeos-banner.png" width="100%" />
</p>

<p align="center">
  <a href="https://narrativeos-orpin.vercel.app"><img alt="Live Demo" src="https://img.shields.io/badge/Live%20Demo-Vercel-000000?style=for-the-badge&logo=vercel" /></a>
  <a href="https://narrativeos-api.onrender.com/health"><img alt="API" src="https://img.shields.io/badge/API-Render-46E3B7?style=for-the-badge&logo=render&logoColor=000" /></a>
  <a href="https://github.com/himanshukaushik9813/narrativeos"><img alt="GitHub" src="https://img.shields.io/badge/GitHub-NarrativeOS-181717?style=for-the-badge&logo=github" /></a>
  <img alt="Next.js" src="https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=next.js" />
  <img alt="FastAPI" src="https://img.shields.io/badge/FastAPI-Backend-009688?style=for-the-badge&logo=fastapi" />
  <img alt="Solidity" src="https://img.shields.io/badge/Solidity-PathMarket-363636?style=for-the-badge&logo=solidity" />
  <img alt="Arbitrum Sepolia" src="https://img.shields.io/badge/Settlement-Arbitrum%20Sepolia-28A0F0?style=for-the-badge" />
  <img alt="SoSoValue" src="https://img.shields.io/badge/Data-SoSoValue-B4FF5A?style=for-the-badge" />
</p>

---

## Live Surfaces

| Surface | URL | Status |
|---|---:|---|
| Product UI | [https://narrativeos-orpin.vercel.app](https://narrativeos-orpin.vercel.app) | Live on Vercel |
| API Health | [https://narrativeos-api.onrender.com/health](https://narrativeos-api.onrender.com/health) | Live on Render |
| Top Narratives | [https://narrativeos-api.onrender.com/api/narratives/top](https://narrativeos-api.onrender.com/api/narratives/top) | Live SoSoValue-backed response |
| Repository | [github.com/himanshukaushik9813/narrativeos](https://github.com/himanshukaushik9813/narrativeos) | Public |
| Settlement Contract | `0xc9f3bcb09b41057a105A7b0598962D8738c4cf8A` | Arbitrum Sepolia |

> [!IMPORTANT]
> NarrativeOS is intentionally strict about data provenance. The MVP uses live SoSoValue feeds for market intelligence and does **not** fabricate unavailable market data. If a required API key, RPC, or contract address is missing, the system fails closed and surfaces a configuration state.

---

## Quick Start For Judges

If you have five minutes, review the project in this order:

| Step | What To Open | What It Demonstrates |
|---:|---|---|
| 1 | [Live UI](https://narrativeos-orpin.vercel.app) | Production-deployed market terminal |
| 2 | [Top Narratives API](https://narrativeos-api.onrender.com/api/narratives/top) | Live SoSoValue evidence pipeline |
| 3 | `/build` route in the UI | Custom Path Contract creation |
| 4 | Evidence Drawer | Source-linked Market DNA |
| 5 | Agent Timeline | Transparent agent reasoning |
| 6 | `contracts/src/PathMarket.sol` | On-chain Path Contract primitive |

The fastest way to understand the project:

```text
SoSoValue evidence
  -> narrative agents
  -> structured Path Contract
  -> user review
  -> Arbitrum Sepolia settlement
  -> oracle evidence hash
```

---

## Cinematic Hero

**Prediction markets today ask users to bet on isolated events.**

NarrativeOS asks a more institutional question:

> What if the market could trade the entire chain of causality?

Not:

```text
Will BTC be above $100k by Friday?
```

But:

```text
Iran escalates conflict
  -> oil trades above $100
  -> risk assets compress
  -> BTC falls below $90k
```

NarrativeOS converts emerging market narratives into structured **Path Contracts**: ordered, multi-leg theses backed by live evidence, agent scoring, and on-chain settlement.

It is built to feel like:

```text
Palantir decision systems
  x OpenAI agent orchestration
  x Polymarket market creation
  x Bloomberg Terminal signal density
```

---

## Why NarrativeOS Exists

Markets are no longer moved by single events. They are moved by **narratives that unfold across time**.

An ETF inflow does not matter in isolation. It matters when it appears alongside news velocity, liquidity rotation, token attention, macro regime shifts, and crowd positioning. The modern trader is not only asking whether an event will happen. They are asking whether a sequence of conditions is forming into a durable path.

Current prediction markets compress that complexity into binary questions. That is useful, but incomplete.

NarrativeOS exists to make market structure more expressive:

| Old Primitive | New Primitive |
|---|---|
| Single event | Multi-step path |
| Binary outcome | Ordered thesis |
| Human-written market | AI-generated instrument |
| Weak evidence context | Source-linked evidence graph |
| Static odds | Agent-scored narrative intelligence |
| One-off bet | Portfolio of future paths |

---

## The Problem With Current Prediction Markets

Prediction markets are powerful, but their dominant UX still looks like a list of isolated propositions.

| Problem | Why It Matters |
|---|---|
| Events are isolated | Real markets move through causal chains, not single statements. |
| Market creation is manual | High-quality market writing requires research, structure, and settlement design. |
| Evidence is fragmented | Users must leave the platform to validate why a market exists. |
| Settlement logic is opaque | Many markets hide the operational complexity of oracle resolution. |
| No native narrative memory | Platforms rarely preserve how a thesis formed, changed, and resolved. |
| Limited composability | A trader cannot easily express "if A, then B, then C" as one instrument. |

NarrativeOS addresses this by introducing a new market primitive: the **Path Contract**.

---

## What Is A Path Market?

A Path Market is a market for a **sequence of future states**.

Instead of trading one outcome, users trade whether a structured narrative completes.

```text
Leg 1: BTC spot ETF daily net inflow remains positive
Leg 2: BTC spot ETF 3-day net inflow holds above baseline
Leg 3: BTC remains a matched currency in SoSoValue featured news
Settlement: path succeeds if each leg confirms in order
```

In investor language:

> A Path Market is a path-dependent prediction instrument for narrative-driven markets.

In product language:

> It is a way to trade an entire thesis, not a single headline.

In protocol language:

> It is an on-chain contract that stores a terms hash, accepts leg-level positions, and resolves sequential oracle evidence.

---

## Real Narrative Path Examples

### 1. Geopolitical Risk Path

```text
Iran escalates conflict
  -> Brent crude trades above $100
  -> crypto risk appetite contracts
  -> BTC falls below $90k
```

### 2. Bitcoin ETF Momentum Path

```text
BTC spot ETF daily net inflow remains positive
  -> 3-day cumulative inflow expands
  -> BTC remains dominant in SoSoValue matched-currency news
```

### 3. Ethereum Rotation Path

```text
ETH ETF flow improves
  -> Ethereum ecosystem narratives accelerate
  -> ETH becomes a persistent SoSoValue matched currency
```

### 4. Regulation Narrative Path

```text
CLARITY Act news velocity increases
  -> regulatory market attention persists
  -> crypto policy narrative remains category-dominant
```

### 5. AI Infrastructure Rotation Path

```text
AI token news velocity rises
  -> matched currencies cluster around AI infrastructure
  -> ETF / liquidity evidence supports risk-on continuation
```

> [!NOTE]
> The current MVP only generates and settles structures supported by available live evidence. It does not invent unavailable SoSoValue endpoints, whale data, social data, or private market feeds.

---

## Product Snapshot

| Capability | MVP Status |
|---|---|
| Live SoSoValue featured news ingestion | Implemented |
| SoSoValue listed currencies ingestion | Implemented |
| SoSoValue current ETF metrics | Implemented |
| SoSoValue historical ETF inflow chart | Implemented |
| SoDEX spot/perps endpoint surface | Implemented as API context |
| AI narrative agent pipeline | Implemented |
| Evidence-backed path generation | Implemented |
| Custom Path Contract builder | Implemented |
| Agent Pipeline Timeline | Implemented |
| Evidence Drawer | Implemented |
| Review and Publish flow | Implemented |
| On-chain PathMarket contract | Implemented |
| Arbitrum Sepolia settlement | Implemented |
| Oracle leg resolution API | Implemented |
| Wallet testnet staking/order flow | Implemented |
| Production frontend deployment | Vercel |
| Production backend deployment | Render |

---

## Screenshots

Production screenshots from the deployed NarrativeOS experience.

| Market Terminal | Narrative Intelligence |
|---|---|
| ![Market Terminal](docs/assets/screenshots/market-terminal.png) | ![Narrative Intelligence](docs/assets/screenshots/narrative-intelligence.png) |

| Path Builder | Alpha Signal Stream |
|---|---|
| ![Path Builder](docs/assets/screenshots/path-builder.png) | ![Alpha Signal Stream](docs/assets/screenshots/signal-feed.png) |

---

## Demo GIF Placeholders

| Demo | Asset |
|---|---|
| Boot sequence into terminal | `docs/assets/gifs/boot-sequence.gif` |
| Live SoSoValue narrative detection | `docs/assets/gifs/live-narratives.gif` |
| Generate Path Contract | `docs/assets/gifs/generate-path.gif` |
| Publish and stake on testnet | `docs/assets/gifs/publish-stake.gif` |
| Evidence and oracle review | `docs/assets/gifs/evidence-oracle.gif` |

---

## Animated SVG Banner Suggestions

Banner asset: `docs/assets/narrativeos-banner.png`

Design direction:

```text
black background
faint green radial glow
thin terminal grid
animated path nodes
SoSoValue signal particles
NARRATIVEOS wordmark
subtitle: Path Intelligence for Prediction Markets
```

Suggested SVG layers:

| Layer | Motion |
|---|---|
| Background grid | Slow opacity breathing |
| Signal particles | Horizontal drift |
| Path nodes | Sequential pulse |
| Terminal scanline | Slow vertical sweep |
| Wordmark | Subtle green edge glow |

---

## Architecture

NarrativeOS is a monorepo with three major execution domains:

```text
apps/web       -> Next.js App Router frontend
services/api   -> FastAPI backend and agent pipeline
contracts      -> Solidity PathMarket contract and Foundry tests
```

### System Architecture

```mermaid
flowchart TB
    subgraph User["User Surface"]
        Wallet["MetaMask / Wallet"]
        Web["Next.js App Router UI"]
        Builder["Custom Path Builder"]
        Terminal["Market Terminal"]
    end

    subgraph Intelligence["Narrative Intelligence Layer"]
        API["FastAPI Backend"]
        DataAgent["Data Agent"]
        NarrativeAgent["Narrative Agent"]
        RiskAgent["Risk Agent"]
        StrategyAgent["Strategy Agent"]
        ExecutionAgent["Execution Agent"]
        ExplainAgent["Explainability Agent"]
        Cache["SoSoValue Cache + Stale Revalidation"]
    end

    subgraph ExternalData["Market Data Sources"]
        SoSoNews["SoSoValue Featured News"]
        SoSoCurrencies["SoSoValue Listed Currencies"]
        SoSoETF["SoSoValue ETF Metrics"]
        SoSoHistory["SoSoValue Historical ETF Inflows"]
        SoDEX["SoDEX Spot / Perps Context"]
    end

    subgraph Chain["Settlement Layer"]
        RPC["Arbitrum Sepolia RPC"]
        Contract["PathMarket.sol"]
        Oracle["Oracle Key / Resolver"]
    end

    Web --> API
    Builder --> Web
    Terminal --> Web
    Wallet --> Web

    API --> DataAgent
    DataAgent --> Cache
    Cache --> SoSoNews
    Cache --> SoSoCurrencies
    Cache --> SoSoETF
    Cache --> SoSoHistory
    API --> SoDEX

    DataAgent --> NarrativeAgent
    NarrativeAgent --> RiskAgent
    RiskAgent --> StrategyAgent
    StrategyAgent --> ExplainAgent
    StrategyAgent --> ExecutionAgent

    ExecutionAgent --> RPC
    Web --> Contract
    RPC --> Contract
    Oracle --> Contract
```

### Repository Architecture

```mermaid
flowchart LR
    Repo["NarrativeOS Monorepo"]
    Repo --> Web["apps/web"]
    Repo --> API["services/api"]
    Repo --> Contracts["contracts"]

    Web --> Pages["App Router Pages"]
    Web --> Trading["Trading Components"]
    Web --> Builder["Path Builder"]
    Web --> Wallet["RainbowKit / wagmi / viem"]

    API --> Clients["SoSoValue + SoDEX Clients"]
    API --> Agents["Agent Pipeline"]
    API --> Models["Typed Pydantic Models"]
    API --> Execution["Settlement Executor"]
    API --> RepoMem["In-Memory Path Repository"]

    Contracts --> Solidity["PathMarket.sol"]
    Contracts --> Tests["Foundry Tests"]
```

---

## System Flow

### Live Narrative Detection

```mermaid
sequenceDiagram
    participant UI as Next.js UI
    participant API as FastAPI
    participant SSV as SoSoValue API
    participant Agents as Agent Pipeline

    UI->>API: GET /api/narratives/top
    API->>SSV: Fetch listed currencies
    API->>SSV: Fetch featured news
    API->>SSV: Fetch BTC/ETH ETF metrics
    API->>SSV: Fetch historical ETF inflows
    API->>Agents: Normalize evidence
    Agents->>Agents: Rank narratives
    Agents->>Agents: Score confidence and risk
    Agents->>API: NarrativeTheme[]
    API->>UI: Evidence-backed narratives
```

### Path Contract Generation

```mermaid
sequenceDiagram
    participant User
    participant UI as Path Builder
    participant API as FastAPI
    participant Agents as Strategy + Explainability Agents

    User->>UI: Select narrative
    UI->>API: POST /api/path-contracts/draft
    API->>Agents: Convert theme into PathContract
    Agents->>Agents: Generate 3 linear legs
    Agents->>Agents: Attach evidence and Market DNA
    Agents->>Agents: Hash terms payload
    Agents->>API: Draft PathContract
    API->>UI: Contract review object
    User->>UI: Edit / review / publish
```

### Publish And Stake Flow

```mermaid
sequenceDiagram
    participant User
    participant UI as Next.js UI
    participant Wallet
    participant Contract as PathMarket.sol
    participant API as FastAPI

    User->>UI: Publish Path Contract
    UI->>Wallet: Request createLinearPath transaction
    Wallet->>Contract: createLinearPath(termsHash, legCount)
    Contract-->>Wallet: PathCreated(pathId)
    UI->>API: POST /api/path-contracts/publish with txHash
    API-->>UI: Published contract state
    User->>Wallet: Stake on a leg
    Wallet->>Contract: stakeLeg(pathId, legIndex, support)
```

### Oracle Settlement Flow

```mermaid
flowchart TD
    Evidence["Evidence Snapshot"] --> Hash["Generate evidenceHash"]
    Hash --> OracleReview["Oracle Review"]
    OracleReview --> Decision{"Leg confirmed?"}
    Decision -->|Yes| Confirm["resolveLeg(pathId, legIndex, true, evidenceHash)"]
    Decision -->|No| Reject["resolveLeg(pathId, legIndex, false, evidenceHash)"]
    Confirm --> Contract["PathMarket.sol"]
    Reject --> Contract
    Contract --> SequentialCheck{"Resolved in order?"}
    SequentialCheck -->|Yes| Update["Update leg state"]
    SequentialCheck -->|No| Revert["ResolutionOutOfOrder"]
    Update --> Closed{"Failed leg or final leg?"}
    Closed -->|No| NextLeg["Wait for next leg"]
    Closed -->|Yes| Claims["Users call claim()"]
```

---

## AI Agent Architecture

NarrativeOS uses a deterministic, inspectable agent pipeline. The MVP does not hide behind vague "AI magic"; it appends a typed `AgentContext` as evidence moves through the system.

### Agent Roles

| Agent | Responsibility | Output |
|---|---|---|
| Data Agent | Fetch supported SoSoValue feeds and normalize evidence | Source inventory, snapshot time |
| Narrative Agent | Rank themes from tags, matched currencies, ETF flow context | Top narrative IDs and confidence |
| Risk Agent | Compute risk from confidence and evidence breadth | Theme-level risk |
| Strategy Agent | Convert narratives into v1 3-leg linear Path Contracts | Legs, thresholds, time windows |
| Execution Agent | Prepare publish / settlement context | Chain, tx hash, on-chain path ID |
| Explainability Agent | Generate Market DNA from cited evidence | Human-readable thesis explanation |

### Agent Scoring Model

```mermaid
flowchart LR
    NewsTags["News Tags"] --> TagScore["Tag Frequency Score"]
    MatchedCurrencies["Matched Currencies"] --> CurrencyScore["Currency Attention Score"]
    QuoteInfo["Quote Engagement"] --> EngagementScore["Engagement Score"]
    ETFMetrics["ETF Metrics"] --> FlowScore["Flow Support Score"]
    EvidenceBreadth["Evidence Breadth"] --> BreadthScore["Breadth Score"]

    TagScore --> Confidence["Confidence"]
    CurrencyScore --> Confidence
    EngagementScore --> Confidence
    FlowScore --> Confidence
    BreadthScore --> Confidence

    Confidence --> Risk["Risk = 100 - Confidence with breadth adjustments"]
    Risk --> ContractScore["Path Contract Score"]
    Confidence --> ContractScore
```

### Agent Credibility Scoring

NarrativeOS treats agents as accountable analysts. Each generated contract carries a score trail so users can inspect why the system believes a path is credible.

| Credibility Input | Source | Impact |
|---|---|---|
| Evidence breadth | Count of cited SoSoValue evidence items | Higher breadth improves confidence |
| Source persistence | Repeated tags / matched currencies across featured news | Repeated appearances increase narrative durability |
| Flow support | SoSoValue BTC / ETH ETF metrics and historical inflow chart | Flow alignment strengthens thesis quality |
| Engagement signal | SoSoValue `quoteInfo`-derived interaction context | Stronger engagement improves magnitude |
| Contradiction discount | Weak breadth, stale signals, or cooling flows | Lowers confidence and raises risk |
| Settlement clarity | Whether each leg maps to a supported evidence source | Improves publish readiness |

```mermaid
flowchart TD
    Agent["Agent Output"] --> EvidenceCheck{"Cites supported SoSoValue evidence?"}
    EvidenceCheck -->|No| LowCred["Low credibility / reject for publish"]
    EvidenceCheck -->|Yes| Breadth["Evidence breadth score"]
    Breadth --> Persistence["Persistence score"]
    Persistence --> Flow["ETF / market flow score"]
    Flow --> Clarity["Settlement clarity score"]
    Clarity --> Contradictions{"Contradictions detected?"}
    Contradictions -->|Yes| Discount["Apply risk discount"]
    Contradictions -->|No| Preserve["Preserve score"]
    Discount --> Final["Final confidence + risk"]
    Preserve --> Final
```

The MVP scoring model is intentionally legible. It is not a black-box trading model; it is a transparent narrative underwriting system.

### AgentContext Shape

```json
{
  "snapshotTime": "2026-06-04T17:29:18+00:00",
  "dataAgent": {
    "currencies": 1234,
    "featuredNews": 30,
    "etfFeeds": ["us-btc-spot", "us-eth-spot"]
  },
  "narrativeAgent": {
    "rankedThemeIds": ["tag-clarity-act", "currency-btc"],
    "dominantTheme": "CLARITY ACT narrative path"
  },
  "riskAgent": {
    "riskModel": "100 - confidence, adjusted by evidence breadth"
  },
  "strategyAgent": {
    "supportedStructure": "linear",
    "legCount": 3
  },
  "executionAgent": {
    "mode": "wallet",
    "status": "submitted"
  },
  "explainabilityAgent": {
    "style": "Market DNA",
    "evidenceRule": "Only supported SoSoValue endpoints are cited."
  }
}
```

---

## SoSoValue Intelligence Layer

SoSoValue is the core evidence engine of NarrativeOS.

The MVP integrates:

| SoSoValue Feed | Usage |
|---|---|
| Listed currencies | Market universe and currency context |
| Featured news | Narrative detection, tag frequency, matched currency evidence |
| Featured news by currency | Currency-specific intelligence surface |
| Current ETF data metrics | ETF flow conditions |
| Historical ETF inflow chart | Market chart and threshold baselines |

### SoSoValue Request Boundary

```mermaid
flowchart TD
    Request["Backend request"] --> HasKey{"SOSOVALUE_API_KEY present?"}
    HasKey -->|No| ConfigError["503 configuration error"]
    HasKey -->|Yes| CacheCheck{"Fresh cache available?"}
    CacheCheck -->|Yes| ReturnFresh["Return cached payload"]
    CacheCheck -->|No| LiveFetch["Call SoSoValue with x-soso-api-key"]
    LiveFetch --> Success{"HTTP success?"}
    Success -->|Yes| StoreCache["Store payload and return"]
    Success -->|HTTP 429 + stale available| ReturnStale["Return stale cached payload"]
    Success -->|Failure| FailClosed["Return upstream error"]
```

> [!WARNING]
> NarrativeOS does not include seeded market narratives, fake whale data, fake social data, or fictional SoDEX Path endpoints. Unsupported data remains unavailable until a real public source is integrated.

---

## SoDEX Integration Boundary

SoDEX is included as a market context surface for spot/perps endpoints and account state. The MVP keeps this integration truthful:

| Area | Status |
|---|---|
| SoDEX spot endpoint configuration | Implemented |
| SoDEX perps endpoint configuration | Implemented |
| Spot symbols API route | Implemented |
| Account state API route | Implemented |
| Path Contract publishing through SoDEX | Not claimed |
| Path Contract settlement | Arbitrum Sepolia EVM contract |

NarrativeOS does **not** invent a SoDEX Path Contract endpoint. Path Contracts are published through the deployed EVM `PathMarket` contract.

---

## Smart Contract Architecture

The MVP settlement primitive is `PathMarket.sol`.

### Contract Responsibilities

| Function | Purpose |
|---|---|
| `createLinearPath(bytes32 termsHash, uint8 legCount)` | Creates a new path with immutable off-chain terms hash |
| `stakeLeg(uint256 pathId, uint8 legIndex, bool support)` | Lets users support or oppose a specific leg |
| `resolveLeg(uint256 pathId, uint8 legIndex, bool confirmed, bytes32 evidenceHash)` | Oracle-only sequential leg resolution |
| `claim(uint256 pathId)` | Graduated per-leg payout and unresolved-leg refund behavior |
| `setOracle(address nextOracle)` | Owner-managed oracle rotation |

### Contract Data Model

```mermaid
classDiagram
    class PathMarket {
      +address owner
      +address oracle
      +uint256 nextPathId
      +createLinearPath(bytes32,uint8)
      +stakeLeg(uint256,uint8,bool)
      +resolveLeg(uint256,uint8,bool,bytes32)
      +claim(uint256)
    }

    class Path {
      +address creator
      +bytes32 termsHash
      +uint8 legCount
      +uint8 resolvedLegs
      +bool exists
      +bool closed
    }

    class Leg {
      +uint256 supportTotal
      +uint256 opposeTotal
      +bool resolved
      +bool confirmed
      +bytes32 evidenceHash
    }

    class UserLegStake {
      +uint256 support
      +uint256 oppose
    }

    PathMarket --> Path
    PathMarket --> Leg
    PathMarket --> UserLegStake
```

### Settlement Properties

| Property | Mechanism |
|---|---|
| Ordered resolution | `legIndex == path.resolvedLegs` |
| Oracle restriction | `onlyOracle` modifier |
| Immutable terms pointer | `termsHash` |
| Evidence anchoring | `evidenceHash` per resolved leg |
| Early failure closure | Path closes on first failed leg |
| Graduated payout | Winners receive principal plus proportional loser pool |
| Unresolved refunds | Unresolved legs refund both sides after closure |

### Contract Events

| Event | Meaning |
|---|---|
| `PathCreated` | A path was created with terms hash and leg count |
| `LegStaked` | User staked support or opposition on a leg |
| `LegResolved` | Oracle resolved a leg with evidence hash |
| `Claimed` | User claimed payout/refund |
| `OracleUpdated` | Oracle signer changed |

---

## API Documentation

Base URL:

```text
https://narrativeos-api.onrender.com
```

### Health

```http
GET /health
```

Response:

```json
{
  "ok": true,
  "timestamp": "2026-06-04T17:29:15+00:00"
}
```

### Top Narratives

```http
GET /api/narratives/top
```

Returns live SoSoValue-backed narratives.

```json
{
  "narratives": [
    {
      "id": "tag-clarity-act",
      "title": "CLARITY ACT narrative path",
      "confidence": 81,
      "risk": 19,
      "evidence": [
        {
          "source": "SoSoValue featured news",
          "label": "U.S. Senator Lummis...",
          "value": "tag=CLARITY ACT"
        }
      ]
    }
  ],
  "snapshotTime": "2026-06-04T17:29:18+00:00"
}
```

### Market Chart

```http
GET /api/market-chart?asset=btc&points=54&future_points=28
```

Returns ETF inflow chart data derived from SoSoValue historical ETF inflow feeds.

### Draft Path Contract

```http
POST /api/path-contracts/draft
Content-Type: application/json
```

```json
{
  "themeId": "currency-btc",
  "stakeAmount": "0.001",
  "creator": "0x..."
}
```

### Publish Path Contract

```http
POST /api/path-contracts/publish
Content-Type: application/json
```

Wallet-submitted mode:

```json
{
  "contract": {},
  "txHash": "0x...",
  "creator": "0x..."
}
```

Server-relay mode:

```json
{
  "contract": {},
  "relay": true
}
```

### List Path Contracts

```http
GET /api/path-contracts
GET /api/path-contracts?status=published
```

### Get Path Contract

```http
GET /api/path-contracts/{path_id}
```

### SoDEX Symbols

```http
GET /api/sodex/spot/symbols
```

### SoDEX Account State

```http
GET /api/sodex/accounts/{user_address}/state
```

### Oracle Resolve

```http
POST /api/oracle/resolve
Content-Type: application/json
```

```json
{
  "pathId": 4,
  "legIndex": 1,
  "confirmed": true,
  "evidenceHash": "0x..."
}
```

---

## Local Setup

### Prerequisites

| Tool | Version |
|---|---|
| Node.js | 20+ recommended |
| npm | 10+ recommended |
| Python | 3.12+ |
| Foundry | Latest stable |
| MetaMask | For wallet flows |


NarrativeOS is the operating system for that sequence.
