"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";

import { signalFeed } from "@/lib/mockData";
import type { SignalItem } from "@/lib/types";

export function SignalFeed() {
  const [items, setItems] = useState<SignalItem[]>(signalFeed);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setItems((current) => {
        const next = signalFeed[current.length % signalFeed.length];
        return [{ ...next, time: "now" }, ...current].slice(0, 6);
      });
    }, 8000);

    return () => window.clearInterval(interval);
  }, []);

  return (
    <section className="border-t border-[#141414] p-5">
      <div className="label label-active">SIGNALS</div>
      <div className="mt-3 h-px bg-[#1a1a1a]" />
      <div>
        {items.map((signal, index) => (
          <motion.div
            key={`${signal.author}-${signal.time}-${index}`}
            initial={{ y: 15, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.22 }}
            className="grid grid-cols-[90px_1fr] gap-4 border-b border-[#0f0f0f] py-3"
          >
            <div className="mono text-xs">
              {signal.type === "ai" ? (
                <span className="text-[#b4ff5a]">● {signal.author}</span>
              ) : signal.type === "whale" ? (
                <span className="text-[#ff9944]">● {signal.author}</span>
              ) : (
                <span className="text-[#444]">○ {signal.author}</span>
              )}
              <div className="mt-1 text-[10px] text-[#333]">{signal.time}</div>
            </div>
            <p className="text-[11px] leading-5 text-[#555]">{signal.content}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
