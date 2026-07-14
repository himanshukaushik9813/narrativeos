"use client";

import { ExternalLink, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { fetchPathMarket, toApiError } from "@/lib/narrativeApi";
import type { IntelligenceError, PathMarketView } from "@/lib/types";

export function PathMarketDetail({ contractId }: { contractId: string }) {
  const [market, setMarket] = useState<PathMarketView | null>(null);
  const [error, setError] = useState<IntelligenceError | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async (signal?: AbortSignal) => {
    setIsLoading(true);
    setError(null);
    try {
      setMarket(await fetchPathMarket(contractId, signal));
    } catch (caught) {
      const apiError = toApiError(caught);
      setError({ message: apiError.message, status: apiError.status, missing: apiError.missing });
    } finally {
      if (!signal?.aborted) {
        setIsLoading(false);
      }
    }
  }, [contractId]);

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    const timer = window.setInterval(() => void load(), 12000);
    return () => {
      controller.abort();
      window.clearInterval(timer);
    };
  }, [load]);

  return (
    <main className="relative min-h-screen overflow-hidden bg-black px-3 pb-8 pt-20 sm:px-5">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_top,rgba(180,255,90,0.10),transparent_46%)]" />
      <section className="relative z-10 mx-auto max-w-[1280px]">
        <header className="mb-4 flex flex-wrap items-end justify-between gap-3 border-b border-[#111] pb-4">
          <div>
            <div className="mono text-[10px] uppercase tracking-[0.18em] text-[#555]">PATH MARKET DETAIL</div>
            <h1 className="mono mt-2 text-xl font-bold uppercase tracking-widest text-white sm:text-2xl">
              {market?.title ?? contractId}
            </h1>
            <p className="mt-1.5 max-w-3xl text-sm leading-5 text-[#777]">
              Dedicated execution page for pool state, evidence, settlement status, transaction history, and explorer verification.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void load()}
            className="engine-button border-[#333] text-[#888] hover:border-[#b4ff5a] hover:text-[#b4ff5a]"
          >
            <RefreshCw className={isLoading ? "size-3 animate-spin" : "size-3"} aria-hidden />
            Sync
          </button>
        </header>

        {error ? (
          <div className="rounded-sm border border-[#401d1d] bg-[#120606] p-4">
            <div className="mono text-[10px] uppercase tracking-widest text-[#ff7777]">Market unavailable</div>
            <p className="mt-2 text-sm text-[#999]">{error.message}</p>
          </div>
        ) : null}

        {market ? (
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
            <section className="space-y-4">
              <div className="rounded-sm border border-[#171717] bg-[#050505]/92 p-4">
                <div className="grid gap-2 md:grid-cols-4">
                  <Metric label="Probability" value={`${market.probability}%`} />
                  <Metric label="Liquidity" value={`${market.pool.totalLiquidity} ETH`} />
                  <Metric label="Participants" value={String(market.pool.participantCount)} />
                  <Metric label="Depth" value={market.pricing.marketDepth} />
                </div>
                <p className="mt-4 text-sm leading-6 text-[#999]">{market.contract.marketDna}</p>
              </div>

              <div className="rounded-sm border border-[#171717] bg-[#050505]/92 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="label label-active">Quant Pricing Model</div>
                    <p className="mt-2 text-sm leading-6 text-[#777]">
                      {market.pricing.model}. Market feedback is discounted until confirmed on-chain liquidity exists.
                    </p>
                  </div>
                  <div className="mono text-3xl font-bold text-[#b4ff5a]">{market.pricing.fairProbability}%</div>
                </div>
                <div className="mt-3 grid gap-2 md:grid-cols-4">
                  <Metric label="Support Bid / Ask" value={`${market.pricing.supportBid} / ${market.pricing.supportAsk}`} />
                  <Metric label="Oppose Bid / Ask" value={`${market.pricing.opposeBid} / ${market.pricing.opposeAsk}`} />
                  <Metric label="Spread" value={`${market.pricing.spreadBps} bps`} />
                  <Metric label="Reward" value={market.pricing.impliedReward} />
                </div>
                <div className="mt-3 rounded-sm border border-[#111] bg-black p-3 text-xs leading-5 text-[#777]">
                  {market.pricing.feedbackLoop}
                </div>
              </div>

              <div className="rounded-sm border border-[#171717] bg-[#050505]/92 p-4">
                <div className="label label-active">Pool / Market Depth</div>
                <div className="mt-3 grid gap-2 md:grid-cols-3">
                  <Metric label="Support Pool" value={`${market.pool.supportTotal} ETH`} />
                  <Metric label="Oppose Pool" value={`${market.pool.opposeTotal} ETH`} />
                  <Metric label="Largest Order" value={`${market.pool.largestPosition} ETH`} />
                </div>
                <div className="mt-3 overflow-hidden rounded-sm border border-[#171717] bg-[#ff7744]">
                  <div className="h-3 bg-[#b4ff5a]" style={{ width: `${market.pool.supportShare}%` }} />
                </div>
              </div>

              <div className="rounded-sm border border-[#171717] bg-[#050505]/92 p-4">
                <div className="label label-active">Transaction History</div>
                <div className="mt-3 space-y-2">
                  {market.latestOrders.length ? market.latestOrders.map((order) => (
                    <a
                      key={order.id}
                      href={order.explorerUrl ?? undefined}
                      target={order.explorerUrl ? "_blank" : undefined}
                      rel="noreferrer"
                      className="grid gap-2 rounded-sm border border-[#111] bg-black p-3 md:grid-cols-[1fr_110px_110px]"
                    >
                      <div>
                        <div className={order.action === "support" ? "label label-active" : "label text-[#ff7744]"}>
                          {order.directionLabel}
                        </div>
                        <div className="mono mt-1 text-[9px] uppercase tracking-widest text-[#555]">
                          {order.userAddress ? `${order.userAddress.slice(0, 6)}...${order.userAddress.slice(-4)}` : "unknown wallet"}
                        </div>
                      </div>
                      <div className="mono text-sm font-bold text-white">{order.amount} ETH</div>
                      <div className="mono text-[9px] uppercase tracking-widest text-[#555]">
                        {order.txHash ? `${order.txHash.slice(0, 8)}...${order.txHash.slice(-6)}` : "pending"}
                      </div>
                    </a>
                  )) : (
                    <div className="rounded-sm border border-[#111] bg-black p-4 text-sm text-[#666]">
                      No confirmed stake transactions recorded yet.
                    </div>
                  )}
                </div>
              </div>
            </section>

            <aside className="space-y-4 xl:sticky xl:top-20 xl:self-start">
              <div className="rounded-sm border border-[#171717] bg-[#050505]/92 p-4">
                <div className="label label-active">On-chain Explorer</div>
                <div className="mt-3 space-y-2">
                  <ExplorerRow label="Contract" value={market.contractAddress ?? "not configured"} />
                  <ExplorerRow label="Creator" value={market.creator ?? "server relay"} />
                  <ExplorerRow label="Publish Tx" value={market.transactionHash ?? "awaiting publish"} />
                  <ExplorerRow label="Deployment Block" value="indexed from receipt after publish" />
                  <ExplorerRow label="Settlement Block" value={market.settlementBlock ? String(market.settlementBlock) : "pending"} />
                </div>
                {market.explorerUrl ? (
                  <a
                    href={market.explorerUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="engine-button mt-4 w-full border-[#333] text-[#b4ff5a] hover:border-[#b4ff5a]"
                  >
                    <ExternalLink className="size-3" aria-hidden />
                    View on Arbiscan
                  </a>
                ) : null}
              </div>

              <div className="rounded-sm border border-[#171717] bg-[#050505]/92 p-4">
                <div className="label label-active">Evidence</div>
                <div className="mt-3 space-y-2">
                  {market.evidence.slice(0, 6).map((item) => (
                    <div key={`${item.source}-${item.label}-${item.value}`} className="rounded-sm border border-[#111] bg-black p-3">
                      <div className="mono text-[9px] uppercase tracking-widest text-[#b4ff5a]">{item.source}</div>
                      <p className="mt-2 text-xs leading-5 text-[#888]">{item.label}</p>
                    </div>
                  ))}
                </div>
              </div>

              <Link href="/#path-order-execution" className="engine-button w-full border-[#b4ff5a] bg-[#b4ff5a] text-black">
                Execute / Claim
              </Link>
            </aside>
          </div>
        ) : null}
      </section>
    </main>
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

function ExplorerRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-sm border border-[#111] bg-black px-2.5 py-2">
      <div className="mono text-[8px] uppercase tracking-widest text-[#444]">{label}</div>
      <div className="mono mt-1 break-all text-[10px] uppercase tracking-widest text-[#aaa]">{value}</div>
    </div>
  );
}
