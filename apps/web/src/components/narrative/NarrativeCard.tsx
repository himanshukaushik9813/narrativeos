"use client";

import { motion } from "framer-motion";
import Link from "next/link";

import type { NarrativeTrend } from "@/lib/types";

type NarrativeCardData = NarrativeTrend & {
  sourceThemeId?: string;
};

export function NarrativeCard({ trend }: { trend: NarrativeCardData }) {
  const builderHref = trend.sourceThemeId
    ? `/build?themeId=${encodeURIComponent(trend.sourceThemeId)}`
    : `/build?source=narrative&title=${encodeURIComponent(trend.title)}&score=${trend.score}`;

  return (
    <motion.article
      whileHover={{ scale: 1.005 }}
      className="rounded-sm border border-[#1a1a1a] bg-[#0a0a0a] p-4 hover:border-[#333] hover:shadow-[0_0_20px_rgba(180,255,90,0.05)]"
    >
      <div className="mono flex items-center justify-between border-b border-[#1a1a1a] pb-3 text-[10px] uppercase tracking-widest text-[#666]">
        <span>NARRATIVE DETECTED</span>
        <span className="text-2xl font-bold text-[#b4ff5a]">{trend.score}</span>
      </div>
      <h2 className="mt-4 text-sm font-semibold text-white">{trend.title}</h2>
      <p className="mono mt-4 text-xs leading-6 text-[#666]">{trend.body}</p>
      <div className="mono mt-5 text-[10px] uppercase tracking-widest text-[#444]">SIGNALS</div>
      <ul className="mono mt-2 space-y-1 text-xs text-[#888]">
        {trend.signals.map((signal) => (
          <li key={signal}>→ {signal}</li>
        ))}
      </ul>
      <div className="mono mt-5 space-y-1 text-[10px] uppercase tracking-widest text-[#555]">
        <p>HISTORICAL MATCH: {trend.match ?? "March 2024 83%"}</p>
        <p>
          RISK: {trend.risk ?? "LOW"} <span className="text-[#b4ff5a]">●</span>
        </p>
      </div>
      <Link
        href={builderHref}
        className="mono mt-5 inline-flex rounded-sm border border-[#b4ff5a] px-3 py-1 text-[10px] uppercase tracking-widest text-[#b4ff5a] transition-colors hover:bg-[#b4ff5a] hover:text-black"
      >
        CREATE PATH CONTRACT
      </Link>
    </motion.article>
  );
}
