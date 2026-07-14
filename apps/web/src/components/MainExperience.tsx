"use client";

import { useCallback, useEffect, useState } from "react";

import { IntroScreen } from "@/components/intro/IntroScreen";
import { MarketTerminal } from "@/components/MarketTerminal";

const BOOT_STORAGE_KEY = "narrativeos.booted";

export function MainExperience() {
  const [hasMounted, setHasMounted] = useState(false);
  const [showBoot, setShowBoot] = useState(false);

  const completeBoot = useCallback(() => {
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(BOOT_STORAGE_KEY, "true");
    }

    setShowBoot(false);
  }, []);

  useEffect(() => {
    setHasMounted(true);
    if (window.sessionStorage.getItem(BOOT_STORAGE_KEY) !== "true") {
      setShowBoot(true);
    }
  }, []);

  useEffect(() => {
    if (!showBoot) {
      return;
    }

    const fallbackTimer = window.setTimeout(completeBoot, 7000);

    return () => window.clearTimeout(fallbackTimer);
  }, [showBoot, completeBoot]);

  return (
    <>
      <MarketTerminal />
      {hasMounted && showBoot ? <IntroScreen onComplete={completeBoot} /> : null}
    </>
  );
}
