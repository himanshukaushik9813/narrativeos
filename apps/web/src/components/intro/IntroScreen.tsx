"use client";

import { useEffect, useState } from "react";

import { BootSequence } from "@/components/intro/BootSequence";

type IntroScreenProps = {
  onComplete: () => void;
};

export function IntroScreen({ onComplete }: IntroScreenProps) {
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const exitTimer = window.setTimeout(() => setExiting(true), 5200);
    const doneTimer = window.setTimeout(onComplete, 6400);

    return () => {
      window.clearTimeout(exitTimer);
      window.clearTimeout(doneTimer);
    };
  }, [onComplete]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" || event.key === "Enter") {
        onComplete();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onComplete]);

  return (
    <section
      aria-label="NarrativeOS boot sequence"
      className="pointer-events-none fixed inset-0 z-[100] cursor-default overflow-hidden bg-black"
      role="presentation"
    >
      <BootSequence exiting={exiting} />
    </section>
  );
}
