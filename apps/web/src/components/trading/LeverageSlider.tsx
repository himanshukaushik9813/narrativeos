"use client";

import { MonoLabel } from "@/components/ui/MonoLabel";

type LeverageSliderProps = {
  value: number;
  onChange: (value: number) => void;
};

export function LeverageSlider({ value, onChange }: LeverageSliderProps) {
  const pct = ((value - 1) / 24) * 100;

  return (
    <div className="border-t border-[#111] pt-5">
      <div className="mb-3 flex items-center justify-between">
        <MonoLabel>LEVERAGE</MonoLabel>
        <span className="mono text-sm text-[#b4ff5a]">{value}x</span>
      </div>
      <input
        className="leverage-slider"
        style={{ "--pct": `${pct}%` } as React.CSSProperties}
        type="range"
        min={1}
        max={25}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
      <div className="mono mt-2 flex justify-between text-[9px] uppercase tracking-widest text-[#333]">
        <span>1x</span>
        <span>MAX</span>
      </div>
    </div>
  );
}
