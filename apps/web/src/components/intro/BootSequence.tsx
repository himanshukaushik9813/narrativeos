"use client";

import { motion } from "framer-motion";

import { LogoReveal } from "@/components/intro/LogoReveal";
import { ParticleNetwork } from "@/components/intro/ParticleNetwork";
import { SystemLogs } from "@/components/intro/SystemLogs";

const bootEase: [number, number, number, number] = [0.16, 1, 0.3, 1];

type BootSequenceProps = {
  exiting: boolean;
};

export function BootSequence({ exiting }: BootSequenceProps) {
  return (
    <motion.div
      initial={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
      animate={
        exiting
          ? { opacity: 0, scale: 0.965, filter: "blur(16px)" }
          : { opacity: 1, scale: 1, filter: "blur(0px)" }
      }
      transition={{ duration: 1.2, ease: bootEase }}
      className="relative min-h-screen overflow-hidden bg-black"
    >
      <ParticleNetwork />
      <Atmosphere />
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.2, ease: bootEase }}
        className="relative z-10 flex min-h-screen flex-col items-center justify-center px-6 text-center"
      >
        <motion.div
          animate={{
            scale: [1, 1.012, 1],
            filter: [
              "drop-shadow(0 0 10px rgba(180,255,90,0.04))",
              "drop-shadow(0 0 42px rgba(180,255,90,0.16))",
              "drop-shadow(0 0 16px rgba(180,255,90,0.08))"
            ]
          }}
          transition={{ delay: 3.7, duration: 2.2, repeat: 1, ease: bootEase }}
        >
          <LogoReveal />
          <SystemLogs />
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

function Atmosphere() {
  return (
    <>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(180,255,90,0.08)_0%,rgba(20,80,10,0.045)_20%,rgba(0,0,0,0.2)_46%,rgba(0,0,0,0.96)_100%)]" />
      <div className="absolute inset-x-0 bottom-[-24%] mx-auto h-[520px] w-[760px] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(180,255,90,0.12)_0%,rgba(20,80,10,0.06)_42%,transparent_72%)] blur-[42px]" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.018)_1px,transparent_1px)] bg-[length:100%_4px] opacity-25" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_44%,transparent_0%,rgba(0,0,0,0.34)_62%,rgba(0,0,0,0.92)_100%)]" />
    </>
  );
}
