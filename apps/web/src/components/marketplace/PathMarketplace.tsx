"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  Activity,
  Bookmark,
  Eye,
  ExternalLink,
  MessageSquare,
  RefreshCw,
  Search,
  Share2,
  ShieldCheck,
  TrendingUp
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type MouseEvent, type ReactNode } from "react";
import { useAccount } from "wagmi";

import { cn } from "@/lib/cn";
import {
  fetchCreatorLeaderboard,
  fetchHistoricalLearning,
  fetchPathMarkets,
  recordMarketAction,
  toApiError
} from "@/lib/narrativeApi";
import type {
  CreatorReputation,
  HistoricalLearningItem,
  IntelligenceError,
  MarketSection,
  PathMarketView
} from "@/lib/types";

type TabKey =
  | "Trending Contracts"
  | "Highest Volume"
  | "Highest Confidence"
  | "Most Staked"
  | "Newest"
  | "Ending Soon"
  | "Highest Accuracy"
  | "Most Profitable Creators";

const MARKET_SECTION_NAMES: TabKey[] = [
  "Trending Contracts",
  "Highest Volume",
  "Highest Confidence",
  "Most Staked",
  "Newest",
  "Ending Soon",
  "Highest Accuracy",
  "Most Profitable Creators"
];

function emptyMarketSections(): MarketSection[] {
  return MARKET_SECTION_NAMES.map((name) => ({ name, markets: [] }));
}

export function PathMarketplace() {
  const [markets, setMarkets] = useState<PathMarketView[]>([]);
  const [sections, setSections] = useState<MarketSection[]>([]);
  const [creators, setCreators] = useState<CreatorReputation[]>([]);
  const [history, setHistory] = useState<HistoricalLearningItem[]>([]);
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState<TabKey>("Trending Contracts");
  const [selectedMarketId, setSelectedMarketId] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<IntelligenceError | null>(null);
  const { address } = useAccount();

  const load = useCallback(async (signal?: AbortSignal, includeLiveCandidates = true) => {
    setIsLoading(true);
    setError(null);
    try {
      const [marketResponse, creatorResponse, historyResponse] = await Promise.all([
        fetchPathMarkets(signal, includeLiveCandidates),
        fetchCreatorLeaderboard(signal),
        fetchHistoricalLearning(signal)
      ]);
      setMarkets(marketResponse.markets);
      setSections(marketResponse.sections);
      setCreators(creatorResponse.creators);
      setHistory(historyResponse.history);
      setSelectedMarketId((current) => current ?? marketResponse.markets[0]?.contractId ?? null);
    } catch (caught) {
      const apiError = toApiError(caught);
      if (apiError.status === 404 || apiError.message.toLowerCase() === "not found") {
        setMarkets([]);
        setSections(emptyMarketSections());
        setCreators([]);
        setHistory([]);
        setSelectedMarketId(null);
        setError(null);
        return;
      }
      setError({ message: apiError.message, status: apiError.status, missing: apiError.missing });
    } finally {
      if (!signal?.aborted) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal, true);
    const timer = window.setInterval(() => void load(undefined, false), 45000);
    return () => {
      controller.abort();
      window.clearInterval(timer);
    };
  }, [load]);

  const selectedSection = useMemo(
    () => sections.find((section) => section.name === activeTab)?.markets ?? markets,
    [activeTab, markets, sections]
  );

  const filteredMarkets = useMemo(() => {
    const lower = query.toLowerCase().trim();
    const source = lower
      ? markets.filter((market) =>
          [
            market.title,
            market.status,
            market.liquidity,
            market.creator ?? "",
            market.contract.theme,
            market.contract.id,
            ...market.contract.legs.map((leg) => `${leg.condition} ${leg.metricSource}`)
          ]
            .join(" ")
            .toLowerCase()
            .includes(lower)
        )
      : selectedSection;
    return source;
  }, [markets, query, selectedSection]);

  const selectedMarket =
    markets.find((market) => market.contractId === selectedMarketId) ?? filteredMarkets[0] ?? markets[0] ?? null;

  async function action(market: PathMarketView, kind: "watch" | "bookmark" | "share") {
    await recordMarketAction(market.contractId, {
      action: kind,
      userAddress: address
    });
    await load(undefined, false);
  }

  async function submitComment() {
    if (!selectedMarket || !comment.trim()) {
      return;
    }
    await recordMarketAction(selectedMarket.contractId, {
      action: "comment",
      userAddress: address,
      comment: comment.trim()
    });
    setComment("");
    await load(undefined, false);
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-black px-3 pb-8 pt-20 sm:px-5">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_top,rgba(180,255,90,0.10),transparent_46%)]" />
      <section className="relative z-10 mx-auto max-w-[1440px]">
        <header className="mb-4 border-b border-[#111] pb-4">
          <div className="mono text-[10px] uppercase tracking-[0.18em] text-[#555]">PATH MARKET PROTOCOL</div>
          <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="mono text-xl font-bold uppercase tracking-widest text-white sm:text-2xl">
                Tradeable Narrative Markets
              </h1>
              <p className="mt-1.5 max-w-3xl text-sm leading-5 text-[#777]">
                Live SoSoValue evidence becomes probability, probability becomes a Path Contract, and community actions feed back into market ranking.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void load(undefined, true)}
              className="engine-button border-[#333] text-[#888] hover:border-[#b4ff5a] hover:text-[#b4ff5a]"
            >
              <RefreshCw className={cn("size-3", isLoading && "animate-spin")} aria-hidden />
              Sync Market State
            </button>
          </div>
        </header>

        {error ? (
          <div className="mb-4 rounded-sm border border-[#401d1d] bg-[#120606] p-3">
            <div className="mono text-[10px] uppercase tracking-widest text-[#ff7777]">Marketplace unavailable</div>
            <p className="mt-2 text-sm text-[#999]">{error.message}</p>
          </div>
        ) : null}

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_390px]">
          <section className="space-y-3">
            <ProtocolPipeline />

            <div className="rounded-sm border border-[#171717] bg-[#050505]/92 p-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap gap-2">
                  {sections.map((section) => (
                    <button
                      key={section.name}
                      type="button"
                      onClick={() => setActiveTab(section.name as TabKey)}
                      className={cn(
                        "mono rounded-sm border px-2.5 py-1.5 text-[8px] uppercase tracking-widest transition-colors",
                        activeTab === section.name
                          ? "border-[#b4ff5a] bg-[#b4ff5a] text-black"
                          : "border-[#202020] text-[#666] hover:border-[#555] hover:text-white"
                      )}
                    >
                      {section.name}
                    </button>
                  ))}
                </div>
                <label className="flex min-w-[240px] items-center gap-2 rounded-sm border border-[#1f1f1f] bg-black px-3 py-1.5 focus-within:border-[#b4ff5a]">
                  <Search className="size-3 text-[#444]" aria-hidden />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search asset, narrative, risk, creator..."
                    className="mono w-full bg-transparent text-[10px] uppercase tracking-widest text-white outline-none placeholder:text-[#333]"
                  />
                </label>
              </div>
            </div>

            <div className="grid gap-3 lg:grid-cols-2">
              <AnimatePresence mode="popLayout">
                {filteredMarkets.map((market) => (
                  <MarketCard
                    key={market.contractId}
                    market={market}
                    selected={selectedMarket?.contractId === market.contractId}
                    onSelect={() => setSelectedMarketId(market.contractId)}
                    onAction={(kind) => void action(market, kind)}
                  />
                ))}
              </AnimatePresence>
              {!filteredMarkets.length ? (
                <div className="rounded-sm border border-[#211a10] bg-[#100d06] p-5 lg:col-span-2">
                  <div className="mono text-[10px] uppercase tracking-widest text-[#ffaa44]">
                    No path markets loaded
                  </div>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-[#777]">
                    Publish a Path Contract from the builder, or sync live SoSoValue candidates once the API key is accepted. NarrativeOS will not fabricate market inventory.
                  </p>
                  <Link
                    href="/build"
                    className="mono mt-4 inline-flex rounded-sm border border-[#333] px-3 py-2 text-[10px] uppercase tracking-widest text-[#b4ff5a] hover:border-[#b4ff5a]"
                  >
                    Open Builder
                  </Link>
                </div>
              ) : null}
            </div>
          </section>

          <aside className="space-y-4 xl:sticky xl:top-20 xl:self-start">
            {selectedMarket ? (
              <MarketInspector
                market={selectedMarket}
                comment={comment}
                onCommentChange={setComment}
                onSubmitComment={() => void submitComment()}
              />
            ) : null}
            <CreatorReputationPanel creators={creators} />
            <HistoricalLearningPanel history={history} />
          </aside>
        </div>
      </section>
    </main>
  );
}

function ProtocolPipeline() {
  const stages = ["SoSoValue", "Agents", "Evidence", "Probability", "Marketplace", "Settlement", "Reputation"];
  return (
    <div className="rounded-sm border border-[#171717] bg-[#050505]/92 p-3">
      <div className="label label-active">Protocol Feedback Loop</div>
      <div className="mt-3 grid gap-1.5 md:grid-cols-7">
        {stages.map((stage, index) => (
          <div key={stage} className="relative rounded-sm border border-[#1b1b1b] bg-black px-2.5 py-2">
            <div className="mono text-[9px] uppercase tracking-widest text-[#555]">{String(index + 1).padStart(2, "0")}</div>
            <div className="mono mt-1.5 text-[9px] font-bold uppercase tracking-widest text-white">{stage}</div>
            {index < stages.length - 1 ? (
              <div className="absolute -right-2 top-1/2 hidden h-px w-4 bg-[#b4ff5a]/40 md:block" />
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

function MarketCard({
  market,
  selected,
  onSelect,
  onAction
}: {
  market: PathMarketView;
  selected: boolean;
  onSelect: () => void;
  onAction: (kind: "watch" | "bookmark" | "share") => void;
}) {
  const actionHref =
    market.contract.status === "published"
      ? "/#path-order-execution"
      : `/build?title=${encodeURIComponent(market.title)}&score=${market.probability}&source=marketplace`;

  return (
    <motion.article
      layout
      onClick={onSelect}
      className={cn(
        "cursor-pointer rounded-sm border bg-[#050505] p-3 transition-colors",
        selected ? "border-[#b4ff5a] shadow-[0_0_28px_rgba(180,255,90,0.08)]" : "border-[#171717] hover:border-[#333]"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mono text-[9px] uppercase tracking-widest text-[#555]">{market.contractId}</div>
          <h2 className="mt-1.5 line-clamp-2 text-sm font-semibold leading-5 text-white">{market.title}</h2>
        </div>
        <div className="mono shrink-0 text-right text-2xl font-bold leading-none text-[#b4ff5a] sm:text-3xl">{market.probability}%</div>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-1.5">
        <Metric label="Volume" value={`${market.volume} ETH`} />
        <Metric label="Depth" value={market.pricing.marketDepth} />
        <Metric label="Spread" value={`${market.pricing.spreadBps} bps`} />
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[#111] pt-3">
        <div className="mono max-w-[280px] truncate text-[8px] uppercase tracking-widest text-[#555]">
          {market.status} / {market.settlementStatus}
        </div>
        <div className="flex flex-wrap justify-end gap-1.5">
          <Link
            href={`/markets/${market.contractId}`}
            onClick={(event) => event.stopPropagation()}
            className="mono rounded-sm border border-[#2b2b2b] px-2.5 py-1.5 text-[8px] uppercase tracking-widest text-[#b4ff5a] hover:border-[#b4ff5a]"
          >
            Inspect
          </Link>
          <Link
            href={actionHref}
            onClick={(event) => event.stopPropagation()}
            className="mono rounded-sm border border-[#2b2b2b] px-2.5 py-1.5 text-[8px] uppercase tracking-widest text-[#888] hover:border-[#b4ff5a] hover:text-[#b4ff5a]"
          >
            {market.contract.status === "published" ? "Execute" : "Build"}
          </Link>
          <IconAction label="Watch" onClick={(event) => { event.stopPropagation(); onAction("watch"); }}>
            <Eye className="size-3" />
          </IconAction>
          <IconAction label="Bookmark" onClick={(event) => { event.stopPropagation(); onAction("bookmark"); }}>
            <Bookmark className="size-3" />
          </IconAction>
          <IconAction label="Share" onClick={(event) => { event.stopPropagation(); onAction("share"); }}>
            <Share2 className="size-3" />
          </IconAction>
        </div>
      </div>
    </motion.article>
  );
}

function MarketInspector({
  market,
  comment,
  onCommentChange,
  onSubmitComment
}: {
  market: PathMarketView;
  comment: string;
  onCommentChange: (value: string) => void;
  onSubmitComment: () => void;
}) {
  return (
    <section className="rounded-sm border border-[#171717] bg-[#050505]/92 p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="label label-active">Market Inspector</div>
          <h2 className="mt-1.5 text-base font-semibold leading-6 text-white">{market.title}</h2>
        </div>
        {market.explorerUrl ? (
          <a href={market.explorerUrl} target="_blank" rel="noreferrer" className="rounded-sm border border-[#222] p-2 text-[#666] hover:border-[#b4ff5a] hover:text-[#b4ff5a]">
            <ExternalLink className="size-4" aria-hidden />
          </a>
        ) : null}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-1.5">
        <Metric label="Open Interest" value={`${market.openInterest} ETH`} />
        <Metric label="Total Stakes" value={`${market.totalStakes} ETH`} />
        <Metric label="Time Remaining" value={market.timeRemaining} />
        <Metric label="Verification" value={market.verificationStatus} />
      </div>

      <div className="mt-4 rounded-sm border border-[#111] bg-black p-3">
        <div className="flex items-center justify-between gap-3">
          <div className="label">Pricing Engine</div>
          <span className="mono text-[9px] uppercase tracking-widest text-[#b4ff5a]">
            {market.pricing.model}
          </span>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-1.5">
          <Metric label="Support Bid / Ask" value={`${market.pricing.supportBid} / ${market.pricing.supportAsk}`} />
          <Metric label="Oppose Bid / Ask" value={`${market.pricing.opposeBid} / ${market.pricing.opposeAsk}`} />
          <Metric label="Implied Reward" value={market.pricing.impliedReward} />
          <Metric label="Slippage" value={`${market.pricing.defaultStakeSlippageBps} bps`} />
        </div>
        <p className="mt-3 text-xs leading-5 text-[#666]">{market.pricing.feedbackLoop}</p>
      </div>

      <div className="mt-4 rounded-sm border border-[#111] bg-black p-3">
        <div className="label">Live Pool</div>
        <div className="mt-3 grid grid-cols-2 gap-1.5">
          <Metric label="Bull Stakes" value={`${market.pool.supportTotal} ETH`} />
          <Metric label="Bear Stakes" value={`${market.pool.opposeTotal} ETH`} />
          <Metric label="Average Entry" value={`${market.pool.averageEntry} ETH`} />
          <Metric label="Largest Position" value={`${market.pool.largestPosition} ETH`} />
        </div>
        <div className="mt-3 overflow-hidden rounded-sm border border-[#171717] bg-[#ff7744]">
          <div className="h-2 bg-[#b4ff5a]" style={{ width: `${market.pool.supportShare}%` }} />
        </div>
      </div>

      <div className="mt-4 rounded-sm border border-[#111] bg-black p-3">
        <div className="label">Latest On-chain Orders</div>
        <div className="mt-3 space-y-2">
          {market.latestOrders.length ? market.latestOrders.slice(0, 4).map((order) => (
            <a
              key={order.id}
              href={order.explorerUrl ?? undefined}
              target={order.explorerUrl ? "_blank" : undefined}
              rel="noreferrer"
              className="block rounded-sm border border-[#151515] bg-[#050505] p-2 hover:border-[#333]"
            >
              <div className="mono flex items-center justify-between gap-2 text-[9px] uppercase tracking-widest">
                <span className={order.action === "support" ? "text-[#b4ff5a]" : "text-[#ff7744]"}>
                  {order.directionLabel}
                </span>
                <span className="text-white">{order.amount} ETH</span>
              </div>
              <div className="mono mt-1 flex items-center justify-between gap-2 text-[8px] uppercase tracking-widest text-[#444]">
                <span>{order.userAddress ? `${order.userAddress.slice(0, 6)}...${order.userAddress.slice(-4)}` : "unknown"}</span>
                <span>{order.txHash ? `${order.txHash.slice(0, 8)}...${order.txHash.slice(-6)}` : "pending"}</span>
              </div>
            </a>
          )) : (
            <div className="rounded-sm border border-[#151515] bg-[#050505] p-3 text-xs text-[#666]">
              No confirmed stake transactions yet.
            </div>
          )}
        </div>
      </div>

      <div className="mt-4">
        <div className="label">Lifecycle</div>
        <div className="mt-3 space-y-2">
          {market.lifecycle.map((stage) => (
            <div key={stage.name} className="flex items-center gap-3">
              <span
                className={cn(
                  "size-2 rounded-full",
                  stage.state === "complete" && "bg-[#b4ff5a]",
                  stage.state === "current" && "bg-[#ffaa44] shadow-[0_0_16px_rgba(255,170,68,0.45)]",
                  stage.state === "pending" && "bg-[#222]"
                )}
              />
              <span className={cn("mono text-[10px] uppercase tracking-widest", stage.state === "pending" ? "text-[#444]" : "text-[#cfcfcf]")}>
                {stage.name}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4">
        <div className="label">Explainable Probability</div>
        <div className="mt-3 space-y-2">
          {market.probabilityBreakdown.signals.map((signal) => (
            <div key={signal.label} className="rounded-sm border border-[#111] bg-black p-3">
              <div className="mono flex items-center justify-between text-[9px] uppercase tracking-widest">
                <span className="text-[#888]">{signal.label}</span>
                <span className={signal.score >= 0 ? "text-[#b4ff5a]" : "text-[#ff7744]"}>
                  {signal.score >= 0 ? "+" : ""}{signal.score}
                </span>
              </div>
              <p className="mt-2 text-xs leading-5 text-[#666]">{signal.detail}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4">
        <div className="label">Evidence Engine</div>
        <div className="mt-3 space-y-2">
          {market.evidence.length ? market.evidence.slice(0, 4).map((item) => (
            <a
              key={`${item.source}-${item.label}-${item.value}`}
              href={item.url ?? undefined}
              target={item.url ? "_blank" : undefined}
              rel="noreferrer"
              className="block rounded-sm border border-[#111] bg-black p-3 hover:border-[#333]"
            >
              <div className="mono text-[9px] uppercase tracking-widest text-[#b4ff5a]">{item.source}</div>
              <p className="mt-2 text-xs leading-5 text-[#888]">{item.label}</p>
            </a>
          )) : (
            <div className="rounded-sm border border-[#221] bg-black p-3 text-xs text-[#777]">Evidence unavailable.</div>
          )}
        </div>
      </div>

      <div className="mt-4 rounded-sm border border-[#151515] bg-black p-3">
        <div className="label">Community Comment</div>
        <textarea
          value={comment}
          onChange={(event) => onCommentChange(event.target.value)}
          rows={3}
          className="engine-input mt-2 resize-none"
          placeholder="Add market reasoning..."
        />
        <button type="button" onClick={onSubmitComment} className="engine-button mt-3 border-[#333] text-[#b4ff5a] hover:border-[#b4ff5a]">
          <MessageSquare className="size-3" aria-hidden />
          Comment
        </button>
      </div>
    </section>
  );
}

function CreatorReputationPanel({ creators }: { creators: CreatorReputation[] }) {
  return (
    <section className="rounded-sm border border-[#171717] bg-[#050505]/92 p-3">
      <div className="label label-active">Creator Reputation</div>
      <div className="mt-3 space-y-1.5">
        {creators.length ? creators.slice(0, 4).map((creator) => (
          <div key={creator.creator} className="rounded-sm border border-[#111] bg-black p-2.5">
            <div className="mono flex justify-between text-[9px] uppercase tracking-widest">
              <span className="truncate text-[#888]">{creator.creator}</span>
              <span className="text-[#b4ff5a]">{creator.reputationScore}</span>
            </div>
            <div className="mt-2 grid grid-cols-3 gap-1.5">
              <Metric label="Accuracy" value={`${creator.accuracy}%`} />
              <Metric label="Published" value={String(creator.contractsPublished)} />
              <Metric label="Consistency" value={`${creator.consistency}%`} />
            </div>
          </div>
        )) : (
          <p className="mt-3 text-xs leading-5 text-[#666]">Creator reputation begins after contracts are published or community actions are recorded.</p>
        )}
      </div>
    </section>
  );
}

function HistoricalLearningPanel({ history }: { history: HistoricalLearningItem[] }) {
  return (
    <section className="rounded-sm border border-[#171717] bg-[#050505]/92 p-3">
      <div className="label label-active">Historical Intelligence</div>
      {history.length ? (
        <div className="mt-3 space-y-1.5">
          {history.map((item) => (
            <details key={item.contractId} className="rounded-sm border border-[#111] bg-black p-2.5">
              <summary className="mono cursor-pointer text-[10px] uppercase tracking-widest text-[#b4ff5a]">
                {item.contractId} / {item.outcome}
              </summary>
              <p className="mt-3 text-xs leading-5 text-[#777]">{item.returnProfile}</p>
            </details>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-xs leading-5 text-[#666]">
          No resolved Path Contracts yet. Once oracle settlement completes, correct signals and failed signals become training history.
        </p>
      )}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-sm border border-[#151515] bg-black/70 px-2.5 py-2">
      <div className="mono text-[8px] uppercase tracking-widest text-[#444]">{label}</div>
      <div className="mono mt-1 truncate text-xs font-bold text-[#b4ff5a]">{value}</div>
    </div>
  );
}

function IconAction({
  label,
  onClick,
  children
}: {
  label: string;
  onClick: (event: MouseEvent<HTMLButtonElement>) => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="rounded-sm border border-[#222] p-1.5 text-[#555] hover:border-[#b4ff5a] hover:text-[#b4ff5a]"
    >
      {children}
    </button>
  );
}
