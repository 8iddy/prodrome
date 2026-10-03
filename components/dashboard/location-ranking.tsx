'use client'

import type { Signal } from '@/lib/surveillance'
import { displayLocationName, driverText, formatDate, latestByLocation, weekStatus } from '@/lib/surveillance'
import { TONE } from './surveillance-map'

export function LocationRanking({ signals, onSelect, selectedId }: { signals: Signal[]; onSelect: (signal: Signal) => void; selectedId?: string }) {
  const locations = latestByLocation(signals).sort((a, b) => b.risk_score - a.risk_score)
  return <section className="overflow-hidden border border-slate-800 bg-[#0d1015]">
    <div className="border-b border-slate-800 px-4 py-3"><h2 className="text-sm text-slate-100">All labs, latest week</h2><p className="mt-0.5 font-sans text-xs text-slate-500">Labs with the largest change are at the top. Select a row to see it on the map.</p></div>
    <ul>{locations.map(signal => {
      const status = weekStatus(signal); const t = TONE[status.tone]; const active = signal.observation.location_id === selectedId
      return <li key={signal.observation.location_id}><button onClick={() => onSelect(signal)} className={`flex w-full items-center gap-3 border-t border-slate-800/80 px-4 py-3 text-left transition hover:bg-slate-800/40 ${active ? 'bg-slate-800/40' : ''}`}>
        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: t.color }} />
        <span className="min-w-0 flex-1"><span className="block text-sm text-slate-100">{displayLocationName(signal.observation.location_name)}</span><span className="block truncate font-sans text-xs text-slate-500">{status.tone === 'normal' ? 'Within normal range' : driverText(signal.drivers[0])}</span></span>
        <span className="shrink-0 text-right"><span className={`block text-xs ${t.text}`}>{status.label}</span><span className="block text-[10px] text-slate-500">{formatDate(signal.observation.observation_date)}</span></span>
      </button></li>
    })}</ul>
  </section>
}
