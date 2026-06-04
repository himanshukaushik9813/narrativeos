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
import { defaultPathKey, pathOptions } from "@/lib/mockData";
import {
  draftPathContract,
  fetchMarketChart,
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
  PathKey
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
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      className="relative min-h-screen overflow-hidden bg-black px-4 pb-10 pt-20"
    >
      <AtmosphericBackground />
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
