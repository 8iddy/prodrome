'use client'

import { useMemo } from 'react'
import type { Signal } from '@/lib/surveillance'
import { driverText, latestByLocation } from '@/lib/surveillance'

function color(risk: number) { return risk >= .8 ? '#ef4444' : risk >= .65 ? '#f59e0b' : risk >= .55 ? '#eab308' : '#64748b' }
export function SurveillanceMap({ signals, selectedId, onSelect }: { signals: Signal[]; selectedId?: string; onSelect: (signal: Signal) => void }) {
  const locations = useMemo(() => latestByLocation(signals).filter(s => s.observation.latitude != null && s.observation.longitude != null), [signals])
  const selected = locations.find(signal => signal.observation.location_id === selectedId)
  const minLat = -1.5, maxLat = 4.5, minLng = 29.5, maxLng = 35.5
  const x = (lon: number) => ((lon - minLng) / (maxLng - minLng)) * 100
  const y = (lat: number) => ((maxLat - lat) / (maxLat - minLat)) * 100
  if (!locations.length) return <div className="flex min-h-[400px] items-center justify-center border border-slate-800 bg-[#0d1015] text-sm text-slate-500">No geographic metadata is available for this dataset.</div>
  return <div className="relative min-h-[430px] overflow-hidden border border-slate-800 bg-[#0b1016]">
    <div className="absolute inset-0 opacity-50" style={{ backgroundImage: 'linear-gradient(#1e293b 1px, transparent 1px), linear-gradient(90deg, #1e293b 1px, transparent 1px)', backgroundSize: '10% 10%' }} />
    <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid meet">
      <path d="M42 5 L55 6 L67 13 L77 25 L80 40 L73 53 L79 68 L70 88 L58 96 L46 88 L37 91 L25 78 L19 60 L23 44 L19 27 L28 13 Z" fill="#121b25" stroke="#475569" strokeWidth=".7" />
      {locations.map(signal => { const o=signal.observation; const active=o.location_id===selectedId; return <g key={o.location_id} onClick={() => onSelect(signal)} className="cursor-pointer"><circle cx={x(o.longitude)} cy={y(o.latitude)} r={active ? 3.8 : 2.5} fill="none" stroke={color(signal.risk_score)} strokeWidth=".7" opacity=".4"/><circle cx={x(o.longitude)} cy={y(o.latitude)} r={active ? 2.3 : 1.6} fill={color(signal.risk_score)} stroke="#0b1016" strokeWidth=".6"/></g> })}
    </svg>
    <div className="absolute left-3 top-3 text-[10px] uppercase tracking-wider text-slate-400">Geographic surveillance state</div>
    <div className="absolute right-3 top-3 flex gap-3 text-[10px] text-slate-400"><span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-red-500" />High</span><span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-amber-500" />Medium</span><span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-yellow-500" />Low</span></div>
    {selected && <div className="absolute bottom-3 left-3 max-w-sm border border-slate-700 bg-[#090c11]/95 p-3 shadow-xl"><div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full" style={{background:color(selected.risk_score)}}/><p className="text-sm text-slate-100">{selected.observation.location_name}</p><span className="ml-auto text-xs text-amber-300">{selected.risk_score.toFixed(2)}</span></div><p className="mt-1 text-xs text-slate-400">{selected.observation.pathogen} · {selected.observation.observation_date}</p><div className="mt-3 grid grid-cols-3 gap-3 text-xs text-slate-400"><span>Tests <b className="block text-slate-100">{selected.observation.tests_completed ?? '—'}</b></span><span>Positives <b className="block text-slate-100">{selected.observation.positive_tests ?? '—'}</b></span><span>Positivity <b className="block text-slate-100">{selected.observation.positivity_rate == null ? '—' : `${(selected.observation.positivity_rate*100).toFixed(1)}%`}</b></span></div><p className="mt-3 border-t border-slate-800 pt-2 text-xs text-slate-300">{driverText(selected.drivers[0])}</p></div>}
  </div>
}
