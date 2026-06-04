"use client";

import { getDefaultConfig, RainbowKitProvider } from "@rainbow-me/rainbowkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type ReactNode, useState } from "react";
import { http, WagmiProvider } from "wagmi";
import { defineChain } from "viem";

const settlementChain = defineChain({
  id: Number(
    process.env.NEXT_PUBLIC_SETTLEMENT_CHAIN_ID ||
      process.env.NEXT_PUBLIC_VALUECHAIN_CHAIN_ID ||
      421614
  ),
  name: process.env.NEXT_PUBLIC_SETTLEMENT_CHAIN_NAME || "Arbitrum Sepolia",
  nativeCurrency: {
    decimals: 18,
    name: "Arbitrum Sepolia Ether",
    symbol: "ETH"
  },
  rpcUrls: {
    default: {
      http: [
        process.env.NEXT_PUBLIC_SETTLEMENT_RPC_URL ||
          process.env.NEXT_PUBLIC_VALUECHAIN_RPC_URL ||
          "https://sepolia-rollup.arbitrum.io/rpc"
      ]
    }
  },
  blockExplorers: {
    default: {
      name: "Arbiscan",
      url: process.env.NEXT_PUBLIC_SETTLEMENT_EXPLORER_URL || "https://sepolia.arbiscan.io"
    }
  },
  testnet: true
});

const config = getDefaultConfig({
  appName: "NarrativeOS",
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "missing-walletconnect-project-id",
  chains: [settlementChain],
  transports: {
    [settlementChain.id]: http(
      process.env.NEXT_PUBLIC_SETTLEMENT_RPC_URL ||
        process.env.NEXT_PUBLIC_VALUECHAIN_RPC_URL ||
        undefined
    )
  },
  ssr: true
});

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider modalSize="compact" initialChain={settlementChain}>
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
