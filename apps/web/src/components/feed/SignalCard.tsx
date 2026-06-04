"use client";

import { motion } from "framer-motion";
import Link from "next/link";

import { SectorBadge } from "@/components/ui/SectorBadge";

type SignalCardProps = {
  title: string;
  confidence: number;
  priority: string;
  body: string;
  sectors: string[];
  match: string;
  risk: string;
  window: string;
};

export function SignalCard({ title, confidence, priority, body, sectors, match, risk, window }: SignalCardProps) {
  const priorityColor =
    priority === "HIGH" ? "#b4ff5a" : priority === "MED" ? "#ffaa00" : "#ff4444";
  const riskColor = risk === "LOW" ? "text-[#b4ff5a]" : risk === "MED" ? "text-[#ffaa00]" : "text-[#ff4444]";
  const builderHref = `/build?source=feed&title=${encodeURIComponent(title)}&score=${confidence}`;

  return (
    <motion.article
      initial={{ y: -16, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      whileHover={{ scale: 1.005 }}
      className="border-b border-[#111] py-6"
    >
      <div className="mono mb-3 flex flex-wrap items-center justify-between gap-3 text-[10px] uppercase tracking-widest text-[#666]">
        <span>NARRATIVE ALPHA</span>
        <span>
          CONFIDENCE <span style={{ color: priorityColor }}>{confidence}</span>{" "}
          <span className="text-white">{priority}</span>{" "}
          <span style={{ color: priorityColor }}>●</span>
        </span>
      </div>
      <div className="mb-4 border-t border-[#1a1a1a]" />
      <h2 className="mono text-sm text-white">{title}</h2>
      <p className="mono mt-3 max-w-3xl text-xs leading-6 text-[#777]">{body}</p>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="mono mr-2 text-[10px] uppercase tracking-widest text-[#555]">SECTORS</span>
        {sectors.map((sector) => (
          <SectorBadge key={sector}>{sector}</SectorBadge>
        ))}
      </div>
      <div className="mono mt-4 space-y-1 text-[10px] uppercase tracking-widest text-[#555]">
        <p>MATCH {match}</p>
        <p>
          RISK <span className={riskColor}>● {risk}</span>
        </p>
        <p>WINDOW {window}</p>
      </div>
      <div className="mt-4 flex gap-3">
        <Link
          href={builderHref}
          className="mono rounded-sm border border-[#b4ff5a] px-3 py-1 text-[10px] uppercase tracking-widest text-[#b4ff5a] transition-colors hover:bg-[#b4ff5a] hover:text-black"
        >
          CREATE PATH CONTRACT
        </Link>
        <button className="mono rounded-sm border border-[#2a2a2a] px-3 py-1 text-[10px] uppercase tracking-widest text-[#666] hover:text-white">
          DISMISS
        </button>
      </div>
    </motion.article>
  );
}
