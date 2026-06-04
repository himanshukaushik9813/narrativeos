"use client";

import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import type { ReactNode } from "react";

const terminalEase: [number, number, number, number] = [0.16, 1, 0.3, 1];

export function FloatingTerminal({ children }: { children: ReactNode }) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useSpring(useTransform(y, [-300, 300], [6, -6]), {
    stiffness: 100,
    damping: 30
  });
  const rotateY = useSpring(useTransform(x, [-500, 500], [-8, 8]), {
    stiffness: 100,
    damping: 30
  });

  return (
    <motion.div
      style={{ perspective: 1200, rotateX, rotateY, transformStyle: "preserve-3d" }}
      onMouseMove={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        x.set(event.clientX - rect.left - rect.width / 2);
        y.set(event.clientY - rect.top - rect.height / 2);
      }}
      onMouseLeave={() => {
        x.set(0);
        y.set(0);
      }}
      initial={{ opacity: 0, y: 40, rotateX: 8 }}
      animate={{ opacity: 1, y: 0, rotateX: 0 }}
      transition={{ duration: 1, ease: terminalEase }}
      className="w-full"
    >
      <div
        className="rounded-sm"
        style={{
          background: "rgba(8,8,8,0.95)",
          border: "1px solid #1e1e1e",
          backdropFilter: "blur(20px)",
          boxShadow:
            "0 0 80px rgba(0,0,0,0.8), 0 0 40px rgba(180,255,90,0.04), inset 0 1px 0 rgba(255,255,255,0.03)",
          transformStyle: "preserve-3d"
        }}
      >
        {children}
      </div>
    </motion.div>
  );
}
