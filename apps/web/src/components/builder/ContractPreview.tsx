import type { BuilderLeg } from "@/lib/types";

type ContractPreviewProps = {
  title: string;
  structure: string;
  stake: string;
  legs: BuilderLeg[];
  payoutModel: string;
};

export function ContractPreview({ title, structure, stake, legs, payoutModel }: ContractPreviewProps) {
  return (
    <aside className="rounded-sm border border-[#1a1a1a] bg-[#0a0a0a] p-5">
      <div className="mono mb-5 text-[10px] uppercase tracking-widest text-[#444]">CONTRACT PREVIEW</div>
      <h2 className="mono text-sm text-white">{title}</h2>
      <p className="mono mt-2 text-[10px] uppercase tracking-widest text-[#555]">
        STRUCTURE: {structure} · STAKE: {stake} TEST ETH
      </p>
      <div className="relative ml-1 mt-6 border-l-2 border-dashed border-[#1e1e1e] pl-6">
        {legs.map((leg, index) => (
          <div key={leg.id} className="relative pb-8">
            <span
              className={`absolute -left-[32px] top-0 size-3 rounded-full border-2 border-[#b4ff5a] ${
                index === 0 ? "bg-[#b4ff5a]" : "bg-black"
              }`}
            />
            <div className="mono text-xs text-[#b4ff5a]">LEG {String(leg.id).padStart(2, "0")}</div>
            <p className="mono mt-2 text-sm text-white">{leg.condition}</p>
            <p className="mono mt-1 text-xs text-[#555]">Window: {leg.window} days</p>
            <p className="mono mt-1 text-xs text-[#555]">Confidence: {leg.confidence}%</p>
          </div>
        ))}
        <div className="relative">
          <span className="absolute -left-[32px] top-0 size-3 rounded-full border-2 border-[#b4ff5a] bg-black" />
          <div className="mono text-xs text-[#b4ff5a]">SETTLEMENT</div>
          <p className="mono mt-2 text-sm text-white">{payoutModel}</p>
          <p className="mono mt-1 text-xs text-[#555]">Max reward: 2.4x</p>
          <p className="mono mt-1 text-xs text-[#555]">Expected value: +0.8x</p>
        </div>
      </div>
    </aside>
  );
}
