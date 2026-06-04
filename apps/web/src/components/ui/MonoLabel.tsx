export function MonoLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="mono text-[9px] uppercase tracking-widest text-[#444]">
      {children}
    </span>
  );
}
