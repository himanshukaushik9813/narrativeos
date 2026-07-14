"use client";

import { motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAccount } from "wagmi";

import { FloatingTerminal } from "@/components/trading/FloatingTerminal";
import { AgentPipelineTimeline } from "@/components/trading/AgentPipelineTimeline";
import { EvidenceDrawer } from "@/components/trading/EvidenceDrawer";
import { MultiPathChart } from "@/components/trading/MultiPathChart";
import { PairHeader } from "@/components/trading/PairHeader";
import { PathSelectorPanel } from "@/components/trading/PathSelectorPanel";
import { ReviewPublishModal } from "@/components/trading/ReviewPublishModal";
import { SignalFeed } from "@/components/trading/SignalFeed";
import { FeaturePanel } from "@/components/ui/FeaturePanel";
import { defaultPathKey, pathOptions } from "@/lib/staticUiData";
import {
  draftPathContract,
  fetchMarketChart,
  fetchSoDEXContext,
  fetchTopNarratives,
  publishPathContract,
  toApiError
} from "@/lib/narrativeApi";
import type {
  IntelligenceError,
  IntelligenceStatus,
  MarketChartResponse,
  NarrativeTheme,
  PathContract,
  PathKey,
  SoDEXMarketContext
} from "@/lib/types";

export function MarketTerminal() {
  const [selectedPath, setSelectedPath] = useState<PathKey>(defaultPathKey);
  const [leverage, setLeverage] = useState(12);
  const [collateral, setCollateral] = useState("0.001");
  const [toast, setToast] = useState<string | null>(null);
  const [timeframe, setTimeframe] = useState("1D");
  const [narratives, setNarratives] = useState<NarrativeTheme[]>([]);
  const [contract, setContract] = useState<PathContract | null>(null);
  const [marketChart, setMarketChart] = useState<MarketChartResponse | null>(null);
  const [sodexContext, setSodexContext] = useState<SoDEXMarketContext | null>(null);
  const [marketChartError, setMarketChartError] = useState<IntelligenceError | null>(null);
  const [isChartLoading, setIsChartLoading] = useState(false);
  const [intelligenceStatus, setIntelligenceStatus] = useState<IntelligenceStatus>("idle");
  const [intelligenceError, setIntelligenceError] = useState<IntelligenceError | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [isDrafting, setIsDrafting] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishError, setPublishError] = useState<IntelligenceError | null>(null);
  const { address, isConnected } = useAccount();

  const selectedOption = useMemo(
    () => pathOptions.find((option) => option.id === selectedPath) ?? pathOptions[1],
    [selectedPath]
  );

  const loadLiveDraft = useCallback(
    async (signal?: AbortSignal) => {
      setIsDrafting(true);
      setIntelligenceStatus("loading");
      setIntelligenceError(null);

      try {
        const response = await fetchTopNarratives(signal);
        if (!response.narratives.length) {
          throw new Error("SoSoValue returned no eligible narrative evidence.");
        }
        setNarratives(response.narratives);

        const draft = await draftPathContract({
          themeId: response.narratives[0].id,
          stakeAmount: normalizeStake(collateral),
          creator: address,
          signal
        });
        setContract(draft);
        setIntelligenceStatus("ready");
      } catch (error) {
        if (signal?.aborted) {
          return;
        }
        const apiError = toApiError(error);
        setContract(null);
        setIntelligenceError({
          message: apiError.message,
          status: apiError.status,
          missing: apiError.missing
        });
        setIntelligenceStatus("error");
      } finally {
        if (!signal?.aborted) {
          setIsDrafting(false);
        }
      }
    },
    [address, collateral]
  );

  const loadMarketChart = useCallback(async (signal?: AbortSignal) => {
    setIsChartLoading(true);
    setMarketChartError(null);
    try {
      const chart = await fetchMarketChart(signal);
      setMarketChart(chart);
    } catch (error) {
      if (signal?.aborted) {
        return;
      }
      const apiError = toApiError(error);
      setMarketChart(null);
      setMarketChartError({
        message: apiError.message,
        status: apiError.status,
        missing: apiError.missing
      });
    } finally {
      if (!signal?.aborted) {
        setIsChartLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void loadLiveDraft(controller.signal);
    void loadMarketChart(controller.signal);
    void fetchSoDEXContext(controller.signal).then(setSodexContext).catch(() => undefined);
    return () => controller.abort();
  }, [loadLiveDraft, loadMarketChart]);

  function openReview() {
    setPublishError(null);
    setReviewOpen(true);
    void loadLiveDraft();
  }

  async function publishDraft() {
    if (!contract) {
      return;
    }
    setIsPublishing(true);
    setPublishError(null);
    try {
      const published = await publishPathContract({
        contract,
        creator: address,
        relay: true
      });
      setContract(published);
      setIntelligenceStatus("published");
      setToast(`Published ${published.id}${published.txHash ? ` / ${shortHash(published.txHash)}` : ""}`);
      window.setTimeout(() => setToast(null), 3200);
    } catch (error) {
      const apiError = toApiError(error);
      setPublishError({
        message: apiError.message,
        status: apiError.status,
        missing: apiError.missing
      });
    } finally {
      setIsPublishing(false);
    }
  }

  return (
    <motion.main
      initial={false}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      className="relative min-h-screen overflow-hidden bg-black px-4 pb-10 pt-20"
    >
      <AtmosphericBackground />
      <div className="relative z-10 mx-auto flex max-w-7xl flex-col gap-4">
        <ProtocolFlowStrip />
        <JudgeClarityPanel sodexContext={sodexContext} contract={contract} />
      </div>
      <div className="relative z-10 mx-auto flex max-w-7xl flex-col items-center gap-6 xl:flex-row xl:items-start xl:justify-center">
        <FloatingTerminal>
          <div className="grid overflow-hidden rounded-sm lg:grid-cols-[minmax(0,1fr)_340px]">
            <section>
              <PairHeader
                pair={marketChart?.symbol ?? "BTC ETF"}
                value={marketChart?.latestValue}
                changePct={marketChart?.latestChangePct}
                source={marketChart?.source ?? "SoSoValue"}
                metric={marketChart?.metric ?? "Live ETF metric"}
                points={marketChart?.data.length}
                settlement="Arbitrum Sepolia"
              />
              <MultiPathChart
                chart={marketChart}
                isLoading={isChartLoading}
                error={marketChartError}
                selectedPath={selectedPath}
                timeframe={timeframe}
                onTimeframeChange={setTimeframe}
                onRefresh={() => void loadMarketChart()}
              />
              <AgentPipelineTimeline
                contract={contract}
                status={intelligenceStatus}
                error={intelligenceError}
              />
              <EvidenceDrawer
                contract={contract}
                narratives={narratives}
                status={intelligenceStatus}
                error={intelligenceError}
                onRefresh={() => void loadLiveDraft()}
              />
              <SignalFeed />
            </section>
            <PathSelectorPanel
              selectedPath={selectedPath}
              onSelect={setSelectedPath}
              leverage={leverage}
              onLeverageChange={setLeverage}
              collateral={collateral}
              onCollateralChange={setCollateral}
              onEnter={openReview}
              activeContract={contract}
              onOrderSuccess={(message) => {
                setToast(message);
                window.setTimeout(() => setToast(null), 3200);
              }}
            />
          </div>
        </FloatingTerminal>
        <FeaturePanel />
      </div>

      <ReviewPublishModal
        open={reviewOpen}
        contract={contract}
        status={intelligenceStatus}
        error={intelligenceError}
        stakeAmount={normalizeStake(collateral)}
        selectedPathName={selectedOption.name}
        leverage={leverage}
        isConnected={isConnected}
        isRefreshing={isDrafting}
        isPublishing={isPublishing}
        publishError={publishError}
        onClose={() => setReviewOpen(false)}
        onRefresh={() => void loadLiveDraft()}
        onPublish={publishDraft}
      />

      {toast && (
        <motion.div
          initial={{ y: 16, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="mono fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-sm border border-[#b4ff5a] bg-black px-4 py-3 text-xs text-[#b4ff5a]"
        >
          {toast}
        </motion.div>
      )}
    </motion.main>
  );
}

function normalizeStake(value: string) {
  const trimmed = value.trim();
  return Number(trimmed) > 0 ? trimmed : "0.001";
}

function shortHash(value: string) {
  return `${value.slice(0, 8)}...${value.slice(-6)}`;
}

function ProtocolFlowStrip() {
  const stages = ["SoSoValue", "AI Agents", "Evidence", "Probability", "Path Contract", "Stakes", "Settlement", "Reputation"];
  return (
    <section className="rounded-sm border border-[#121912] bg-[#030503]/80 p-3">
      <div className="grid gap-2 md:grid-cols-4 xl:grid-cols-8">
        {stages.map((stage, index) => (
          <div key={stage} className="relative rounded-sm border border-[#151515] bg-black px-3 py-2">
            <div className="mono text-[8px] uppercase tracking-widest text-[#35502c]">{String(index + 1).padStart(2, "0")}</div>
            <div className="mono mt-1 text-[10px] font-bold uppercase tracking-widest text-[#d8d8d8]">{stage}</div>
            {index < stages.length - 1 ? (
              <div className="absolute -right-1 top-1/2 hidden h-px w-2 bg-[#b4ff5a]/35 xl:block" />
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}

function JudgeClarityPanel({
  sodexContext,
  contract
}: {
  sodexContext: SoDEXMarketContext | null;
  contract: PathContract | null;
}) {
  const rows = [
    {
      label: "1 / Detect",
      title: "SoSoValue signal intake",
      body: "Featured news, matched currencies, ETF metrics, and ETF inflow history become the only evidence allowed into the agent pipeline."
    },
    {
      label: "2 / Price",
      title: "Deterministic path quote",
      body: "Probability is computed from evidence quality, agent confidence, risk, and confirmed stake feedback; thin markets are discounted."
    },
    {
      label: "3 / Publish",
      title: "Terms hash on-chain",
      body: "The reviewed path publishes to the configured Arbitrum Sepolia PathMarket contract with an explorer-verifiable transaction."
    },
    {
      label: "4 / Trade",
      title: "Stake into any creator path",
      body: "Users support or oppose individual legs through wallet transactions; confirmed orders feed back into market depth and pricing."
    }
  ];

  return (
    <section className="rounded-sm border border-[#151515] bg-[#050505]/86 p-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="label label-active">JUDGE QUICK READ</div>
          <h1 className="mono mt-2 text-xl font-bold uppercase tracking-widest text-white">
            Live narratives become priced, tradeable path contracts.
          </h1>
          <p className="mt-2 max-w-4xl text-sm leading-6 text-[#777]">
            NarrativeOS is not a generic signal dashboard: it converts live SoSoValue evidence into structured contract legs, computes an auditable probability quote, publishes terms on-chain, and lets the market stake against the thesis.
          </p>
        </div>
        <div className="grid min-w-[260px] gap-2 sm:grid-cols-2">
          <StatusTile label="Current Draft" value={contract ? contract.status : "loading"} />
          <StatusTile
            label="SoDEX Context"
            value={sodexContext ? `${sodexContext.status} / ${sodexContext.spotSymbols + sodexContext.perpsSymbols} symbols` : "checking"}
          />
        </div>
      </div>
      <div className="mt-4 grid gap-2 md:grid-cols-4">
        {rows.map((row) => (
          <article key={row.label} className="rounded-sm border border-[#151515] bg-black p-3">
            <div className="mono text-[8px] uppercase tracking-widest text-[#b4ff5a]">{row.label}</div>
            <div className="mono mt-2 text-[10px] font-bold uppercase tracking-widest text-white">{row.title}</div>
            <p className="mt-2 text-xs leading-5 text-[#666]">{row.body}</p>
          </article>
        ))}
      </div>
      {sodexContext ? (
        <div className="mono mt-3 rounded-sm border border-[#111] bg-black px-3 py-2 text-[9px] uppercase tracking-widest text-[#555]">
          {sodexContext.note}
        </div>
      ) : null}
    </section>
  );
}

function StatusTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-sm border border-[#151515] bg-black p-3">
      <div className="mono text-[8px] uppercase tracking-widest text-[#444]">{label}</div>
      <div className="mono mt-1 truncate text-[11px] font-bold uppercase tracking-widest text-[#b4ff5a]">{value}</div>
    </div>
  );
}

function AtmosphericBackground() {
  return (
    <div className="pointer-events-none fixed inset-0">
      <div
        className="absolute bottom-[-20%] left-1/2 h-[600px] w-[900px] -translate-x-1/2 blur-[40px]"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(20,80,10,0.4) 0%, rgba(10,40,5,0.15) 50%, transparent 70%)"
        }}
      />
      <div
        className="absolute right-[-5%] top-[-10%] size-[400px] blur-[60px]"
        style={{
          background: "radial-gradient(ellipse, rgba(180,255,90,0.04) 0%, transparent 70%)"
        }}
      />
    </div>
  );
}
