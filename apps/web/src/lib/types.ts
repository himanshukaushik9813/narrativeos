export type NarrativeTheme = {
  id: string;
  title: string;
  summary: string;
  confidence: number;
  risk: number;
  magnitude: number;
  evidence: EvidenceItem[];
  metadata?: Record<string, unknown>;
};

export type NarrativesResponse = {
  narratives: NarrativeTheme[];
  snapshotTime: string;
};

export type PathKey = "gigaBull" | "bull" | "mild" | "bear" | "megaBear" | "custom";

export interface ChartDataPoint {
  t: string;
  date?: string;
  actual?: number;
  gigaBull?: number;
  bull?: number;
  mild?: number;
  bear?: number;
  megaBear?: number;
  custom?: number;
}

export type MarketChartResponse = {
  symbol: string;
  title: string;
  metric: string;
  unit: string;
  source: string;
  snapshotTime: string;
  data: ChartDataPoint[];
  startIndex: number;
  latestValue: number;
  latestChangePct: number;
  pathConfidence: Partial<Record<PathKey, number>>;
  sourceNote: string;
};

export type PathOption = {
  id: PathKey;
  index: string;
  name: string;
  multiplier: string;
  color: string;
};

export type IntelligenceStatus = "idle" | "loading" | "ready" | "error" | "published";

export type IntelligenceError = {
  message: string;
  status?: number;
  missing?: string[];
};

export type SectorScore = {
  id?: string;
  sector: string;
  label?: string;
  score: number;
  change: number;
  momentum: number;
};

export type NarrativeTrend = {
  title: string;
  score: number;
  body: string;
  signals: string[];
  match?: string;
  risk?: "LOW" | "MED" | "HIGH";
};

export type SignalItem = {
  type: "ai" | "whale" | "user";
  author: string;
  time: string;
  content: string;
  confidence: number;
};

export type OpportunitySignal = {
  title: string;
  confidence: number;
  priority: "HIGH" | "MED" | "LOW";
  body: string;
  sectors: string[];
  match: string;
  risk: "LOW" | "MED" | "HIGH";
  window: string;
};

export type BuilderLeg = {
  id: number;
  condition: string;
  window: string;
  confidence: number;
};

export type ContractStructure = "Linear" | "Parallel" | "Conditional" | "Weighted" | "Dynamic";

export type EngineContractStatus = "Draft" | "Published" | "Active" | "Resolved" | "Expired" | "Archived";

export type ConditionLibraryItem = {
  id: string;
  category: string;
  label: string;
  metricSource: string;
  comparator: ">" | ">=" | "<" | "<=" | "=";
  threshold: string;
  window: string;
  confidence: number;
  source: "SoSoValue";
  supported: boolean;
  note: string;
};

export type EngineLeg = {
  id: string;
  condition: string;
  metricSource: string;
  comparator: ">" | ">=" | "<" | "<=" | "=";
  threshold: string;
  window: string;
  confidence: number;
  weight: number;
  evidence: EvidenceItem[];
};

export type SimulationResult = {
  historicalSuccessRate: number;
  expectedReward: number;
  riskScore: number;
  maxDrawdown: number;
  narrativeStrength: number;
  historicalSimilarity: number;
  marketRegimeCompatibility: number;
};

export type EngineContract = {
  id: string;
  source: "live-narrative" | "custom" | "ai-assisted" | "signal";
  sourceThemeId?: string;
  title: string;
  description: string;
  structure: ContractStructure;
  status: EngineContractStatus;
  confidence: number;
  historicalMatch: number;
  timeHorizon: string;
  stakeAmount: string;
  stakeToken: "Arbitrum Sepolia ETH";
  narrativeTitle: string;
  narrativeScore: number;
  settlementLogic: string;
  legs: EngineLeg[];
  reasoning: string[];
  contradictionAnalysis: string[];
  failureConditions: string[];
  simulation: SimulationResult;
  createdAt: string;
  updatedAt: string;
  txHash?: string | null;
  onchainPathId?: number | null;
  marketAddress?: string | null;
  termsHash?: `0x${string}`;
};

export type EvidenceItem = {
  source: string;
  label: string;
  value: string;
  url?: string | null;
  observedAt?: string | null;
};

export type PathLeg = {
  leg: number;
  condition: string;
  metricSource: string;
  comparator: ">" | ">=" | "<" | "<=" | "=";
  threshold: string;
  window: string;
  confidence: number;
  evidence: EvidenceItem[];
};

export type AgentContext = {
  snapshotTime: string;
  dataAgent: Record<string, unknown>;
  narrativeAgent: Record<string, unknown>;
  riskAgent: Record<string, unknown>;
  strategyAgent: Record<string, unknown>;
  executionAgent?: Record<string, unknown>;
  explainabilityAgent: Record<string, unknown>;
};

export type PathContract = {
  id: string;
  title: string;
  theme: string;
  structure: "linear";
  legs: PathLeg[];
  confidence: number;
  risk: number;
  stakeAmount: string;
  stakeToken: "Arbitrum Sepolia ETH";
  creator?: string | null;
  marketAddress?: string | null;
  termsHash: `0x${string}`;
  onchainPathId?: number | null;
  txHash?: string | null;
  status: "draft" | "pending" | "published" | "resolving" | "resolved" | "failed";
  agentContext: AgentContext;
  marketDna: string;
};

export type PathContractsResponse = {
  contracts: PathContract[];
};

export type ProbabilitySignal = {
  label: string;
  source: string;
  score: number;
  weight: number;
  evidenceCount: number;
  detail: string;
};

export type ProbabilityBreakdown = {
  signals: ProbabilitySignal[];
  riskAdjustment: number;
  rawScore: number;
  probability: number;
  confidence: number;
  risk: number;
  marketSentiment: "bullish" | "constructive" | "neutral" | "defensive" | "stressed";
  expectedReward: string;
  historicalMatch: number;
  updatedAt: string;
};

export type PricingQuote = {
  model: string;
  fairProbability: number;
  supportBid: string;
  supportAsk: string;
  opposeBid: string;
  opposeAsk: string;
  spreadBps: number;
  impliedReward: string;
  defaultStakeSlippageBps: number;
  liquidityScore: number;
  marketDepth: "No On-chain Depth" | "Thin" | "Developing" | "Institutional";
  feedbackLoop: string;
};

export type LifecycleStage = {
  name:
    | "Draft"
    | "Simulation"
    | "Published"
    | "Open For Staking"
    | "Active"
    | "Settlement"
    | "Resolved"
    | "Archived";
  state: "complete" | "current" | "pending";
};

export type PathMarketView = {
  contractId: string;
  title: string;
  creator?: string | null;
  status: LifecycleStage["name"];
  probability: number;
  volume: string;
  openInterest: string;
  totalStakes: string;
  stakeToken: string;
  participants: number;
  pool: MarketPool;
  latestOrders: MarketOrder[];
  largestOrders: MarketOrder[];
  timeRemaining: string;
  liquidity: "Unavailable" | "Low" | "Medium" | "High";
  settlementStatus: string;
  watchCount: number;
  bookmarkCount: number;
  commentCount: number;
  lifecycle: LifecycleStage[];
  probabilityBreakdown: ProbabilityBreakdown;
  pricing: PricingQuote;
  evidence: EvidenceItem[];
  contract: PathContract;
  contractAddress?: string | null;
  transactionHash?: string | null;
  network: string;
  settlementBlock?: number | null;
  verificationStatus: "Unpublished" | "Pending" | "Verified";
  explorerUrl?: string | null;
  updatedAt: string;
};

export type MarketSection = {
  name: string;
  markets: PathMarketView[];
};

export type MarketsResponse = {
  markets: PathMarketView[];
  sections: MarketSection[];
  snapshotTime: string;
};

export type MarketActionRequest = {
  action: "support" | "oppose" | "watch" | "bookmark" | "comment" | "share";
  userAddress?: string | null;
  legIndex?: number | null;
  amount?: string | null;
  txHash?: string | null;
  comment?: string | null;
};

export type MarketAction = MarketActionRequest & {
  id: string;
  contractId: string;
  createdAt: string;
};

export type MarketOrder = {
  id: string;
  action: "support" | "oppose";
  userAddress?: string | null;
  legIndex?: number | null;
  amount: string;
  txHash?: string | null;
  createdAt: string;
  directionLabel: string;
  explorerUrl?: string | null;
};

export type MarketPool = {
  totalLiquidity: string;
  supportTotal: string;
  opposeTotal: string;
  averageEntry: string;
  largestPosition: string;
  latestStake: string;
  participantCount: number;
  supportShare: number;
  opposeShare: number;
};

export type PortfolioPosition = {
  contractId: string;
  title: string;
  side: "support" | "oppose";
  amount: string;
  probability: number;
  status: string;
  txHash?: string | null;
};

export type PortfolioResponse = {
  address: string;
  activePositions: PortfolioPosition[];
  resolvedPositions: PortfolioPosition[];
  pendingSettlement: PortfolioPosition[];
  totalStaked: string;
  roi: string;
  winRate: number;
  currentExposure: string;
  portfolioHeatmap: Record<string, string>;
  narrativeDistribution: Record<string, number>;
};

export type CreatorReputation = {
  creator: string;
  accuracy: number;
  contractsPublished: number;
  settlementSuccess: number;
  roi: string;
  followers: number;
  reputationScore: number;
  consistency: number;
  topNarratives: string[];
  historicalPerformance: string[];
};

export type CreatorLeaderboardResponse = {
  creators: CreatorReputation[];
};

export type HistoricalLearningItem = {
  contractId: string;
  outcome: string;
  correctSignals: string[];
  failedSignals: string[];
  settlementTime?: string | null;
  historicalMatch: number;
  returnProfile: string;
  reasonForSuccess: string;
  reasonForFailure: string;
};

export type HistoricalLearningResponse = {
  history: HistoricalLearningItem[];
};

export type SoDEXMarketContext = {
  status: "online" | "degraded" | "unavailable";
  spotSymbols: number;
  perpsSymbols: number;
  referenceSymbols: string[];
  note: string;
  updatedAt: string;
};
