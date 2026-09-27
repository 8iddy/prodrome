'use client'

import { useMemo, useState } from 'react'
import type { Signal } from '@/lib/surveillance'
import { displayLocationName, driverText, latestByLocation } from '@/lib/surveillance'

type RiskState = 'high' | 'medium' | 'low'

const RISK_STYLES: Record<RiskState, { label: string; color: string; text: string }> = {
  high: { label: 'High', color: '#fb4b65', text: '#fecdd3' },
  medium: { label: 'Medium', color: '#f59e0b', text: '#fde68a' },
  low: { label: 'Low', color: '#38bdf8', text: '#bae6fd' },
}

function riskState(risk: number): RiskState {
  if (risk >= .8) return 'high'
  if (risk >= .65) return 'medium'
  return 'low'
}

function MapMarker({ signal, x, y, selected, hovered, onSelect, onHover }: {
  signal: Signal; x: number; y: number; selected: boolean; hovered: boolean
  onSelect: () => void; onHover: (active: boolean) => void
}) {
  const state = riskState(signal.risk_score)
  const style = RISK_STYLES[state]
  const name = displayLocationName(signal.observation.location_name)
  const showLabel = selected || state === 'high'
  const labelOnLeft = x > 74
  const labelX = x + (labelOnLeft ? -3.3 : 3.3)
  const labelY = y - 3.3
  const markerRadius = selected ? 2.85 : hovered ? 2.25 : 1.85

  return <g
    role="button"
    tabIndex={0}
    aria-label={`${name}, ${style.label} risk, score ${signal.risk_score.toFixed(2)}, ${signal.observation.pathogen}`}
    className="map-marker cursor-pointer outline-none"
    onClick={onSelect}
    onMouseEnter={() => onHover(true)}
    onMouseLeave={() => onHover(false)}
    onFocus={() => onHover(true)}
    onBlur={() => onHover(false)}
    onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onSelect() } }}
  >
    {(selected || state === 'high' || state === 'medium') && <circle
      className={`map-marker-ping ${selected ? 'map-marker-ping-selected' : state === 'high' ? 'map-marker-ping-high' : 'map-marker-ping-medium'}`}
      cx={x} cy={y} r={selected ? 3.2 : state === 'high' ? 2.75 : 2.3} fill="none" stroke={style.color}
    />}
    {selected && <circle cx={x} cy={y} r={4.4} fill="none" stroke="#e2e8f0" strokeWidth=".65" opacity=".95" />}
    <circle cx={x} cy={y} r={selected ? 3.55 : hovered ? 2.95 : 2.55} fill={style.color} opacity={selected ? .22 : .13} />
    <circle cx={x} cy={y} r={markerRadius} fill={style.color} stroke={selected ? '#f8fafc' : '#071017'} strokeWidth={selected ? '.65' : '.5'} />
    <circle cx={x} cy={y} r={selected ? .8 : .55} fill="#f8fafc" opacity=".95" />
    {showLabel && <text x={labelX} y={labelY} textAnchor={labelOnLeft ? 'end' : 'start'} className="map-marker-label">{name}</text>}
    {hovered && <g pointerEvents="none" transform={`translate(${Math.min(64, Math.max(5, x - 16))} ${Math.max(7, y - 15)})`}>
      <rect width="32" height="11.5" rx="1" fill="#070b11" stroke={style.color} strokeWidth=".35" opacity=".98" />
      <text x="2" y="3.1" className="map-tooltip-title">{name}</text>
      <text x="2" y="6.5" className="map-tooltip-copy">{style.label} · {signal.risk_score.toFixed(2)}</text>
      <text x="2" y="9.5" className="map-tooltip-copy">{signal.observation.pathogen}</text>
    </g>}
  </g>
}

export function SurveillanceMap({ signals, selectedId, onSelect }: { signals: Signal[]; selectedId?: string; onSelect: (signal: Signal) => void }) {
  const [hoveredId, setHoveredId] = useState<string>()
  const locations = useMemo(() => latestByLocation(signals).filter(s => s.observation.latitude != null && s.observation.longitude != null), [signals])
  const selected = locations.find(signal => signal.observation.location_id === selectedId)
  const minLat = -1.5, maxLat = 4.5, minLng = 29.5, maxLng = 35.5
  const x = (lon: number) => ((lon - minLng) / (maxLng - minLng)) * 100
  const y = (lat: number) => ((maxLat - lat) / (maxLat - minLat)) * 100
  if (!locations.length) return <div className="flex min-h-[400px] items-center justify-center border border-slate-800 bg-[#0d1015] text-sm text-slate-500">No geographic metadata is available for this dataset.</div>

  return <div className="relative min-h-[430px] overflow-hidden border border-slate-800 bg-[#0b1016]" aria-label="Interactive Uganda surveillance map">
    <div className="absolute inset-0 opacity-50" style={{ backgroundImage: 'linear-gradient(#1e293b 1px, transparent 1px), linear-gradient(90deg, #1e293b 1px, transparent 1px)', backgroundSize: '10% 10%' }} />
    <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid meet">
      <path d="M42 5 L55 6 L67 13 L77 25 L80 40 L73 53 L79 68 L70 88 L58 96 L46 88 L37 91 L25 78 L19 60 L23 44 L19 27 L28 13 Z" fill="#121b25" stroke="#64748b" strokeWidth=".85" />
      <path d="M28 21 L42 27 L56 21 L72 30 M22 44 L42 48 L63 42 L77 50 M25 68 L46 65 L71 70" fill="none" stroke="#334155" strokeWidth=".35" opacity=".85" />
      {locations.map(signal => <MapMarker
        key={signal.observation.location_id}
        signal={signal}
        x={x(signal.observation.longitude)}
        y={y(signal.observation.latitude)}
        selected={signal.observation.location_id === selectedId}
        hovered={signal.observation.location_id === hoveredId}
        onSelect={() => onSelect(signal)}
        onHover={active => setHoveredId(active ? signal.observation.location_id : undefined)}
      />)}
    </svg>
    <div className="absolute left-3 top-3"><p className="text-[10px] uppercase tracking-wider text-slate-300">Uganda surveillance state</p><p className="mt-1 text-[10px] text-slate-500">Select a marker for location detail</p></div>
    <div className="absolute right-3 top-3 rounded-sm border border-slate-700/70 bg-[#090c11]/80 px-2 py-1.5 text-[10px] text-slate-300"><div className="flex gap-3">{(Object.keys(RISK_STYLES) as RiskState[]).map(state => <span key={state} className="inline-flex items-center gap-1"><i className="h-2.5 w-2.5 rounded-full border border-slate-100/40" style={{ backgroundColor: RISK_STYLES[state].color }} />{RISK_STYLES[state].label}</span>)}</div><p className="mt-1 text-[9px] text-slate-500">Pulse intensity indicates urgency</p></div>
    {selected && <div className="absolute bottom-3 left-3 max-w-sm border bg-[#090c11]/95 p-3 shadow-xl" style={{ borderColor: RISK_STYLES[riskState(selected.risk_score)].color }}><div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full ring-2 ring-slate-100/80" style={{ background: RISK_STYLES[riskState(selected.risk_score)].color }} /><div><p className="text-[9px] uppercase tracking-wider text-slate-500">Selected location</p><p className="text-sm text-slate-100">{displayLocationName(selected.observation.location_name)}</p></div><span className="ml-auto text-sm font-medium" style={{ color: RISK_STYLES[riskState(selected.risk_score)].text }}>{selected.risk_score.toFixed(2)}</span></div><p className="mt-1 text-xs" style={{ color: RISK_STYLES[riskState(selected.risk_score)].text }}>{RISK_STYLES[riskState(selected.risk_score)].label} risk · {selected.observation.pathogen} · {selected.observation.observation_date}</p><div className="mt-3 grid grid-cols-3 gap-3 text-xs text-slate-400"><span>Tests <b className="block text-slate-100">{selected.observation.tests_completed ?? '—'}</b></span><span>Positives <b className="block text-slate-100">{selected.observation.positive_tests ?? '—'}</b></span><span>Positivity <b className="block text-slate-100">{selected.observation.positivity_rate == null ? '—' : `${(selected.observation.positivity_rate * 100).toFixed(1)}%`}</b></span></div><p className="mt-3 border-t border-slate-800 pt-2 text-xs text-slate-300">{driverText(selected.drivers[0])}</p></div>}
  </div>
}
