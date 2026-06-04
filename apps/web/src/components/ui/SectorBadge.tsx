export function SectorBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="mono border border-[#2a2a2a] px-2 py-0.5 text-[9px] uppercase tracking-widest text-[#777]">
      {children}
    </span>
  );
}
