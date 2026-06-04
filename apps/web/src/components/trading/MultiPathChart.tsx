"use client";

import { motion } from "framer-motion";
import { AlertTriangle, Loader2, RefreshCw } from "lucide-react";
import { useMemo, type CSSProperties } from "react";
import {
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

import { formatCompactUsd } from "@/lib/chartUtils";
import { cn } from "@/lib/cn";
import type { ChartDataPoint, IntelligenceError, MarketChartResponse, PathKey } from "@/lib/types";

const forecastPaths: Array<{
  key: PathKey;
  dataKey: keyof ChartDataPoint;
  label: string;
  color: string;
  signal: "HIGH" | "MED" | "LOW";
}> = [
  { key: "gigaBull", dataKey: "gigaBull", label: "Upper Break", color: "#ff4fd8", signal: "HIGH" },
  { key: "bull", dataKey: "bull", label: "Bull Drift", color: "#23a8ff", signal: "HIGH" },
  { key: "mild", dataKey: "mild", label: "Mean Path", color: "#d9c931", signal: "MED" },
  { key: "bear", dataKey: "bear", label: "Risk Fade", color: "#78bd3a", signal: "MED" },
  { key: "megaBear", dataKey: "megaBear", label: "Stress Path", color: "#7b61ff", signal: "LOW" },
  { key: "custom", dataKey: "custom", label: "Custom", color: "#b86cff", signal: "MED" }
];

export function MultiPathChart({
  chart,
  isLoading,
  error,
  selectedPath,
  timeframe,
  onTimeframeChange,
  onRefresh
}: {
  chart: MarketChartResponse | null;
  isLoading: boolean;
  error: IntelligenceError | null;
  selectedPath: PathKey;
  timeframe: string;
  onTimeframeChange: (timeframe: string) => void;
  onRefresh: () => void;
}) {
  void timeframe;
  void onTimeframeChange;

  const selectedMeta = forecastPaths.find((path) => path.key === selectedPath) ?? forecastPaths[1];
  const values = useMemo(() => collectValues(chart?.data ?? []), [chart]);
  const domain = useMemo(() => paddedDomain(values), [values]);
  const startPoint = useMemo(() => startPointStyle(chart, domain), [chart, domain]);

  return (
    <motion.div
      whileHover={{ rotateX: 0.7, rotateY: -0.7, y: -1 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      className="soso-forecast-chart relative isolate overflow-hidden rounded-[18px] border border-[#2a2a2a] bg-black px-3 py-3"
      style={
        {
          perspective: 1200,
          "--selected-path-color": selectedMeta.color
        } as CSSProperties
      }
    >
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.018)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.014)_1px,transparent_1px)] bg-[length:100%_33px,18px_100%]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_55%_48%,rgba(255,255,255,0.025),transparent_34%)]" />

      {chart ? (
        <div className="pointer-events-none absolute left-0 right-0 top-6 z-20 flex justify-between px-[34%]">
          <span className="mono text-[8px] uppercase tracking-[0.22em] text-[#7a7a7a]">[ START ]</span>
          <span className="mono text-[8px] uppercase tracking-[0.22em] text-[#7a7a7a]">[ ENDS ]</span>
        </div>
      ) : null}

      <div className="relative z-10 h-[296px] w-full">
        {chart ? (
          <>
            <StartMarker style={startPoint} />
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chart.data} margin={{ top: 26, right: 28, left: 0, bottom: 8 }}>
                <CartesianGrid
                  stroke="rgba(255,255,255,0.06)"
                  strokeDasharray="1 0"
                  vertical
                  horizontal
                />
                <XAxis
                  dataKey="t"
                  minTickGap={34}
                  tick={{ fill: "#777", fontSize: 8, fontFamily: "Space Mono" }}
                  axisLine={false}
                  tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  orientation="right"
                  domain={domain}
                  tick={{ fill: "#777", fontSize: 8, fontFamily: "Space Mono" }}
                  axisLine={false}
                  tickLine={false}
                  width={50}
                  tickFormatter={(value) => compactAxis(Number(value))}
                />
                <Tooltip
                  content={<ChartTooltip chart={chart} selectedPath={selectedPath} />}
                  cursor={{ stroke: "#ffffff", strokeOpacity: 0.18, strokeWidth: 1, strokeDasharray: "2 5" }}
                  wrapperStyle={{ outline: "none" }}
                />
                <Line
                  type="monotone"
                  dataKey="actual"
                  stroke="#f1f1f1"
                  strokeWidth={2}
                  dot={false}
                  connectNulls={false}
                  className="soso-actual-line"
                  isAnimationActive
                  animationBegin={120}
                  animationDuration={1800}
                />
                {forecastPaths.map((path, index) => {
                  const selected = selectedPath === path.key;
                  const confidence = chart.pathConfidence[path.key] ?? 55;
                  return (
                    <Line
                      key={path.key}
                      type="monotone"
                      dataKey={path.dataKey}
                      stroke={path.color}
                      strokeWidth={selected ? 1.7 : 1.05}
                      strokeDasharray="4 4"
                      dot={false}
                      connectNulls={false}
                      opacity={selected ? 0.96 : 0.42 + (confidence / 100) * 0.24}
                      className={cn("soso-projection-line", selected && "soso-projection-line-active")}
                      style={
                        {
                          "--path-color": path.color,
                          "--path-delay": `${index * -0.8}s`,
                          "--path-duration": `${12 + index * 1.2}s`
                        } as CSSProperties
                      }
                      isAnimationActive
                      animationBegin={620 + index * 60}
                      animationDuration={1500}
                    />
                  );
                })}
                <ReferenceLine
                  x="START"
                  stroke="rgba(255,255,255,0.25)"
                  strokeDasharray="2 4"
                  className="soso-start-reference"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </>
        ) : (
          <ChartState isLoading={isLoading} error={error} onRefresh={onRefresh} />
        )}
      </div>
    </motion.div>
  );
}

function ChartTooltip({
  active,
  payload,
  label,
  chart,
  selectedPath
}: {
  active?: boolean;
  payload?: Array<{ value?: number | string; dataKey?: string | number }>;
  label?: string;
  chart: MarketChartResponse;
  selectedPath: PathKey;
}) {
  if (!active || !payload?.length) {
    return null;
  }

  const selected = forecastPaths.find((path) => path.key === selectedPath) ?? forecastPaths[1];
  const row =
    payload.find((item) => item.dataKey === selected.dataKey && typeof item.value === "number") ??
    payload.find((item) => item.dataKey === "actual" && typeof item.value === "number") ??
    payload.find((item) => typeof item.value === "number");

  if (!row || typeof row.value !== "number") {
    return null;
  }

  const meta = forecastPaths.find((path) => path.dataKey === row.dataKey) ?? selected;
  const isActual = row.dataKey === "actual";

  return (
    <div className="mono min-w-[245px] rounded-sm border border-white/15 bg-black/90 px-4 py-3 text-[10px] uppercase tracking-[0.14em] text-[#777] shadow-[0_0_36px_rgba(255,255,255,0.08)] backdrop-blur-xl">
      <div className="mb-3 flex items-center justify-between border-b border-[#1a1a1a] pb-2">
        <span className="text-white">{chart.symbol}</span>
        <span className="text-[#b4ff5a]">{label}</span>
      </div>
      <TooltipRow label={chart.metric} value={formatCompactUsd(Number(row.value))} hot />
      <TooltipRow label="Source" value={isActual ? "SoSoValue" : "NarrativeOS"} />
      <TooltipRow label="Path" value={isActual ? "Historical" : meta.label} />
      <TooltipRow
        label="Confidence"
        value={isActual ? "Observed" : `${chart.pathConfidence[meta.key] ?? 55}%`}
      />
      <TooltipRow label="Signal" value={isActual ? "LIVE" : meta.signal} />
    </div>
  );
}

function TooltipRow({ label, value, hot = false }: { label: string; value: string; hot?: boolean }) {
  return (
    <div className="mt-2 flex items-center justify-between gap-5">
      <span className="text-[#444]">{label}</span>
      <span className={hot ? "text-white" : "text-[#b4ff5a]"}>{value}</span>
    </div>
  );
}

function ChartState({
  isLoading,
  error,
  onRefresh
}: {
  isLoading: boolean;
  error: IntelligenceError | null;
  onRefresh: () => void;
}) {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="mono max-w-sm text-center text-[10px] uppercase tracking-widest text-[#666]">
        {isLoading ? (
          <>
            <Loader2 className="mx-auto mb-3 size-5 animate-spin text-[#b4ff5a]" aria-hidden />
            Loading SoSoValue ETF history...
          </>
        ) : (
          <>
            <AlertTriangle className="mx-auto mb-3 size-5 text-[#ff7744]" aria-hidden />
            <p>{error?.message ?? "SoSoValue chart feed is not available."}</p>
            <button
              type="button"
              onClick={onRefresh}
              className="mt-4 inline-flex items-center gap-2 rounded-sm border border-[#333] px-3 py-2 text-[#b4ff5a] hover:border-[#b4ff5a]"
            >
              <RefreshCw className="size-3" aria-hidden />
              Retry live chart
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function StartMarker({ style }: { style: CSSProperties }) {
  return (
    <div className="pointer-events-none absolute z-20" style={style}>
      <span className="absolute left-1/2 top-1/2 size-[7px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-[0_0_12px_rgba(255,255,255,0.85)]" />
      <span className="absolute left-1/2 top-1/2 size-5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/25" />
    </div>
  );
}

function collectValues(data: ChartDataPoint[]) {
  return data.flatMap((point) =>
    ["actual", "gigaBull", "bull", "mild", "bear", "megaBear", "custom"]
      .map((key) => point[key as keyof ChartDataPoint])
      .filter((value): value is number => typeof value === "number")
  );
}

function paddedDomain(values: number[]): [number, number] {
  if (!values.length) {
    return [0, 1];
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  const padding = Math.max((max - min) * 0.1, max * 0.006);
  return [min - padding, max + padding];
}

function startPointStyle(chart: MarketChartResponse | null, domain: [number, number]): CSSProperties {
  if (!chart?.data.length) {
    return { left: "50%", top: "50%" };
  }
  const point = chart.data[chart.startIndex];
  const value = point?.actual ?? point?.bull ?? chart.latestValue;
  const left = (chart.startIndex / Math.max(1, chart.data.length - 1)) * 100;
  const top = 100 - ((value - domain[0]) / Math.max(1, domain[1] - domain[0])) * 100;
  return {
    left: `calc(${left}% - 6px)`,
    top: `calc(${Math.max(10, Math.min(90, top))}% + 2px)`
  };
}

function compactAxis(value: number) {
  if (Math.abs(value) >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(0)}B`;
  }
  if (Math.abs(value) >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(0)}M`;
  }
  if (Math.abs(value) >= 1_000) {
    return `${(value / 1_000).toFixed(0)}K`;
  }
  return `${value.toFixed(0)}`;
}
