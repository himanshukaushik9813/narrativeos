import { NarrativeHeatmap } from "@/components/narrative/NarrativeHeatmap";
import { LiveNarrativesGrid } from "@/components/narrative/LiveNarrativesGrid";

export default function NarrativesPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-black p-4 pt-24">
      <div
        className="pointer-events-none fixed inset-x-0 top-10 h-[420px] blur-[60px]"
        style={{ background: "radial-gradient(ellipse at top, rgba(20,80,10,0.28), transparent 68%)" }}
      />
      <div className="relative mx-auto max-w-7xl">
        <div className="mb-8 border-b border-[#111] pb-5">
          <div className="mono text-[10px] uppercase tracking-widest text-[#444]">
            NARRATIVE INTELLIGENCE
          </div>
          <h1 className="mono mt-2 text-2xl font-bold text-white">SECTOR ROTATION MAP</h1>
        </div>
        <NarrativeHeatmap />
        <LiveNarrativesGrid />
      </div>
    </main>
  );
}
