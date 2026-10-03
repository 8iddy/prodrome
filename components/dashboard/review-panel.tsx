'use client'

import { useEffect, useState } from 'react'
import type { AlertReview, AlertStatus, NewReviewEntry } from '@/lib/reviews'
import { REVIEW_CHECKS, STATUS_LABEL, rememberReviewer, rememberedReviewer } from '@/lib/reviews'

export const STATUS_STYLE: Record<AlertStatus, string> = {
  new: 'border-cyan-700/70 text-cyan-200',
  under_review: 'border-amber-600/70 text-amber-200',
  verified: 'border-rose-500/70 text-rose-200',
  dismissed: 'border-slate-600 text-slate-400',
}

export function StatusBadge({ status }: { status: AlertStatus }) {
  return <span className={`shrink-0 border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${STATUS_STYLE[status]}`}>{STATUS_LABEL[status]}</span>
}

const stamp = (iso: string) => new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
const checkLabel = (id: string) => REVIEW_CHECKS.find(c => c.id === id)?.label ?? id

export function ReviewHistory({ review }: { review?: AlertReview }) {
  if (!review?.history.length) return <p className="font-sans text-xs text-slate-500">No review recorded yet.</p>
  return <ol className="space-y-2">{review.history.slice().reverse().map(entry => <li key={entry.id} className="border-l-2 border-slate-700 pl-3 font-sans text-xs leading-5 text-slate-400">
    <p className="text-slate-300"><StatusBadge status={entry.status} /> <span className="ml-1.5">{entry.reviewer}</span> <span className="text-slate-500">· {stamp(entry.recordedAt)}</span></p>
    {entry.checks.length > 0 && <p className="mt-1">Checks done: {entry.checks.map(checkLabel).join(', ')}.</p>}
    {entry.response && <p>Response: {entry.response}</p>}
    {entry.note && <p>Note: {entry.note}</p>}
  </li>)}</ol>
}

const DECISIONS: AlertStatus[] = ['under_review', 'verified', 'dismissed']

export function ReviewForm({ alertId, review, onRecord, onDone }: { alertId: string; review?: AlertReview; onRecord: (entry: Omit<NewReviewEntry, 'datasetId'>) => Promise<unknown>; onDone: () => void }) {
  const last = review?.history[review.history.length - 1]
  const [checks, setChecks] = useState<string[]>(last?.checks ?? [])
  const [status, setStatus] = useState<AlertStatus>(review && review.status !== 'new' ? review.status : 'under_review')
  const [response, setResponse] = useState('')
  const [note, setNote] = useState('')
  const [reviewer, setReviewer] = useState('')
  const [error, setError] = useState('')
  useEffect(() => { setReviewer(rememberedReviewer()) }, [])
  const toggle = (id: string) => setChecks(c => c.includes(id) ? c.filter(x => x !== id) : [...c, id])
  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!reviewer.trim()) { setError('Add the reviewer name.'); return }
    try {
      await onRecord({ alertId, status, checks, response: response.trim(), note: note.trim(), reviewer: reviewer.trim() })
      rememberReviewer(reviewer.trim()); onDone()
    } catch (err) { setError(err instanceof Error ? err.message : 'The review failed to save. Try again.') }
  }
  const field = 'w-full border border-slate-700 bg-[#080a0d] px-2.5 py-1.5 font-sans text-sm text-slate-100 placeholder:text-slate-600'
  return <form onSubmit={save} className="space-y-3 border border-slate-800 bg-[#0a0d12] p-3">
    <fieldset>
      <legend className="text-[10px] uppercase tracking-wider text-slate-500">Checks done</legend>
      <div className="mt-1.5 grid gap-1.5 sm:grid-cols-2">{REVIEW_CHECKS.map(c => <label key={c.id} className="flex items-center gap-2 font-sans text-sm text-slate-300">
        <input type="checkbox" checked={checks.includes(c.id)} onChange={() => toggle(c.id)} className="accent-cyan-500" />{c.label}</label>)}</div>
    </fieldset>
    <fieldset>
      <legend className="text-[10px] uppercase tracking-wider text-slate-500">Decision</legend>
      <div className="mt-1.5 flex flex-wrap gap-1.5">{DECISIONS.map(s => <label key={s} className={`cursor-pointer border px-2.5 py-1 text-xs ${status === s ? STATUS_STYLE[s] + ' bg-slate-800/60' : 'border-slate-800 text-slate-400'}`}>
        <input type="radio" name={`status-${alertId}`} value={s} checked={status === s} onChange={() => setStatus(s)} className="sr-only" />{STATUS_LABEL[s]}</label>)}</div>
    </fieldset>
    <label className="block"><span className="text-[10px] uppercase tracking-wider text-slate-500">Response taken</span>
      <textarea value={response} onChange={e => setResponse(e.target.value)} rows={2} className={`${field} mt-1.5`} placeholder="For example: district team asked to review recent case reports" /></label>
    <label className="block"><span className="text-[10px] uppercase tracking-wider text-slate-500">Note</span>
      <input value={note} onChange={e => setNote(e.target.value)} className={`${field} mt-1.5`} placeholder="What you found" /></label>
    <label className="block"><span className="text-[10px] uppercase tracking-wider text-slate-500">Reviewer</span>
      <input value={reviewer} onChange={e => setReviewer(e.target.value)} className={`${field} mt-1.5`} placeholder="Your name" autoComplete="name" /></label>
    {error && <p className="font-sans text-xs text-rose-300">{error}</p>}
    <div className="flex flex-wrap items-center gap-2">
      <button type="submit" className="border border-cyan-700 bg-cyan-950/50 px-3 py-1.5 text-xs text-cyan-100 hover:bg-cyan-900/50">Save review</button>
      <button type="button" onClick={onDone} className="px-2 py-1.5 text-xs text-slate-400 hover:text-slate-100">Cancel</button>
      <span className="font-sans text-[11px] text-slate-500">Saved in this browser for the prototype.</span>
    </div>
  </form>
}
