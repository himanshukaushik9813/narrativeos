"use client";

import { motion } from "framer-motion";

const features = [
  {
    id: "01",
    label: "PREDICT",
    title: "Predict the path, not just the price.",
    body:
      "AI generates possible futures. You pick the one you believe - or draw your own."
  },
  {
    id: "02",
    label: "SCORE",
    title: "Accuracy pays.",
    body:
      "Paths are scored continuously against reality. The closer your prediction tracks what actually happens, the more you earn."
  },
  {
    id: "03",
    label: "EDGE",
    title: "Beat the AI, keep the edge.",
    body:
      "Think you see something the models do not? Draw your own path. If you are right and the crowd is wrong, you earn more per dollar than anyone else."
  }
];

export function FeaturePanel() {
  return (
    <motion.aside
      initial="hidden"
      animate="visible"
      variants={{ visible: { transition: { staggerChildren: 0.15 } } }}
      className="hidden w-[270px] shrink-0 flex-col gap-5 xl:flex"
    >
      {features.map((feature, index) => (
        <motion.div
          key={feature.id}
          variants={{
            hidden: { opacity: 0, x: 20 },
            visible: { opacity: 1, x: 0, transition: { duration: 0.4 } }
          }}
          className={`rounded-sm border border-[#1a1a1a] bg-[#080808]/80 p-4 ${
            index === 0 ? "border-l-2 border-l-[#b4ff5a]" : ""
          }`}
        >
          <div className="mono text-[9px] uppercase tracking-widest text-[#b4ff5a]">
            {feature.id} - {feature.label}
          </div>
          <div className="my-2 h-px w-full bg-[#1a1a1a]" />
          <h2 className="text-sm font-semibold text-white">{feature.title}</h2>
          <p className="mt-3 text-[11px] leading-relaxed text-[#555]">{feature.body}</p>
        </motion.div>
      ))}
    </motion.aside>
  );
}
