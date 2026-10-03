'use client'

import { useState } from 'react'
import { Activity, ChevronDown, FileWarning, FlaskConical } from 'lucide-react'
import type { AlertKind, RunAlert } from '@/lib/surveillance'
import { displayLocationName, explainAlert, formatDate, isSyntheticName, levelWord } from '@/lib/surveillance'

export const KIND_STYLE: Record<AlertKind, { icon: typeof Activity; accent: string; text: string; soft: string }> = {
  infection: { icon: Activity, accent: '#f59e0b', text: 'text-amber-300', soft: 'bg-amber-500/10' },
  operations: { icon: FlaskConical, accent: '#a78bfa', text: 'text-violet-300', soft: 'bg-violet-500/10' },
  reporting: { icon: FileWarning, accent: '#38bdf8', text: 'text-sky-300', soft: 'bg-sky-500/10' },
}

const LEVEL_STYLE: Record<string, string> = {
  critical: 'border-red-500/70 text-red-300', high: 'border-rose-500/60 text-rose-300',
  medium: 'border-amber-500/60 text-amber-300', low: 'border-slate-600 text-slate-300',
}

export function SyntheticTag({ className = '' }: { className?: string }) {
  return <span title="Simulated data for demonstration." className={`inline-flex items-center border border-amber-700/50 px-1 py-px align-middle text-[9px] font-semibold uppercase tracking-wider text-amber-400/90 ${className}`}>synthetic</span>
}

export function LocationLabel({ name, className = '' }: { name: string; className?: string }) {
  return <span className={`inline-flex flex-wrap items-center gap-1.5 ${className}`}>{displayLocationName(name)}{isSyntheticName(name) && <SyntheticTag />}</span>
}

export function AlertCard({ alert, compact = false, defaultOpen = false }: { alert: RunAlert; compact?: boolean; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen || !compact)
  const { kind, title, info, evidence, pattern } = explainAlert(alert)
  const style = KIND_STYLE[kind]
  const Icon = style.icon
  return <article className="relative border-b border-slate-800/80 p-4 last:border-0" style={{ boxShadow: `inset 3px 0 0 ${style.accent}` }}>
    <div className="flex items-start gap-3">
      <span className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center ${style.soft}`}><Icon size={16} className={style.text} aria-hidden="true" /></span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <h3 className="font-sans text-[15px] font-semibold leading-snug text-slate-100">{title}</h3>
          <span className={`shrink-0 border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${LEVEL_STYLE[alert.severity] ?? LEVEL_STYLE.low}`} title="Priority reflects the size of the change, how long it lasts, and how many signs agree.">{levelWord(alert.severity)} priority</span>
        </div>
        <p className="mt-1 text-xs text-slate-400"><LocationLabel name={alert.location} className="text-slate-200" /> · week of {formatDate(alert.start_date)}</p>
      </div>
    </div>
    <ul className="mt-3 space-y-1.5 pl-11 font-sans text-sm leading-6 text-slate-300">
      {(open ? evidence : evidence.slice(0, 1)).map(line => <li key={line} className="relative before:absolute before:-left-3 before:top-[11px] before:h-1 before:w-1 before:bg-slate-500">{line}</li>)}
    </ul>
    {open && <div className="mt-3 space-y-3 pl-11">
      {pattern.length > 0 && <p className="font-sans text-sm leading-6 text-slate-400">{pattern.join(' ')}</p>}
      <p className="font-sans text-sm leading-6 text-slate-400">{info.meaning}</p>
      <div className="border border-slate-800 bg-slate-900/40 p-3">
        <p className="text-[10px] uppercase tracking-wider text-cyan-300/90">Suggested next step · {info.who}</p>
        <p className="mt-1 font-sans text-sm leading-6 text-slate-200">{info.nextStep}</p>
      </div>
    </div>}
    <div className="mt-3 flex items-center justify-between gap-3 pl-11 text-[11px] text-slate-500">
      <span title="How unusual the pattern is, from 0 (normal) to 1 (very unusual).">Alert score {alert.risk_score.toFixed(2)} of 1</span>
      {compact && <button onClick={() => setOpen(!open)} className="inline-flex items-center gap-1 text-slate-400 hover:text-slate-100" aria-expanded={open}>{open ? 'Less' : 'What to do'}<ChevronDown size={13} className={`transition ${open ? 'rotate-180' : ''}`} /></button>}
    </div>
  </article>
}
