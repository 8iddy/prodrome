'use client'

import { useEffect, useState } from 'react'
import { Activity, ChevronDown, ClipboardCheck, FileWarning, FlaskConical } from 'lucide-react'
import type { AlertKind, RunAlert } from '@/lib/surveillance'
import { displayLocationName, explainAlert, formatDate, levelWord } from '@/lib/surveillance'
import type { AlertReview, NewReviewEntry } from '@/lib/reviews'
import { ReviewForm, ReviewHistory, StatusBadge } from './review-panel'
import { Term } from './term'

export const KIND_STYLE: Record<AlertKind, { icon: typeof Activity; accent: string; text: string; soft: string }> = {
  infection: { icon: Activity, accent: '#f59e0b', text: 'text-amber-300', soft: 'bg-amber-500/10' },
  operations: { icon: FlaskConical, accent: '#a78bfa', text: 'text-violet-300', soft: 'bg-violet-500/10' },
  reporting: { icon: FileWarning, accent: '#38bdf8', text: 'text-sky-300', soft: 'bg-sky-500/10' },
}

const LEVEL_STYLE: Record<string, string> = {
  critical: 'border-red-500/70 text-red-300', high: 'border-rose-500/60 text-rose-300',
  medium: 'border-amber-500/60 text-amber-300', low: 'border-slate-600 text-slate-300',
}

export type ReviewProps = { review?: AlertReview; onRecord?: (entry: Omit<NewReviewEntry, 'datasetId'>) => Promise<unknown> }

export function AlertCard({ alert, compact = false, defaultOpen = false, review, onRecord }: { alert: RunAlert; compact?: boolean; defaultOpen?: boolean } & ReviewProps) {
  const [open, setOpen] = useState(defaultOpen || !compact)
  const [reviewing, setReviewing] = useState(false)
  useEffect(() => { if (defaultOpen) { setOpen(true); setTimeout(() => document.getElementById(`alert-${alert.alert_id}`)?.scrollIntoView({ block: 'start' }), 100) } }, [defaultOpen, alert.alert_id])
  const { kind, title, info, evidence, pattern } = explainAlert(alert)
  const style = KIND_STYLE[kind]
  const Icon = style.icon
  const reviewable = Boolean(onRecord)
  return <article id={`alert-${alert.alert_id}`} className="relative border-b border-slate-800/80 p-4 last:border-0" style={{ boxShadow: `inset 3px 0 0 ${style.accent}` }}>
    <div className="flex items-start gap-3">
      <span className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center ${style.soft}`}><Icon size={16} className={style.text} aria-hidden="true" /></span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <h3 className="font-sans text-[15px] font-semibold leading-snug text-slate-100">{title}</h3>
          <span className="flex flex-wrap gap-1.5">
            {reviewable && <StatusBadge status={review?.status ?? 'new'} />}
            <span className={`shrink-0 border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${LEVEL_STYLE[alert.severity] ?? LEVEL_STYLE.low}`} title="Priority reflects the size of the change, how long it lasts, and how many signs agree.">{levelWord(alert.severity)} priority</span>
          </span>
        </div>
        <p className="mt-1 text-xs text-slate-400"><span className="text-slate-200">{displayLocationName(alert.location)}</span> · week of {formatDate(alert.start_date)}</p>
      </div>
    </div>
    <ul className="mt-3 space-y-1.5 pl-11 font-sans text-sm leading-6 text-slate-300">
      {(open ? evidence : evidence.slice(0, 1)).map(line => <li key={line} className="relative before:absolute before:-left-3 before:top-[11px] before:h-1 before:w-1 before:bg-slate-500">{line}</li>)}
    </ul>
    {open && <div className="mt-3 space-y-3 pl-11">
      {pattern.length > 0 && <p className="font-sans text-sm leading-6 text-slate-400">{pattern.join(' ')}</p>}
      <dl className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-500">
        <div><dt className="inline"><Term k="persistence" />: </dt><dd className="inline text-slate-300">{alert.persistence} week{alert.persistence === 1 ? '' : 's'}</dd></div>
        <div><dt className="inline"><Term k="corroboration" />: </dt><dd className="inline text-slate-300">{[alert.supporting_drivers?.length ? `${alert.supporting_drivers.length} more measure${alert.supporting_drivers.length === 1 ? '' : 's'}` : '', alert.spatial_corroboration ? `${alert.spatial_corroboration} other location${alert.spatial_corroboration === 1 ? '' : 's'}` : ''].filter(Boolean).join(', ') || 'none'}</dd></div>
        <div><dt className="inline"><Term k="quality" />: </dt><dd className="inline text-slate-300">{alert.data_quality?.length ? alert.data_quality.join(', ').replace(/_/g, ' ') : 'no flags'}</dd></div>
      </dl>
      <p className="font-sans text-sm leading-6 text-slate-400">{info.meaning}</p>
      <div className="border border-slate-800 bg-slate-900/40 p-3">
        <p className="text-[10px] uppercase tracking-wider text-cyan-300/90">Suggested next step · {info.who}</p>
        <p className="mt-1 font-sans text-sm leading-6 text-slate-200">{info.nextStep}</p>
      </div>
      {reviewable && <div className="space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[10px] uppercase tracking-wider text-slate-500">Review</p>
          {!reviewing && <button onClick={() => setReviewing(true)} className="inline-flex items-center gap-1.5 border border-cyan-800 bg-cyan-950/40 px-2.5 py-1 text-[11px] text-cyan-200 hover:bg-cyan-900/50"><ClipboardCheck size={13} />{review ? 'Update review' : 'Start review'}</button>}
        </div>
        {reviewing && onRecord && <ReviewForm alertId={alert.alert_id} review={review} onRecord={onRecord} onDone={() => setReviewing(false)} />}
        <ReviewHistory review={review} />
      </div>}
    </div>}
    <div className="mt-3 flex items-center justify-between gap-3 pl-11 text-[11px] text-slate-500">
      <span className="whitespace-nowrap"><Term k="risk">Risk score</Term> {alert.risk_score.toFixed(2)} of 1</span>
      {compact && <button onClick={() => setOpen(!open)} className="inline-flex items-center gap-1 whitespace-nowrap text-slate-400 hover:text-slate-100" aria-expanded={open}>{open ? 'Less' : reviewable ? 'Review' : 'What to do'}<ChevronDown size={13} className={`transition ${open ? 'rotate-180' : ''}`} /></button>}
    </div>
  </article>
}
