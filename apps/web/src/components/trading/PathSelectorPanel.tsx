"use client";

import * as Slider from "@radix-ui/react-slider";
import { motion } from "framer-motion";

import { PathOrderTicket } from "@/components/trading/PathOrderTicket";
import { cn } from "@/lib/cn";
import { pathOptions } from "@/lib/mockData";
import type { PathContract, PathKey } from "@/lib/types";

type PathSelectorPanelProps = {
  selectedPath: PathKey;
  onSelect: (path: PathKey) => void;
  leverage: number;
  onLeverageChange: (value: number) => void;
  collateral: string;
  onCollateralChange: (value: string) => void;
  onEnter: () => void;
  activeContract: PathContract | null;
  onOrderSuccess: (message: string) => void;
};

export function PathSelectorPanel({
  selectedPath,
  onSelect,
  leverage,
  onLeverageChange,
  collateral,
  onCollateralChange,
  onEnter,
  activeContract,
  onOrderSuccess
}: PathSelectorPanelProps) {
  return (
    <aside className="border-l border-[#141414] bg-[#080808] p-4">
      <div className="label label-active mb-3">SELECT PROVIDER</div>
      <div className="mb-4 h-px bg-[#1a1a1a]" />
      <div className="space-y-1">
        {pathOptions.map((path) => {
          const selected = selectedPath === path.id;
          return (
            <motion.button
              key={path.id}
              type="button"
              onClick={() => onSelect(path.id)}
              whileTap={{ scale: 0.99 }}
              className={cn(
                "flex w-full items-center justify-between rounded-sm border border-transparent bg-black/20 px-3 py-2 text-left transition-colors hover:border-[#333] hover:bg-[#111]",
                selected && "border-[#b4ff5a] bg-[rgba(180,255,90,0.04)]"
              )}
              style={{ borderLeft: `3px solid ${path.color}` }}
            >
              <span className="flex min-w-0 items-center gap-3">
                <span className="mono bg-[#111] px-1.5 py-0.5 text-[9px] text-[#2a2a2a]">
                  {path.index}
                </span>
                <span className={cn("mono truncate text-[11px] text-[#666]", selected && "text-white")}>
                  {path.name}
                </span>
              </span>
              <span className="mono shrink-0 text-[11px] text-[#b4ff5a]">{path.multiplier}</span>
            </motion.button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => onSelect("custom")}
        className="mono mt-4 w-full rounded-sm border border-[#222] px-3 py-2 text-left text-[10px] uppercase tracking-widest text-[#555] hover:border-[#b4ff5a] hover:text-[#b4ff5a]"
      >
        ← DRAW CUSTOM PATH
      </button>

      <div className="my-5 h-px bg-[#1a1a1a]" />
      <div className="mb-3 flex items-center justify-between">
        <span className="label">LEVERAGE</span>
        <span className="mono text-sm text-[#b4ff5a]">{leverage}x</span>
      </div>
      <Slider.Root
        min={1}
        max={100}
        step={1}
        value={[leverage]}
        onValueChange={([value]) => onLeverageChange(value)}
        className="relative flex h-5 w-full touch-none select-none items-center"
      >
        <Slider.Track className="relative h-[3px] grow rounded-full bg-[#1a1a1a]">
          <Slider.Range
            className="absolute h-full rounded-full"
            style={{ background: "linear-gradient(to right, #7ab832, #b4ff5a)" }}
          />
        </Slider.Track>
        <Slider.Thumb className="block size-3 cursor-pointer rounded-full bg-[#b4ff5a] shadow-[0_0_8px_rgba(180,255,90,0.5)] outline-none" />
      </Slider.Root>
      <div className="mono mt-1 flex justify-between text-[9px] uppercase tracking-widest text-[#333]">
        <span>1x</span>
        <span>MAX</span>
      </div>

      <label className="mt-5 block">
        <span className="label">STAKE</span>
        <div className="mt-2 flex items-center rounded-sm border border-[#1a1a1a] bg-[#0f0f0f] px-3 py-2 focus-within:border-[#b4ff5a]">
          <input
            value={collateral}
            onChange={(event) => onCollateralChange(event.target.value)}
            inputMode="decimal"
            className="mono w-full bg-transparent text-2xl text-white outline-none"
          />
          <span className="mono text-xs text-[#555]">TEST ETH</span>
        </div>
        <span className="mono mt-2 block text-[9px] uppercase tracking-widest text-[#444]">
          Arbitrum Sepolia stake
        </span>
      </label>

      <motion.button
        type="button"
        onClick={onEnter}
        whileHover={{ scale: 1.02, boxShadow: "0 0 25px rgba(180,255,90,0.2)" }}
        whileTap={{ scale: 0.98 }}
        className="mono mt-5 w-full rounded-sm bg-[#b4ff5a] py-3 text-xs font-bold uppercase tracking-[0.15em] text-black"
      >
        REVIEW PATH
      </motion.button>

      <PathOrderTicket activeContract={activeContract} onOrderSuccess={onOrderSuccess} />
    </aside>
  );
}
