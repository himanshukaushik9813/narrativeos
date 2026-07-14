import { keccak256, toHex } from "viem";

import type {
  ConditionLibraryItem,
  EngineContract,
  EngineLeg,
  MarketChartResponse,
  NarrativeTheme,
  PathContract,
  PathLeg,
  SimulationResult
} from "@/lib/types";

const STORAGE_KEY = "narrativeos.pathContracts.v1";

export const contractStructures = ["Linear", "Parallel", "Conditional", "Weighted", "Dynamic"] as const;

export const contractStates = ["Draft", "Published", "Active", "Resolved", "Expired", "Archived"] as const;

export const conditionLibrary: ConditionLibraryItem[] = [
  {
    id: "btc-etf-daily-inflow",
    category: "ETF Flows",
    label: "BTC spot ETF daily net inflow",
    metricSource: "SoSoValue current ETF data metrics",
    comparator: ">",
    threshold: "0 USD",
    window: "24 hours",
    confidence: 76,
    source: "SoSoValue",
    supported: true,
    note: "Current ETF metrics are supported by the SoSoValue API."
  },
  {
    id: "btc-etf-cumulative-flow",
    category: "ETF Flows",
    label: "BTC ETF cumulative net inflow expands",
    metricSource: "SoSoValue historical ETF inflow chart",
    comparator: ">=",
    threshold: "latest observed baseline",
    window: "7 days",
    confidence: 72,
    source: "SoSoValue",
    supported: true,
    note: "Uses live cumNetInflow history from SoSoValue."
  },
  {
    id: "eth-etf-daily-inflow",
    category: "ETF Flows",
    label: "ETH spot ETF daily net inflow",
    metricSource: "SoSoValue current ETF data metrics",
    comparator: ">",
    threshold: "0 USD",
    window: "24 hours",
    confidence: 70,
    source: "SoSoValue",
    supported: true,
    note: "Current ETF metrics are supported by the SoSoValue API."
  },
  {
    id: "narrative-velocity",
    category: "Narrative Velocity",
    label: "Theme remains present in featured news",
    metricSource: "SoSoValue featured news",
    comparator: ">=",
    threshold: "3 tagged items",
    window: "3 days",
    confidence: 74,
    source: "SoSoValue",
    supported: true,
    note: "Uses featured-news tags, categories, and matched currencies."
  },
  {
    id: "social-momentum",
    category: "Social Momentum",
    label: "Quote engagement holds above baseline",
    metricSource: "SoSoValue quoteInfo engagement",
    comparator: ">=",
    threshold: "observed interactions",
    window: "3 days",
    confidence: 66,
    source: "SoSoValue",
    supported: true,
    note: "Uses quoteInfo fields returned with featured news."
  },
  {
    id: "currency-attention",
    category: "Market Dominance",
    label: "Matched currency attention persists",
    metricSource: "SoSoValue featured news by currency",
    comparator: ">=",
    threshold: "1 matched-currency item",
    window: "7 days",
    confidence: 62,
    source: "SoSoValue",
    supported: true,
    note: "Uses the supported featured-news-by-currency endpoint."
  },
  {
    id: "tvl-growth",
    category: "TVL Growth",
    label: "TVL growth condition",
    metricSource: "Not available in supported SoSoValue endpoints",
    comparator: ">=",
    threshold: "unsupported",
    window: "disabled",
    confidence: 0,
    source: "SoSoValue",
    supported: false,
    note: "Disabled until an official public TVL endpoint is available."
  },
  {
    id: "whale-accumulation",
    category: "Whale Accumulation",
    label: "Smart money accumulation condition",
    metricSource: "Not available in supported SoSoValue endpoints",
    comparator: ">=",
    threshold: "unsupported",
    window: "disabled",
    confidence: 0,
    source: "SoSoValue",
    supported: false,
    note: "Disabled to avoid fabricating whale data."
  },
  {
    id: "funding-rates",
    category: "Funding Rates",
    label: "Funding-rate condition",
    metricSource: "Not available in supported SoSoValue endpoints",
    comparator: "<=",
    threshold: "unsupported",
    window: "disabled",
    confidence: 0,
    source: "SoSoValue",
    supported: false,
    note: "Disabled until a supported public funding endpoint is available."
  },
  {
    id: "dex-volume",
    category: "DEX Volume",
    label: "DEX volume condition",
    metricSource: "Not available in supported SoSoValue endpoints",
    comparator: ">=",
    threshold: "unsupported",
    window: "disabled",
    confidence: 0,
    source: "SoSoValue",
    supported: false,
    note: "Disabled until a supported public DEX-volume endpoint is available."
  },
  {
    id: "stablecoin-inflow",
    category: "Stablecoin Inflows",
    label: "Stablecoin inflow condition",
    metricSource: "Not available in supported SoSoValue endpoints",
    comparator: ">=",
    threshold: "unsupported",
    window: "disabled",
    confidence: 0,
    source: "SoSoValue",
    supported: false,
    note: "Disabled until a supported public stablecoin-flow endpoint is available."
  },
  {
    id: "volatility",
    category: "Volatility",
    label: "Volatility expansion condition",
    metricSource: "SoSoValue historical ETF inflow chart",
    comparator: "<=",
    threshold: "observed drawdown band",
    window: "7 days",
    confidence: 58,
    source: "SoSoValue",
    supported: true,
    note: "Uses variance in live ETF flow history as a risk proxy."
  }
];

export function contractFromPathDraft(draft: PathContract, narrative?: NarrativeTheme): EngineContract {
  const now = new Date().toISOString();
  const legs = draft.legs.map((leg) => legFromPathLeg(leg));
  return {
    id: draft.id,
    source: "live-narrative",
    sourceThemeId: narrative?.id,
    title: titleFromNarrative(draft.theme),
    description: draft.marketDna,
    structure: "Linear",
    status: draft.status === "published" ? "Published" : "Draft",
    confidence: draft.confidence,
    historicalMatch: Math.max(55, Math.min(94, draft.confidence + 6)),
    timeHorizon: inferHorizon(legs),
    stakeAmount: draft.stakeAmount,
    stakeToken: "Arbitrum Sepolia ETH",
    narrativeTitle: draft.theme,
    narrativeScore: narrative?.magnitude ?? draft.confidence,
    settlementLogic: "Success if all required legs confirm within the configured time horizon.",
    legs,
    reasoning: reasoningFromDraft(draft),
    contradictionAnalysis: contradictionFromDraft(draft),
    failureConditions: failureFromLegs(legs),
    simulation: simulateContract(legs, draft.confidence),
    createdAt: now,
    updatedAt: now,
    txHash: draft.txHash,
    onchainPathId: draft.onchainPathId,
    marketAddress: draft.marketAddress,
    termsHash: draft.termsHash
  };
}

export function contractFromSeed(seed?: Partial<EngineContract>): EngineContract {
  const now = new Date().toISOString();
  const baseLegs = [
    legFromLibrary(conditionLibrary[0]),
    legFromLibrary(conditionLibrary[3]),
    legFromLibrary(conditionLibrary[4])
  ];
  const confidence = seed?.confidence ?? 68;
  return {
    id: seed?.id ?? nextContractId(),
    source: seed?.source ?? "custom",
    title: seed?.title ?? "Custom Path Market",
    description:
      seed?.description ??
      "A custom path market composed from supported SoSoValue evidence sources, simulated locally, and prepared for PathMarket settlement.",
    structure: seed?.structure ?? "Linear",
    status: seed?.status ?? "Draft",
    confidence,
    historicalMatch: seed?.historicalMatch ?? Math.max(54, confidence + 7),
    timeHorizon: seed?.timeHorizon ?? "14 days",
    stakeAmount: seed?.stakeAmount ?? "0.000001",
    stakeToken: "Arbitrum Sepolia ETH",
    narrativeTitle: seed?.narrativeTitle ?? seed?.title ?? "Custom Narrative",
    narrativeScore: seed?.narrativeScore ?? confidence,
    settlementLogic:
      seed?.settlementLogic ??
      "Success if the configured conditions complete before expiry; unresolved legs follow the PathMarket refund/review path.",
    legs: seed?.legs?.length ? seed.legs : baseLegs,
    reasoning:
      seed?.reasoning ??
      [
        "The contract uses live SoSoValue ETF and featured-news evidence.",
        "Legs are sequenced to test capital flow first, then narrative persistence.",
        "Risk is discounted when evidence breadth narrows or flow momentum cools."
      ],
    contradictionAnalysis:
      seed?.contradictionAnalysis ??
      [
        "Positive news velocity can conflict with negative ETF flow.",
        "A single high-engagement article can overstate durable narrative strength.",
        "ETF flow signals may lag broader market rotation."
      ],
    failureConditions:
      seed?.failureConditions ?? failureFromLegs(seed?.legs?.length ? seed.legs : baseLegs),
    simulation: seed?.simulation ?? simulateContract(seed?.legs?.length ? seed.legs : baseLegs, confidence),
    createdAt: seed?.createdAt ?? now,
    updatedAt: now,
    txHash: seed?.txHash ?? null,
    onchainPathId: seed?.onchainPathId ?? null,
    termsHash: seed?.termsHash
  };
}

export function contractFromPrompt(prompt: string): EngineContract {
  const lower = prompt.toLowerCase();
  const ethTilt = lower.includes("eth") || lower.includes("ethereum") || lower.includes("base");
  const aiTilt = lower.includes("ai") || lower.includes("infrastructure");
  const title = ethTilt
    ? aiTilt
      ? "Ethereum AI Infrastructure Path"
      : "Ethereum Ecosystem Path"
    : aiTilt
      ? "AI Infrastructure Rotation Path"
      : "Narrative Momentum Path";
  const legs = [
    legFromLibrary(ethTilt ? conditionLibrary[2] : conditionLibrary[0]),
    legFromLibrary(conditionLibrary[3]),
    legFromLibrary(conditionLibrary[4]),
    legFromLibrary(conditionLibrary[5])
  ];
  const confidence = aiTilt || ethTilt ? 74 : 66;
  return contractFromSeed({
    id: nextContractId(),
    source: "ai-assisted",
    title,
    narrativeTitle: title,
    description: `AI-assisted contract generated from: "${prompt}". Evidence sources are restricted to supported SoSoValue endpoints.`,
    confidence,
    historicalMatch: aiTilt ? 83 : 72,
    timeHorizon: "14 days",
    legs,
    reasoning: [
      "ETF flow acceleration is the capital-flow anchor for the thesis.",
      "Featured-news persistence tests whether attention survives the first impulse.",
      "Quote engagement acts as the supported proxy for narrative momentum.",
      "Matched-currency evidence keeps the path tied to observable SoSoValue data."
    ],
    contradictionAnalysis: [
      "ETF inflows can weaken while news velocity remains high.",
      "A narrative can trend without converting into sustained capital flow.",
      "Unsupported TVL, whale, and DEX conditions are excluded until official endpoints exist."
    ],
    failureConditions: failureFromLegs(legs)
  });
}

export function legFromLibrary(item: ConditionLibraryItem): EngineLeg {
  return {
    id: randomId("leg"),
    condition: item.label,
    metricSource: item.metricSource,
    comparator: item.comparator,
    threshold: item.threshold,
    window: item.window,
    confidence: item.confidence,
    weight: 1,
    evidence: [
      {
        source: item.metricSource,
        label: item.label,
        value: item.note,
        observedAt: new Date().toISOString()
      }
    ]
  };
}

export function simulateContract(
  legs: EngineLeg[],
  confidence: number,
  chart?: MarketChartResponse | null
): SimulationResult {
  const legConfidence = legs.length
    ? legs.reduce((total, leg) => total + leg.confidence, 0) / legs.length
    : confidence;
  const chartValues = chart?.data
    .map((point) => point.actual)
    .filter((value): value is number => typeof value === "number") ?? [];
  const trend = chartValues.length > 1 ? chartValues[chartValues.length - 1] - chartValues[0] : 0;
  const drawdown = maxDrawdownPct(chartValues);
  const regimeBoost = trend >= 0 ? 6 : -4;
  const historicalSuccessRate = clamp(Math.round(legConfidence * 0.62 + confidence * 0.24 + regimeBoost), 18, 94);
  const riskScore = clamp(Math.round(100 - historicalSuccessRate + drawdown * 1.4), 6, 92);

  return {
    historicalSuccessRate,
    expectedReward: Number((1 + historicalSuccessRate / 100 + legs.length * 0.08).toFixed(2)),
    riskScore,
    maxDrawdown: Number(drawdown.toFixed(2)),
    narrativeStrength: clamp(Math.round(confidence * 0.68 + legConfidence * 0.32), 0, 100),
    historicalSimilarity: clamp(Math.round(confidence + (trend >= 0 ? 8 : -6)), 0, 100),
    marketRegimeCompatibility: clamp(Math.round(62 + regimeBoost + Math.max(0, 12 - drawdown)), 0, 100)
  };
}

export function engineContractToPathContract(contract: EngineContract): PathContract {
  const payload = {
    title: contract.title,
    description: contract.description,
    structure: contract.structure,
    legs: contract.legs,
    settlementLogic: contract.settlementLogic,
    stakeAmount: contract.stakeAmount,
    stakeToken: contract.stakeToken,
    createdAt: contract.createdAt
  };
  const termsHash = keccak256(toHex(JSON.stringify(payload)));

  return {
    id: contract.id,
    title: contract.title,
    theme: contract.narrativeTitle,
    structure: "linear",
    legs: contract.legs.map((leg, index) => ({
      leg: index + 1,
      condition: leg.condition,
      metricSource: leg.metricSource,
      comparator: leg.comparator,
      threshold: leg.threshold,
      window: leg.window,
      confidence: leg.confidence,
      evidence: leg.evidence
    })),
    confidence: contract.confidence,
    risk: contract.simulation.riskScore,
    stakeAmount: contract.stakeAmount,
    stakeToken: "Arbitrum Sepolia ETH",
    creator: null,
    termsHash,
    onchainPathId: contract.onchainPathId,
    txHash: contract.txHash,
    marketAddress: contract.marketAddress,
    status: "draft",
    agentContext: {
      snapshotTime: new Date().toISOString(),
      dataAgent: {
        sources: ["SoSoValue featured news", "SoSoValue ETF metrics", "SoSoValue ETF history"]
      },
      narrativeAgent: {
        dominant_theme: contract.narrativeTitle,
        confidence: contract.confidence
      },
      riskAgent: {
        risk_score: contract.simulation.riskScore,
        max_drawdown: contract.simulation.maxDrawdown
      },
      strategyAgent: {
        supported_structure: "linear",
        requested_structure: contract.structure,
        leg_count: contract.legs.length
      },
      executionAgent: {},
      explainabilityAgent: {
        style: "Market DNA",
        summary: contract.description
      }
    },
    marketDna: contract.description
  };
}

export function listStoredContracts(): EngineContract[] {
  if (typeof window === "undefined") {
    return [];
  }
  try {
    const payload = window.localStorage.getItem(STORAGE_KEY);
    return payload ? (JSON.parse(payload) as EngineContract[]) : [];
  } catch {
    return [];
  }
}

export function saveStoredContract(contract: EngineContract) {
  if (typeof window === "undefined") {
    return;
  }
  const next = [contract, ...listStoredContracts().filter((item) => item.id !== contract.id)];
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next.slice(0, 50)));
  window.dispatchEvent(new Event("narrativeos-contracts-updated"));
}

export function archiveStoredContract(contractId: string) {
  if (typeof window === "undefined") {
    return;
  }
  const next = listStoredContracts().map((contract) =>
    contract.id === contractId
      ? { ...contract, status: "Archived" as const, updatedAt: new Date().toISOString() }
      : contract
  );
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event("narrativeos-contracts-updated"));
}

export function nextContractId() {
  const count = typeof window === "undefined" ? 1 : listStoredContracts().length + 1;
  return `PC-${String(count).padStart(5, "0")}`;
}

function legFromPathLeg(leg: PathLeg): EngineLeg {
  return {
    id: randomId(`leg-${leg.leg}`),
    condition: leg.condition,
    metricSource: leg.metricSource,
    comparator: leg.comparator,
    threshold: leg.threshold,
    window: leg.window,
    confidence: leg.confidence,
    weight: 1,
    evidence: leg.evidence
  };
}

function titleFromNarrative(theme: string) {
  return theme
    .replace(/\s+narrative\s+path/i, "")
    .replace(/\s+market\s+path/i, "")
    .trim()
    .concat(" Path Contract");
}

function inferHorizon(legs: EngineLeg[]) {
  const windows = legs.map((leg) => Number.parseInt(leg.window, 10)).filter(Number.isFinite);
  if (!windows.length) {
    return "14 days";
  }
  return `${Math.max(...windows)} days`;
}

function reasoningFromDraft(draft: PathContract) {
  return [
    `${draft.theme} ranked from live SoSoValue evidence at ${draft.confidence}% confidence.`,
    "The contract converts observable narrative attention into sequential settlement legs.",
    "Every leg cites the same evidence used by the agent pipeline.",
    "Arbitrum Sepolia publish stores the terms hash and leg count on-chain."
  ];
}

function contradictionFromDraft(draft: PathContract) {
  const metricSources = Array.from(new Set(draft.legs.map((leg) => leg.metricSource)));
  return [
    "A high news count can fade before the settlement window closes.",
    "ETF flow can diverge from narrative velocity.",
    `${metricSources[0] ?? "The primary source"} may lag faster market rotation.`,
    "Unsupported off-chain claims are excluded from settlement."
  ];
}

function failureFromLegs(legs: EngineLeg[]) {
  return legs.map((leg) => `${leg.condition} fails to satisfy ${leg.comparator} ${leg.threshold} within ${leg.window}.`);
}

function maxDrawdownPct(values: number[]) {
  let peak = values[0] ?? 0;
  let maxDrawdown = 0;
  for (const value of values) {
    peak = Math.max(peak, value);
    if (peak > 0) {
      maxDrawdown = Math.max(maxDrawdown, ((peak - value) / peak) * 100);
    }
  }
  return maxDrawdown;
}

function randomId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
  }
  return `${prefix}-${Math.random().toString(16).slice(2, 10)}`;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}
