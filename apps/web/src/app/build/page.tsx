import { Suspense } from "react";

import { PathContractBuilder } from "@/components/builder/PathContractBuilder";

export default function BuildPage() {
  return (
    <main className="min-h-screen bg-black p-4 pt-24">
      <Suspense fallback={<BuildFallback />}>
        <PathContractBuilder />
      </Suspense>
    </main>
  );
}

function BuildFallback() {
  return (
    <div className="flex min-h-[calc(100vh-140px)] items-center justify-center rounded-sm border border-[#111] bg-black">
      <p className="mono text-[10px] uppercase tracking-widest text-[#777]">
        Loading Path Contract Engine
      </p>
    </div>
  );
}
