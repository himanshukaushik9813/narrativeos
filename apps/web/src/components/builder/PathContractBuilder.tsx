"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  Archive,
  Bot,
  Check,
  Copy,
  FileCode2,
  GripVertical,
  Loader2,
  Network,
  Plus,
  RefreshCw,
  Save,
  Search,
  Send,
  ShieldCheck,
  Shuffle,
  Trash2,
  Wand2
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";

import { cn } from "@/lib/cn";
import {
  archiveStoredContract,
  contractStates,
  conditionLibrary,
  contractFromPathDraft,
  contractFromPrompt,
  contractFromSeed,
  contractStructures,
  engineContractToPathContract,
  legFromLibrary,
  listStoredContracts,
  saveStoredContract,
  simulateContract
} from "@/lib/pathContracts";
import {
  draftPathContract,
  fetchMarketChart,
  fetchTopNarratives,
  publishPathContract,
  toApiError
} from "@/lib/narrativeApi";
import type {
  ConditionLibraryItem,
  EngineContract,
  EngineContractStatus,
  EngineLeg,
  IntelligenceError,
  MarketChartResponse,
  NarrativeTheme
} from "@/lib/types";

type LoadState = "loading" | "ready" | "error";

export function PathContractBuilder() {
  const searchParams = useSearchParams();
  const themeId = searchParams.get("themeId");
  const seedTitle = searchParams.get("title");
  const seedScore = Number(searchParams.get("score") ?? 0);
  const source = searchParams.get("source");

  const [contract, setContract] = useState<EngineContract | null>(null);
  const [narratives, setNarratives] = useState<NarrativeTheme[]>([]);
  const [marketChart, setMarketChart] = useState<MarketChartResponse | null>(null);
  const [storedContracts, setStoredContracts] = useState<EngineContract[]>([]);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [error, setError] = useState<IntelligenceError | null>(null);
  const [liveSourceError, setLiveSourceError] = useState<IntelligenceError | null>(null);
  const [isLoadingSources, setIsLoadingSources] = useState(false);
  const [selectedLegId, setSelectedLegId] = useState<string | null>(null);
  const [libraryQuery, setLibraryQuery] = useState("");
  const [aiPrompt, setAiPrompt] = useState("Create a bullish Ethereum ecosystem thesis");
  const [isSimulating, setIsSimulating] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [success, setSuccess] = useState<EngineContract | null>(null);
  const [draggedLegId, setDraggedLegId] = useState<string | null>(null);

  const selectedLeg = contract?.legs.find((leg) => leg.id === selectedLegId) ?? contract?.legs[0] ?? null;

  const refreshStoredContracts = useCallback(() => {
    setStoredContracts(listStoredContracts());
  }, []);

  const loadEngine = useCallback(
    async (signal?: AbortSignal) => {
      setLoadState("loading");
      setError(null);
      setLiveSourceError(null);
      try {
        let chart: MarketChartResponse | null = null;
        const chartResult = await Promise.allSettled([fetchMarketChart(signal)]);

        if (chartResult[0].status === "fulfilled") {
          chart = chartResult[0].value;
          setMarketChart(chartResult[0].value);
        } else {
          const apiError = toApiError(chartResult[0].reason);
          setLiveSourceError({
            message: apiError.message,
            status: apiError.status,
            missing: apiError.missing
          });
        }

        if (themeId) {
          try {
            const narrativeResponse = await fetchTopNarratives(signal);
            setNarratives(narrativeResponse.narratives);
            const theme = narrativeResponse.narratives.find((item) => item.id === themeId) ?? narrativeResponse.narratives[0];
            const draft = await draftPathContract({
              themeId: theme.id,
              stakeAmount: "0.000001",
              signal
            });
            const generated = contractFromPathDraft(draft, theme);
            generated.simulation = simulateContract(generated.legs, generated.confidence, chart);
            setContract(generated);
            setSelectedLegId(generated.legs[0]?.id ?? null);
          } catch (caught) {
            const apiError = toApiError(caught);
            setLiveSourceError({
              message: apiError.message,
              status: apiError.status,
              missing: apiError.missing
            });
            const fallback = contractFromSeed({
              title: "Custom Narrative Path",
              narrativeTitle: "Custom Narrative",
              description: "Live narrative generation is unavailable, so this custom path remains editable and publishable with supported SoSoValue evidence sources."
            });
            fallback.simulation = simulateContract(fallback.legs, fallback.confidence, chart);
            setContract(fallback);
            setSelectedLegId(fallback.legs[0]?.id ?? null);
          }
        } else if (seedTitle) {
          const seeded = contractFromSeed({
            source: source === "feed" ? "signal" : "custom",
            title: seedTitle,
            narrativeTitle: seedTitle,
            confidence: seedScore || 68,
            narrativeScore: seedScore || 68,
            historicalMatch: Math.min(92, Math.max(58, (seedScore || 68) + 8))
          });
          seeded.simulation = simulateContract(seeded.legs, seeded.confidence, chart);
          setContract(seeded);
          setSelectedLegId(seeded.legs[0]?.id ?? null);
        } else {
          const custom = contractFromSeed();
          custom.simulation = simulateContract(custom.legs, custom.confidence, chart);
          setContract(custom);
          setSelectedLegId(custom.legs[0]?.id ?? null);
        }
        setLoadState("ready");
      } catch (caught) {
        if (signal?.aborted) {
          return;
        }
        const apiError = toApiError(caught);
        setError({
          message: apiError.message,
          status: apiError.status,
          missing: apiError.missing
        });
        setLoadState("error");
      }
    },
    [seedScore, seedTitle, source, themeId]
  );

  useEffect(() => {
    const controller = new AbortController();
    refreshStoredContracts();
    void loadEngine(controller.signal);
    const onStorage = () => refreshStoredContracts();
    window.addEventListener("storage", onStorage);
    window.addEventListener("narrativeos-contracts-updated", onStorage);
    return () => {
      controller.abort();
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("narrativeos-contracts-updated", onStorage);
    };
  }, [loadEngine, refreshStoredContracts]);

  const filteredLibrary = useMemo(() => {
    const query = libraryQuery.toLowerCase().trim();
    if (!query) {
      return conditionLibrary;
    }
    return conditionLibrary.filter((item) =>
      [item.category, item.label, item.metricSource, item.note].some((value) =>
        value.toLowerCase().includes(query)
      )
    );
  }, [libraryQuery]);

  const loadLiveSources = useCallback(async () => {
    if (isLoadingSources || narratives.length) {
      return;
    }
    setIsLoadingSources(true);
    setLiveSourceError(null);
    try {
      const response = await fetchTopNarratives();
      setNarratives(response.narratives);
    } catch (caught) {
      const apiError = toApiError(caught);
      setLiveSourceError({
        message: apiError.message,
        status: apiError.status,
        missing: apiError.missing
      });
    } finally {
      setIsLoadingSources(false);
    }
  }, [isLoadingSources, narratives.length]);

  function updateContract(update: Partial<EngineContract>) {
    setContract((current) => {
      if (!current) {
        return current;
      }
      const next = {
        ...current,
        ...update,
        updatedAt: new Date().toISOString()
      };
      next.simulation = simulateContract(next.legs, next.confidence, marketChart);
      return next;
    });
  }

  function updateLeg(id: string, update: Partial<EngineLeg>) {
    setContract((current) => {
      if (!current) {
        return current;
      }
      const nextLegs = current.legs.map((leg) => (leg.id === id ? { ...leg, ...update } : leg));
      return {
        ...current,
        legs: nextLegs,
        failureConditions: nextLegs.map(
          (leg) => `${leg.condition} fails to satisfy ${leg.comparator} ${leg.threshold} within ${leg.window}.`
        ),
        simulation: simulateContract(nextLegs, current.confidence, marketChart),
        updatedAt: new Date().toISOString()
      };
    });
  }

  function addLeg(item?: ConditionLibraryItem) {
    if (item && !item.supported) {
      return;
    }
    const nextLeg = item
      ? legFromLibrary(item)
      : legFromLibrary(conditionLibrary.find((libraryItem) => libraryItem.supported) ?? conditionLibrary[0]);
    setContract((current) => {
      if (!current) {
        return current;
      }
      const nextLegs = [...current.legs, nextLeg];
      setSelectedLegId(nextLeg.id);
      return {
        ...current,
        legs: nextLegs,
        simulation: simulateContract(nextLegs, current.confidence, marketChart),
        updatedAt: new Date().toISOString()
      };
    });
  }

  function duplicateLeg(id: string) {
    setContract((current) => {
      if (!current) {
        return current;
      }
      const index = current.legs.findIndex((leg) => leg.id === id);
      if (index < 0) {
        return current;
      }
      const duplicate = { ...current.legs[index], id: `${current.legs[index].id}-copy-${Date.now()}` };
      const nextLegs = [...current.legs.slice(0, index + 1), duplicate, ...current.legs.slice(index + 1)];
      setSelectedLegId(duplicate.id);
      return {
        ...current,
        legs: nextLegs,
        simulation: simulateContract(nextLegs, current.confidence, marketChart),
        updatedAt: new Date().toISOString()
      };
    });
  }

  function deleteLeg(id: string) {
    setContract((current) => {
      if (!current || current.legs.length <= 1) {
        return current;
      }
      const nextLegs = current.legs.filter((leg) => leg.id !== id);
      setSelectedLegId(nextLegs[0]?.id ?? null);
      return {
        ...current,
        legs: nextLegs,
        simulation: simulateContract(nextLegs, current.confidence, marketChart),
        updatedAt: new Date().toISOString()
      };
    });
  }

  function reorderLeg(sourceId: string, targetId: string) {
    setContract((current) => {
      if (!current || sourceId === targetId) {
        return current;
      }
      const sourceIndex = current.legs.findIndex((leg) => leg.id === sourceId);
      const targetIndex = current.legs.findIndex((leg) => leg.id === targetId);
      if (sourceIndex < 0 || targetIndex < 0) {
        return current;
      }
      const nextLegs = [...current.legs];
      const [moved] = nextLegs.splice(sourceIndex, 1);
      nextLegs.splice(targetIndex, 0, moved);
      return {
        ...current,
        legs: nextLegs,
        simulation: simulateContract(nextLegs, current.confidence, marketChart),
        updatedAt: new Date().toISOString()
      };
    });
  }

  function saveDraft() {
    if (!contract) {
      return;
    }
    const next = { ...contract, status: "Draft" as const, updatedAt: new Date().toISOString() };
    saveStoredContract(next);
    setContract(next);
    setSuccess(next);
  }

  async function publishContract() {
    if (!contract) {
      return;
    }
    setIsPublishing(true);
    setError(null);
    try {
      const pathContract = engineContractToPathContract(contract);
      const published = await publishPathContract({
        contract: pathContract,
        relay: true
      });
      const next: EngineContract = {
        ...contract,
        id: contract.id.startsWith("PC-") ? contract.id : published.id,
        status: "Published",
        txHash: published.txHash,
        onchainPathId: published.onchainPathId,
        marketAddress: published.marketAddress,
        termsHash: published.termsHash,
        updatedAt: new Date().toISOString()
      };
      saveStoredContract(next);
      setContract(next);
      setSuccess(next);
    } catch (caught) {
      const apiError = toApiError(caught);
      setError({
        message: apiError.message,
        status: apiError.status,
        missing: apiError.missing
      });
    } finally {
      setIsPublishing(false);
    }
  }

  function runSimulation() {
    if (!contract) {
      return;
    }
    setIsSimulating(true);
    window.setTimeout(() => {
      updateContract({
        simulation: simulateContract(contract.legs, contract.confidence, marketChart)
      });
      setIsSimulating(false);
    }, 650);
  }

  function generateWithAi() {
    const generated = contractFromPrompt(aiPrompt);
    generated.simulation = simulateContract(generated.legs, generated.confidence, marketChart);
    setContract(generated);
    setSelectedLegId(generated.legs[0]?.id ?? null);
  }

  if (loadState === "loading" || !contract) {
    return <EngineShellState label="Loading live SoSoValue contract engine" />;
  }

  if (loadState === "error") {
    return (
      <EngineShellState
        label={error?.message ?? "Contract engine failed to load"}
        actionLabel="Retry"
        onAction={() => void loadEngine()}
      />
    );
  }

  return (
    <section className="relative -mx-4 -mt-6 min-h-[calc(100vh-72px)] overflow-hidden bg-black px-4 pb-8 pt-2">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(180,255,90,0.11),transparent_45%)]" />
      <EngineHeader
        contract={contract}
        isPublishing={isPublishing}
        isSimulating={isSimulating}
        onCustom={() => {
          const custom = contractFromSeed();
          custom.simulation = simulateContract(custom.legs, custom.confidence, marketChart);
          setContract(custom);
          setSelectedLegId(custom.legs[0]?.id ?? null);
        }}
        onSave={saveDraft}
        onPublish={() => void publishContract()}
        onSimulate={runSimulation}
      />

      <div className="relative z-10 mx-auto grid max-w-[1440px] gap-5 xl:grid-cols-[minmax(0,1fr)_390px]">
        <main className="space-y-5">
          <ContractEditor
            contract={contract}
            selectedLegId={selectedLegId}
            draggedLegId={draggedLegId}
            onSelectLeg={setSelectedLegId}
            onContractChange={updateContract}
            onLegChange={updateLeg}
            onAddLeg={() => addLeg()}
            onDuplicateLeg={duplicateLeg}
            onDeleteLeg={deleteLeg}
            onDragStart={setDraggedLegId}
            onDragEnd={() => setDraggedLegId(null)}
            onDropLeg={(targetId) => {
              if (draggedLegId) {
                reorderLeg(draggedLegId, targetId);
              }
              setDraggedLegId(null);
            }}
          />
          <IntelligenceDock
            narratives={narratives}
            activeThemeId={contract.sourceThemeId}
            prompt={aiPrompt}
            onPromptChange={setAiPrompt}
            onGenerate={generateWithAi}
            query={libraryQuery}
            onQueryChange={setLibraryQuery}
            items={filteredLibrary}
            onAdd={addLeg}
            liveSourceError={liveSourceError}
            isLoadingSources={isLoadingSources}
            onLoadSources={loadLiveSources}
            onGenerateFromTheme={async (theme) => {
              try {
                const draft = await draftPathContract({ themeId: theme.id, stakeAmount: contract.stakeAmount });
                const generated = contractFromPathDraft(draft, theme);
                generated.simulation = simulateContract(generated.legs, generated.confidence, marketChart);
                setContract(generated);
                setSelectedLegId(generated.legs[0]?.id ?? null);
              } catch (caught) {
                const apiError = toApiError(caught);
                setLiveSourceError({
                  message: apiError.message,
                  status: apiError.status,
                  missing: apiError.missing
                });
              }
            }}
          />
        </main>

        <aside className="space-y-4 xl:sticky xl:top-24 xl:self-start">
          <ExecutionStackPanel contract={contract} actionError={error} />
          <LivePathMap contract={contract} selectedLeg={selectedLeg} />
          <SimulationPanel contract={contract} isSimulating={isSimulating} onSimulate={runSimulation} />
          <ReasoningPanel contract={contract} />
          <PortfolioPanel
            contracts={storedContracts}
            onLoad={(next) => {
              setContract(next);
              setSelectedLegId(next.legs[0]?.id ?? null);
            }}
            onArchive={(id) => {
              archiveStoredContract(id);
              refreshStoredContracts();
            }}
          />
        </aside>
      </div>

      <AnimatePresence>
        {success ? (
          <SuccessOverlay contract={success} onClose={() => setSuccess(null)} />
        ) : null}
      </AnimatePresence>
    </section>
  );
}

function EngineHeader({
  contract,
  isPublishing,
  isSimulating,
  onCustom,
  onSave,
  onPublish,
  onSimulate
}: {
  contract: EngineContract;
  isPublishing: boolean;
  isSimulating: boolean;
  onCustom: () => void;
  onSave: () => void;
  onPublish: () => void;
  onSimulate: () => void;
}) {
  return (
    <header className="relative z-10 mx-auto mb-4 flex max-w-[1440px] flex-wrap items-center justify-between gap-3 border-b border-[#111] pb-4">
      <div>
        <div className="mono text-[10px] uppercase tracking-[0.18em] text-[#555]">PATH CONTRACT ENGINE</div>
        <h1 className="mono mt-1 text-xl font-bold uppercase tracking-widest text-white">
          {contract.title}
        </h1>
      </div>
      <div className="mono flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-widest">
        <StatusPill status={contract.status} />
        <button type="button" onClick={onCustom} className="engine-button border-[#333] text-[#888] hover:border-[#b4ff5a] hover:text-[#b4ff5a]">
          <Plus className="size-3" aria-hidden />
          New Custom
        </button>
        <button type="button" onClick={onSave} className="engine-button border-[#333] text-[#888] hover:border-[#b4ff5a] hover:text-[#b4ff5a]">
          <Save className="size-3" aria-hidden />
          Save
        </button>
        <button type="button" onClick={onSimulate} className="engine-button border-[#333] text-[#888] hover:border-[#b4ff5a] hover:text-[#b4ff5a]">
          {isSimulating ? <Loader2 className="size-3 animate-spin" aria-hidden /> : <Shuffle className="size-3" aria-hidden />}
          Simulate
        </button>
        <button
          type="button"
          onClick={onPublish}
          disabled={isPublishing}
          className="engine-button border-[#b4ff5a] bg-[#b4ff5a] text-black hover:shadow-[0_0_28px_rgba(180,255,90,0.22)] disabled:cursor-wait disabled:opacity-70"
        >
          {isPublishing ? <Loader2 className="size-3 animate-spin" aria-hidden /> : <Send className="size-3" aria-hidden />}
          Publish
        </button>
      </div>
    </header>
  );
}

function ContractEditor({
  contract,
  selectedLegId,
  draggedLegId,
  onSelectLeg,
  onContractChange,
  onLegChange,
  onAddLeg,
  onDuplicateLeg,
  onDeleteLeg,
  onDragStart,
  onDragEnd,
  onDropLeg
}: {
  contract: EngineContract;
  selectedLegId: string | null;
  draggedLegId: string | null;
  onSelectLeg: (id: string) => void;
  onContractChange: (update: Partial<EngineContract>) => void;
  onLegChange: (id: string, update: Partial<EngineLeg>) => void;
  onAddLeg: () => void;
  onDuplicateLeg: (id: string) => void;
  onDeleteLeg: (id: string) => void;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
  onDropLeg: (id: string) => void;
}) {
  return (
    <section className="overflow-hidden rounded-sm border border-[#1a1a1a] bg-[#050505]/92 shadow-[0_0_80px_rgba(0,0,0,0.38)]">
      <div className="border-b border-[#111] p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="label label-active">Custom Path Composer</div>
            <h2 className="mono mt-2 text-lg font-bold uppercase tracking-widest text-white">
              Build a tradeable path, then execute it
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#777]">
              Compose conditions, simulate the thesis, save the draft, and publish the terms hash through the PathMarket contract.
            </p>
          </div>
          <div className="grid min-w-[280px] grid-cols-2 gap-2">
            <Metric label="Confidence" value={`${contract.confidence}%`} />
            <Metric label="Legs" value={`${contract.legs.length}`} />
          </div>
        </div>
      </div>

      <div className="grid gap-5 p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-5">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_180px]">
            <Field label="Title">
              <input
                value={contract.title}
                onChange={(event) => onContractChange({ title: event.target.value })}
                className="engine-input text-base"
              />
            </Field>
            <Field label="Time Horizon">
              <input
                value={contract.timeHorizon}
                onChange={(event) => onContractChange({ timeHorizon: event.target.value })}
                className="engine-input"
              />
            </Field>
          </div>

          <Field label="Description">
            <textarea
              value={contract.description}
              onChange={(event) => onContractChange({ description: event.target.value })}
              rows={3}
              className="engine-input resize-none leading-6"
            />
          </Field>

          <div>
            <div className="label mb-2">Structure</div>
            <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
              {contractStructures.map((structure) => (
                <button
                  key={structure}
                  type="button"
                  onClick={() => onContractChange({ structure })}
                  className={cn(
                    "mono min-h-10 rounded-sm border px-2 text-[9px] uppercase tracking-widest transition-colors",
                    contract.structure === structure
                      ? "border-[#b4ff5a] bg-[#b4ff5a] text-black"
                      : "border-[#1f1f1f] text-[#666] hover:border-[#555] hover:text-white"
                  )}
                >
                  {structure}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#111] pb-3">
            <div>
              <div className="label label-active">Path Legs</div>
              <p className="mt-1 text-xs text-[#555]">Drag to reorder. Each leg remains tied to supported evidence.</p>
            </div>
            <button type="button" onClick={onAddLeg} className="engine-button border-[#333] text-[#b4ff5a]">
              <Plus className="size-3" aria-hidden />
              Add Leg
            </button>
          </div>

          <div className="space-y-3">
            {contract.legs.map((leg, index) => (
              <motion.article
                key={leg.id}
                layout
                draggable
                onDragStart={() => onDragStart(leg.id)}
                onDragEnd={onDragEnd}
                onDragOver={(event) => event.preventDefault()}
                onDrop={() => onDropLeg(leg.id)}
                onClick={() => onSelectLeg(leg.id)}
                className={cn(
                  "rounded-sm border bg-[#080808] p-4 transition-colors",
                  selectedLegId === leg.id ? "border-[#b4ff5a] shadow-[0_0_34px_rgba(180,255,90,0.08)]" : "border-[#181818] hover:border-[#333]",
                  draggedLegId === leg.id && "opacity-40"
                )}
              >
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div className="mono flex min-w-0 items-center gap-3 text-[10px] uppercase tracking-widest">
                    <GripVertical className="size-4 shrink-0 cursor-grab text-[#333]" aria-hidden />
                    <span className="shrink-0 text-[#b4ff5a]">LEG {String(index + 1).padStart(2, "0")}</span>
                    <span className="truncate text-[#555]">{leg.metricSource}</span>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <IconButton label="Duplicate leg" onClick={() => onDuplicateLeg(leg.id)}>
                      <Copy className="size-3" aria-hidden />
                    </IconButton>
                    <IconButton label="Delete leg" onClick={() => onDeleteLeg(leg.id)}>
                      <Trash2 className="size-3" aria-hidden />
                    </IconButton>
                  </div>
                </div>

                <div className="grid gap-3">
                  <input
                    value={leg.condition}
                    onChange={(event) => onLegChange(leg.id, { condition: event.target.value })}
                    className="engine-input"
                    onClick={(event) => event.stopPropagation()}
                  />
                  <div className="grid gap-3 sm:grid-cols-[110px_minmax(0,1fr)_130px]">
                    <select
                      value={leg.comparator}
                      onChange={(event) => onLegChange(leg.id, { comparator: event.target.value as EngineLeg["comparator"] })}
                      className="engine-input"
                      onClick={(event) => event.stopPropagation()}
                    >
                      {[">", ">=", "<", "<=", "="].map((comparator) => (
                        <option key={comparator} value={comparator}>
                          {comparator}
                        </option>
                      ))}
                    </select>
                    <input
                      value={leg.threshold}
                      onChange={(event) => onLegChange(leg.id, { threshold: event.target.value })}
                      className="engine-input"
                      onClick={(event) => event.stopPropagation()}
                    />
                    <input
                      value={leg.window}
                      onChange={(event) => onLegChange(leg.id, { window: event.target.value })}
                      className="engine-input"
                      onClick={(event) => event.stopPropagation()}
                    />
                  </div>
                  <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_180px_130px]">
                    <input
                      value={leg.metricSource}
                      onChange={(event) => onLegChange(leg.id, { metricSource: event.target.value })}
                      className="engine-input"
                      onClick={(event) => event.stopPropagation()}
                    />
                    <RangeInput
                      value={leg.confidence}
                      onChange={(value) => onLegChange(leg.id, { confidence: value })}
                      label="Confidence"
                    />
                    <RangeInput
                      value={leg.weight}
                      min={1}
                      max={5}
                      onChange={(value) => onLegChange(leg.id, { weight: value })}
                      label="Weight"
                    />
                  </div>
                </div>
              </motion.article>
            ))}
          </div>
        </div>

        <aside className="space-y-4">
          <Field label="Contract State">
            <select
              value={contract.status}
              onChange={(event) => onContractChange({ status: event.target.value as EngineContract["status"] })}
              className="engine-input"
            >
              {contractStates.map((state) => (
                <option key={state} value={state}>
                  {state}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Stake">
            <input
              value={contract.stakeAmount}
              onChange={(event) => onContractChange({ stakeAmount: event.target.value })}
              className="engine-input"
            />
          </Field>
          <Field label="Settlement Logic">
            <textarea
              value={contract.settlementLogic}
              onChange={(event) => onContractChange({ settlementLogic: event.target.value })}
              rows={6}
              className="engine-input resize-none leading-6"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Metric label="Historical Match" value={`${contract.historicalMatch}%`} />
            <Metric label="Narrative Score" value={`${contract.narrativeScore}`} />
          </div>
          <div className="rounded-sm border border-[#181818] bg-black/50 p-4">
            <div className="label">Selected Evidence</div>
            {contract.legs.find((leg) => leg.id === selectedLegId)?.evidence.slice(0, 2).map((item) => (
              <div key={`${item.source}-${item.label}`} className="mt-3 border-t border-[#111] pt-3">
                <div className="mono text-[9px] uppercase tracking-widest text-[#b4ff5a]">{item.source}</div>
                <p className="mt-1 text-xs leading-5 text-[#888]">{item.label}</p>
                <p className="mono mt-1 text-[10px] uppercase tracking-widest text-[#444]">{item.value}</p>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </section>
  );
}

function IntelligenceDock({
  narratives,
  activeThemeId,
  prompt,
  onPromptChange,
  onGenerate,
  query,
  onQueryChange,
  items,
  onAdd,
  liveSourceError,
  isLoadingSources,
  onLoadSources,
  onGenerateFromTheme
}: {
  narratives: NarrativeTheme[];
  activeThemeId?: string;
  prompt: string;
  onPromptChange: (value: string) => void;
  onGenerate: () => void;
  query: string;
  onQueryChange: (value: string) => void;
  items: ConditionLibraryItem[];
  onAdd: (item: ConditionLibraryItem) => void;
  liveSourceError: IntelligenceError | null;
  isLoadingSources: boolean;
  onLoadSources: () => void | Promise<void>;
  onGenerateFromTheme: (theme: NarrativeTheme) => void | Promise<void>;
}) {
  const [activeTab, setActiveTab] = useState<"conditions" | "ai" | "sources">("conditions");
  const tabs = [
    { id: "conditions", label: "Conditions" },
    { id: "ai", label: "AI Assist" },
    { id: "sources", label: "Live Sources" }
  ] as const;

  return (
    <section className="rounded-sm border border-[#171717] bg-[#050505]/88 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#111] pb-3">
        <div>
          <div className="label label-active">Builder Tools</div>
          <p className="mt-1 text-xs text-[#555]">Open only the tool you need, then return to the custom path.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setActiveTab(tab.id);
                if (tab.id === "sources") {
                  void onLoadSources();
                }
              }}
              className={cn(
                "mono rounded-sm border px-3 py-2 text-[9px] uppercase tracking-widest transition-colors",
                activeTab === tab.id
                  ? "border-[#b4ff5a] bg-[#b4ff5a] text-black"
                  : "border-[#222] text-[#666] hover:border-[#555] hover:text-white"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "conditions" ? (
        <div className="pt-4">
          <div className="mb-3 flex items-center gap-2 rounded-sm border border-[#181818] bg-black px-3 py-2">
            <Search className="size-3 text-[#555]" aria-hidden />
            <input
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              placeholder="Search ETF, social, volatility..."
              className="mono w-full bg-transparent text-[10px] uppercase tracking-widest text-white outline-none placeholder:text-[#333]"
            />
          </div>
          <div className="grid max-h-[320px] gap-2 overflow-y-auto pr-1 md:grid-cols-2">
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onAdd(item)}
                disabled={!item.supported}
                className={cn(
                  "rounded-sm border p-3 text-left transition-colors",
                  item.supported
                    ? "border-[#181818] hover:border-[#b4ff5a]"
                    : "cursor-not-allowed border-[#221717] bg-[#090505] opacity-55"
                )}
              >
                <div className="mono flex items-center justify-between text-[9px] uppercase tracking-widest">
                  <span className={item.supported ? "text-[#b4ff5a]" : "text-[#ff7777]"}>{item.category}</span>
                  <span className="text-[#444]">{item.supported ? "LIVE" : "LOCKED"}</span>
                </div>
                <p className="mt-2 text-xs leading-5 text-white">{item.label}</p>
                <p className="mono mt-2 text-[9px] uppercase tracking-widest text-[#555]">{item.note}</p>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {activeTab === "ai" ? (
        <div className="grid gap-3 pt-4 md:grid-cols-[minmax(0,1fr)_220px]">
          <textarea
            value={prompt}
            onChange={(event) => onPromptChange(event.target.value)}
            rows={4}
            className="engine-input resize-none leading-6"
          />
          <button type="button" onClick={onGenerate} className="engine-button h-full min-h-24 border-[#b4ff5a] bg-[#b4ff5a] text-black">
            <Wand2 className="size-3" aria-hidden />
            Generate Custom Path
          </button>
        </div>
      ) : null}

      {activeTab === "sources" ? (
        <div className="grid gap-2 pt-4 md:grid-cols-3">
          {isLoadingSources ? (
            <div className="rounded-sm border border-[#172312] bg-[#061006] p-4 md:col-span-3">
              <div className="mono text-[9px] uppercase tracking-widest text-[#b4ff5a]">Loading SoSoValue sources</div>
              <p className="mt-2 text-xs leading-5 text-[#777]">
                Pulling live narrative candidates only for this tool panel.
              </p>
            </div>
          ) : null}
          {!isLoadingSources && narratives.length ? (
            narratives.slice(0, 6).map((theme) => (
              <button
                key={theme.id}
                type="button"
                onClick={() => void onGenerateFromTheme(theme)}
                className={cn(
                  "rounded-sm border p-3 text-left transition-colors",
                  activeThemeId === theme.id ? "border-[#b4ff5a] bg-[#b4ff5a]/5" : "border-[#181818] hover:border-[#333]"
                )}
              >
                <div className="mono flex items-center justify-between gap-3 text-[9px] uppercase tracking-widest">
                  <span className="truncate text-white">{theme.title}</span>
                  <span className="text-[#b4ff5a]">{theme.confidence}%</span>
                </div>
                <p className="mt-2 line-clamp-2 text-xs leading-5 text-[#666]">{theme.summary}</p>
              </button>
            ))
          ) : null}
          {!isLoadingSources && !narratives.length ? (
            <div className="rounded-sm border border-[#2a1717] bg-[#100606] p-4 md:col-span-3">
              <div className="mono text-[9px] uppercase tracking-widest text-[#ff8888]">Live sources unavailable</div>
              <p className="mt-2 text-xs leading-5 text-[#777]">
                {liveSourceError?.message ?? "Custom path creation stays enabled. Live narrative import returns when SoSoValue is available again."}
              </p>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

function ExecutionStackPanel({
  contract,
  actionError
}: {
  contract: EngineContract;
  actionError: IntelligenceError | null;
}) {
  const termsLabel = contract.termsHash ? `${contract.termsHash.slice(0, 10)}...${contract.termsHash.slice(-8)}` : "generated at publish";
  const txLabel = contract.txHash ? `${contract.txHash.slice(0, 10)}...${contract.txHash.slice(-8)}` : "awaiting publish";
  const stack = [
    {
      icon: ShieldCheck,
      label: "Instrument",
      value: `${contract.structure} / ${contract.legs.length} legs`
    },
    {
      icon: FileCode2,
      label: "Terms Hash",
      value: termsLabel
    },
    {
      icon: Network,
      label: "Settlement",
      value: "Arbitrum Sepolia PathMarket"
    }
  ];

  return (
    <Panel title="Execution Stack">
      <div className="space-y-2">
        {stack.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="flex items-center gap-3 rounded-sm border border-[#181818] bg-black/55 p-3">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-sm border border-[#263718] bg-[#b4ff5a]/5 text-[#b4ff5a]">
                <Icon className="size-4" aria-hidden />
              </div>
              <div className="min-w-0">
                <div className="mono text-[9px] uppercase tracking-widest text-[#444]">{item.label}</div>
                <div className="mono mt-1 truncate text-[11px] uppercase tracking-widest text-[#ddd]">{item.value}</div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-3 rounded-sm border border-[#181818] bg-[#050505] p-3">
        <div className="mono text-[9px] uppercase tracking-widest text-[#444]">Transaction</div>
        <div className="mono mt-1 truncate text-[11px] uppercase tracking-widest text-[#b4ff5a]">{txLabel}</div>
      </div>
      {actionError ? (
        <div className="mt-3 rounded-sm border border-[#3a1f1f] bg-[#120707] p-3">
          <div className="mono text-[9px] uppercase tracking-widest text-[#ff9999]">Execution Notice</div>
          <p className="mt-2 text-xs leading-5 text-[#888]">{actionError.message}</p>
        </div>
      ) : null}
    </Panel>
  );
}

function LivePathMap({ contract, selectedLeg }: { contract: EngineContract; selectedLeg: EngineLeg | null }) {
  return (
    <Panel title="Live Path Visualization">
      <div className="relative overflow-hidden rounded-sm border border-[#181818] bg-[#030303] p-4">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(180,255,90,0.08),transparent_55%)]" />
        <div className="relative space-y-3">
          {contract.legs.map((leg, index) => (
            <div key={leg.id} className="relative">
              <motion.div
                animate={{ boxShadow: ["0 0 0 rgba(180,255,90,0)", "0 0 24px rgba(180,255,90,0.16)", "0 0 0 rgba(180,255,90,0)"] }}
                transition={{ duration: 2.6, repeat: Infinity, delay: index * 0.2 }}
                className={cn(
                  "rounded-sm border bg-black/80 p-3",
                  selectedLeg?.id === leg.id ? "border-[#b4ff5a]" : "border-[#1d1d1d]"
                )}
              >
                <div className="mono flex items-center justify-between text-[9px] uppercase tracking-widest text-[#555]">
                  <span>NODE {String(index + 1).padStart(2, "0")}</span>
                  <span className="text-[#b4ff5a]">{leg.confidence}%</span>
                </div>
                <p className="mt-2 text-xs leading-5 text-white">{leg.condition}</p>
              </motion.div>
              {index < contract.legs.length - 1 ? (
                <motion.div
                  animate={{ opacity: [0.25, 1, 0.25] }}
                  transition={{ duration: 1.8, repeat: Infinity, delay: index * 0.15 }}
                  className="mx-auto h-6 w-px bg-[#b4ff5a]/60"
                />
              ) : null}
            </div>
          ))}
          <div className="rounded-sm border border-[#b4ff5a]/40 bg-[#b4ff5a]/5 p-3">
            <div className="mono text-[9px] uppercase tracking-widest text-[#b4ff5a]">Settlement</div>
            <p className="mt-2 text-xs leading-5 text-[#ddd]">{contract.settlementLogic}</p>
          </div>
        </div>
      </div>
    </Panel>
  );
}

function SimulationPanel({
  contract,
  isSimulating,
  onSimulate
}: {
  contract: EngineContract;
  isSimulating: boolean;
  onSimulate: () => void;
}) {
  const metrics = [
    ["Historical Success", `${contract.simulation.historicalSuccessRate}%`],
    ["Expected Reward", `${contract.simulation.expectedReward}x`],
    ["Risk Score", `${contract.simulation.riskScore}`],
    ["Max Drawdown", `${contract.simulation.maxDrawdown}%`],
    ["Narrative Strength", `${contract.simulation.narrativeStrength}%`],
    ["Similarity", `${contract.simulation.historicalSimilarity}%`],
    ["Regime Fit", `${contract.simulation.marketRegimeCompatibility}%`]
  ];
  return (
    <Panel title="Contract Simulator">
      <button type="button" onClick={onSimulate} className="engine-button mb-3 w-full border-[#333] text-[#b4ff5a]">
        {isSimulating ? <Loader2 className="size-3 animate-spin" aria-hidden /> : <RefreshCw className="size-3" aria-hidden />}
        Simulate Contract
      </button>
      <div className="grid grid-cols-2 gap-2">
        {metrics.map(([label, value]) => (
          <Metric key={label} label={label} value={value} />
        ))}
      </div>
    </Panel>
  );
}

function ReasoningPanel({ contract }: { contract: EngineContract }) {
  return (
    <Panel title="AI Reasoning Panel">
      <ReasoningList icon={<Bot className="size-3" aria-hidden />} title="Why This Contract?" items={contract.reasoning} />
      <ReasoningList title="Contradiction Analysis" items={contract.contradictionAnalysis} />
      <ReasoningList title="What Breaks This Thesis?" items={contract.failureConditions} danger />
    </Panel>
  );
}

function PortfolioPanel({
  contracts,
  onLoad,
  onArchive
}: {
  contracts: EngineContract[];
  onLoad: (contract: EngineContract) => void;
  onArchive: (id: string) => void;
}) {
  const activeContracts = contracts.filter((contract) => contract.status !== "Archived");
  const winRate = activeContracts.length
    ? Math.round(activeContracts.reduce((total, contract) => total + contract.simulation.historicalSuccessRate, 0) / activeContracts.length)
    : 0;
  const averageReturn = activeContracts.length
    ? Number((activeContracts.reduce((total, contract) => total + contract.simulation.expectedReward, 0) / activeContracts.length).toFixed(2))
    : 0;
  const narrativeAccuracy = activeContracts.length
    ? Math.round(activeContracts.reduce((total, contract) => total + contract.narrativeScore, 0) / activeContracts.length)
    : 0;
  return (
    <Panel title="My Contracts">
      <div className="mb-3 grid grid-cols-3 gap-2">
        <Metric label="Active" value={`${contracts.filter((contract) => contract.status === "Active").length}`} />
        <Metric label="Draft" value={`${contracts.filter((contract) => contract.status === "Draft").length}`} />
        <Metric label="Published" value={`${contracts.filter((contract) => contract.status === "Published").length}`} />
        <Metric label="Resolved" value={`${contracts.filter((contract) => contract.status === "Resolved").length}`} />
        <Metric label="Win Rate" value={`${winRate}%`} />
        <Metric label="Avg Return" value={`${averageReturn}x`} />
        <Metric label="Accuracy" value={`${narrativeAccuracy}%`} />
      </div>
      <div className="max-h-[280px] space-y-2 overflow-y-auto pr-1">
        {contracts.length ? (
          contracts.map((item) => (
            <div key={item.id} className="rounded-sm border border-[#181818] bg-[#050505] p-3">
              <div className="mono flex items-center justify-between text-[9px] uppercase tracking-widest">
                <span className="text-white">{item.id}</span>
                <span className="text-[#b4ff5a]">{item.status}</span>
              </div>
              <p className="mt-2 line-clamp-1 text-xs text-[#777]">{item.title}</p>
              <div className="mt-3 flex gap-2">
                <button type="button" onClick={() => onLoad(item)} className="engine-button flex-1 border-[#333] text-[#888]">
                  Load
                </button>
                <IconButton label="Archive" onClick={() => onArchive(item.id)}>
                  <Archive className="size-3" aria-hidden />
                </IconButton>
              </div>
            </div>
          ))
        ) : (
          <p className="mono text-[10px] uppercase tracking-widest text-[#444]">No saved contracts yet.</p>
        )}
      </div>
    </Panel>
  );
}

function SuccessOverlay({ contract, onClose }: { contract: EngineContract; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/80 px-4 backdrop-blur-md"
    >
      <motion.div
        initial={{ y: 24, scale: 0.96, filter: "blur(10px)" }}
        animate={{ y: 0, scale: 1, filter: "blur(0px)" }}
        exit={{ y: 12, scale: 0.98, opacity: 0 }}
        className="w-full max-w-xl rounded-sm border border-[#b4ff5a]/50 bg-[#050505] p-6 shadow-[0_0_90px_rgba(180,255,90,0.12)]"
      >
        <div className="mx-auto mb-5 flex size-12 items-center justify-center rounded-full border border-[#b4ff5a] bg-[#b4ff5a] text-black">
          <Check className="size-6" aria-hidden />
        </div>
        <div className="text-center">
          <div className="label label-active">Path Contract Created</div>
          <h2 className="mono mt-2 text-xl uppercase tracking-widest text-white">{contract.id}</h2>
          <p className="mt-3 text-sm leading-6 text-[#777]">{contract.title}</p>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-3">
          <Metric label="Confidence" value={`${contract.confidence}%`} />
          <Metric label="Expected Reward" value={`${contract.simulation.expectedReward}x`} />
          <Metric label="Narrative Score" value={`${contract.narrativeScore}`} />
          <Metric label="Settlement" value={contract.structure} />
        </div>
        {contract.txHash ? (
          <a
            href={`https://sepolia.arbiscan.io/tx/${contract.txHash}`}
            target="_blank"
            rel="noreferrer"
            className="mono mt-4 block truncate rounded-sm border border-[#181818] bg-black px-3 py-2 text-center text-[10px] uppercase tracking-widest text-[#b4ff5a]"
          >
            {contract.txHash}
          </a>
        ) : null}
        <button type="button" onClick={onClose} className="engine-button mt-5 w-full border-[#b4ff5a] bg-[#b4ff5a] text-black">
          Continue
        </button>
      </motion.div>
    </motion.div>
  );
}

function EngineShellState({
  label,
  actionLabel,
  onAction
}: {
  label: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex min-h-[calc(100vh-140px)] items-center justify-center rounded-sm border border-[#111] bg-black">
      <div className="text-center">
        <Loader2 className="mx-auto mb-4 size-6 animate-spin text-[#b4ff5a]" aria-hidden />
        <p className="mono text-[10px] uppercase tracking-widest text-[#777]">{label}</p>
        {actionLabel && onAction ? (
          <button type="button" onClick={onAction} className="engine-button mx-auto mt-4 border-[#333] text-[#b4ff5a]">
            {actionLabel}
          </button>
        ) : null}
      </div>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-sm border border-[#171717] bg-[#070707]/90 p-4">
      <div className="label label-active mb-3">{title}</div>
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="mt-4 block">
      <div className="label mb-2">{label}</div>
      {children}
    </label>
  );
}

function RangeInput({
  value,
  min = 0,
  max = 100,
  label,
  onChange
}: {
  value: number;
  min?: number;
  max?: number;
  label: string;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block">
      <div className="mono mb-1 flex justify-between text-[9px] uppercase tracking-widest text-[#444]">
        <span>{label}</span>
        <span className="text-[#b4ff5a]">{value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full accent-[#b4ff5a]"
      />
    </label>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-sm border border-[#181818] bg-black/60 p-3">
      <div className="mono text-[9px] uppercase tracking-widest text-[#444]">{label}</div>
      <div className="mono mt-1 truncate text-sm text-[#b4ff5a]">{value}</div>
    </div>
  );
}

function StatusPill({ status }: { status: EngineContractStatus }) {
  return (
    <span className="rounded-sm border border-[#233518] bg-[#b4ff5a]/5 px-3 py-2 text-[#b4ff5a]">
      {status}
    </span>
  );
}

function IconButton({
  label,
  onClick,
  children
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      className="rounded-sm border border-[#252525] p-2 text-[#666] transition-colors hover:border-[#b4ff5a] hover:text-[#b4ff5a]"
      aria-label={label}
    >
      {children}
    </button>
  );
}

function ReasoningList({
  title,
  items,
  icon,
  danger = false
}: {
  title: string;
  items: string[];
  icon?: ReactNode;
  danger?: boolean;
}) {
  return (
    <div className="mt-4 first:mt-0">
      <div className={cn("mono flex items-center gap-2 text-[9px] uppercase tracking-widest", danger ? "text-[#ff7777]" : "text-[#b4ff5a]")}>
        {icon}
        {title}
      </div>
      <ul className="mt-2 space-y-2 text-xs leading-5 text-[#777]">
        {items.slice(0, 5).map((item) => (
          <li key={item} className="border-l border-[#222] pl-3">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
