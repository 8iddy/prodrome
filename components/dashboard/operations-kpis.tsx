import Link from 'next/link'
import { ArrowRight, ChevronRight } from 'lucide-react'
import type { AnalyticsRun } from '@/lib/surveillance'
import { alertKind, alertKinds, displayLocationName, formatDate, isSignal, latestByLocation, weekStatus } from '@/lib/surveillance'
import type { AlertStatus } from '@/lib/reviews'
import { STATUS_LABEL, STATUS_ORDER } from '@/lib/reviews'
import { sortAlerts } from './priority-alert-feed'
import { STATUS_STYLE } from './review-panel'
import { Term } from './term'

const article = (word: string) => /^[aeiou]/i.test(word) ? 'an' : 'a'

export function runSummary(run: AnalyticsRun) {
  const all = latestByLocation(run.signals)
  // A national series beside local ones (Scotland beside its Health Boards) is reported apart from the count.
  const national = all.length > 1 && all.some(s => s.observation.location_type === 'country')
  const latest = national ? all.filter(s => s.observation.location_type !== 'country') : all
  const dates = run.signals.map(s => String(s.observation.observation_date)).sort()
  const unusual = latest.filter(s => weekStatus(s).tone !== 'normal')
  const byKind = { infection: 0, operations: 0, reporting: 0 }
  run.alerts.forEach(a => { byKind[alertKind(a.primary_driver)] += 1 })
  const mostRecent = sortAlerts(run.alerts, 'recent')[0]
  const signals = run.signals.filter(isSignal).length
  return { latest, national, first: dates[0], last: dates[dates.length - 1], unusual, byKind, mostRecent, signals }
}

function plural(n: number, word: string, many = `${word}s`) { return `${n} ${n === 1 ? word : many}` }

type Noun = (count?: number) => string

export function SituationSummary({ run, noun }: { run: AnalyticsRun; noun: Noun }) {
  const s = runSummary(run)
  const national = s.latest.length === 1 && s.latest[0].observation.location_type === 'country'
  const headline = national
    ? (s.unusual.length ? `${displayLocationName(s.latest[0].observation.location_name)} shows a signal in the latest week.` : `${displayLocationName(s.latest[0].observation.location_name)} is within its normal range in the latest week.`)
    : s.unusual.length === 0
      ? `All ${s.latest.length} ${noun(2)} are within their normal range.`
      : `${plural(s.unusual.length, noun(1), noun(2))} ${s.unusual.length === 1 ? 'shows' : 'show'} a signal: ${s.unusual.map(u => displayLocationName(u.observation.location_name)).join(', ')}.`
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
      {s.mostRecent && <> The most recent was {article(alertKinds[alertKind(s.mostRecent.primary_driver)].label)} {alertKinds[alertKind(s.mostRecent.primary_driver)].label.toLowerCase()} at {displayLocationName(s.mostRecent.location)}, week of {formatDate(s.mostRecent.start_date)}.</>}
    </p>
    <p className="mt-4 font-sans text-xs text-slate-500">New to ProDrome? <Link href="/example" className="inline-flex items-center gap-1 text-cyan-300 hover:text-cyan-200">Follow one alert from start to finish <ArrowRight size={12} /></Link></p>
  </section>
}

/** Data → Signal → Alert → Verified event, with a count at each stage. */
export function StagesStrip({ run, statusCounts, noun }: { run: AnalyticsRun; statusCounts: Record<AlertStatus, number>; noun: Noun }) {
  const s = runSummary(run)
  const stages: { key: string; title: React.ReactNode; value: number; text: string; href?: string }[] = [
    { key: 'data', title: 'Data', value: run.records_scored, text: `weekly records from ${plural(s.latest.length, noun(1), noun(2))}${s.national ? ' and the national series' : ''}` },
    { key: 'signal', title: <Term k="signal" />, value: s.signals, text: 'unusual weeks' },
    { key: 'alert', title: <Term k="alert" />, value: run.alerts.length, text: 'patterns that held', href: '/alerts' },
    { key: 'verified', title: <Term k="verified">Verified event</Term>, value: statusCounts.verified, text: 'confirmed by a reviewer', href: '/alerts?status=verified' },
  ]
  return <section aria-label="From data to verified event" className="border border-slate-800 bg-[#0b0f14]">
    <ol className="grid grid-cols-2 md:grid-cols-4">
      {stages.map((stage, i) => <li key={stage.key} className={`relative border-slate-800 px-4 py-3 ${i % 2 ? 'border-l' : ''} ${i > 1 ? 'border-t md:border-t-0' : ''} ${i === 2 ? 'md:border-l' : ''}`}>
        <p className="text-[10px] uppercase tracking-[.16em] text-slate-500">{i + 1} · {stage.title}</p>
        <p className="mt-1 text-2xl font-medium text-slate-100">{stage.value.toLocaleString('en-GB')}</p>
        <p className="font-sans text-[11px] leading-4 text-slate-500">{stage.href ? <Link href={stage.href} className="hover:text-cyan-200">{stage.text}</Link> : stage.text}</p>
        {i < 3 && <ChevronRight size={16} aria-hidden="true" className="absolute right-[-9px] top-1/2 z-10 hidden -translate-y-1/2 bg-[#0b0f14] text-slate-600 md:block" />}
      </li>)}
    </ol>
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-slate-800 px-4 py-2.5">
      <span className="text-[10px] uppercase tracking-[.16em] text-slate-500">Alerts by status</span>
      {STATUS_ORDER.map(status => <Link key={status} href={`/alerts?status=${status}`} className="inline-flex items-center gap-1.5 text-xs text-slate-300 hover:text-white">
        <span className={`border px-1.5 py-px text-[10px] font-semibold uppercase tracking-wider ${STATUS_STYLE[status]}`}>{STATUS_LABEL[status]}</span>{statusCounts[status]}
      </Link>)}
    </div>
  </section>
}
