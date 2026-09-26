import type { AnalyticsRun, Signal } from '@/lib/surveillance'
import { latestByLocation } from '@/lib/surveillance'

export function OperationsKpis({ run }: { run: AnalyticsRun }) {
  const latest = latestByLocation(run.signals)
  const rising = latest.filter(signal => signal.risk_score >= .55).length
  const highest = Math.max(...latest.map(signal => signal.risk_score), 0)
  const cards = [
    ['Locations monitored', latest.length], ['Alert periods in run', run.alerts.length],
    ['Highest current risk', highest ? highest.toFixed(2) : '—'], ['Locations with rising signals', rising],
  ]
  return <div className="grid grid-cols-2 gap-3 md:grid-cols-4">{cards.map(([label, value]) => <div key={String(label)} className="border border-slate-800 bg-[#0d1015] px-3 py-3"><p className="text-[10px] uppercase tracking-wider text-slate-500">{label}</p><p className="mt-2 text-2xl font-medium text-slate-100">{value}</p></div>)}</div>
}
