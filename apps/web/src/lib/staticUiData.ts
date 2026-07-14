import type {
  BuilderLeg,
  NarrativeTrend,
  PathKey,
  PathOption,
  SectorScore,
  SignalItem
} from "@/lib/types";

export const pathOptions: PathOption[] = [
  { id: "gigaBull", index: "01", name: "NarrativeOS AI - Giga Bull", multiplier: "1.50x", color: "#b4ff5a" },
  { id: "bull", index: "02", name: "NarrativeOS AI - Bull", multiplier: "1.80x", color: "#22cc88" },
  { id: "mild", index: "03", name: "NarrativeOS AI - Mild", multiplier: "2.25x", color: "#66aaff" },
  { id: "bear", index: "04", name: "NarrativeOS AI - Bear", multiplier: "1.60x", color: "#ff6644" },
  { id: "megaBear", index: "05", name: "NarrativeOS AI - Mega Bear", multiplier: "1.50x", color: "#ff2222" },
  { id: "custom", index: "06", name: "Custom Drawn Path", multiplier: "2.80x", color: "#cc66ff" }
];

export const sectorScores: SectorScore[] = [];

export const narrativeTrends: NarrativeTrend[] = [];

export const signalFeed: SignalItem[] = [];

export const opportunitySignals: Array<{
  title: string;
  confidence: number;
  priority: "HIGH" | "MED" | "LOW";
  body: string;
  sectors: string[];
  match: string;
  risk: "LOW" | "MED" | "HIGH";
  window: string;
}> = [];

export const builderInitialLegs: BuilderLeg[] = [
  {
    id: 1,
    condition: "ETH ETF net inflow > 200 M USD",
    window: "7",
    confidence: 82
  },
  {
    id: 2,
    condition: "Base TVL change > 15%",
    window: "10",
    confidence: 71
  }
];

export const defaultPathKey: PathKey = "bull";
