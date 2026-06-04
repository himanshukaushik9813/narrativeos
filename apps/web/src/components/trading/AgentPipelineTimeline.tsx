"use client";

import { motion } from "framer-motion";

import { cn } from "@/lib/cn";
import type { IntelligenceError, IntelligenceStatus, PathContract } from "@/lib/types";

type AgentPipelineTimelineProps = {
  contract: PathContract | null;
  status: IntelligenceStatus;
  error: IntelligenceError | null;
};

const agentLabels = [
  "Data Agent",
  "Narrative Agent",
  "Risk Agent",
  "Strategy Agent",
  "Execution Agent",
  "Explainability Agent"
];

export function AgentPipelineTimeline({ contract, status, error }: AgentPipelineTimelineProps) {
  const steps = buildSteps(contract, status, error);

  return (
    <section className="border-t border-[#141414] bg-[#060606] px-5 py-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="label label-active">6-AGENT PIPELINE</div>
        <span className="mono text-[9px] uppercase tracking-widest text-[#444]">
          {contract ? contract.id : "NO LIVE DRAFT"}
        </span>
      </div>
      <div className="grid gap-3 md:grid-cols-3 2xl:grid-cols-6">
        {steps.map((step, index) => (
          <motion.div
            key={step.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.04 }}
            className={cn(
              "relative min-w-0 overflow-hidden rounded-sm border bg-black/30 p-3",
              step.state === "complete" && "border-[#244014]",
              step.state === "active" && "border-[#b4ff5a]",
              step.state === "blocked" && "border-[#3a1f1f]",
              step.state === "waiting" && "border-[#171717]"
            )}
          >
            <div className="mono flex items-center justify-between text-[9px] uppercase tracking-widest">
              <span className="text-[#555]">{String(index + 1).padStart(2, "0")}</span>
              <span
                className={cn(
                  "size-1.5 rounded-full",
                  step.state === "complete" && "bg-[#b4ff5a]",
                  step.state === "active" && "bg-[#ffaa44]",
                  step.state === "blocked" && "bg-[#ff5555]",
                  step.state === "waiting" && "bg-[#333]"
                )}
              />
            </div>
            <h3 className="mono mt-3 break-words text-[10px] uppercase tracking-[0.12em] text-white">{step.label}</h3>
            <p className="mt-2 line-clamp-4 break-words text-xs leading-5 text-[#666]">{step.body}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

function buildSteps(
  contract: PathContract | null,
  status: IntelligenceStatus,
  error: IntelligenceError | null
) {
  if (!contract) {
    return agentLabels.map((label, index) => ({
      label,
      state: status === "loading" && index === 0 ? "active" : index === 0 ? "blocked" : "waiting",
      body:
        index === 0
          ? error?.missing?.length
            ? `Missing ${error.missing.join(", ")}`
            : error?.message ?? "Fetching supported SoSoValue endpoints."
          : "Waiting for shared AgentContext."
    }));
  }

  const context = contract.agentContext;
  return [
    {
      label: "Data Agent",
      state: "complete",
      body: `${Number(context.dataAgent?.featured_news ?? 0)} news items, ${Number(context.dataAgent?.currencies ?? 0)} currencies, ETF feeds loaded.`
    },
    {
      label: "Narrative Agent",
      state: "complete",
      body: `${contract.theme} ranked from live tags, currencies, and ETF flow shifts.`
    },
    {
      label: "Risk Agent",
      state: "complete",
      body: `Risk ${contract.risk}% with ${contract.confidence}% path confidence.`
    },
    {
      label: "Strategy Agent",
      state: "complete",
      body: `Prepared ${contract.legs.length}-leg ${contract.structure} contract with graduated settlement.`
    },
    {
      label: "Execution Agent",
      state: status === "published" || contract.status === "published" ? "complete" : "active",
      body:
        contract.txHash && contract.status === "published"
          ? `Submitted ${shortHash(contract.txHash)}`
          : "Review ready. Arbitrum Sepolia publish awaits confirmation."
    },
    {
      label: "Explainability Agent",
      state: "complete",
      body: "Market DNA and oracle evidence prepared from the same agent context."
    }
  ];
}

function shortHash(value: string) {
  return `${value.slice(0, 8)}...${value.slice(-6)}`;
}
