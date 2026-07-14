import type { Address } from "viem";

export const pathMarketAbi = [
  {
    type: "function",
    name: "createLinearPath",
    stateMutability: "payable",
    inputs: [
      { name: "termsHash", type: "bytes32" },
      { name: "legCount", type: "uint8" }
    ],
    outputs: [{ name: "pathId", type: "uint256" }]
  },
  {
    type: "function",
    name: "stakeLeg",
    stateMutability: "payable",
    inputs: [
      { name: "pathId", type: "uint256" },
      { name: "legIndex", type: "uint8" },
      { name: "support", type: "bool" }
    ],
    outputs: []
  },
  {
    type: "function",
    name: "claimReward",
    stateMutability: "nonpayable",
    inputs: [{ name: "pathId", type: "uint256" }],
    outputs: [{ name: "amount", type: "uint256" }]
  }
] as const;

export const settlementChainId = Number(
  process.env.NEXT_PUBLIC_SETTLEMENT_CHAIN_ID ||
    process.env.NEXT_PUBLIC_VALUECHAIN_CHAIN_ID ||
    421614
);

export const settlementChainName =
  process.env.NEXT_PUBLIC_SETTLEMENT_CHAIN_NAME || "Arbitrum Sepolia";

export const settlementExplorerUrl =
  process.env.NEXT_PUBLIC_SETTLEMENT_EXPLORER_URL || "https://sepolia.arbiscan.io";

export function pathMarketAddress(): Address | null {
  const value = process.env.NEXT_PUBLIC_PATH_MARKET_CONTRACT_ADDRESS;
  if (!value?.startsWith("0x")) {
    return null;
  }
  return value as Address;
}

export function explorerTxUrl(txHash: string) {
  return `${settlementExplorerUrl.replace(/\/$/, "")}/tx/${txHash}`;
}
