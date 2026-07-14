"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/cn";

const navItems = [
  { href: "/", label: "TERMINAL" },
  { href: "/markets", label: "MARKETS" },
  { href: "/narratives", label: "NARRATIVES" },
  { href: "/build", label: "CONTRACTS" },
  { href: "/portfolio", label: "PORTFOLIO" },
  { href: "/feed", label: "FEED" }
];

export function Navbar() {
  const pathname = usePathname();

  return (
    <header
      className="fixed left-0 right-0 top-0 z-[120] flex items-center justify-between px-6 py-4"
      style={{ borderBottom: "1px solid #0f0f0f", background: "rgba(0,0,0,0.8)", backdropFilter: "blur(20px)" }}
    >
      <a href="/" className="mono text-sm font-bold tracking-[0.1em] text-white">
        <span className="text-[#b4ff5a]">[✕]</span> NARRATIVEOS
      </a>
      <nav className="flex flex-wrap items-center gap-x-4 gap-y-2 lg:gap-5">
        {navItems.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <a
              key={item.href}
              href={item.href}
              className={cn(
                "mono border-b border-transparent py-1 text-[10px] uppercase tracking-widest text-[#444] transition-colors hover:text-white",
                active && "border-[#b4ff5a] text-white"
              )}
            >
              {item.label}
            </a>
          );
        })}
      </nav>
      <ConnectButton.Custom>
        {({ account, chain, mounted, openAccountModal, openChainModal, openConnectModal }) => {
          const ready = mounted;
          const connected = ready && account && chain;

          return (
            <div aria-hidden={!ready} className={!ready ? "opacity-0" : ""}>
              {connected ? (
                <button
                  type="button"
                  onClick={chain.unsupported ? openChainModal : openAccountModal}
                  className="mono rounded-sm border border-[#2a2a2a] px-3 py-1.5 text-[10px] uppercase tracking-widest text-[#b4ff5a] hover:border-[#b4ff5a]"
                >
                  {account.displayName}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={openConnectModal}
                  className="mono rounded-sm border border-[#2a2a2a] px-3 py-1.5 text-[10px] uppercase tracking-widest text-[#666] hover:border-[#b4ff5a] hover:text-[#b4ff5a]"
                >
                  CONNECT WALLET
                </button>
              )}
            </div>
          );
        }}
      </ConnectButton.Custom>
    </header>
  );
}
