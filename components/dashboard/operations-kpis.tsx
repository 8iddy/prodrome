import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import type { AnalyticsRun } from '@/lib/surveillance'
import { alertKind, alertKinds, displayLocationName, formatDate, latestByLocation, weekStatus } from '@/lib/surveillance'
import { sortAlerts } from './priority-alert-feed'

export function runSummary(run: AnalyticsRun) {
  const latest = latestByLocation(run.signals)
  const dates = run.signals.map(s => String(s.observation.observation_date)).sort()
  const unusual = latest.filter(s => weekStatus(s).tone !== 'normal')
  const byKind = { infection: 0, operations: 0, reporting: 0 }
  run.alerts.forEach(a => { byKind[alertKind(a.primary_driver)] += 1 })
  const mostRecent = sortAlerts(run.alerts, 'recent')[0]
  return { latest, first: dates[0], last: dates[dates.length - 1], unusual, byKind, mostRecent }
}

function plural(n: number, word: string) { return `${n} ${word}${n === 1 ? '' : 's'}` }

export function SituationSummary({ run }: { run: AnalyticsRun }) {
  const s = runSummary(run)
  const headline = s.unusual.length === 0
    ? `All ${s.latest.length} labs are within their normal range.`
    : `${plural(s.unusual.length, 'lab')} ${s.unusual.length === 1 ? 'shows' : 'show'} an unusual change: ${s.unusual.map(u => displayLocationName(u.observation.location_name)).join(', ')}.`
  const parts = [
    s.byKind.infection && `${s.byKind.infection} possible rise${s.byKind.infection === 1 ? '' : 's'} in infections`,
    s.byKind.operations && plural(s.byKind.operations, 'lab operations problem'),
    s.byKind.reporting && plural(s.byKind.reporting, 'reporting gap'),
  ].filter(Boolean).join(', ')
  return <section className="border border-slate-800 bg-gradient-to-br from-[#0e141b] to-[#0b0e13] p-5 md:p-6">
    <p className="text-[10px] uppercase tracking-[.18em] text-cyan-300/80">Situation summary · latest week {formatDate(s.last)}</p>
    <h1 className="mt-2 font-sans text-xl font-semibold leading-snug text-slate-50 md:text-2xl">{headline}</h1>
    <p className="mt-2 max-w-3xl font-sans text-sm leading-6 text-slate-400">
      From {formatDate(s.first)} to {formatDate(s.last)}, ProDrome raised {plural(run.alerts.length, 'alert')}{parts ? `: ${parts}` : ''}.
      {s.mostRecent && <> The most recent was a {alertKinds[alertKind(s.mostRecent.primary_driver)].label.toLowerCase()} at {displayLocationName(s.mostRecent.location)}, week of {formatDate(s.mostRecent.start_date)}.</>}
    </p>
    <p className="mt-4 font-sans text-xs text-slate-500">New to ProDrome? <Link href="/example" className="inline-flex items-center gap-1 text-cyan-300 hover:text-cyan-200">Follow one alert from start to finish <ArrowRight size={12} /></Link></p>
  </section>
}

export function OperationsKpis({ run }: { run: AnalyticsRun }) {
  const s = runSummary(run)
  const cards: [string, string | number, string][] = [
    ['Labs reporting', s.latest.length, 'Labs that sent weekly data'],
    ['Unusual this week', s.unusual.length, s.unusual.length ? 'Labs to check now' : 'All labs in normal range'],
    ['Alerts in period', run.alerts.length, `${formatDate(s.first)} to ${formatDate(s.last)}`],
    ['Possible infection rises', s.byKind.infection, 'Alerts based on positive tests'],
  ]
  return <div className="grid grid-cols-2 gap-3 md:grid-cols-4">{cards.map(([label, value, hint]) => <div key={label} className="border border-slate-800 bg-[#0d1015] px-4 py-3"><p className="text-[10px] uppercase tracking-wider text-slate-500">{label}</p><p className="mt-1.5 text-2xl font-medium text-slate-100">{value}</p><p className="mt-1 font-sans text-[11px] leading-4 text-slate-500">{hint}</p></div>)}</div>
}
