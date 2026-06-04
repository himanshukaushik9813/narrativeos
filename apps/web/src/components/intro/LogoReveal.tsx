"use client";

import { motion } from "framer-motion";

const bootEase: [number, number, number, number] = [0.16, 1, 0.3, 1];

export function LogoReveal() {
  return (
    <div className="text-center">
      <motion.h1
        initial={{ opacity: 0, scale: 0.96, filter: "blur(10px)" }}
        animate={{
          opacity: 1,
          scale: [0.96, 1, 1.012, 1],
          filter: "blur(0px)",
          textShadow: [
            "0 0 0 rgba(180,255,90,0)",
            "0 0 28px rgba(180,255,90,0.22)",
            "0 0 42px rgba(180,255,90,0.36)",
            "0 0 24px rgba(180,255,90,0.18)"
          ]
        }}
        transition={{ duration: 4.4, ease: bootEase, times: [0, 0.42, 0.74, 1] }}
        className="mono text-4xl font-bold uppercase tracking-[0.38em] text-[#f0f0f0] sm:text-6xl"
      >
        NARRATIVEOS
      </motion.h1>
      <motion.p
        initial={{ opacity: 0, y: 8, filter: "blur(6px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        transition={{ delay: 0.4, duration: 1.4, ease: bootEase }}
        className="mono mx-auto mt-5 max-w-[520px] text-[10px] uppercase tracking-[0.22em] text-[#555] sm:text-xs"
      >
        AI-powered path intelligence for on-chain markets
      </motion.p>
    </div>
  );
}
