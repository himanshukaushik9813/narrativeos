"use client";

import { useCallback, useEffect, useState } from "react";

import { IntroScreen } from "@/components/intro/IntroScreen";
import { MarketTerminal } from "@/components/MarketTerminal";

const BOOT_STORAGE_KEY = "narrativeos.booted";

export function MainExperience() {
  const [bootComplete, setBootComplete] = useState(false);

  const completeBoot = useCallback(() => {
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(BOOT_STORAGE_KEY, "true");
    }

    setBootComplete(true);
  }, []);

  useEffect(() => {
    if (bootComplete) {
      return;
    }

    if (window.sessionStorage.getItem(BOOT_STORAGE_KEY) === "true") {
      setBootComplete(true);
      return;
    }

    const fallbackTimer = window.setTimeout(completeBoot, 7000);

    return () => window.clearTimeout(fallbackTimer);
  }, [bootComplete, completeBoot]);

  return (
    <>
      {!bootComplete ? <IntroScreen onComplete={completeBoot} /> : null}
      <MarketTerminal />
    </>
  );
}
