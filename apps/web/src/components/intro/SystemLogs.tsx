"use client";

import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";

const logs = [
  "INITIALIZING NARRATIVE ENGINE...",
  "CONNECTING TO ARBITRUM SEPOLIA...",
  "SYNCING MARKET MEMORY...",
  "BOOTING AI AGENTS...",
  "LOADING CAPITAL FLOW GRAPH..."
];

const bootEase: [number, number, number, number] = [0.16, 1, 0.3, 1];

export function SystemLogs() {
  const [visibleLines, setVisibleLines] = useState<string[]>([]);
  const [activeLine, setActiveLine] = useState("");

  const schedule = useMemo(
    () =>
      logs.map((line, lineIndex) => ({
        line,
        start: 1500 + lineIndex * 680
      })),
    []
  );

  useEffect(() => {
    const timers: number[] = [];

    schedule.forEach(({ line, start }, lineIndex) => {
      for (let charIndex = 0; charIndex <= line.length; charIndex += 1) {
        timers.push(
          window.setTimeout(() => {
            setActiveLine(line.slice(0, charIndex));
          }, start + charIndex * 18)
        );
      }

      timers.push(
        window.setTimeout(() => {
          setVisibleLines((current) => [...current, line]);
          setActiveLine("");
        }, start + line.length * 18 + 120)
      );

      if (lineIndex === logs.length - 1) {
        timers.push(
          window.setTimeout(() => {
            setActiveLine("SYSTEM READY");
          }, start + line.length * 18 + 420)
        );
      }
    });

    return () => timers.forEach(window.clearTimeout);
  }, [schedule]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 1.35, duration: 1.1, ease: bootEase }}
      className="mono mx-auto mt-10 w-full max-w-[460px] text-left text-[10px] uppercase tracking-[0.18em] text-[#777] sm:text-xs"
    >
      <div className="rounded-sm border border-[#111] bg-black/35 px-4 py-3 shadow-[0_0_40px_rgba(180,255,90,0.03)] backdrop-blur-sm">
        {visibleLines.map((line) => (
          <p key={line} className="py-1 text-[#777]">
            <span className="text-[#b4ff5a]">›</span> {line}
          </p>
        ))}
        {activeLine ? (
          <p className="py-1 text-[#b4ff5a]">
            <span>›</span> {activeLine}
            <motion.span
              animate={{ opacity: [0, 1, 0] }}
              transition={{ duration: 0.9, repeat: Infinity, ease: "linear" }}
              className="ml-1 inline-block"
            >
              ▌
            </motion.span>
          </p>
        ) : null}
      </div>
    </motion.div>
  );
}
