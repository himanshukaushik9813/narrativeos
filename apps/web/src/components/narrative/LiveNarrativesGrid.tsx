"use client";

import { useEffect, useState } from "react";

import { NarrativeCard } from "@/components/narrative/NarrativeCard";
import { fetchTopNarratives, toApiError } from "@/lib/narrativeApi";
import type { IntelligenceError, NarrativeTheme, NarrativeTrend } from "@/lib/types";

type LoadState = "loading" | "ready" | "error";

export function LiveNarrativesGrid() {
  const [state, setState] = useState<LoadState>("loading");
  const [themes, setThemes] = useState<NarrativeTheme[]>([]);
  const [error, setError] = useState<IntelligenceError | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      setState("loading");
      setError(null);
      try {
        const response = await fetchTopNarratives(controller.signal);
        setThemes(response.narratives);
        setState("ready");
      } catch (caught) {
        if (controller.signal.aborted) {
          return;
        }
        const apiError = toApiError(caught);
        setError({
          message: apiError.message,
          status: apiError.status,
          missing: apiError.missing
        });
        setState("error");
      }
    }

    void load();

    return () => controller.abort();
  }, []);

  if (state === "loading") {
    return (
      <section className="mt-8 grid gap-3 lg:grid-cols-3">
        {[0, 1, 2].map((item) => (
          <div key={item} className="h-[292px] animate-pulse rounded-sm border border-[#151515] bg-[#070707]" />
        ))}
      </section>
    );
  }

  if (state === "error") {
    return (
      <section className="mt-8 rounded-sm border border-[#2a1717] bg-[#100606] p-5">
        <div className="mono text-[10px] uppercase tracking-widest text-[#ff8888]">
          Live SoSoValue narratives unavailable
        </div>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[#888]">
          {error?.message ?? "The API could not return live narrative evidence. The app will not fabricate narrative cards."}
        </p>
      </section>
    );
  }

  return (
    <section className="mt-8 grid gap-3 lg:grid-cols-3">
      {themes.map((theme) => (
        <NarrativeCard key={theme.id} trend={toTrend(theme)} />
      ))}
    </section>
  );
}

function toTrend(theme: NarrativeTheme): NarrativeTrend & { sourceThemeId: string } {
  const evidenceSignals = theme.evidence.slice(0, 3).map((item) => {
    const value = item.value ? ` ${item.value}` : "";
    return `${item.label}${value}`;
  });

  return {
    sourceThemeId: theme.id,
    title: theme.title,
    score: theme.confidence,
    body: theme.summary,
    signals: evidenceSignals.length ? evidenceSignals : ["Live SoSoValue evidence attached"],
    match: `Live SoSoValue evidence (${theme.evidence.length} sources)`,
    risk: riskLabel(theme.risk)
  };
}

function riskLabel(risk: number): "LOW" | "MED" | "HIGH" {
  if (risk < 36) {
    return "LOW";
  }
  if (risk < 68) {
    return "MED";
  }
  return "HIGH";
}
