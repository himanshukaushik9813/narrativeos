"use client";

import { motion } from "framer-motion";
import { RefreshCw, ShieldAlert, Wallet } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAccount } from "wagmi";

import { cn } from "@/lib/cn";
import { fetchPathMarkets, fetchPortfolio, toApiError } from "@/lib/narrativeApi";
import type { IntelligenceError, PathMarketView, PortfolioPosition, PortfolioResponse } from "@/lib/types";

export function PortfolioDashboard() {
  const { address, isConnected } = useAccount();
  const [portfolio, setPortfolio] = useState<PortfolioResponse | null>(null);
  const [markets, setMarkets] = useState<PathMarketView[]>([]);
  const [error, setError] = useState<IntelligenceError | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const load = useCallback(async (signal?: AbortSignal) => {
    setIsLoading(true);
    setError(null);
    try {
      const marketResponse = await fetchPathMarkets(signal);
      setMarkets(marketResponse.markets);
      if (address) {
        setPortfolio(await fetchPortfolio(address, signal));
      }
    } catch (caught) {
      const apiError = toApiError(caught);
      setError({ message: apiError.message, status: apiError.status, missing: apiError.missing });
    } finally {
      if (!signal?.aborted) {
        setIsLoading(false);
      }
    }
  }, [address]);

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const marketMap = useMemo(
    () => new Map(markets.map((market) => [market.contractId, market])),
    [markets]
  );

  if (!isConnected || !address) {
    return (
      <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-black px-4 pt-20">
        <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_center,rgba(180,255,90,0.12),transparent_46%)]" />
        <section className="relative z-10 max-w-xl rounded-sm border border-[#1a1a1a] bg-[#050505] p-8 text-center">
          <Wallet className="mx-auto size-8 text-[#b4ff5a]" aria-hidden />
          <h1 className="mono mt-4 text-xl font-bold uppercase tracking-widest text-white">Connect Portfolio Wallet</h1>
          <p className="mt-3 text-sm leading-6 text-[#777]">
            Portfolio analytics are built from recorded Path Market actions tied to your wallet address.
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-black px-4 pb-10 pt-24">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_top,rgba(180,255,90,0.10),transparent_46%)]" />
      <section className="relative z-10 mx-auto max-w-[1320px]">
        <header className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-[#111] pb-5">
          <div>
            <div className="mono text-[10px] uppercase tracking-[0.18em] text-[#555]">PATH MARKET PORTFOLIO</div>
            <h1 className="mono mt-2 text-2xl font-bold uppercase tracking-widest text-white">Exposure Intelligence</h1>
            <p className="mt-2 text-sm text-[#777]">{address}</p>
          </div>
          <button
            type="button"
            onClick={() => void load()}
            className="engine-button border-[#333] text-[#888] hover:border-[#b4ff5a] hover:text-[#b4ff5a]"
          >
            <RefreshCw className={cn("size-3", isLoading && "animate-spin")} aria-hidden />
            Refresh
          </button>
        </header>

        {error ? (
          <div className="mb-5 rounded-sm border border-[#401d1d] bg-[#120606] p-4">
            <div className="mono flex items-center gap-2 text-[10px] uppercase tracking-widest text-[#ff7777]">
              <ShieldAlert className="size-3" aria-hidden />
              Portfolio sync failed
            </div>
            <p className="mt-2 text-sm text-[#999]">{error.message}</p>
          </div>
        ) : null}

        <div className="grid gap-4 lg:grid-cols-4">
          <Metric label="Total Staked" value={`${portfolio?.totalStaked ?? "0"} ETH`} />
          <Metric label="ROI" value={portfolio?.roi ?? "0.00x"} />
          <Metric label="Win Rate" value={`${portfolio?.winRate ?? 0}%`} />
          <Metric label="Current Exposure" value={`${portfolio?.currentExposure ?? "0"} ETH`} />
        </div>

        <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <section className="space-y-5">
            <PositionTable
              title="Active Positions"
              positions={portfolio?.activePositions ?? []}
              marketMap={marketMap}
            />
            <PositionTable
              title="Pending Settlement"
              positions={portfolio?.pendingSettlement ?? []}
              marketMap={marketMap}
            />
            <PositionTable
              title="Resolved Positions"
              positions={portfolio?.resolvedPositions ?? []}
              marketMap={marketMap}
            />
          </section>

          <aside className="space-y-5">
            <HeatmapPanel portfolio={portfolio} />
            <DistributionPanel portfolio={portfolio} />
          </aside>
        </div>
      </section>
    </main>
  );
}

function PositionTable({
  title,
  positions,
  marketMap
}: {
  title: string;
  positions: PortfolioPosition[];
  marketMap: Map<string, PathMarketView>;
}) {
  return (
    <section className="rounded-sm border border-[#171717] bg-[#050505]/92 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="label label-active">{title}</div>
        <div className="mono text-[10px] uppercase tracking-widest text-[#555]">{positions.length} positions</div>
      </div>
      <div className="mt-4 space-y-2">
        {positions.length ? positions.map((position) => {
          const market = marketMap.get(position.contractId);
          return (
            <motion.article
              key={`${position.contractId}-${position.txHash ?? position.side}`}
              layout
              className="grid gap-3 rounded-sm border border-[#111] bg-black p-3 md:grid-cols-[minmax(0,1fr)_110px_110px_110px]"
            >
              <div className="min-w-0">
                <div className="mono text-[9px] uppercase tracking-widest text-[#555]">{position.contractId}</div>
                <h2 className="mt-1 truncate text-sm font-semibold text-white">{position.title}</h2>
                <p className="mt-1 text-xs text-[#666]">{market?.settlementStatus ?? position.status}</p>
              </div>
              <Cell label="Side" value={position.side} hot={position.side === "support"} />
              <Cell label="Amount" value={`${position.amount} ETH`} />
              <Cell label="Probability" value={`${position.probability}%`} hot />
            </motion.article>
          );
        }) : (
          <div className="rounded-sm border border-[#111] bg-black p-5 text-sm text-[#666]">
            No positions recorded yet. Execute support or oppose orders from a published Path Market.
          </div>
        )}
      </div>
    </section>
  );
}

function HeatmapPanel({ portfolio }: { portfolio: PortfolioResponse | null }) {
  const entries = Object.entries(portfolio?.portfolioHeatmap ?? {});
  return (
    <section className="rounded-sm border border-[#171717] bg-[#050505]/92 p-4">
      <div className="label label-active">Portfolio Heatmap</div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        {entries.length ? entries.map(([key, value]) => (
          <Metric key={key} label={key} value={value} />
        )) : (
          <p className="col-span-2 text-xs leading-5 text-[#666]">Heatmap activates after recorded market actions.</p>
        )}
      </div>
    </section>
  );
}

function DistributionPanel({ portfolio }: { portfolio: PortfolioResponse | null }) {
  const entries = Object.entries(portfolio?.narrativeDistribution ?? {});
  return (
    <section className="rounded-sm border border-[#171717] bg-[#050505]/92 p-4">
      <div className="label label-active">Narrative Distribution</div>
      <div className="mt-4 space-y-2">
        {entries.length ? entries.map(([title, count]) => (
          <div key={title} className="rounded-sm border border-[#111] bg-black p-3">
            <div className="mono flex justify-between gap-3 text-[9px] uppercase tracking-widest">
              <span className="truncate text-[#888]">{title}</span>
              <span className="text-[#b4ff5a]">{count}</span>
            </div>
          </div>
        )) : (
          <p className="text-xs leading-5 text-[#666]">No narrative exposure recorded.</p>
        )}
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-sm border border-[#171717] bg-[#050505] p-4">
      <div className="mono text-[9px] uppercase tracking-widest text-[#555]">{label}</div>
      <div className="mono mt-2 truncate text-xl font-bold text-[#b4ff5a]">{value}</div>
    </div>
  );
}

function Cell({ label, value, hot }: { label: string; value: string; hot?: boolean }) {
  return (
    <div>
      <div className="mono text-[8px] uppercase tracking-widest text-[#444]">{label}</div>
      <div className={cn("mono mt-1 truncate text-xs uppercase tracking-widest", hot ? "text-[#b4ff5a]" : "text-[#bbb]")}>
        {value}
      </div>
    </div>
  );
}
