"use client";

import { Send } from "lucide-react";

type EnterPathCTAProps = {
  onEnter: () => void;
};

export function EnterPathCTA({ onEnter }: EnterPathCTAProps) {
  return (
    <button
      type="button"
      onClick={onEnter}
      className="mono flex w-full items-center justify-center gap-2 rounded-full bg-[#b4ff5a] py-3 text-sm font-bold uppercase tracking-widest text-black transition-all duration-150 hover:scale-[1.01] hover:bg-[#c8ff70]"
    >
      <Send className="size-4" aria-hidden />
      ENTER PATH
    </button>
  );
}
