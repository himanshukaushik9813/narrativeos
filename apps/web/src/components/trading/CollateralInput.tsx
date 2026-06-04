"use client";

import { MonoLabel } from "@/components/ui/MonoLabel";

type CollateralInputProps = {
  value: string;
  onChange: (value: string) => void;
};

export function CollateralInput({ value, onChange }: CollateralInputProps) {
  return (
    <label className="block border-t border-[#111] pt-5">
      <MonoLabel>COLLATERAL</MonoLabel>
      <div className="mt-2 flex items-center rounded-sm border border-[#1a1a1a] px-3 py-2 focus-within:border-[#b4ff5a]">
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          inputMode="decimal"
          className="mono w-full bg-transparent text-2xl text-white outline-none"
        />
        <span className="mono text-xs text-[#555]">USDC</span>
      </div>
    </label>
  );
}
