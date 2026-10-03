export function DataModeBadge({ mode = 'SYNTHETIC' }: { mode?: string }) {
  return <span title="All numbers on this site come from a simulation built for demonstration." className="whitespace-nowrap border border-amber-700/70 bg-amber-950/35 px-2 py-1 text-[10px] font-semibold tracking-[.12em] text-amber-300"><span className="hidden sm:inline">DEMO DATA · </span>{mode}</span>
}
