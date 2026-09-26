'use client'

import type { Signal } from '@/lib/surveillance'
import { driverText, latestByLocation } from '@/lib/surveillance'

export function LocationRanking({ signals, onSelect }: { signals: Signal[]; onSelect: (signal: Signal) => void }) {
  const locations=latestByLocation(signals).sort((a,b)=>b.risk_score-a.risk_score)
  return <section className="overflow-hidden border border-slate-800 bg-[#0d1015]"><div className="border-b border-slate-800 px-3 py-2"><p className="text-xs text-slate-200">Locations ranked by current risk</p></div><div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead className="text-[10px] uppercase tracking-wider text-slate-500"><tr><th className="p-3">Location</th><th>Pathogen</th><th>Strongest driver</th><th>Last observation</th><th className="pr-3 text-right">Risk</th></tr></thead><tbody>{locations.map(signal=><tr key={signal.observation.location_id} onClick={()=>onSelect(signal)} className="cursor-pointer border-t border-slate-800/80 hover:bg-slate-800/40"><td className="p-3 text-slate-100">{signal.observation.location_name}</td><td className="text-slate-400">{signal.observation.pathogen}</td><td className="max-w-[280px] truncate text-slate-400">{driverText(signal.drivers[0])}</td><td className="text-slate-500">{signal.observation.observation_date}</td><td className="pr-3 text-right text-amber-300">{signal.risk_score.toFixed(2)}</td></tr>)}</tbody></table></div></section>
}
