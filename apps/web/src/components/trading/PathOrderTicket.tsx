"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, Check, ExternalLink, Loader2, RefreshCw, Send, Trophy } from "lucide-react";
import { parseEther, type Address } from "viem";
import {
  useAccount,
  useChainId,
  useSwitchChain,
  useWaitForTransactionReceipt,
  useWriteContract
} from "wagmi";

import { cn } from "@/lib/cn";
import { fetchPathMarket, fetchPublishedPathContracts, recordMarketAction, toApiError } from "@/lib/narrativeApi";
import {
  explorerTxUrl,
  pathMarketAbi,
  pathMarketAddress,
  settlementChainId,
  settlementChainName
} from "@/lib/pathMarket";
import type { IntelligenceError, PathContract, PathMarketView } from "@/lib/types";

type PathOrderTicketProps = {
  activeContract: PathContract | null;
  onOrderSuccess?: (message: string) => void;
};

type Direction = "support" | "oppose";

export function PathOrderTicket({ activeContract, onOrderSuccess }: PathOrderTicketProps) {
  const [contracts, setContracts] = useState<PathContract[]>([]);
  const [selectedContractId, setSelectedContractId] = useState<string | null>(null);
  const [selectedLegIndex, setSelectedLegIndex] = useState(0);
  const [direction, setDirection] = useState<Direction>("support");
  const [amount, setAmount] = useState("0.000001");
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<IntelligenceError | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submittedHash, setSubmittedHash] = useState<`0x${string}` | undefined>();
  const [notifiedHash, setNotifiedHash] = useState<string | null>(null);
  const [txMode, setTxMode] = useState<"stake" | "claim">("stake");
  const [marketView, setMarketView] = useState<PathMarketView | null>(null);
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain, isPending: isSwitching } = useSwitchChain();
  const {
    writeContractAsync,
    isPending: isWriting,
    error: writeError,
    reset: resetWrite
  } = useWriteContract();
  const {
    isLoading: isConfirming,
    isSuccess: isConfirmed
  } = useWaitForTransactionReceipt({
    hash: submittedHash
  });

  const fallbackContractAddress = pathMarketAddress();
  const marketContracts = useMemo(() => {
    const published = contracts.filter((contract) => contract.status === "published");
    if (activeContract?.status === "published") {
      const exists = published.some((contract) => contract.id === activeContract.id);
      return exists ? published : [activeContract, ...published];
    }
    return published;
  }, [activeContract, contracts]);

  const selectedContract = useMemo(
    () => marketContracts.find((contract) => contract.id === selectedContractId) ?? marketContracts[0] ?? null,
    [marketContracts, selectedContractId]
  );
  const contractAddress =
    selectedContract?.marketAddress?.startsWith("0x")
      ? (selectedContract.marketAddress as Address)
      : fallbackContractAddress;
  const selectedLeg = selectedContract?.legs[selectedLegIndex] ?? selectedContract?.legs[0] ?? null;
  const onchainPathId = selectedContract?.onchainPathId;
  const amountIsValid = Number(amount) > 0;
  const isWrongChain = isConnected && chainId !== settlementChainId;
  const canClaim =
    Boolean(isConnected && contractAddress && selectedContract && onchainPathId && selectedContract.status === "resolved" && !isWrongChain) &&
    !isWriting &&
    !isConfirming;
  const creatorIsDifferent =
    Boolean(address && selectedContract?.creator) &&
    selectedContract?.creator?.toLowerCase() !== address?.toLowerCase();
  const canSubmit =
    Boolean(
      isConnected &&
        contractAddress &&
        selectedContract &&
        onchainPathId &&
        selectedLeg &&
        amountIsValid &&
        !isWrongChain
    ) &&
    !isWriting &&
    !isConfirming;

  const loadContracts = useCallback(async (signal?: AbortSignal) => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const response = await fetchPublishedPathContracts(signal);
      setContracts(response.contracts);
      setSelectedContractId((current) => current ?? response.contracts[0]?.id ?? null);
    } catch (error) {
      if (signal?.aborted) {
        return;
      }
      const apiError = toApiError(error);
      setLoadError({
        message: apiError.message,
        status: apiError.status,
        missing: apiError.missing
      });
    } finally {
      if (!signal?.aborted) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void loadContracts(controller.signal);
    return () => controller.abort();
  }, [loadContracts]);

  useEffect(() => {
    if (!selectedContract && marketContracts[0]) {
      setSelectedContractId(marketContracts[0].id);
    }
  }, [marketContracts, selectedContract]);

  useEffect(() => {
    setSelectedLegIndex(0);
  }, [selectedContractId]);

  useEffect(() => {
    if (!selectedContract) {
      setMarketView(null);
      return;
    }
    const controller = new AbortController();
    const loadMarket = () => {
      void fetchPathMarket(selectedContract.id, controller.signal)
        .then(setMarketView)
        .catch(() => undefined);
    };
    loadMarket();
    const timer = window.setInterval(loadMarket, 12000);
    return () => {
      controller.abort();
      window.clearInterval(timer);
    };
  }, [selectedContract]);

  useEffect(() => {
    if (isConfirmed && submittedHash && notifiedHash !== submittedHash) {
      setNotifiedHash(submittedHash);
      if (txMode === "stake" && selectedContract) {
        void recordMarketAction(selectedContract.id, {
          action: direction,
          userAddress: address,
          legIndex: selectedLegIndex,
          amount,
          txHash: submittedHash
        })
          .then(() => fetchPathMarket(selectedContract.id))
          .then(setMarketView)
          .catch(() => undefined);
      }
      onOrderSuccess?.(`${txMode === "claim" ? "Reward claimed" : "Order executed"} ${shortHash(submittedHash)}`);
      void loadContracts();
    }
  }, [
    address,
    amount,
    direction,
    isConfirmed,
    loadContracts,
    notifiedHash,
    onOrderSuccess,
    selectedContract,
    selectedLegIndex,
    submittedHash,
    txMode
  ]);

  async function placeOrder() {
    if (!contractAddress || !selectedContract || !selectedLeg || !onchainPathId || !amountIsValid) {
      return;
    }

    resetWrite();
    setSubmittedHash(undefined);
    setNotifiedHash(null);
    setSubmitError(null);

    try {
      setTxMode("stake");
      const txHash = await writeContractAsync({
        address: contractAddress,
        abi: pathMarketAbi,
        functionName: "stakeLeg",
        args: [BigInt(onchainPathId), selectedLegIndex, direction === "support"],
        value: parseEther(amount)
      });
      setSubmittedHash(txHash);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Path order transaction failed");
    }
  }

  async function claimReward() {
    if (!contractAddress || !selectedContract || !onchainPathId) {
      return;
    }

    resetWrite();
    setSubmittedHash(undefined);
    setNotifiedHash(null);
    setSubmitError(null);
    setTxMode("claim");

    try {
      const txHash = await writeContractAsync({
        address: contractAddress,
        abi: pathMarketAbi,
        functionName: "claimReward",
        args: [BigInt(onchainPathId)]
      });
      setSubmittedHash(txHash);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Reward claim transaction failed");
    }
  }

  return (
    <section id="path-order-execution" className="mt-5 rounded-sm border border-[#181818] bg-black/35 p-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="label label-active">PATH ORDER EXECUTION</div>
          <p className="mono mt-1 text-[9px] uppercase tracking-widest text-[#444]">
            Stake into published contracts from any creator
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadContracts()}
          className="rounded-sm border border-[#222] p-2 text-[#555] hover:border-[#b4ff5a] hover:text-[#b4ff5a]"
          aria-label="Refresh published path contracts"
        >
          <RefreshCw className={cn("size-3", isLoading && "animate-spin")} aria-hidden />
        </button>
      </div>

      {marketContracts.length ? (
        <div className="mt-3 space-y-3">
          <label className="block">
            <span className="label">Published path</span>
            <select
              value={selectedContract?.id ?? ""}
              onChange={(event) => setSelectedContractId(event.target.value)}
              className="mono mt-2 w-full rounded-sm border border-[#1a1a1a] bg-[#070707] px-3 py-2 text-[10px] uppercase tracking-widest text-white outline-none focus:border-[#b4ff5a]"
            >
              {marketContracts.map((contract) => (
                <option key={contract.id} value={contract.id}>
                  {contract.onchainPathId ? `#${contract.onchainPathId} - ` : ""}{contract.title}
                </option>
              ))}
            </select>
          </label>

          {selectedContract ? (
            <div className="rounded-sm border border-[#101010] bg-[#050505] p-3">
              <div className="mono flex items-center justify-between gap-3 text-[9px] uppercase tracking-widest">
                <span className="truncate text-[#777]">{selectedContract.id}</span>
                <span className={selectedContract.onchainPathId ? "text-[#b4ff5a]" : "text-[#ff9999]"}>
                  {selectedContract.onchainPathId ? `on-chain #${selectedContract.onchainPathId}` : "missing path id"}
                </span>
              </div>
              <h3 className="mt-2 text-sm font-semibold text-white">{selectedContract.title}</h3>
              <p className="mt-2 line-clamp-2 text-xs leading-5 text-[#777]">{selectedContract.marketDna}</p>
              <div className="mono mt-3 grid gap-2 text-[9px] uppercase tracking-widest text-[#555]">
                <span>Creator: {selectedContract.creator ? shortAddress(selectedContract.creator) : "server relay"}</span>
                <span className={creatorIsDifferent ? "text-[#b4ff5a]" : "text-[#777]"}>
                  {creatorIsDifferent ? "Different creator market" : "Creator not connected / same wallet"}
                </span>
              </div>
            </div>
          ) : null}

          <label className="block">
            <span className="label">Leg</span>
            <select
              value={selectedLegIndex}
              onChange={(event) => setSelectedLegIndex(Number(event.target.value))}
              className="mono mt-2 w-full rounded-sm border border-[#1a1a1a] bg-[#070707] px-3 py-2 text-[10px] uppercase tracking-widest text-white outline-none focus:border-[#b4ff5a]"
            >
              {selectedContract?.legs.map((leg, index) => (
                <option key={leg.leg} value={index}>
                  LEG {String(leg.leg).padStart(2, "0")} - {leg.condition}
                </option>
              ))}
            </select>
          </label>

          {selectedLeg ? (
            <div className="rounded-sm border border-[#101010] bg-[#050505] p-3">
              <div className="mono text-[9px] uppercase tracking-widest text-[#555]">
                {selectedLeg.metricSource} / {selectedLeg.window}
              </div>
              <p className="mt-2 text-xs leading-5 text-[#d8d8d8]">{selectedLeg.condition}</p>
              <div className="mono mt-2 text-[9px] uppercase tracking-widest text-[#b4ff5a]">
                {selectedLeg.comparator} {selectedLeg.threshold} / {selectedLeg.confidence}% confidence
              </div>
            </div>
          ) : null}

          <QuotePanel market={marketView} />

          <div className="grid grid-cols-2 gap-2">
            {(["support", "oppose"] as const).map((side) => (
              <button
                key={side}
                type="button"
                onClick={() => setDirection(side)}
                className={cn(
                  "mono rounded-sm border px-3 py-2 text-[10px] font-bold uppercase tracking-widest transition-colors",
                  direction === side
                    ? side === "support"
                      ? "border-[#b4ff5a] bg-[#b4ff5a] text-black"
                      : "border-[#ff7744] bg-[#ff7744] text-black"
                    : "border-[#222] text-[#666] hover:border-[#555] hover:text-white"
                )}
              >
                {side}
              </button>
            ))}
          </div>

          <label className="block">
            <span className="label">Order stake</span>
            <div className="mt-2 flex items-center rounded-sm border border-[#1a1a1a] bg-[#0f0f0f] px-3 py-2 focus-within:border-[#b4ff5a]">
              <input
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                inputMode="decimal"
                className="mono w-full bg-transparent text-lg text-white outline-none"
              />
              <span className="mono text-[10px] text-[#555]">TEST ETH</span>
            </div>
          </label>

          <ExecutionBlock
            isConnected={isConnected}
            isWrongChain={isWrongChain}
            hasContractAddress={Boolean(contractAddress)}
            hasPathId={Boolean(onchainPathId)}
            amountIsValid={amountIsValid}
            writeError={writeError}
            submitError={submitError}
            loadError={loadError}
            submittedHash={submittedHash}
            isConfirming={isConfirming}
            isConfirmed={isConfirmed}
            txMode={txMode}
          />

          <LivePoolPanel market={marketView} />
          <LiveOrderBook market={marketView} />

          {isWrongChain ? (
            <button
              type="button"
              onClick={() => switchChain({ chainId: settlementChainId })}
              disabled={isSwitching}
              className="mono flex w-full items-center justify-center gap-2 rounded-sm border border-[#333] px-3 py-3 text-[10px] font-bold uppercase tracking-[0.15em] text-[#b4ff5a] hover:border-[#b4ff5a] disabled:opacity-60"
            >
              {isSwitching ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
              Switch to {settlementChainName}
            </button>
          ) : (
            <div className="grid gap-2">
              <button
                type="button"
                onClick={() => void placeOrder()}
                disabled={!canSubmit}
                className={cn(
                  "mono flex w-full items-center justify-center gap-2 rounded-sm py-3 text-[10px] font-bold uppercase tracking-[0.15em] transition-all",
                  canSubmit
                    ? "bg-[#b4ff5a] text-black hover:shadow-[0_0_25px_rgba(180,255,90,0.2)]"
                    : "cursor-not-allowed border border-[#222] bg-[#0a0a0a] text-[#444]"
                )}
              >
                {isWriting || isConfirming ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Send className="size-4" aria-hidden />}
                {isConfirming && txMode === "stake" ? "Confirming order" : "Execute order"}
              </button>
              <button
                type="button"
                onClick={() => void claimReward()}
                disabled={!canClaim}
                className={cn(
                  "mono flex w-full items-center justify-center gap-2 rounded-sm border py-3 text-[10px] font-bold uppercase tracking-[0.15em] transition-all",
                  canClaim
                    ? "border-[#b4ff5a] text-[#b4ff5a] hover:bg-[#b4ff5a] hover:text-black"
                    : "cursor-not-allowed border-[#222] bg-[#0a0a0a] text-[#444]"
                )}
              >
                {isWriting || isConfirming ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Trophy className="size-4" aria-hidden />}
                {isConfirming && txMode === "claim" ? "Confirming claim" : "Claim reward"}
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="mt-3 rounded-sm border border-[#211a10] bg-[#100d06] p-3">
          <div className="mono flex items-center gap-2 text-[10px] uppercase tracking-widest text-[#ffaa44]">
            <AlertTriangle className="size-3" aria-hidden />
            No published path markets available
          </div>
          <p className="mt-2 text-xs leading-5 text-[#777]">
            Publish a Path Contract first, or refresh after another wallet creates one. Order execution never uses mock path ids.
          </p>
        </div>
      )}
    </section>
  );
}

function ExecutionBlock({
  isConnected,
  isWrongChain,
  hasContractAddress,
  hasPathId,
  amountIsValid,
  writeError,
  submitError,
  loadError,
  submittedHash,
  isConfirming,
  isConfirmed,
  txMode
}: {
  isConnected: boolean;
  isWrongChain: boolean;
  hasContractAddress: boolean;
  hasPathId: boolean;
  amountIsValid: boolean;
  writeError: Error | null;
  submitError: string | null;
  loadError: IntelligenceError | null;
  submittedHash?: `0x${string}`;
  isConfirming: boolean;
  isConfirmed: boolean;
  txMode: "stake" | "claim";
}) {
  const rows = [
    { label: "Wallet connected", ready: isConnected, hard: true },
    { label: `${settlementChainName} network`, ready: !isWrongChain, hard: true },
    { label: "PathMarket contract configured", ready: hasContractAddress, hard: true },
    { label: "On-chain path id", ready: hasPathId, hard: true },
    { label: "Stake amount", ready: amountIsValid, hard: true }
  ];

  return (
    <div className="rounded-sm border border-[#101010] bg-[#050505] p-3">
      <div className="space-y-2">
        {rows.map((row) => (
          <div
            key={row.label}
            className="mono flex items-center justify-between gap-3 text-[9px] uppercase tracking-widest"
          >
            <span className={row.ready ? "text-[#aaa]" : "text-[#555]"}>{row.label}</span>
            <span className={row.ready ? "text-[#b4ff5a]" : row.hard ? "text-[#ff7777]" : "text-[#ffaa44]"}>
              {row.ready ? <Check className="size-3" aria-hidden /> : "blocked"}
            </span>
          </div>
        ))}
      </div>

      {submittedHash ? (
        <a
          href={explorerTxUrl(submittedHash)}
          target="_blank"
          rel="noreferrer"
          className="mono mt-3 flex items-center justify-between gap-3 rounded-sm border border-[#182810] bg-[#071006] px-3 py-2 text-[9px] uppercase tracking-widest text-[#b4ff5a]"
        >
          <span>
            {isConfirmed
              ? txMode === "claim"
                ? "Reward claim confirmed"
                : "Order confirmed"
              : isConfirming
                ? txMode === "claim"
                  ? "Reward claim submitted"
                  : "Order submitted"
                : "Transaction sent"}
          </span>
          <span className="inline-flex items-center gap-1">
            {shortHash(submittedHash)}
            <ExternalLink className="size-3" aria-hidden />
          </span>
        </a>
      ) : null}

      {submitError || writeError || loadError ? (
        <div className="mono mt-3 rounded-sm border border-[#3a1f1f] bg-[#120707] p-2 text-[9px] uppercase tracking-widest text-[#ff9999]">
          {submitError ?? writeError?.message ?? loadError?.message}
        </div>
      ) : null}
    </div>
  );
}

function LivePoolPanel({ market }: { market: PathMarketView | null }) {
  const pool = market?.pool;
  return (
    <section className="rounded-sm border border-[#101010] bg-[#050505] p-3">
      <div className="label label-active">LIVE POOL</div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <PoolMetric label="Total Liquidity" value={`${pool?.totalLiquidity ?? "0"} ETH`} />
        <PoolMetric label="Participants" value={String(pool?.participantCount ?? 0)} />
        <PoolMetric label="Bull Stakes" value={`${pool?.supportTotal ?? "0"} ETH`} />
        <PoolMetric label="Bear Stakes" value={`${pool?.opposeTotal ?? "0"} ETH`} />
        <PoolMetric label="Average Entry" value={`${pool?.averageEntry ?? "0"} ETH`} />
        <PoolMetric label="Largest Position" value={`${pool?.largestPosition ?? "0"} ETH`} />
      </div>
      <div className="mt-3 overflow-hidden rounded-sm border border-[#111] bg-black">
        <div className="h-2 bg-[#ff7744]">
          <div
            className="h-full bg-[#b4ff5a]"
            style={{ width: `${pool?.supportShare ?? 0}%` }}
          />
        </div>
        <div className="mono flex justify-between px-2 py-1 text-[8px] uppercase tracking-widest text-[#555]">
          <span>Support {pool?.supportShare ?? 0}%</span>
          <span>Oppose {pool?.opposeShare ?? 0}%</span>
        </div>
      </div>
    </section>
  );
}

function QuotePanel({ market }: { market: PathMarketView | null }) {
  const pricing = market?.pricing;
  return (
    <section className="rounded-sm border border-[#101010] bg-[#050505] p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="label label-active">PATH QUOTE</div>
        <span className="mono text-[8px] uppercase tracking-widest text-[#444]">
          {pricing?.marketDepth ?? "awaiting market"}
        </span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <PoolMetric label="Support Bid / Ask" value={pricing ? `${pricing.supportBid} / ${pricing.supportAsk}` : "-- / --"} />
        <PoolMetric label="Oppose Bid / Ask" value={pricing ? `${pricing.opposeBid} / ${pricing.opposeAsk}` : "-- / --"} />
        <PoolMetric label="Spread" value={pricing ? `${pricing.spreadBps} bps` : "--"} />
        <PoolMetric label="Slippage" value={pricing ? `${pricing.defaultStakeSlippageBps} bps` : "--"} />
      </div>
      <p className="mt-3 text-[11px] leading-5 text-[#666]">
        {pricing?.feedbackLoop ?? "Quote appears after the market state loads from the NarrativeOS backend."}
      </p>
    </section>
  );
}

function LiveOrderBook({ market }: { market: PathMarketView | null }) {
  const orders = market?.latestOrders ?? [];
  return (
    <section className="rounded-sm border border-[#101010] bg-[#050505] p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="label label-active">LIVE ORDER BOOK</div>
        <span className="mono text-[8px] uppercase tracking-widest text-[#444]">
          {orders.length ? "polling 12s" : "awaiting fills"}
        </span>
      </div>
      <div className="mt-3 space-y-2">
        {orders.length ? (
          orders.slice(0, 5).map((order) => (
            <a
              key={order.id}
              href={order.explorerUrl ?? undefined}
              target={order.explorerUrl ? "_blank" : undefined}
              rel="noreferrer"
              className="grid gap-2 rounded-sm border border-[#111] bg-black p-2 text-xs text-[#777] hover:border-[#333]"
            >
              <div className="mono flex items-center justify-between gap-2 text-[9px] uppercase tracking-widest">
                <span className={order.action === "support" ? "text-[#b4ff5a]" : "text-[#ff7744]"}>
                  {order.directionLabel}
                </span>
                <span className="text-white">{order.amount} ETH</span>
              </div>
              <div className="mono flex items-center justify-between gap-2 text-[8px] uppercase tracking-widest text-[#444]">
                <span>{order.userAddress ? shortAddress(order.userAddress) : "unknown wallet"}</span>
                <span>{order.txHash ? shortHash(order.txHash) : "pending hash"}</span>
              </div>
            </a>
          ))
        ) : (
          <div className="rounded-sm border border-[#151515] bg-black p-3 text-xs leading-5 text-[#666]">
            Confirmed support and oppose transactions appear here after wallet settlement.
          </div>
        )}
      </div>
    </section>
  );
}

function PoolMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-sm border border-[#151515] bg-black/70 p-2">
      <div className="mono text-[8px] uppercase tracking-widest text-[#444]">{label}</div>
      <div className="mono mt-1 truncate text-[11px] font-bold text-white">{value}</div>
    </div>
  );
}

function shortAddress(value: string) {
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

function shortHash(value: string) {
  return `${value.slice(0, 8)}...${value.slice(-6)}`;
}
