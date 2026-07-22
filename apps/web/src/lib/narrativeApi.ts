import type {
  CreatorLeaderboardResponse,
  EvidenceItem,
  HistoricalLearningResponse,
  LifecycleStage,
  MarketAction,
  MarketActionRequest,
  MarketChartResponse,
  MarketSection,
  MarketsResponse,
  NarrativeTheme,
  NarrativesResponse,
  PathContract,
  PathContractsResponse,
  PathLeg,
  PathMarketView,
  PortfolioResponse,
  SoDEXMarketContext
} from "@/lib/types";

const API_BASE = process.env.NEXT_PUBLIC_NARRATIVEOS_API_BASE ?? "http://127.0.0.1:8000";
const DEFAULT_TIMEOUT_MS = 30000;
const LIVE_ENDPOINT_TIMEOUT_MS = 45000;
const LIVE_ENDPOINT_RETRIES = 1;
const SETTLEMENT_NETWORK = "Arbitrum Sepolia";
const ARBITRUM_SEPOLIA_EXPLORER = "https://sepolia.arbiscan.io";
const MARKET_SECTION_NAMES: MarketSection["name"][] = [
  "Trending Contracts",
  "Highest Volume",
  "Highest Confidence",
  "Most Staked",
  "Newest",
  "Ending Soon",
  "Highest Accuracy",
  "Most Profitable Creators"
];
const LIFECYCLE: LifecycleStage["name"][] = [
  "Draft",
  "Simulation",
  "Published",
  "Open For Staking",
  "Active",
  "Settlement",
  "Resolved",
  "Archived"
];
const KNOWN_TRANSLATIONS: Array<[RegExp, string]> = [
  [/三星电子/g, "Samsung Electronics"],
  [/三星/g, "Samsung"],
  [/SK海力士/g, "SK Hynix"],
  [/海力士/g, "Hynix"],
  [/韩国/g, "South Korea"],
  [/比特币/g, "Bitcoin"],
  [/以太坊/g, "Ethereum"]
];

export class NarrativeApiError extends Error {
  status?: number;
  missing?: string[];

  constructor(message: string, status?: number, missing?: string[]) {
    super(message);
    this.name = "NarrativeApiError";
    this.status = status;
    this.missing = missing;
  }
}

export async function fetchTopNarratives(signal?: AbortSignal): Promise<NarrativesResponse> {
  const response = await request<NarrativesResponse>("/api/narratives/top", {
    signal,
    timeoutMs: LIVE_ENDPOINT_TIMEOUT_MS,
    retries: LIVE_ENDPOINT_RETRIES,
    cacheKey: "top-narratives"
  });
  return {
    ...response,
    narratives: response.narratives.map(sanitizeNarrativeTheme)
  };
}

export async function fetchMarketChart(signal?: AbortSignal): Promise<MarketChartResponse> {
  return request<MarketChartResponse>("/api/market-chart?asset=btc&points=54&future_points=28", {
    signal,
    timeoutMs: LIVE_ENDPOINT_TIMEOUT_MS,
    retries: LIVE_ENDPOINT_RETRIES,
    cacheKey: "market-chart-btc"
  });
}

export async function fetchPublishedPathContracts(signal?: AbortSignal): Promise<PathContractsResponse> {
  const response = await request<PathContractsResponse>("/api/path-contracts?status=published", { signal });
  return {
    contracts: response.contracts.map(sanitizePathContract)
  };
}

export async function fetchPathMarkets(
  signal?: AbortSignal,
  includeLiveCandidates = true
): Promise<MarketsResponse> {
  const query = includeLiveCandidates ? "" : "?include_live_candidates=false";
  try {
    const response = await request<MarketsResponse>(`/api/markets${query}`, {
      signal,
      retries: includeLiveCandidates ? LIVE_ENDPOINT_RETRIES : 0,
      timeoutMs: includeLiveCandidates ? LIVE_ENDPOINT_TIMEOUT_MS : DEFAULT_TIMEOUT_MS,
      cacheKey: includeLiveCandidates ? "path-markets-live" : "path-markets-published"
    });
    return normalizeMarketsResponse(response);
  } catch (caught) {
    if (!isLegacyEndpointMiss(caught)) {
      throw caught;
    }
    return fetchLegacyPathMarkets(signal);
  }
}

export async function fetchPathMarket(contractId: string, signal?: AbortSignal): Promise<MarketsResponse["markets"][number]> {
  try {
    return sanitizeMarketView(await request<MarketsResponse["markets"][number]>(`/api/markets/${contractId}`, { signal }));
  } catch (caught) {
    if (!isLegacyEndpointMiss(caught)) {
      throw caught;
    }
    const response = await fetchLegacyPathMarkets(signal);
    const market = response.markets.find((item) => item.contractId === contractId);
    if (!market) {
      throw new NarrativeApiError("Path market not found", 404);
    }
    return market;
  }
}

export async function recordMarketAction(
  contractId: string,
  input: MarketActionRequest
): Promise<MarketAction> {
  try {
    return request<MarketAction>(`/api/markets/${contractId}/actions`, {
      method: "POST",
      body: JSON.stringify(input)
    });
  } catch (caught) {
    if (!isLegacyEndpointMiss(caught)) {
      throw caught;
    }
    return {
      id: `local-${contractId}-${Date.now()}`,
      contractId,
      createdAt: new Date().toISOString(),
      ...input
    };
  }
}

export async function fetchPortfolio(address: string, signal?: AbortSignal): Promise<PortfolioResponse> {
  try {
    return request<PortfolioResponse>(`/api/portfolio/${address}`, { signal });
  } catch (caught) {
    if (!isLegacyEndpointMiss(caught)) {
      throw caught;
    }
    return {
      address,
      activePositions: [],
      resolvedPositions: [],
      pendingSettlement: [],
      totalStaked: "0",
      roi: "0.00x",
      winRate: 0,
      currentExposure: "0",
      portfolioHeatmap: {
        support: "0",
        oppose: "0",
        active: "0",
        pending: "0"
      },
      narrativeDistribution: {}
    };
  }
}

export async function fetchCreatorLeaderboard(signal?: AbortSignal): Promise<CreatorLeaderboardResponse> {
  try {
    return request<CreatorLeaderboardResponse>("/api/creators/leaderboard", { signal });
  } catch (caught) {
    if (!isLegacyEndpointMiss(caught)) {
      throw caught;
    }
    return { creators: [] };
  }
}

export async function fetchHistoricalLearning(signal?: AbortSignal): Promise<HistoricalLearningResponse> {
  try {
    return request<HistoricalLearningResponse>("/api/history/learning", { signal });
  } catch (caught) {
    if (!isLegacyEndpointMiss(caught)) {
      throw caught;
    }
    return { history: [] };
  }
}

export async function fetchSoDEXContext(signal?: AbortSignal): Promise<SoDEXMarketContext> {
  return request<SoDEXMarketContext>("/api/sodex/context", { signal });
}

export async function draftPathContract({
  themeId,
  stakeAmount,
  creator,
  signal
}: {
  themeId: string;
  stakeAmount: string;
  creator?: string;
  signal?: AbortSignal;
}): Promise<PathContract> {
  return sanitizePathContract(await request<PathContract>("/api/path-contracts/draft", {
    method: "POST",
    signal,
    body: JSON.stringify({
      themeId,
      stakeAmount,
      creator
    })
  }));
}

export async function publishPathContract({
  contract,
  creator,
  relay = true
}: {
  contract: PathContract;
  creator?: string;
  relay?: boolean;
}): Promise<PathContract> {
  return sanitizePathContract(await request<PathContract>("/api/path-contracts/publish", {
    method: "POST",
    body: JSON.stringify({
      contract,
      creator,
      relay
    })
  }));
}

export function toApiError(error: unknown): NarrativeApiError {
  if (error instanceof NarrativeApiError) {
    return error;
  }
  if (error instanceof Error) {
    return new NarrativeApiError(error.message || "NarrativeOS API request failed");
  }
  return new NarrativeApiError("NarrativeOS API request failed");
}

type NarrativeRequestInit = RequestInit & {
  timeoutMs?: number;
  retries?: number;
  retryDelayMs?: number;
  cacheKey?: string;
};

async function request<T>(path: string, init: NarrativeRequestInit = {}): Promise<T> {
  const {
    timeoutMs = DEFAULT_TIMEOUT_MS,
    retries = 0,
    retryDelayMs = 900,
    cacheKey,
    ...requestInit
  } = init;
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const payload = await requestOnce<T>(path, requestInit, timeoutMs);
      if (cacheKey) {
        writeLiveCache(cacheKey, payload);
      }
      return payload;
    } catch (error) {
      if (requestInit.signal?.aborted) {
        throw error;
      }

      lastError = error;
      const apiError = toApiError(error);
      if (attempt >= retries || !isRetryableApiError(apiError)) {
        break;
      }

      await delay(retryDelayMs * (attempt + 1), requestInit.signal);
    }
  }

  if (cacheKey) {
    const cached = readLiveCache<T>(cacheKey);
    if (cached) {
      return cached;
    }
  }

  throw lastError ?? new NarrativeApiError("NarrativeOS API request failed");
}

async function requestOnce<T>(
  path: string,
  init: RequestInit,
  timeoutMs: number
): Promise<T> {
  const timeoutController = new AbortController();
  const timeout = window.setTimeout(() => timeoutController.abort(), timeoutMs);
  const signal = mergeSignals(init.signal, timeoutController.signal);
  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...init,
      signal,
      headers: {
        "content-type": "application/json",
        ...init.headers
      }
    });
  } catch (error) {
    if (timeoutController.signal.aborted) {
      throw new NarrativeApiError(
        "NarrativeOS backend is still waking up or the live SoSoValue feed is slow. Retry in a moment.",
        408
      );
    }
    if (error instanceof DOMException && error.name === "AbortError") {
      throw error;
    }
    throw new NarrativeApiError("NarrativeOS API is unreachable. Start services/api on port 8000.", 0);
  } finally {
    window.clearTimeout(timeout);
  }

  if (!response.ok) {
    throw await buildApiError(response);
  }

  return response.json() as Promise<T>;
}

async function buildApiError(response: Response): Promise<NarrativeApiError> {
  const fallback = `NarrativeOS API returned ${response.status}`;
  try {
    const payload = (await response.json()) as {
      detail?: string | { message?: string; missing?: string[] };
    };
    if (typeof payload.detail === "string") {
      return new NarrativeApiError(payload.detail, response.status);
    }
    return new NarrativeApiError(
      payload.detail?.message ?? fallback,
      response.status,
      payload.detail?.missing
    );
  } catch {
    return new NarrativeApiError(fallback, response.status);
  }
}

function isRetryableApiError(error: NarrativeApiError): boolean {
  return error.status === 0 || error.status === 408 || error.status === 429 || error.status === 502 || error.status === 503 || error.status === 504;
}

function delay(durationMs: number, signal?: AbortSignal | null): Promise<void> {
  if (signal?.aborted) {
    return Promise.reject(new DOMException("Aborted", "AbortError"));
  }

  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(resolve, durationMs);
    signal?.addEventListener(
      "abort",
      () => {
        window.clearTimeout(timer);
        reject(new DOMException("Aborted", "AbortError"));
      },
      { once: true }
    );
  });
}

function liveCacheKey(cacheKey: string): string {
  return `narrativeos.live-api.v1.${encodeURIComponent(API_BASE)}.${cacheKey}`;
}

function writeLiveCache<T>(cacheKey: string, payload: T): void {
  try {
    window.localStorage.setItem(
      liveCacheKey(cacheKey),
      JSON.stringify({
        storedAt: new Date().toISOString(),
        payload
      })
    );
  } catch {
    // Cache is a resilience aid only; storage failures should never block live data.
  }
}

function readLiveCache<T>(cacheKey: string): T | null {
  try {
    const raw = window.localStorage.getItem(liveCacheKey(cacheKey));
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as { payload?: T };
    return parsed.payload ?? null;
  } catch {
    return null;
  }
}

function mergeSignals(signal: AbortSignal | null | undefined, timeoutSignal: AbortSignal): AbortSignal {
  if (!signal) {
    return timeoutSignal;
  }

  if (signal.aborted) {
    return signal;
  }

  const controller = new AbortController();
  const abort = () => controller.abort();
  signal.addEventListener("abort", abort, { once: true });
  timeoutSignal.addEventListener("abort", abort, { once: true });
  return controller.signal;
}

async function fetchLegacyPathMarkets(signal?: AbortSignal): Promise<MarketsResponse> {
  try {
    const response = await request<PathContractsResponse>("/api/path-contracts", { signal });
    const markets = response.contracts.map((contract, index) => legacyContractToMarket(contract, index));
    return {
      markets,
      sections: buildMarketSections(markets),
      snapshotTime: new Date().toISOString()
    };
  } catch (caught) {
    if (isLegacyEndpointMiss(caught)) {
      return emptyMarketsResponse();
    }
    throw caught;
  }
}

function normalizeMarketsResponse(response: MarketsResponse): MarketsResponse {
  const markets = response.markets.map(sanitizeMarketView);
  const byId = new Map(markets.map((market) => [market.contractId, market]));
  const sections = response.sections.length
    ? response.sections.map((section) => ({
        name: section.name,
        markets: section.markets.map((market) => byId.get(market.contractId) ?? sanitizeMarketView(market))
      }))
    : buildMarketSections(markets);

  return {
    markets,
    sections,
    snapshotTime: response.snapshotTime
  };
}

function emptyMarketsResponse(): MarketsResponse {
  return {
    markets: [],
    sections: MARKET_SECTION_NAMES.map((name) => ({ name, markets: [] })),
    snapshotTime: new Date().toISOString()
  };
}

function buildMarketSections(markets: PathMarketView[]): MarketSection[] {
  return [
    { name: "Trending Contracts", markets: [...markets].sort((a, b) => b.probability - a.probability).slice(0, 6) },
    { name: "Highest Volume", markets: [...markets].sort((a, b) => numericAmount(b.volume) - numericAmount(a.volume)).slice(0, 6) },
    { name: "Highest Confidence", markets: [...markets].sort((a, b) => b.probabilityBreakdown.confidence - a.probabilityBreakdown.confidence).slice(0, 6) },
    { name: "Most Staked", markets: [...markets].sort((a, b) => numericAmount(b.totalStakes) - numericAmount(a.totalStakes)).slice(0, 6) },
    { name: "Newest", markets: [...markets].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 6) },
    { name: "Ending Soon", markets: [...markets].sort((a, b) => windowRank(a.timeRemaining) - windowRank(b.timeRemaining)).slice(0, 6) },
    { name: "Highest Accuracy", markets: [...markets].sort((a, b) => b.probabilityBreakdown.historicalMatch - a.probabilityBreakdown.historicalMatch).slice(0, 6) },
    { name: "Most Profitable Creators", markets: [...markets].sort((a, b) => numericAmount(b.openInterest) - numericAmount(a.openInterest)).slice(0, 6) }
  ];
}

function legacyContractToMarket(rawContract: PathContract, index: number): PathMarketView {
  const contract = sanitizePathContract(rawContract);
  const evidence = contractEvidence(contract);
  const legConfidence = contract.legs.length
    ? average(contract.legs.map((leg) => leg.confidence))
    : contract.confidence;
  const evidenceQuality = clamp(Math.round(evidence.length * 9 + legConfidence * 0.34), 0, 100);
  const probability = clamp(Math.round(contract.confidence * 0.58 + evidenceQuality * 0.24 - contract.risk * 0.10 + 18), 3, 97);
  const confidence = clamp(Math.round(contract.confidence * 0.72 + evidenceQuality * 0.18), 0, 100);
  const risk = clamp(Math.round(contract.risk * 0.74 + (100 - confidence) * 0.26), 0, 100);
  const status = lifecycleStatus(contract);
  const settlementStatus = contract.txHash
    ? "Pending oracle evidence"
    : contract.status === "published"
      ? "Awaiting on-chain depth"
      : "Simulation / publish required";
  const spreadBps = contract.onchainPathId ? 1100 : 2500;
  const supportMid = probability / 100;
  const halfSpread = spreadBps / 20000;
  const supportBid = clampPrice(supportMid - halfSpread);
  const supportAsk = clampPrice(supportMid + halfSpread);
  const opposeMid = 1 - supportMid;
  const opposeBid = clampPrice(opposeMid - halfSpread);
  const opposeAsk = clampPrice(opposeMid + halfSpread);
  const updatedAt = contract.agentContext?.snapshotTime ?? new Date(Date.now() - index * 1000).toISOString();

  return {
    contractId: contract.id,
    title: contract.title,
    creator: contract.creator,
    status,
    probability,
    volume: "0",
    openInterest: "0",
    totalStakes: "0",
    stakeToken: contract.stakeToken,
    participants: 0,
    pool: {
      totalLiquidity: "0",
      supportTotal: "0",
      opposeTotal: "0",
      averageEntry: "0",
      largestPosition: "0",
      latestStake: "0",
      participantCount: 0,
      supportShare: 0,
      opposeShare: 0
    },
    latestOrders: [],
    largestOrders: [],
    timeRemaining: timeRemaining(contract),
    liquidity: contract.onchainPathId ? "Low" : "Unavailable",
    settlementStatus,
    watchCount: 0,
    bookmarkCount: 0,
    commentCount: 0,
    lifecycle: lifecycle(status),
    probabilityBreakdown: {
      signals: [
        {
          label: "SoSoValue Evidence Breadth",
          source: "SoSoValue featured news, currencies, and ETF feeds",
          score: Math.round(evidenceQuality - 50),
          weight: 0.34,
          evidenceCount: evidence.length,
          detail: "Compatibility quote generated from the stored Path Contract evidence while the deployed backend marketplace endpoint is catching up."
        },
        {
          label: "Agent Confidence",
          source: "NarrativeOS multi-agent context",
          score: Math.round(contract.confidence - 50),
          weight: 0.46,
          evidenceCount: contract.legs.length,
          detail: "Uses the same Data, Narrative, Risk, Strategy, Execution, and Explainability agent confidence already saved with the contract."
        },
        {
          label: "Risk Discount",
          source: "Risk Agent",
          score: -Math.round(contract.risk * 0.2),
          weight: 0.2,
          evidenceCount: contract.legs.length,
          detail: "Discounts thin or unresolved paths until the market receives confirmed testnet stake depth."
        }
      ],
      riskAdjustment: -Math.round(contract.risk * 0.1),
      rawScore: probability,
      probability,
      confidence,
      risk,
      marketSentiment: sentiment(probability),
      expectedReward: rewardMultiple(probability),
      historicalMatch: clamp(Math.round(contract.confidence + evidence.length * 1.2 - contract.risk * 0.15), 0, 100),
      updatedAt
    },
    pricing: {
      model: "Compatibility path quote v1",
      fairProbability: probability,
      supportBid: formatPrice(supportBid),
      supportAsk: formatPrice(supportAsk),
      opposeBid: formatPrice(opposeBid),
      opposeAsk: formatPrice(opposeAsk),
      spreadBps,
      impliedReward: rewardMultiple(Math.round(supportAsk * 100)),
      defaultStakeSlippageBps: contract.onchainPathId ? 900 : 2500,
      liquidityScore: contract.onchainPathId ? 12 : 0,
      marketDepth: contract.onchainPathId ? "Thin" : "No On-chain Depth",
      feedbackLoop: "No confirmed stake feedback yet; quote is driven by stored SoSoValue evidence and agent confidence only."
    },
    evidence,
    contract,
    contractAddress: contract.marketAddress,
    transactionHash: contract.txHash,
    network: SETTLEMENT_NETWORK,
    settlementBlock: null,
    verificationStatus: contract.txHash ? "Pending" : "Unpublished",
    explorerUrl: contract.txHash ? `${ARBITRUM_SEPOLIA_EXPLORER}/tx/${contract.txHash}` : null,
    updatedAt
  };
}

function sanitizeMarketView(market: PathMarketView): PathMarketView {
  const contract = sanitizePathContract(market.contract);
  return {
    ...market,
    title: englishTitle(market.title, contract.title),
    contract,
    evidence: market.evidence.map(sanitizeEvidence),
    network: englishText(market.network, SETTLEMENT_NETWORK),
    settlementStatus: englishText(market.settlementStatus, "Settlement status unavailable"),
    pricing: {
      ...market.pricing,
      feedbackLoop: englishText(market.pricing.feedbackLoop, "Market feedback is pending confirmed orders.")
    },
    probabilityBreakdown: {
      ...market.probabilityBreakdown,
      signals: market.probabilityBreakdown.signals.map((signal) => ({
        ...signal,
        label: englishTitle(signal.label, "Probability Signal"),
        source: englishText(signal.source, "NarrativeOS evidence source"),
        detail: englishText(signal.detail, "Probability signal detail unavailable.")
      }))
    }
  };
}

function sanitizeNarrativeTheme(theme: NarrativeTheme): NarrativeTheme {
  const title = englishTitle(theme.title, "SoSoValue Narrative Path");
  return {
    ...theme,
    title,
    summary: englishText(theme.summary, "Live SoSoValue evidence supports this NarrativeOS path candidate."),
    evidence: theme.evidence.map(sanitizeEvidence),
    metadata: sanitizeJson(theme.metadata ?? {}) as Record<string, unknown>
  };
}

function sanitizePathContract(contract: PathContract): PathContract {
  const theme = englishTitle(contract.theme, "SoSoValue Narrative Path");
  const title = englishTitle(contract.title, `${theme} - Linear Path`);
  return {
    ...contract,
    title,
    theme,
    legs: contract.legs.map(sanitizeLeg),
    agentContext: sanitizeJson(contract.agentContext) as PathContract["agentContext"],
    marketDna: englishText(contract.marketDna, "Live SoSoValue evidence supports this Path Contract.")
  };
}

function sanitizeLeg(leg: PathLeg): PathLeg {
  return {
    ...leg,
    condition: englishText(leg.condition, "Configured SoSoValue evidence condition"),
    metricSource: englishText(leg.metricSource, "SoSoValue evidence source"),
    threshold: englishText(leg.threshold, "observed threshold"),
    window: englishText(leg.window, "evidence window"),
    evidence: leg.evidence.map(sanitizeEvidence)
  };
}

function sanitizeEvidence(item: EvidenceItem): EvidenceItem {
  return {
    ...item,
    source: englishText(item.source, "SoSoValue evidence"),
    label: englishText(item.label, "SoSoValue evidence"),
    value: englishText(item.value, "SoSoValue evidence")
  };
}

function sanitizeJson(value: unknown): unknown {
  if (typeof value === "string") {
    return englishText(value, "SoSoValue signal");
  }
  if (Array.isArray(value)) {
    return value.map(sanitizeJson);
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, sanitizeJson(item)])
    );
  }
  return value;
}

function englishTitle(value: unknown, fallback: string): string {
  const text = englishText(value, fallback);
  return text
    .replace(/\bnarrative path\b/gi, "Narrative Path")
    .replace(/\blinear path\b/gi, "Linear Path")
    .replace(/\bsosovalue\b/gi, "SoSoValue")
    .replace(/\beth\b/gi, "ETH")
    .replace(/\bbtc\b/gi, "BTC")
    .replace(/\busdt\b/gi, "USDT")
    .replace(/\busdc\b/gi, "USDC");
}

function englishText(value: unknown, fallback: string): string {
  const raw = typeof value === "string" ? value : value == null ? "" : String(value);
  const translated = KNOWN_TRANSLATIONS.reduce((current, [pattern, replacement]) => (
    current.replace(pattern, replacement)
  ), raw);
  const cleaned = translated
    .normalize("NFKD")
    .replace(/[^\x20-\x7E]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\s+([,.;:!?])/g, "$1");
  return cleaned || fallback;
}

function isLegacyEndpointMiss(error: unknown): boolean {
  if (error instanceof DOMException && error.name === "AbortError") {
    return false;
  }
  return toApiError(error).status === 404;
}

function contractEvidence(contract: PathContract): EvidenceItem[] {
  const seen = new Set<string>();
  const evidence: EvidenceItem[] = [];
  for (const leg of contract.legs) {
    for (const item of leg.evidence) {
      const key = `${item.source}|${item.label}|${item.value}|${item.url ?? ""}`;
      if (!seen.has(key)) {
        evidence.push(item);
        seen.add(key);
      }
    }
  }
  return evidence;
}

function lifecycleStatus(contract: PathContract): LifecycleStage["name"] {
  if (contract.status === "resolved") {
    return "Resolved";
  }
  if (contract.status === "resolving") {
    return "Settlement";
  }
  if (contract.status === "failed") {
    return "Archived";
  }
  if (contract.status === "published" && contract.onchainPathId) {
    return "Open For Staking";
  }
  if (contract.status === "published") {
    return "Published";
  }
  return contract.legs.length ? "Simulation" : "Draft";
}

function lifecycle(current: LifecycleStage["name"]): LifecycleStage[] {
  const currentIndex = Math.max(0, LIFECYCLE.indexOf(current));
  return LIFECYCLE.map((name, index) => ({
    name,
    state: index === currentIndex ? "current" : index < currentIndex ? "complete" : "pending"
  }));
}

function timeRemaining(contract: PathContract): string {
  const windows = contract.legs
    .map((leg) => Number(leg.window.match(/\d+/)?.[0] ?? 0))
    .filter(Boolean);
  return windows.length ? `${Math.max(...windows)} days` : "Evidence window unset";
}

function sentiment(probability: number): PathMarketView["probabilityBreakdown"]["marketSentiment"] {
  if (probability >= 75) {
    return "bullish";
  }
  if (probability >= 62) {
    return "constructive";
  }
  if (probability >= 45) {
    return "neutral";
  }
  if (probability >= 30) {
    return "defensive";
  }
  return "stressed";
}

function rewardMultiple(probability: number): string {
  return `${(1 / (clamp(probability, 1, 99) / 100)).toFixed(2)}x`;
}

function formatPrice(value: number): string {
  return clampPrice(value).toFixed(4);
}

function clampPrice(value: number): number {
  return Math.max(0.01, Math.min(0.99, value));
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function average(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length);
}

function numericAmount(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function windowRank(value: string): number {
  const parsed = Number(value.match(/\d+/)?.[0] ?? 999);
  return Number.isFinite(parsed) ? parsed : 999;
}
