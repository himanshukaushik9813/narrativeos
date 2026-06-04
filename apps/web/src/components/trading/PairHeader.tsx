"use client";

import CountUp from "react-countup";

import { LiveDot } from "@/components/ui/LiveDot";

type PairHeaderProps = {
  pair: string;
  value?: number;
  changePct?: number;
  source: string;
  metric: string;
  points?: number;
  settlement: string;
};

export function PairHeader({
  pair,
  value,
  changePct = 0,
  source,
  metric,
  points,
  settlement
}: PairHeaderProps) {
  const positive = changePct >= 0;

  return (
    <div className="border-b border-[#141414] p-5">
      <div className="mb-2 flex items-center gap-3">
        <span className="mono text-[10px] uppercase tracking-[0.15em] text-[#444]">{pair}</span>
        <span className="mono flex items-center gap-1 text-[10px] uppercase tracking-[0.15em] text-[#444]">
          ACTIVE <LiveDot />
        </span>
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <span className="mono text-[42px] font-bold leading-none text-white">
          {typeof value === "number" ? (
            <>
              <CountUp end={value / 1_000_000_000} duration={1.5} decimals={2} separator="," />
              <span className="ml-2 text-xl text-[#555]">B</span>
            </>
          ) : (
            <span className="text-[#555]">--</span>
          )}
        </span>
        <span className={`mono pb-1 text-sm ${positive ? "text-[#b4ff5a]" : "text-[#ff2244]"}`}>
          {positive ? "+" : ""}
          {changePct.toFixed(2)}% latest
        </span>
      </div>
      <div className="mono mt-3 flex flex-wrap gap-2 text-[9px] uppercase tracking-widest text-[#333]">
        <span>SOURCE {source}</span>
        <span>|</span>
        <span>METRIC {metric}</span>
        <span>|</span>
        <span>POINTS {points ?? "--"}</span>
        <span>|</span>
        <span>SETTLEMENT {settlement}</span>
      </div>
    </div>
  );
}
