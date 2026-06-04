import { SignalCard } from "@/components/feed/SignalCard";
import { opportunitySignals } from "@/lib/mockData";

export default function FeedPage() {
  return (
    <main className="min-h-screen bg-black p-4 pt-24">
      <div className="mx-auto max-w-5xl">
        <div className="border-b border-[#111] pb-5">
          <div className="mono text-[10px] uppercase tracking-widest text-[#444]">
            OPPORTUNITY FEED
          </div>
          <h1 className="mono mt-2 text-2xl font-bold text-white">ALPHA SIGNAL STREAM</h1>
        </div>
        <div className="mono flex flex-wrap gap-4 border-b border-[#111] py-4 text-[10px] uppercase tracking-widest text-[#444]">
          {["ALL", "AI SIGNALS", "WHALE MOVES", "SECTOR ROTATION", "NARRATIVE SHIFTS"].map((tab, index) => (
            <button key={tab} className={index === 0 ? "text-[#b4ff5a]" : "hover:text-white"}>
              {tab}
            </button>
          ))}
        </div>
        <section>
          {opportunitySignals.map((signal) => (
            <SignalCard key={signal.title} {...signal} />
          ))}
        </section>
      </div>
    </main>
  );
}
