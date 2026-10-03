'use client'

import { useMemo, useState } from 'react'
import type { Signal } from '@/lib/surveillance'
import { displayLocationName, driverText, formatDate, formatMetric, latestByLocation, weekStatus } from '@/lib/surveillance'
import { GEO, LAKES_PATH, NEIGHBOUR_PATH, UGANDA_PATH } from '@/lib/uganda-geo'
import { SyntheticTag } from './alert-card'

type Tone = 'normal' | 'watch' | 'unusual'
export const TONE: Record<Tone, { label: string; color: string; text: string; help: string }> = {
  normal: { label: 'Normal', color: '#2dd4bf', text: 'text-teal-300', help: 'Numbers are within the usual range' },
  watch: { label: 'Watch', color: '#f59e0b', text: 'text-amber-300', help: 'Some change, under watch' },
  unusual: { label: 'Unusual', color: '#fb4b65', text: 'text-rose-300', help: 'Large change that needs a check' },
}

const px = (lon: number) => ((lon - GEO.minLon) / (GEO.maxLon - GEO.minLon)) * GEO.width
const py = (lat: number) => ((GEO.maxLat - lat) / (GEO.maxLat - GEO.minLat)) * GEO.height

function Marker({ signal, selected, hovered, onSelect, onHover }: { signal: Signal; selected: boolean; hovered: boolean; onSelect: () => void; onHover: (on: boolean) => void }) {
  const x = px(signal.observation.longitude), y = py(signal.observation.latitude)
  const tone = weekStatus(signal).tone
  const t = TONE[tone]
  const name = displayLocationName(signal.observation.location_name)
  const left = x > 70
  return <g role="button" tabIndex={0} aria-label={`${name}: ${t.label} in the latest week`} aria-pressed={selected} className="map-marker cursor-pointer outline-none"
    onClick={onSelect} onMouseEnter={() => onHover(true)} onMouseLeave={() => onHover(false)} onFocus={() => onHover(true)} onBlur={() => onHover(false)}
    onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect() } }}>
    {tone !== 'normal' && <circle className={`map-marker-ping ${tone === 'unusual' ? 'map-marker-ping-high' : 'map-marker-ping-medium'}`} cx={x} cy={y} r={2.6} fill="none" stroke={t.color} />}
    {selected && <circle cx={x} cy={y} r={3.6} fill="none" stroke="#e2e8f0" strokeWidth=".5" />}
    <circle cx={x} cy={y} r={selected ? 2.4 : hovered ? 2.1 : 1.7} fill={t.color} stroke="#071017" strokeWidth=".5" />
    <text x={x + (left ? -1 : 1) * (selected ? 4.4 : 3.2)} y={y + 1} textAnchor={left ? 'end' : 'start'} className={`map-marker-label ${selected ? 'map-marker-label-selected' : ''}`}>{name.replace(/ lab$/, '')}</text>
  </g>
}

export function SurveillanceMap({ signals, selectedId, onSelect, title = 'Lab status in the latest week' }: { signals: Signal[]; selectedId?: string; onSelect: (signal: Signal) => void; title?: string }) {
  const [hoveredId, setHoveredId] = useState<string>()
  const locations = useMemo(() => latestByLocation(signals).filter(s => s.observation.latitude != null && s.observation.longitude != null), [signals])
  const selected = locations.find(s => s.observation.location_id === selectedId)
  if (!locations.length) return <div className="flex min-h-[300px] items-center justify-center border border-slate-800 bg-[#0d1015] font-sans text-sm text-slate-500">No location data is available for this dataset.</div>
  const status = selected ? weekStatus(selected) : undefined
  const o = selected?.observation
  return <section className="flex flex-col border border-slate-800 bg-[#0b1016]" aria-label="Uganda laboratory map">
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-800 px-4 py-3">
      <div><h2 className="text-sm text-slate-100">{title}</h2><p className="mt-0.5 font-sans text-xs text-slate-500">Each dot is a laboratory. Select one to see its numbers.</p></div>
      <div className="flex flex-wrap gap-3 text-[10px] text-slate-300">{(Object.keys(TONE) as Tone[]).map(k => <span key={k} title={TONE[k].help} className="inline-flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full" style={{ background: TONE[k].color }} />{TONE[k].label}</span>)}</div>
    </div>
    <div className="relative mx-auto w-full max-w-[520px] flex-1 px-2">
      <svg viewBox={`0 0 ${GEO.width} ${GEO.height}`} className="h-full w-full" role="img" aria-label="Map of Uganda with laboratory locations">
        <path d={NEIGHBOUR_PATH} fill="#0d131a" stroke="#1f2a37" strokeWidth=".3" />
        <path d={UGANDA_PATH} fill="#121b25" stroke="#64748b" strokeWidth=".45" />
        <path d={LAKES_PATH} fill="#0a2232" stroke="#155e75" strokeWidth=".25" opacity=".9" />
        {locations.map(s => <Marker key={s.observation.location_id} signal={s} selected={s.observation.location_id === selectedId} hovered={s.observation.location_id === hoveredId}
          onSelect={() => onSelect(s)} onHover={on => setHoveredId(on ? s.observation.location_id : undefined)} />)}
      </svg>
    </div>
    {selected && o && status && <div className="border-t border-slate-800 bg-[#090c11] p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="h-2.5 w-2.5 rounded-full" style={{ background: TONE[status.tone].color }} />
        <p className="text-sm text-slate-100">{displayLocationName(o.location_name)}</p><SyntheticTag />
        <span className={`ml-auto text-xs ${TONE[status.tone].text}`}>{status.label} · week of {formatDate(o.observation_date)}</span>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-3 text-[11px] text-slate-500">
        <span>Positive tests<b className="mt-0.5 block text-base font-medium text-slate-100">{formatMetric('positive_tests', o.positive_tests)}</b></span>
        <span>Positivity<b className="mt-0.5 block text-base font-medium text-slate-100">{formatMetric('positivity_rate', o.positivity_rate)}</b></span>
        <span>Turnaround<b className="mt-0.5 block text-base font-medium text-slate-100">{formatMetric('median_tat_hours', o.median_tat_hours)}</b></span>
      </div>
      <p className="mt-3 font-sans text-xs leading-5 text-slate-400">{status.tone === 'normal' ? `${o.pathogen[0].toUpperCase()}${o.pathogen.slice(1)} testing is within the normal range for this lab.` : `Main change: ${driverText(selected.drivers[0])}.`}</p>
    </div>}
  </section>
}
