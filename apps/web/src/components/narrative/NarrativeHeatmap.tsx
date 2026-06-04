"use client";

import { motion } from "framer-motion";
import CountUp from "react-countup";

import { sectorScores } from "@/lib/mockData";

export function NarrativeHeatmap() {
  return (
    <section>
      <div className="mono mb-4 text-[10px] uppercase tracking-widest text-[#444]">
        SOSOVALUE SECTOR HEATMAP
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {sectorScores.map((sector) => {
          const positive = sector.change >= 0;
          const strong = sector.score >= 65;
          const state = positive
            ? strong
              ? {
                  background: "rgba(20,80,10,0.15)",
                  borderColor: "rgba(180,255,90,0.3)"
                }
              : {
                  background: "rgba(10,40,20,0.1)",
                  borderColor: "rgba(34,221,136,0.2)"
                }
            : {
                background: "rgba(40,10,15,0.1)",
                borderColor: "rgba(255,34,68,0.2)"
              };

          return (
            <motion.div
              key={sector.id ?? sector.sector}
              whileHover={{ scale: 1.03, borderColor: positive ? "rgba(180,255,90,0.5)" : "rgba(255,34,68,0.35)" }}
              className="rounded-sm border p-3"
              style={state}
            >
              <div className="mono flex items-center justify-between text-[10px] uppercase tracking-widest text-[#666]">
                <span>▲ {sector.label ?? sector.sector}</span>
                <span className="text-[#b4ff5a]">
                  <CountUp end={sector.score} duration={1.1} />
                </span>
              </div>
              <div className={`mono mt-3 text-lg ${positive ? "text-[#b4ff5a]" : "text-[#ff4444]"}`}>
                {positive ? "+" : ""}
                <CountUp end={sector.change} duration={1.1} decimals={1} />%
              </div>
              <div className="mt-4 flex items-center gap-3">
                <div className="h-1 flex-1 bg-[#111]">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${sector.momentum * 100}%` }}
                    transition={{ duration: 0.8 }}
                    className={positive ? "h-1 bg-[#b4ff5a]" : "h-1 bg-[#ff2244]"}
                  />
                </div>
                <span className="mono text-[10px] text-[#555]">{Math.round(sector.momentum * 100)}%</span>
              </div>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
