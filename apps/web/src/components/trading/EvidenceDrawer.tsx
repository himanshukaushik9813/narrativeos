"use client";

import { motion } from "framer-motion";
import { ChevronDown, RefreshCcw } from "lucide-react";
import { useMemo, useState } from "react";

import { cn } from "@/lib/cn";
import type { IntelligenceError, IntelligenceStatus, NarrativeTheme, PathContract } from "@/lib/types";

type EvidenceDrawerProps = {
  contract: PathContract | null;
  narratives: NarrativeTheme[];
  status: IntelligenceStatus;
  error: IntelligenceError | null;
  onRefresh: () => void;
};

export function EvidenceDrawer({
  contract,
  narratives,
  status,
  error,
  onRefresh
}: EvidenceDrawerProps) {
  const [open, setOpen] = useState(true);
  const evidence = useMemo(() => {
    if (!contract) {
      return [];
    }
    return contract.legs.flatMap((leg) =>
      leg.evidence.map((item) => ({
        ...item,
        leg: leg.leg,
        metricSource: leg.metricSource
      }))
    );
  }, [contract]);

  const primaryTheme = narratives[0];

  return (
    <section className="border-t border-[#141414] bg-[#050505]">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="mono flex w-full items-center justify-between px-5 py-3 text-left text-[10px] uppercase tracking-widest text-[#666]"
      >
        <span className="flex items-center gap-3">
          <span className={cn("size-1.5 rounded-full", status === "ready" || status === "published" ? "bg-[#b4ff5a]" : status === "loading" ? "bg-[#ffaa44]" : "bg-[#ff4444]")} />
          Evidence Drawer
        </span>
        <ChevronDown className={cn("size-4 transition-transform", open && "rotate-180")} aria-hidden />
      </button>

      {open ? (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          className="grid gap-4 border-t border-[#101010] px-5 py-4 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]"
        >
          <div className="rounded-sm border border-[#171717] bg-black/40 p-4">
            <div className="label label-active">MARKET DNA</div>
            {status === "loading" ? (
              <LoadingLines />
            ) : contract ? (
              <>
                <p className="mt-3 text-sm leading-6 text-[#cfcfcf]">{contract.marketDna}</p>
                <div className="mono mt-4 grid gap-2 text-[10px] uppercase tracking-widest text-[#555] sm:grid-cols-2">
                  <Fact label="Theme" value={contract.theme} />
                  <Fact label="Confidence" value={`${contract.confidence}%`} />
                  <Fact label="Risk" value={`${contract.risk}%`} />
                  <Fact label="Terms" value={shortHash(contract.termsHash)} />
                </div>
              </>
            ) : (
              <BlockedState error={error} onRefresh={onRefresh} />
            )}
          </div>

          <div className="rounded-sm border border-[#171717] bg-black/40 p-4">
            <div className="flex items-center justify-between">
              <div className="label label-active">ORACLE EVIDENCE</div>
              <button
                type="button"
                onClick={onRefresh}
                className="mono inline-flex items-center gap-2 rounded-sm border border-[#222] px-2 py-1 text-[9px] uppercase tracking-widest text-[#555] hover:border-[#b4ff5a] hover:text-[#b4ff5a]"
              >
                <RefreshCcw className="size-3" aria-hidden />
                Sync
              </button>
            </div>

            {contract ? (
              <div className="mt-3 max-h-[260px] space-y-2 overflow-y-auto pr-2">
                {evidence.map((item, index) => (
                  <div key={`${item.leg}-${item.label}-${index}`} className="rounded-sm border border-[#111] bg-[#070707] p-3">
                    <div className="mono flex items-center justify-between text-[9px] uppercase tracking-widest text-[#444]">
                      <span>LEG {String(item.leg).padStart(2, "0")}</span>
                      <span>{item.source}</span>
                    </div>
                    <p className="mt-2 text-xs leading-5 text-[#d8d8d8]">{item.label}</p>
                    <div className="mono mt-2 flex flex-wrap gap-2 text-[10px] uppercase tracking-widest text-[#666]">
                      <span className="border border-[#1a1a1a] px-2 py-1">{item.value}</span>
                      <span className="border border-[#1a1a1a] px-2 py-1">{item.metricSource}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-3 rounded-sm border border-[#151515] bg-[#070707] p-3">
                <p className="mono text-[10px] uppercase tracking-widest text-[#555]">
                  {primaryTheme ? primaryTheme.title : "Waiting for live SoSoValue evidence"}
                </p>
              </div>
            )}
          </div>
        </motion.div>
      ) : null}
    </section>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-[#141414] bg-[#070707] p-2">
      <p className="text-[#333]">{label}</p>
      <p className="mt-1 truncate text-[#b4ff5a]">{value}</p>
    </div>
  );
}

function LoadingLines() {
  return (
    <div className="mt-4 space-y-2">
      {[0, 1, 2].map((item) => (
        <div key={item} className="h-3 animate-pulse rounded-sm bg-[#101010]" />
      ))}
    </div>
  );
}

function BlockedState({
  error,
  onRefresh
}: {
  error: IntelligenceError | null;
  onRefresh: () => void;
}) {
  return (
    <div className="mt-4 rounded-sm border border-[#2a1616] bg-[#120707] p-3">
      <p className="mono text-[10px] uppercase tracking-widest text-[#ff7777]">
        {error?.message ?? "Live evidence required"}
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
        className="mono mt-3 rounded-sm border border-[#3a1f1f] px-3 py-2 text-[10px] uppercase tracking-widest text-[#ff9999] hover:border-[#ff7777]"
      >
        Retry live evidence
      </button>
    </div>
  );
}

function shortHash(value: string) {
  return `${value.slice(0, 8)}...${value.slice(-6)}`;
}
