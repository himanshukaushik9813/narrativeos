"use client";

import { motion } from "framer-motion";
import { AlertTriangle, Check, Loader2, X } from "lucide-react";

import { cn } from "@/lib/cn";
import type { IntelligenceError, IntelligenceStatus, PathContract } from "@/lib/types";

type ReviewPublishModalProps = {
  open: boolean;
  contract: PathContract | null;
  status: IntelligenceStatus;
  error: IntelligenceError | null;
  stakeAmount: string;
  selectedPathName: string;
  leverage: number;
  isConnected: boolean;
  isRefreshing: boolean;
  isPublishing: boolean;
  publishError: IntelligenceError | null;
  onClose: () => void;
  onRefresh: () => void;
  onPublish: () => void;
};

export function ReviewPublishModal({
  open,
  contract,
  status,
  error,
  stakeAmount,
  selectedPathName,
  leverage,
  isConnected,
  isRefreshing,
  isPublishing,
  publishError,
  onClose,
  onRefresh,
  onPublish
}: ReviewPublishModalProps) {
  if (!open) {
    return null;
  }

  const alreadyPublished = contract?.status === "published";
  const canPublish = Boolean(contract) && !alreadyPublished && !isPublishing && !isRefreshing;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 px-4 py-8 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-sm border border-[#242424] bg-[#070707] shadow-[0_0_80px_rgba(0,0,0,0.8)]"
      >
        <header className="flex items-center justify-between border-b border-[#171717] px-5 py-4">
          <div>
            <p className="label label-active">REVIEW / PUBLISH FLOW</p>
            <h2 className="mono mt-1 text-lg uppercase tracking-widest text-white">
              {contract?.title ?? "Live draft required"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-sm border border-[#222] p-2 text-[#666] hover:border-[#b4ff5a] hover:text-[#b4ff5a]"
            aria-label="Close review"
          >
            <X className="size-4" aria-hidden />
          </button>
        </header>

        <div className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
          <section className="rounded-sm border border-[#171717] bg-black/40 p-4">
            <div className="mb-4 flex items-center justify-between">
              <span className="label">PATH CONTRACT TERMS</span>
              <span className="mono text-[10px] uppercase tracking-widest text-[#b4ff5a]">
                {contract?.structure ?? "linear"}
              </span>
            </div>

            {contract ? (
              <div className="space-y-3">
                {contract.legs.map((leg) => (
                  <div key={leg.leg} className="rounded-sm border border-[#141414] bg-[#070707] p-3">
                    <div className="mono flex items-center justify-between text-[9px] uppercase tracking-widest text-[#555]">
                      <span>LEG {String(leg.leg).padStart(2, "0")}</span>
                      <span>{leg.confidence}% CONF</span>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-white">{leg.condition}</p>
                    <div className="mono mt-3 grid gap-2 text-[10px] uppercase tracking-widest text-[#666] sm:grid-cols-3">
                      <span>{leg.metricSource}</span>
                      <span>
                        {leg.comparator} {leg.threshold}
                      </span>
                      <span>{leg.window}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <BlockedPanel error={error} onRefresh={onRefresh} isRefreshing={isRefreshing} />
            )}
          </section>

          <aside className="rounded-sm border border-[#171717] bg-black/40 p-4">
            <div className="label label-active">PUBLISH READINESS</div>
            <div className="mt-4 space-y-2">
              <ReadinessRow ready={Boolean(contract)} label="Live evidence draft" />
              <ReadinessRow ready={Boolean(contract && contract.legs.length === 3)} label="3-leg linear structure" />
              <ReadinessRow ready={Boolean(contract?.termsHash)} label="Terms hash" />
              <ReadinessRow ready={isConnected} label="Wallet connected" soft />
            </div>

            <div className="mono mt-5 space-y-2 rounded-sm border border-[#141414] bg-[#070707] p-3 text-[10px] uppercase tracking-widest text-[#555]">
              <Fact label="Selected path" value={selectedPathName} />
              <Fact label="Stake" value={`${stakeAmount || "0"} test ETH`} />
              <Fact label="Leverage view" value={`${leverage}x`} />
              <Fact label="Settlement" value="Arbitrum Sepolia" />
              <Fact label="Status" value={contract?.status ?? status} />
              {contract?.termsHash ? <Fact label="Terms hash" value={shortHash(contract.termsHash)} /> : null}
              {contract?.txHash ? <Fact label="Tx hash" value={shortHash(contract.txHash)} /> : null}
            </div>

            {publishError ? (
              <div className="mt-4 rounded-sm border border-[#3a1f1f] bg-[#120707] p-3">
                <div className="mono flex items-center gap-2 text-[10px] uppercase tracking-widest text-[#ff9999]">
                  <AlertTriangle className="size-3" aria-hidden />
                  {publishError.message}
                </div>
                {publishError.missing?.length ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {publishError.missing.map((item) => (
                      <span key={item} className="mono border border-[#3a1f1f] px-2 py-1 text-[9px] text-[#ff9999]">
                        {item}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}

            <button
              type="button"
              onClick={onPublish}
              disabled={!canPublish}
              className={cn(
                "mono mt-5 flex w-full items-center justify-center gap-2 rounded-sm py-3 text-xs font-bold uppercase tracking-[0.15em] transition-all",
                canPublish
                  ? "bg-[#b4ff5a] text-black hover:shadow-[0_0_25px_rgba(180,255,90,0.2)]"
                  : "cursor-not-allowed border border-[#222] bg-[#0a0a0a] text-[#444]"
              )}
            >
              {isPublishing || isRefreshing ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
              {alreadyPublished ? "Published" : contract ? "Publish to Arbitrum Sepolia" : "Live draft required"}
            </button>
          </aside>
        </div>
      </motion.div>
    </div>
  );
}

function ReadinessRow({ ready, label, soft = false }: { ready: boolean; label: string; soft?: boolean }) {
  return (
    <div className="mono flex items-center justify-between rounded-sm border border-[#141414] bg-[#070707] px-3 py-2 text-[10px] uppercase tracking-widest">
      <span className={ready ? "text-[#d8d8d8]" : soft ? "text-[#777]" : "text-[#555]"}>{label}</span>
      <span className={ready ? "text-[#b4ff5a]" : soft ? "text-[#ffaa44]" : "text-[#ff7777]"}>
        {ready ? <Check className="size-3" aria-hidden /> : soft ? "optional" : "blocked"}
      </span>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[#333]">{label}</span>
      <span className="truncate text-right text-[#b4ff5a]">{value}</span>
    </div>
  );
}

function BlockedPanel({
  error,
  onRefresh,
  isRefreshing
}: {
  error: IntelligenceError | null;
  onRefresh: () => void;
  isRefreshing: boolean;
}) {
  return (
    <div className="rounded-sm border border-[#2a1616] bg-[#120707] p-4">
      <p className="mono text-[10px] uppercase tracking-widest text-[#ff9999]">
        {error?.message ?? "Live SoSoValue draft is not available."}
      </p>
      {error?.missing?.length ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {error.missing.map((item) => (
            <span key={item} className="mono border border-[#3a1f1f] px-2 py-1 text-[9px] uppercase tracking-widest text-[#ff9999]">
              {item}
            </span>
          ))}
        </div>
      ) : null}
      <button
        type="button"
        onClick={onRefresh}
        className="mono mt-4 inline-flex items-center gap-2 rounded-sm border border-[#3a1f1f] px-3 py-2 text-[10px] uppercase tracking-widest text-[#ff9999] hover:border-[#ff7777]"
      >
        {isRefreshing ? <Loader2 className="size-3 animate-spin" aria-hidden /> : null}
        Retry draft
      </button>
    </div>
  );
}

function shortHash(value: string) {
  return `${value.slice(0, 8)}...${value.slice(-6)}`;
}
