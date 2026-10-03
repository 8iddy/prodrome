'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Download, Info, Pause, Play, ShieldCheck, SkipBack, SkipForward } from 'lucide-react'
import { useAnalyticsRun } from '@/hooks/use-analytics-run'
import type { AlertKind, AnalyticsRun, Signal } from '@/lib/surveillance'
import { alertKind, alertKinds, displayLocationName, formatDate, formatMetric, latestByLocation, metricLabels, rollingMedian, weekStatus } from '@/lib/surveillance'
import { OperationsHeader } from './operations-header'
import { OperationsKpis, SituationSummary } from './operations-kpis'
import { SurveillanceMap, TONE } from './surveillance-map'
import { PriorityAlertFeed, sortAlerts } from './priority-alert-feed'
import { LocationRanking } from './location-ranking'
import { RiskTrendChart, SurveillanceChart } from './surveillance-chart'
import { KIND_STYLE } from './alert-card'

export function SiteFooter() {
  return <footer className="mt-10 border-t border-slate-800 px-4 py-6">
    <div className="mx-auto flex max-w-7xl flex-col gap-2 font-sans text-xs leading-5 text-slate-500 md:flex-row md:items-center md:justify-between">
      <p>ProDrome is a research prototype. All data on this site is synthetic and serves for demonstration.</p>
      <p className="shrink-0">The surveillance team reviews every alert and decides on the response.</p>
    </div>
  </footer>
}

function Shell({ children, loading, run }: { children: React.ReactNode; loading: boolean; run: AnalyticsRun | null }) {
  return <div className="min-h-screen bg-[#080a0d] font-mono text-slate-300">
    <OperationsHeader />
    <main className="mx-auto max-w-7xl px-4 py-5 md:px-6 md:py-6">
      {loading ? <div className="border border-slate-800 bg-[#0d1015] p-6 font-sans text-sm text-slate-500">Loading laboratory data…</div>
        : !run ? <div className="border border-slate-800 bg-[#0d1015] p-6 font-sans text-sm text-slate-500">Run the analytics pipeline to generate a model run.</div>
        : children}
    </main>
    <SiteFooter />
  </div>
}

function PageTitle({ title, children }: { title: string; children?: React.ReactNode }) {
  return <div className="mb-5"><h1 className="font-sans text-xl font-semibold text-slate-50 md:text-2xl">{title}</h1>{children && <p className="mt-1.5 max-w-3xl font-sans text-sm leading-6 text-slate-400">{children}</p>}</div>
}

function LabPicker({ run, selectedId, onChange }: { run: AnalyticsRun; selectedId?: string; onChange: (id: string) => void }) {
  const labs = latestByLocation(run.signals).sort((a, b) => a.observation.location_name.localeCompare(b.observation.location_name))
  return <label className="inline-flex items-center gap-2 text-xs text-slate-400">Lab
    <select value={selectedId ?? ''} onChange={e => onChange(e.target.value)} className="border border-slate-700 bg-[#0d1015] px-2.5 py-1.5 text-xs text-slate-100">
      {labs.map(l => <option key={l.observation.location_id} value={l.observation.location_id}>{displayLocationName(l.observation.location_name)}</option>)}
    </select>
  </label>
}

export function OperationsDashboard({ section = 'overview' }: { section?: string }) {
  const { run, loading } = useAnalyticsRun()
  const [selectedId, setSelectedId] = useState<string>()
  const [metric, setMetric] = useState('positive_tests')
  const defaultId = useMemo(() => {
    if (!run) return undefined
    const top = sortAlerts(run.alerts.filter(a => alertKind(a.primary_driver) === 'infection'))[0] ?? sortAlerts(run.alerts)[0]
    return top?.location_id ?? latestByLocation(run.signals)[0]?.observation.location_id
  }, [run])
  const activeId = selectedId ?? defaultId
  const selected = useMemo(() => run ? run.signals.filter(s => s.observation.location_id === activeId) : [], [run, activeId])
  if (!run) return <Shell run={run} loading={loading}><></></Shell>
  const select = (signal: Signal) => setSelectedId(signal.observation.location_id)
  const props = { run, selected, selectedId: activeId, select, setSelectedId, metric, setMetric }
  const content = ({
    overview: <Overview {...props} />, alerts: <Alerts run={run} />, surveillance: <Explore {...props} />,
    locations: <Locations {...props} />, replay: <Replay run={run} selectedId={activeId} select={select} />,
    evaluation: <Evaluation />, data: <Data run={run} />, methods: <Methods />, research: <Data run={run} />,
  } as Record<string, React.ReactNode>)[section] ?? <Overview {...props} />
  return <Shell run={run} loading={loading}>{content}</Shell>
}

type ViewProps = { run: AnalyticsRun; selected: Signal[]; selectedId?: string; select: (s: Signal) => void; setSelectedId: (id: string) => void; metric: string; setMetric: (m: string) => void }

function Overview({ run, selected, selectedId, select, setSelectedId, metric, setMetric }: ViewProps) {
  return <div className="space-y-5">
    <SituationSummary run={run} />
    <OperationsKpis run={run} />
    <div className="grid gap-5 lg:grid-cols-[1.1fr_.9fr]">
      <SurveillanceMap signals={run.signals} selectedId={selectedId} onSelect={select} />
      <PriorityAlertFeed alerts={run.alerts} compact maxHeight="640px" />
    </div>
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 pt-5">
      <div><h2 className="font-sans text-lg font-semibold text-slate-100">Look closer at one lab</h2><p className="font-sans text-sm text-slate-500">Choose a lab and a measure to compare each week with the lab’s normal level.</p></div>
      <LabPicker run={run} selectedId={selectedId} onChange={setSelectedId} />
    </div>
    <SurveillanceChart signals={selected} metric={metric} onMetric={setMetric} alerts={run.alerts} />
    <RiskTrendChart signals={selected} />
  </div>
}

const KIND_FILTERS: [AlertKind | 'all', string][] = [['all', 'All alerts'], ['infection', 'Possible infection rise'], ['operations', 'Lab operations'], ['reporting', 'Reporting gaps']]

function Alerts({ run }: { run: AnalyticsRun }) {
  const [kind, setKind] = useState<AlertKind | 'all'>('all')
  const [by, setBy] = useState<'priority' | 'recent'>('priority')
  const alerts = run.alerts.filter(a => kind === 'all' || alertKind(a.primary_driver) === kind)
  return <>
    <PageTitle title="Alerts to check">Each alert says what changed, why it matters, and who should act. The surveillance team checks each alert and decides on the response.</PageTitle>
    <div className="mb-4 grid gap-3 md:grid-cols-3">{(Object.keys(alertKinds) as AlertKind[]).map(k => { const s = KIND_STYLE[k]; const Icon = s.icon; return <div key={k} className="border border-slate-800 bg-[#0d1015] p-4" style={{ boxShadow: `inset 0 2px 0 ${s.accent}` }}><p className={`inline-flex items-center gap-2 text-xs ${s.text}`}><Icon size={14} />{alertKinds[k].label}</p><p className="mt-2 font-sans text-xs leading-5 text-slate-400">{alertKinds[k].meaning}</p></div> })}</div>
    <div className="mb-3 flex flex-wrap items-center gap-2">
      {KIND_FILTERS.map(([k, label]) => <button key={k} onClick={() => setKind(k)} className={`border px-2.5 py-1.5 text-[11px] ${kind === k ? 'border-cyan-700 bg-cyan-950/40 text-cyan-200' : 'border-slate-800 text-slate-400 hover:text-slate-100'}`}>{label}</button>)}
      <label className="ml-auto inline-flex items-center gap-2 text-[11px] text-slate-400">Sort
        <select value={by} onChange={e => setBy(e.target.value as any)} className="border border-slate-700 bg-[#0d1015] px-2 py-1.5 text-[11px] text-slate-100"><option value="priority">Priority</option><option value="recent">Most recent</option></select>
      </label>
    </div>
    <PriorityAlertFeed alerts={alerts} by={by} title={`${alerts.length} alert${alerts.length === 1 ? '' : 's'}`} subtitle={by === 'priority' ? 'Highest priority first.' : 'Most recent first.'} />
  </>
}

function Explore({ run, selected, selectedId, setSelectedId, metric, setMetric }: ViewProps) {
  const rows = useMemo(() => {
    const sorted = selected.slice().sort((a, b) => a.observation.observation_date.localeCompare(b.observation.observation_date))
    const base = rollingMedian(sorted.map(s => s.observation[metric] ?? null))
    return sorted.map((s, i) => ({ s, base: base[i] })).reverse().slice(0, 80)
  }, [selected, metric])
  return <>
    <PageTitle title="Explore the data">Weekly numbers for one lab at a time. The table lists the most recent weeks first.</PageTitle>
    <div className="mb-4"><LabPicker run={run} selectedId={selectedId} onChange={setSelectedId} /></div>
    <div className="space-y-5">
      <SurveillanceChart signals={selected} metric={metric} onMetric={setMetric} alerts={run.alerts} />
      <RiskTrendChart signals={selected} />
      <div className="overflow-x-auto border border-slate-800 bg-[#0d1015]"><table className="w-full min-w-[520px] text-left text-xs"><thead className="text-[10px] uppercase tracking-wider text-slate-500"><tr><th className="p-3">Week of</th><th>{metricLabels[metric]}</th><th>Normal level</th><th>Status</th></tr></thead><tbody>{rows.map(({ s, base }) => { const st = weekStatus(s); return <tr key={s.observation.source_record_id} className="border-t border-slate-800"><td className="p-3 text-slate-300">{formatDate(s.observation.observation_date)}</td><td className="text-slate-100">{formatMetric(metric, s.observation[metric])}</td><td className="text-slate-500">{formatMetric(metric, base)}</td><td className={TONE[st.tone].text}>{st.label}</td></tr> })}</tbody></table></div>
    </div>
  </>
}

function Locations({ run, selectedId, select }: ViewProps) {
  return <>
    <PageTitle title="Labs">Where each lab is, and how its latest week compares with its normal range.</PageTitle>
    <div className="grid gap-5 lg:grid-cols-[1.1fr_.9fr]"><SurveillanceMap signals={run.signals} selectedId={selectedId} onSelect={select} /><LocationRanking signals={run.signals} onSelect={select} selectedId={selectedId} /></div>
  </>
}

function Replay({ run, selectedId, select }: { run: AnalyticsRun; selectedId?: string; select: (s: Signal) => void }) {
  const dates = useMemo<string[]>(() => [...new Set<string>(run.signals.map(s => String(s.observation.observation_date)))].sort(), [run])
  const [index, setIndex] = useState(() => Math.max(0, dates.indexOf('2025-07-21')))
  const [playing, setPlaying] = useState(false)
  useEffect(() => { if (!playing) return; const timer = setInterval(() => setIndex(c => c >= dates.length - 1 ? 0 : c + 1), 700); return () => clearInterval(timer) }, [playing, dates.length])
  const date = dates[index]
  const view = useMemo(() => run.signals.filter(s => s.observation.observation_date <= date), [run, date])
  const now = latestByLocation(view)
  const unusual = now.filter(s => weekStatus(s).tone !== 'normal')
  const alertsSoFar = run.alerts.filter(a => a.start_date <= date)
  return <>
    <PageTitle title="Replay">Play the period week by week. Each step shows the data ProDrome had at that time and the alerts it raised.</PageTitle>
    <div className="border border-slate-800 bg-[#0d1015] p-4">
      <div className="flex flex-wrap items-center gap-3">
        <span className="min-w-[150px] text-sm text-slate-100">Week of {formatDate(date)}</span>
        <button aria-label="Previous week" onClick={() => setIndex(Math.max(0, index - 1))} className="border border-slate-700 p-2"><SkipBack size={14} /></button>
        <button aria-label={playing ? 'Pause' : 'Play'} onClick={() => setPlaying(!playing)} className="border border-cyan-800 bg-cyan-950/30 p-2 text-cyan-200">{playing ? <Pause size={14} /> : <Play size={14} />}</button>
        <button aria-label="Next week" onClick={() => setIndex(Math.min(dates.length - 1, index + 1))} className="border border-slate-700 p-2"><SkipForward size={14} /></button>
        <input aria-label="Replay week" className="min-w-[180px] flex-1 accent-cyan-500" type="range" min="0" max={dates.length - 1} value={index} onChange={e => setIndex(Number(e.target.value))} />
      </div>
      <p className="mt-3 font-sans text-sm text-slate-400">{unusual.length ? <><span className="text-amber-300">{unusual.length} lab{unusual.length === 1 ? '' : 's'} unusual this week</span> ({unusual.map(u => displayLocationName(u.observation.location_name)).join(', ')}).</> : 'All labs normal this week.'} {alertsSoFar.length} alert{alertsSoFar.length === 1 ? '' : 's'} raised so far.</p>
    </div>
    <div className="mt-5 grid gap-5 lg:grid-cols-[1.1fr_.9fr]"><SurveillanceMap signals={view} selectedId={selectedId} onSelect={select} title={`Lab status, week of ${formatDate(date)}`} /><PriorityAlertFeed alerts={alertsSoFar} by="recent" compact maxHeight="600px" title="Alerts raised so far" subtitle="Most recent first." /></div>
  </>
}

function Evaluation() {
  const [data, setData] = useState<any>(); const [candidates, setCandidates] = useState<any[]>([])
  useEffect(() => {
    fetch('/analytics/evaluation.json').then(r => r.ok ? r.json() : null).then(setData)
    fetch('/analytics/candidate-evaluation.json').then(r => r.ok ? r.json() : null).then(d => setCandidates(d?.candidates ?? []))
  }, [])
  const cards: [string, string, string][] = data ? [
    ['Planted events found', `${data.detected_events} of ${data.ground_truth_events}`, 'Real events built into the test data'],
    ['False alerts', String(data.false_alerts), 'Alerts with no planted event behind them'],
    ['Test spike held', data.negative_control_scenarios ? 'Yes' : '0', 'A spike in one measure that needs no alert'],
    ['Average time to alert', `${data.mean_detection_delay_days} days`, 'From the start of an event to its alert'],
  ] : []
  return <>
    <PageTitle title="Benchmark results">We test ProDrome on a simulated network of 6 labs over 156 weeks. The data holds 5 planted events for ProDrome to find and 1 test spike that needs no alert.</PageTitle>
    <div className="mb-5 flex gap-3 border border-slate-700 bg-slate-900/40 p-4"><Info size={18} className="mt-0.5 shrink-0 text-cyan-300" /><div className="font-sans text-sm leading-6 text-slate-300"><p className="font-semibold text-slate-100">About these results</p><p className="text-slate-400">We set the alert rules with this benchmark. The implementation study will measure how ProDrome performs on laboratory data in Uganda.</p></div></div>
    {data ? <>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">{cards.map(([label, value, hint]) => <div key={label} className="border border-slate-800 bg-[#0d1015] p-4"><p className="text-[10px] uppercase tracking-wider text-slate-500">{label}</p><p className="mt-1.5 text-2xl text-slate-100">{value}</p><p className="mt-1 font-sans text-[11px] text-slate-500">{hint}</p></div>)}</div>
      {candidates.length > 0 && <section className="mt-5 border border-slate-800 bg-[#0d1015]"><div className="border-b border-slate-800 px-4 py-3"><h2 className="text-sm text-slate-100">Rule versions compared</h2><p className="mt-0.5 font-sans text-xs text-slate-500">Each version groups unusual weeks into alerts with different rules. The balanced version, in use, sends one alert for each episode and asks for two signs that agree.</p></div><div className="overflow-x-auto"><table className="w-full min-w-[620px] text-left text-xs"><thead className="text-[10px] uppercase tracking-wider text-slate-500"><tr><th className="p-3">Version</th><th>Events found</th><th>Total alerts</th><th>False alerts</th><th>Median delay</th></tr></thead><tbody>{candidates.map(c => { const current = c.configuration_version === data.configuration_version; return <tr key={c.configuration_version} className={`border-t border-slate-800 ${current ? 'bg-cyan-950/20' : ''}`}><td className="p-3 text-slate-100">{c.configuration_version}{current && <span className="ml-2 text-[10px] text-cyan-300">in use</span>}</td><td>{c.detected_events} of {c.ground_truth_events}</td><td>{c.generated_alerts}</td><td className={c.false_alerts ? 'text-rose-300' : ''}>{c.false_alerts}</td><td>{c.median_detection_delay_days} days</td></tr> })}</tbody></table></div></section>}
      <section className="mt-5 grid gap-4 md:grid-cols-2">
        <Panel title="Why alerts come about a week after the change" body="ProDrome waits for a second unusual week, or for a second sign to agree, before it raises an alert. With weekly data, this places the alert about one week after the change starts." />
        <Panel title="Next stage" body="The next stage tests the rules on fresh simulated data, compares them with standard methods such as EARS and Farrington, and runs them on past WHO FluNet data for Uganda." />
      </section>
      <a href="/analytics/evaluation.json" download className="mt-5 inline-flex items-center gap-2 border border-slate-700 px-3 py-2 text-xs text-slate-300 hover:border-slate-500"><Download size={14} /> Download evaluation data (JSON)</a>
    </> : <p className="font-sans text-sm text-slate-500">Loading evaluation…</p>}
  </>
}

function Data({ run }: { run: AnalyticsRun }) {
  const dates = run.signals.map(s => String(s.observation.observation_date)).sort()
  return <>
    <PageTitle title="Data and sources">What data this site shows, where it came from, and how to trace each number.</PageTitle>
    <div className="grid gap-4 md:grid-cols-2">
      <Panel title="What you are looking at" body={`Synthetic weekly data for 6 simulated laboratories in Uganda, from ${formatDate(dates[0])} to ${formatDate(dates[dates.length - 1])}. The labs carry the names of Ugandan towns to make the map easy to read. Their numbers come from the simulation.`} />
      <Panel title="Weekly totals" body="ProDrome uses weekly totals from each lab: tests, positive results, turnaround time, backlog, failed quality control runs and reports received. Patient names and individual results stay at the lab." />
      <Panel title="Traceable numbers" body="Every weekly record keeps its source, dataset, record ID, import time and data quality flags. Each model run keeps its rule version, random seed and inputs, so anyone can repeat it." />
      <Panel title="Supported data sources" body="The pipeline reads WHO FluNet data for Uganda and Public Health Scotland open data for retrospective testing. Uganda outbreak reports serve as background reference." />
    </div>
    <section className="mt-5 border border-slate-800 bg-[#0d1015] p-4"><h2 className="text-sm text-slate-100">Current model run</h2><pre className="mt-3 overflow-auto text-xs leading-6 text-slate-400">{JSON.stringify({ run_id: run.run_id, model_version: run.model_version, rule_version: run.configuration_version, created_at: run.created_at, weekly_records_scored: run.records_scored, alerts: run.alerts.length }, null, 2)}</pre></section>
  </>
}

function Methods() {
  const steps: [string, string][] = [
    ['1 · Labs send weekly totals', 'Each lab reports totals for the week: tests done, positive results, time to result, samples waiting, failed quality checks, and the share of expected reports that arrived.'],
    ['2 · ProDrome learns what is normal', 'For each lab and each measure, ProDrome takes the median of the past 52 weeks as the normal level. The median keeps this level steady when a few weeks are unusual.'],
    ['3 · It scores each new week', 'It measures how far the week is from normal, how fast the change builds, and how many measures move together. The result is a score from 0 to 1.'],
    ['4 · It raises an alert when the pattern holds', 'A normal alert needs 2 unusual weeks in a row, plus a second independent sign or another lab with a change in the same week. A single strong sign needs 4 weeks. A reporting gap needs 3 weeks.'],
    ['5 · A person checks', 'The alert explains what changed and suggests who should act. The surveillance team reviews the alert and decides on the response.'],
  ]
  return <>
    <PageTitle title="How ProDrome works">ProDrome looks for unusual changes in weekly laboratory data and tells the right person. Here is how it decides.</PageTitle>
    <ol className="space-y-3">{steps.map(([title, body]) => <li key={title} className="border border-slate-800 bg-[#0d1015] p-4"><h2 className="text-sm text-cyan-200">{title}</h2><p className="mt-1.5 max-w-3xl font-sans text-sm leading-6 text-slate-400">{body}</p></li>)}</ol>
    <div className="mt-5 grid gap-4 md:grid-cols-2">
      <Panel title="Why it waits before alerting" body="Weekly lab numbers go up and down for many reasons, such as a testing campaign, a public holiday or a late report. ProDrome waits for the pattern to hold, or for a second sign, and this keeps false alarms low." />
      <Panel title="Weekly totals" body="ProDrome reads weekly totals from each lab. Patient names and individual results stay at the lab, and every alert lists the numbers behind it." />
    </div>
    <Link href="/example" className="mt-5 inline-flex items-center gap-2 border border-cyan-800 bg-cyan-950/40 px-3 py-2 text-xs text-cyan-200 hover:bg-cyan-900/50"><ShieldCheck size={14} /> See these rules in a guided example <ArrowRight size={13} /></Link>
  </>
}

function Panel({ title, body }: { title: string; body: string }) {
  return <div className="border border-slate-800 bg-[#0d1015] p-4"><h2 className="text-sm text-slate-100">{title}</h2><p className="mt-2 font-sans text-sm leading-6 text-slate-400">{body}</p></div>
}
