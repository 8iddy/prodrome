'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, ShieldCheck } from 'lucide-react'
import { SIMULATED_RUN_PATH, useAnalyticsRun } from '@/hooks/use-analytics-run'
import type { AlertKind, AnalyticsRun, Signal } from '@/lib/surveillance'
import { alertKind, alertKinds, displayLocationName, formatDate, formatMetric, latestByLocation, metricLabels, rollingMedian, weekStatus } from '@/lib/surveillance'
import type { Dataset } from '@/lib/datasets'
import { DatasetProvider, pathogenLabel, useDataset } from '@/lib/datasets'
import type { AlertStatus } from '@/lib/reviews'
import { STATUS_LABEL, STATUS_ORDER, countByStatus, statusOf, useReviews } from '@/lib/reviews'
import { GLOSSARY } from '@/lib/glossary'
import { OperationsHeader } from './operations-header'
import { SituationSummary, StagesStrip } from './operations-kpis'
import { SurveillanceMap, TONE } from './surveillance-map'
import { PriorityAlertFeed, sortAlerts, type FeedReviews } from './priority-alert-feed'
import { LocationRanking } from './location-ranking'
import { NationalPanel } from './national-panel'
import { RiskTrendChart, SurveillanceChart } from './surveillance-chart'
import { KIND_STYLE } from './alert-card'
import { Benchmark, PageTitle, Panel } from './benchmark'
import { Term } from './term'

export function SiteFooter() {
  return <footer className="mt-10 border-t border-slate-800 px-4 py-6">
    <div className="mx-auto flex max-w-7xl flex-col gap-2 font-sans text-xs leading-5 text-slate-500 md:flex-row md:items-start md:justify-between md:gap-8">
      <p className="max-w-3xl">The laboratory network on the dashboard is simulated. ProDrome also runs on public surveillance data from WHO FluNet for Uganda and Public Health Scotland.</p>
      <p className="shrink-0">The surveillance team reviews every alert and decides on the response.</p>
    </div>
    <p className="mx-auto mt-3 max-w-7xl font-sans text-xs text-slate-500">Email: contact [at] neuravox.org</p>
  </footer>
}

function Shell({ children, loading, ready }: { children: React.ReactNode; loading: boolean; ready: boolean }) {
  return <div className="min-h-screen bg-[#080a0d] font-mono text-slate-300">
    <OperationsHeader />
    <main className="mx-auto max-w-7xl px-4 py-5 md:px-6 md:py-6">
      {loading ? <div className="border border-slate-800 bg-[#0d1015] p-6 font-sans text-sm text-slate-500">Loading laboratory data…</div>
        : !ready ? <div className="border border-slate-800 bg-[#0d1015] p-6 font-sans text-sm text-slate-500">Run the analytics pipeline to generate a model run.</div>
        : children}
    </main>
    <SiteFooter />
  </div>
}

export function OperationsDashboard({ section = 'overview' }: { section?: string }) {
  return <DatasetProvider><Dashboard section={section} /></DatasetProvider>
}

function Dashboard({ section }: { section: string }) {
  const ctx = useDataset()!
  const path = ctx.run?.path ?? (ctx.ready ? SIMULATED_RUN_PATH : null)
  const { run, loading } = useAnalyticsRun(path)
  const reviews = useReviews(ctx.dataset?.id)
  const [selectedId, setSelectedId] = useState<string>()
  const [metric, setMetric] = useState('positive_tests')
  useEffect(() => { setSelectedId(undefined) }, [path])
  const defaultId = useMemo(() => {
    if (!run) return undefined
    const top = sortAlerts(run.alerts.filter(a => alertKind(a.primary_driver) === 'infection'))[0] ?? sortAlerts(run.alerts)[0]
    return top?.location_id ?? latestByLocation(run.signals)[0]?.observation.location_id
  }, [run])
  const activeId = selectedId ?? defaultId
  const selected = useMemo(() => run ? run.signals.filter(s => s.observation.location_id === activeId) : [], [run, activeId])
  const noStatic = !['methods'].includes(section)
  if (!run && noStatic) return <Shell loading={loading || !ctx.ready} ready={false}><></></Shell>
  if (section === 'methods') return <Shell loading={false} ready><Methods /></Shell>
  const r = run as AnalyticsRun
  const select = (signal: Signal) => setSelectedId(signal.observation.location_id)
  const props: ViewProps = { run: r, dataset: ctx.dataset, noun: ctx.noun, selected, selectedId: activeId, select, setSelectedId, metric, setMetric, reviews }
  const content = ({
    overview: <Overview {...props} />, alerts: <Alerts {...props} />, locations: <Locations {...props} />,
    evaluation: <Benchmark run={r} dataset={ctx.dataset} />, replay: <Benchmark run={r} dataset={ctx.dataset} focus="replay" />, data: <DataSources run={r} />,
  } as Record<string, React.ReactNode>)[section] ?? <Overview {...props} />
  return <Shell loading={false} ready>{content}</Shell>
}

type ViewProps = {
  run: AnalyticsRun; dataset: Dataset | null; noun: (count?: number) => string; selected: Signal[]; selectedId?: string
  select: (s: Signal) => void; setSelectedId: (id: string) => void; metric: string; setMetric: (m: string) => void; reviews: FeedReviews
}

function LocationPicker({ run, noun, selectedId, onChange }: { run: AnalyticsRun; noun: ViewProps['noun']; selectedId?: string; onChange: (id: string) => void }) {
  const locations = latestByLocation(run.signals).sort((a, b) => a.observation.location_name.localeCompare(b.observation.location_name))
  if (locations.length < 2) return null
  return <label className="inline-flex items-center gap-2 text-xs text-slate-400"><span className="capitalize">{noun(1)}</span>
    <select value={selectedId ?? ''} onChange={e => onChange(e.target.value)} className="max-w-[60vw] border border-slate-700 bg-[#0d1015] px-2.5 py-1.5 text-xs text-slate-100">
      {locations.map(l => <option key={l.observation.location_id} value={l.observation.location_id}>{displayLocationName(l.observation.location_name)}</option>)}
    </select>
  </label>
}

/** The place view for the selected dataset: Uganda map, ranked list, or one national panel. */
function PlaceView({ run, dataset, noun, selectedId, select, ranking = false }: ViewProps & { ranking?: boolean }) {
  const kind = dataset?.map ?? 'uganda'
  if (kind === 'national') return <NationalPanel signals={run.signals} />
  const list = <LocationRanking signals={run.signals} onSelect={select} selectedId={selectedId} title={`All ${noun(2)}, latest week`} note={`${noun(2)[0].toUpperCase()}${noun(2).slice(1)} with the largest change are at the top. Select a row to see its numbers.`} />
  if (kind === 'list') return list
  return ranking ? <div className="grid gap-5 lg:grid-cols-[1.1fr_.9fr]"><SurveillanceMap signals={run.signals} selectedId={selectedId} onSelect={select} />{list}</div>
    : <SurveillanceMap signals={run.signals} selectedId={selectedId} onSelect={select} />
}

function Overview(props: ViewProps) {
  const { run, noun, selected, selectedId, setSelectedId, metric, setMetric, reviews, dataset } = props
  const counts = countByStatus(reviews.reviews, run.alerts.map(a => a.alert_id))
  const open = run.alerts.filter(a => ['new', 'under_review'].includes(statusOf(reviews.reviews, a.alert_id)))
  const national = dataset?.map === 'national'
  return <div className="space-y-5">
    <StagesStrip run={run} statusCounts={counts} noun={noun} />
    <SituationSummary run={run} noun={noun} />
    <div className="grid gap-5 lg:grid-cols-[1.1fr_.9fr]">
      <PlaceView {...props} />
      <PriorityAlertFeed alerts={open} compact maxHeight="640px" reviews={reviews} title="Alerts to review"
        subtitle={`New and under review, most important first. ${counts.verified + counts.dismissed} reviewed.`} empty="Every alert in this period has a decision." />
    </div>
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 pt-5">
      <div><h2 className="font-sans text-lg font-semibold text-slate-100">{national ? 'Look closer at the national series' : `Look closer at one ${noun(1)}`}</h2><p className="font-sans text-sm text-slate-500">Choose a measure to compare each week with its <Term k="baseline">normal level</Term>.</p></div>
      <LocationPicker run={run} noun={noun} selectedId={selectedId} onChange={setSelectedId} />
    </div>
    <SurveillanceChart signals={selected} metric={metric} onMetric={setMetric} alerts={run.alerts} changes={run.metadata?.series_changes} />
    <RiskTrendChart signals={selected} />
  </div>
}

const KIND_FILTERS: [AlertKind | 'all', string][] = [['all', 'All kinds'], ['infection', 'Possible infection rise'], ['operations', 'Lab operations'], ['reporting', 'Reporting gaps']]

function Alerts({ run, reviews }: ViewProps) {
  const [kind, setKind] = useState<AlertKind | 'all'>('all')
  const [status, setStatus] = useState<AlertStatus | 'all'>('all')
  const [by, setBy] = useState<'priority' | 'recent'>('priority')
  const [openId, setOpenId] = useState<string>()
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const s = params.get('status') as AlertStatus | null
    if (s && STATUS_ORDER.includes(s)) setStatus(s)
    const id = params.get('alert'); if (id) setOpenId(id)
  }, [])
  const kinds = new Set(run.alerts.map(a => alertKind(a.primary_driver)))
  const counts = countByStatus(reviews.reviews, run.alerts.map(a => a.alert_id))
  const alerts = run.alerts.filter(a => (kind === 'all' || alertKind(a.primary_driver) === kind) && (status === 'all' || statusOf(reviews.reviews, a.alert_id) === status))
  const chip = (active: boolean) => `border px-2.5 py-1.5 text-[11px] ${active ? 'border-cyan-700 bg-cyan-950/40 text-cyan-200' : 'border-slate-800 text-slate-400 hover:text-slate-100'}`
  return <>
    <PageTitle title="Alerts to review">Each <Term k="alert">alert</Term> states what changed, why it matters and who should act. Open an alert to record the checks done, the decision and the response.</PageTitle>
    <ol className="mb-4 grid grid-cols-2 gap-2 font-sans text-[11px] leading-4 text-slate-400 md:grid-cols-4 md:text-xs md:leading-5">
      {['Read what changed and the numbers behind it.', 'Do the checks: confirm the numbers with the lab and compare case reports.', 'Decide: verified when the change is real, dismissed when a cause needs no response.', 'Record the response taken. The history stays on the alert.'].map((t, i) => <li key={t} className="border border-slate-800 bg-[#0d1015] p-2.5 md:p-3"><span className="text-cyan-300">{i + 1}.</span> {t}</li>)}
    </ol>
    {kinds.size > 1 && <div className="mb-4 hidden gap-3 md:grid md:grid-cols-3">{(Object.keys(alertKinds) as AlertKind[]).filter(k => kinds.has(k)).map(k => { const s = KIND_STYLE[k]; const Icon = s.icon; return <div key={k} className="border border-slate-800 bg-[#0d1015] p-4" style={{ boxShadow: `inset 0 2px 0 ${s.accent}` }}><p className={`inline-flex items-center gap-2 text-xs ${s.text}`}><Icon size={14} />{alertKinds[k].label}</p><p className="mt-2 font-sans text-xs leading-5 text-slate-400">{alertKinds[k].meaning}</p></div> })}</div>}
    <div className="mb-2 flex flex-wrap items-center gap-2">
      <span className="text-[10px] uppercase tracking-wider text-slate-500">Status</span>
      <button onClick={() => setStatus('all')} className={chip(status === 'all')}>All {run.alerts.length}</button>
      {STATUS_ORDER.map(s => <button key={s} onClick={() => setStatus(s)} className={chip(status === s)}>{STATUS_LABEL[s]} {counts[s]}</button>)}
    </div>
    <div className="mb-3 flex flex-wrap items-center gap-2">
      {kinds.size > 1 && <><span className="text-[10px] uppercase tracking-wider text-slate-500">Kind</span>{KIND_FILTERS.filter(([k]) => k === 'all' || kinds.has(k as AlertKind)).map(([k, label]) => <button key={k} onClick={() => setKind(k)} className={chip(kind === k)}>{label}</button>)}</>}
      <label className="ml-auto inline-flex items-center gap-2 text-[11px] text-slate-400">Sort
        <select value={by} onChange={e => setBy(e.target.value as 'priority' | 'recent')} className="border border-slate-700 bg-[#0d1015] px-2 py-1.5 text-[11px] text-slate-100"><option value="priority">Priority</option><option value="recent">Most recent</option></select>
      </label>
    </div>
    <PriorityAlertFeed alerts={alerts} by={by} reviews={reviews} compact openId={openId} title={`${alerts.length} alert${alerts.length === 1 ? '' : 's'}`} subtitle={by === 'priority' ? 'Highest priority first.' : 'Most recent first.'} empty="No alerts match these filters." />
  </>
}

function Locations(props: ViewProps) {
  const { run, noun, selected, selectedId, setSelectedId, metric, setMetric, dataset } = props
  const rows = useMemo(() => {
    const sorted = selected.slice().sort((a, b) => a.observation.observation_date.localeCompare(b.observation.observation_date))
    const base = rollingMedian(sorted.map(s => s.observation[metric] ?? null))
    return sorted.map((s, i) => ({ s, base: base[i] })).reverse().slice(0, 80)
  }, [selected, metric])
  const plural = noun(2)
  return <>
    <PageTitle title={dataset?.map === 'national' ? 'National series' : `${plural[0].toUpperCase()}${plural.slice(1)}`}>
      {dataset?.map === 'national' ? 'The latest week of the national series, and how each week compares with its normal level.' : `Where each ${noun(1)} stands in its latest week, and its weekly numbers.`}
    </PageTitle>
    <PlaceView {...props} ranking />
    <div className="mb-4 mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 pt-5">
      <h2 className="font-sans text-lg font-semibold text-slate-100">Weekly numbers</h2>
      <LocationPicker run={run} noun={noun} selectedId={selectedId} onChange={setSelectedId} />
    </div>
    <div className="space-y-5">
      <SurveillanceChart signals={selected} metric={metric} onMetric={setMetric} alerts={run.alerts} changes={run.metadata?.series_changes} />
      <RiskTrendChart signals={selected} />
      <div className="overflow-x-auto border border-slate-800 bg-[#0d1015]"><table className="w-full min-w-[520px] text-left text-xs"><thead className="text-[10px] uppercase tracking-wider text-slate-500"><tr><th className="p-3">Week of</th><th>{metricLabels[metric]}</th><th>Normal level</th><th>Status</th></tr></thead><tbody>{rows.map(({ s, base }) => { const st = weekStatus(s); return <tr key={s.observation.observation_date} className="border-t border-slate-800"><td className="p-3 text-slate-300">{formatDate(s.observation.observation_date)}</td><td className="text-slate-100">{formatMetric(metric, s.observation[metric])}</td><td className="text-slate-500">{formatMetric(metric, base)}</td><td className={TONE[st.tone].text}>{st.label}</td></tr> })}</tbody></table></div>
    </div>
  </>
}

function DataSources({ run }: { run: AnalyticsRun }) {
  const ctx = useDataset()
  const datasets = ctx?.manifest?.datasets ?? []
  const meta = run.metadata
  return <>
    <PageTitle title="Data sources">Each dataset answers a different question. Every number on the site traces back to one of them.</PageTitle>
    <div className="grid gap-4 lg:grid-cols-3">{datasets.map(d => <article key={d.id} className={`border bg-[#0d1015] p-4 ${ctx?.dataset?.id === d.id ? 'border-cyan-800' : 'border-slate-800'}`}>
      <p className={`text-[10px] uppercase tracking-[.16em] ${d.kind === 'simulated' ? 'text-amber-300' : 'text-sky-300'}`}>{d.kind === 'simulated' ? 'Simulated' : 'Public data'}</p>
      <h2 className="mt-1 text-sm text-slate-100">{d.title}</h2>
      <p className="mt-2 font-sans text-sm leading-6 text-slate-400">{d.role}</p>
      <dl className="mt-3 space-y-1 font-sans text-xs text-slate-500">
        <div><dt className="inline text-slate-400">Publisher: </dt><dd className="inline">{d.publisher}</dd></div>
        <div><dt className="inline text-slate-400">Licence: </dt><dd className="inline">{d.licence}</dd></div>
        <div><dt className="inline text-slate-400">Period: </dt><dd className="inline">{formatDate(d.period[0])} to {formatDate(d.period[1])}</dd></div>
        <div><dt className="inline text-slate-400">Locations: </dt><dd className="inline">{d.locations} {d.location_noun[d.locations === 1 ? 0 : 1]}</dd></div>
        <div><dt className="inline text-slate-400">Indicators: </dt><dd className="inline">{d.indicators.map(i => metricLabels[i] ?? i).join(', ')}</dd></div>
        {d.runs.length > 1 && <div><dt className="inline text-slate-400">Pathogens: </dt><dd className="inline">{d.runs.map(r => pathogenLabel(r.pathogen)).join(', ')}</dd></div>}
      </dl>
      {d.source_url && <a href={d.source_url} className="mt-3 inline-block text-xs text-cyan-300 hover:text-cyan-200" rel="noreferrer" target="_blank">Source</a>}
      {ctx?.dataset?.id !== d.id && <button onClick={() => ctx?.select(d.id)} className="mt-3 ml-3 text-xs text-slate-300 underline-offset-2 hover:underline">Show on the dashboard</button>}
    </article>)}</div>
    <div className="mt-5 grid gap-4 md:grid-cols-2">
      <Panel title="Weekly totals" body="ProDrome uses weekly totals from each laboratory: tests, positive results, turnaround time, backlog, rejected samples, reagent use, failed quality control runs and reports received. Patient names and individual results stay at the laboratory." />
      <Panel title="Traceable numbers" body="Every weekly record keeps its source, dataset, record ID, import time and data quality flags. Each model run keeps its rule file hash, random seed, input file checksums and analysis window, so anyone can repeat it." />
      <Panel title="Implementation study" body="The study will work with the regional referral hospital laboratories in Mbarara, Mbale, Gulu and Arua, subject to institutional agreement and ethics approval. It uses 24 to 36 months of historical data for retrospective replay, then an introductory period, then prospective routine use." />
      <Panel title="Connecting laboratory systems" body="The data model accepts CSV and JSON imports, APIs, laboratory information systems and DHIS2 compatible exchange. It uses HL7 FHIR, HL7 v2.5.1, LOINC, ICD-11 and SNOMED CT where the source systems support them." />
    </div>
    <section className="mt-5 border border-slate-800 bg-[#0d1015] p-4"><h2 className="text-sm text-slate-100">Current model run</h2><pre className="mt-3 overflow-auto text-xs leading-6 text-slate-400">{JSON.stringify({
      dataset: ctx?.dataset?.title, run_id: run.run_id, rule_version: run.configuration_version, created_at: run.created_at, weekly_records_scored: run.records_scored, alerts: run.alerts.length,
      ...(meta ? { configuration_sha256: meta.configuration_sha256, random_seed: meta.random_seed, analysis_window: meta.analysis_window, inputs: meta.inputs } : {}),
    }, null, 2)}</pre></section>
  </>
}

function Methods() {
  const steps: [string, string][] = [
    ['1 · Laboratories send weekly totals', 'Each laboratory reports totals for the week: tests done, positive results, time to result, samples waiting, failed quality checks, and the share of expected reports that arrived.'],
    ['2 · ProDrome learns what is normal', 'For each location and each measure, ProDrome takes the median of the past 52 weeks as the normal level. It needs at least 12 weeks of history. The median keeps this level steady when a few weeks are unusual.'],
    ['3 · It scores each new week', 'It measures how far the week is from normal, how fast the change builds, how long it lasts and how many measures move together. The result is a risk score from 0 to 1. A week above 0.58 with a measure far from normal is a signal.'],
    ['4 · It raises an alert when the pattern holds', 'An alert needs 2 signals in a row, plus a second independent measure or another location with a signal in the same week. A single strong change needs 4 weeks. A reporting gap needs 3 weeks. One episode gives one alert.'],
    ['5 · A person reviews', 'The alert explains what changed and suggests who should act. A reviewer records the checks done, marks the alert verified or dismissed, and records the response.'],
  ]
  return <>
    <PageTitle title="How ProDrome works">ProDrome looks for unusual changes in weekly laboratory data and tells the right person. The same rules run on every dataset. They live in one versioned file, configs/scoring/v2-balanced.json.</PageTitle>
    <ol className="space-y-3">{steps.map(([title, body]) => <li key={title} className="border border-slate-800 bg-[#0d1015] p-4"><h2 className="text-sm text-cyan-200">{title}</h2><p className="mt-1.5 max-w-3xl font-sans text-sm leading-6 text-slate-400">{body}</p></li>)}</ol>
    <div className="mt-5 grid gap-4 md:grid-cols-2">
      <Panel title="Why it waits before alerting" body="Weekly laboratory numbers go up and down for many reasons, such as a testing campaign, a public holiday or a late report. ProDrome waits for the pattern to hold, or for a second sign, and this keeps false alarms low." />
      <Panel title="What each alert shows" body="Every alert lists the measures that moved, their values, their normal levels, how many weeks the change lasted and which other locations agreed. Anyone can trace an alert back to its weekly numbers." />
    </div>
    <section className="mt-6">
      <h2 className="font-sans text-lg font-semibold text-slate-100">Glossary</h2>
      <dl className="mt-3 grid gap-3 md:grid-cols-2">{Object.values(GLOSSARY).map(g => <div key={g.term} className="border border-slate-800 bg-[#0d1015] p-4"><dt className="text-sm text-slate-100">{g.term}</dt><dd className="mt-1.5 font-sans text-sm leading-6 text-slate-400">{g.text}</dd></div>)}</dl>
    </section>
    <Link href="/example" className="mt-5 inline-flex items-center gap-2 border border-cyan-800 bg-cyan-950/40 px-3 py-2 text-xs text-cyan-200 hover:bg-cyan-900/50"><ShieldCheck size={14} /> See these rules in a guided example <ArrowRight size={13} /></Link>
  </>
}
