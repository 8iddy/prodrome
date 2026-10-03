'use client'

import { useEffect, useMemo, useState } from 'react'
import { Download, Pause, Play, SkipBack, SkipForward } from 'lucide-react'
import { useAnalyticsRun, useJson } from '@/hooks/use-analytics-run'
import type { AnalyticsRun, Signal } from '@/lib/surveillance'
import { displayLocationName, formatDate, latestByLocation, weekStatus } from '@/lib/surveillance'
import type { Dataset } from '@/lib/datasets'
import { pathogenLabel } from '@/lib/datasets'
import { SurveillanceMap } from './surveillance-map'
import { LocationRanking } from './location-ranking'
import { NationalPanel } from './national-panel'
import { PriorityAlertFeed } from './priority-alert-feed'
import { SurveillanceChart } from './surveillance-chart'

export function PageTitle({ title, children }: { title: string; children?: React.ReactNode }) {
  return <div className="mb-5"><h1 className="font-sans text-xl font-semibold text-slate-50 md:text-2xl">{title}</h1>{children && <p className="mt-1.5 max-w-3xl font-sans text-sm leading-6 text-slate-400">{children}</p>}</div>
}

export function Panel({ title, body, children }: { title: string; body?: string; children?: React.ReactNode }) {
  return <div className="border border-slate-800 bg-[#0d1015] p-4"><h2 className="text-sm text-slate-100">{title}</h2>{body && <p className="mt-2 font-sans text-sm leading-6 text-slate-400">{body}</p>}{children}</div>
}

function Part({ id, number, title, question, children }: { id: string; number: number; title: string; question: string; children: React.ReactNode }) {
  return <section id={id} className="scroll-mt-28 border-t border-slate-800 pt-6">
    <p className="text-[10px] uppercase tracking-[.18em] text-cyan-300/80">Part {number}</p>
    <h2 className="mt-1 font-sans text-lg font-semibold text-slate-50">{title}</h2>
    <p className="mt-1 max-w-3xl font-sans text-sm leading-6 text-slate-400"><span className="text-slate-200">Question: </span>{question}</p>
    <div className="mt-4">{children}</div>
  </section>
}

function Stat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return <div className="border border-slate-800 bg-[#0d1015] p-4"><p className="text-[10px] uppercase tracking-wider text-slate-500">{label}</p><p className="mt-1.5 text-2xl text-slate-100">{value}</p><p className="mt-1 font-sans text-[11px] text-slate-500">{hint}</p></div>
}

function SimulatedPart() {
  const { value: data } = useJson<any>('/analytics/evaluation.json')
  const { value: candidates } = useJson<any>('/analytics/candidate-evaluation.json')
  if (!data) return <p className="font-sans text-sm text-slate-500">Loading the simulated benchmark…</p>
  return <>
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      <Stat label="Planted events found" value={`${data.detected_events} of ${data.ground_truth_events}`} hint="Events built into the simulated data" />
      <Stat label="Alerts with no event" value={String(data.false_alerts)} hint="Alerts with no planted event behind them" />
      <Stat label="Test spike held" value={data.negative_control_scenarios ? 'Yes' : 'No'} hint="A spike in one measure that needs no alert" />
      <Stat label="Average time to alert" value={`${data.mean_detection_delay_days} days`} hint="From the start of an event to its alert" />
    </div>
    {candidates?.candidates?.length > 0 && <div className="mt-4 border border-slate-800 bg-[#0d1015]">
      <div className="border-b border-slate-800 px-4 py-3"><h3 className="text-sm text-slate-100">Rule versions compared</h3><p className="mt-0.5 font-sans text-xs text-slate-500">Each version groups signals into alerts with different rules. The balanced version is in use. It sends one alert for each episode and asks for two signs that agree.</p></div>
      <div className="overflow-x-auto"><table className="w-full min-w-[560px] text-left text-xs"><thead className="text-[10px] uppercase tracking-wider text-slate-500"><tr><th className="p-3">Version</th><th>Events found</th><th>Total alerts</th><th>Alerts with no event</th><th>Median delay</th></tr></thead>
        <tbody>{candidates.candidates.map((c: any) => { const current = c.configuration_version === data.configuration_version; return <tr key={c.configuration_version} className={`border-t border-slate-800 ${current ? 'bg-cyan-950/20' : ''}`}><td className="p-3 text-slate-100">{c.configuration_version}{current && <span className="ml-2 text-[10px] text-cyan-300">in use</span>}</td><td>{c.detected_events} of {c.ground_truth_events}</td><td>{c.generated_alerts}</td><td className={c.false_alerts ? 'text-rose-300' : ''}>{c.false_alerts}</td><td>{c.median_detection_delay_days} days</td></tr> })}</tbody></table></div>
    </div>}
    <p className="mt-3 font-sans text-xs leading-5 text-slate-500">The rules were set on this benchmark. Parts 2 and 3 run the same rules, unchanged, on public data.</p>
    <a href="/analytics/evaluation.json" download className="mt-3 inline-flex items-center gap-2 border border-slate-700 px-3 py-2 text-xs text-slate-300 hover:border-slate-500"><Download size={14} /> Download simulated benchmark (JSON)</a>
  </>
}

type Metrics = { health_board_seasons: number; defined_seasons: number; seasons_with_alert_in_window: number; detection_window_share: number | null; weeks_from_onset: Summary; weeks_from_peak: Summary; off_season_alerts: number; health_board_years: number; off_season_alerts_per_health_board_year: number | null; alerts_per_health_board_season: number | null }
type Summary = { n: number; median: number | null; q1: number | null; q3: number | null }
const GROUPS: [string, string][] = [['all', 'All 14 Health Boards'], ['mainland', '11 mainland boards'], ['islands', '3 island boards']]

const pct = (v: number | null) => v == null ? '–' : `${Math.round(v * 100)}%`
const iqr = (s: Summary) => s.median == null ? '–' : `${s.median} (${s.q1} to ${s.q3})`
const num = (v: number | null, digits = 2) => v == null ? '–' : v.toFixed(digits)

function metricRows(m: Metrics): [string, string][] {
  return [
    ['Seasons with an alert from 4 weeks before onset to peak', m.defined_seasons ? `${m.seasons_with_alert_in_window} of ${m.defined_seasons} (${pct(m.detection_window_share)})` : 'No defined seasons'],
    ['First alert relative to onset, weeks: median (IQR)', iqr(m.weeks_from_onset)],
    ['First alert relative to peak, weeks: median (IQR)', iqr(m.weeks_from_peak)],
    ['Off season alerts per Health Board year', `${num(m.off_season_alerts_per_health_board_year)} (${m.off_season_alerts} in ${m.health_board_years})`],
    ['Alerts per Health Board season', num(m.alerts_per_health_board_season, 1)],
  ]
}

function ScotlandPart() {
  const { value } = useJson<any>('/datasets/phs-scotland/validation.json')
  const [pathogen, setPathogen] = useState('influenza')
  const [group, setGroup] = useState('all')
  if (!value) return <p className="font-sans text-sm text-slate-500">Loading the external validation…</p>
  const data = value.pathogens[pathogen]
  const g = data.groups[group]
  const prodrome = metricRows(g.prodrome), comparison = metricRows(g.comparison)
  const toggle = (active: boolean) => `border px-2.5 py-1 text-[11px] ${active ? 'border-cyan-700 bg-cyan-950/40 text-cyan-200' : 'border-slate-800 text-slate-400 hover:text-slate-100'}`
  return <>
    <div className="grid gap-4 md:grid-cols-3">
      <Panel title="Input" body="Weekly CARI sentinel tests and positives for each Health Board, October 2022 to September 2026. The 2022/23 season builds the baseline and is left out of the scores." />
      <Panel title="Reference" body="Weekly laboratory confirmed cases from a separate Public Health Scotland reporting stream. Onset is the first of two weeks at 20% or more of the season peak. A season with a peak under 10 cases has no onset." />
      <Panel title="Comparison rule" body={`${value.comparison_rule}. It raises a new alert after positivity falls below that level for a week.`} />
    </div>
    <div className="mt-4 flex flex-wrap items-center gap-2">
      {Object.keys(value.pathogens).map(p => <button key={p} onClick={() => setPathogen(p)} className={toggle(pathogen === p)}>{pathogenLabel(p)}</button>)}
      <span className="mx-1 h-4 border-l border-slate-800" />
      {GROUPS.map(([k, label]) => <button key={k} onClick={() => setGroup(k)} className={toggle(group === k)}>{label}</button>)}
    </div>
    <div className="mt-3 overflow-x-auto border border-slate-800 bg-[#0d1015]">
      <table className="w-full min-w-[560px] text-left text-xs">
        <thead className="text-[10px] uppercase tracking-wider text-slate-500"><tr><th className="p-3">{pathogenLabel(pathogen)} · {GROUPS.find(x => x[0] === group)?.[1]}</th><th className="p-3">ProDrome</th><th className="p-3">Comparison rule</th></tr></thead>
        <tbody>{prodrome.map(([label, value], i) => <tr key={label} className="border-t border-slate-800"><td className="p-3 font-sans text-slate-400">{label}</td><td className="p-3 text-slate-100">{value}</td><td className="p-3 text-slate-300">{comparison[i][1]}</td></tr>)}</tbody>
      </table>
    </div>
    <p className="mt-2 font-sans text-xs leading-5 text-slate-500">Negative weeks mean the alert came before onset or peak. {data.undefined_seasons.length ? `Seasons below the minimum size: ${data.undefined_seasons.map((s: string) => s.replace(/^NHS /, '')).join(', ')}.` : ''}</p>
    <details className="mt-3 border border-slate-800 bg-[#0d1015]">
      <summary className="cursor-pointer px-4 py-3 text-xs text-slate-200">Results for each Health Board</summary>
      <div className="overflow-x-auto"><table className="w-full min-w-[640px] text-left text-xs">
        <thead className="text-[10px] uppercase tracking-wider text-slate-500"><tr><th className="p-3">Health Board</th><th>Seasons found</th><th>Onset, median</th><th>Off season</th><th>Per season</th><th>Rule: found</th><th>Rule: onset</th></tr></thead>
        <tbody>{data.health_boards.map((hb: any) => <tr key={hb.location_id} className="border-t border-slate-800">
          <td className="p-3 text-slate-200">{hb.location_name.replace(/^NHS /, '')}{hb.island && <span className="ml-1.5 text-[10px] text-slate-500">island</span>}</td>
          <td>{hb.prodrome.seasons_with_alert_in_window} of {hb.prodrome.defined_seasons}</td><td>{hb.prodrome.weeks_from_onset.median ?? '–'}</td>
          <td>{hb.prodrome.off_season_alerts}</td><td>{num(hb.prodrome.alerts_per_health_board_season, 1)}</td>
          <td className="text-slate-400">{hb.comparison.seasons_with_alert_in_window} of {hb.comparison.defined_seasons}</td><td className="text-slate-400">{hb.comparison.weeks_from_onset.median ?? '–'}</td>
        </tr>)}</tbody></table></div>
    </details>
    <p className="mt-3 max-w-3xl font-sans text-xs leading-5 text-slate-500">Seasonal waves are expected events, so this part measures timing against a known wave. An off season alert can reflect a real change in the data. The definitions were fixed and committed before the results were computed.</p>
    <a href="/datasets/phs-scotland/validation.json" download className="mt-3 inline-flex items-center gap-2 border border-slate-700 px-3 py-2 text-xs text-slate-300 hover:border-slate-500"><Download size={14} /> Download external validation (JSON)</a>
  </>
}

function UgandaPart() {
  const { run } = useAnalyticsRun('/datasets/who-flunet-uganda/run.json')
  const [metric, setMetric] = useState('positive_tests')
  if (!run) return <p className="font-sans text-sm text-slate-500">Loading the WHO FluNet series…</p>
  const window = run.metadata?.analysis_window
  return <>
    <div className="grid gap-4 md:grid-cols-[1fr_1fr]">
      <Panel title="Series" body={`WHO FluNet weekly influenza tests and positives for Uganda, scored from ${formatDate(window?.start)} to ${formatDate(window?.end)}. The canonical data keeps the full record from ${formatDate(window?.canonical_start)}. ${window?.reason ?? ''}`} />
      <Panel title="Notes on the series">
        <ul className="mt-2 list-disc space-y-1 pl-4 font-sans text-sm leading-6 text-slate-400">{(run.metadata?.notes ?? []).filter((n: string) => !n.includes('single_origin_source')).map((n: string) => <li key={n}>{n}</li>)}</ul>
      </Panel>
    </div>
    <div className="mt-4"><SurveillanceChart signals={run.signals} metric={metric} onMetric={setMetric} alerts={run.alerts} height={300} /></div>
    <div className="mt-4"><PriorityAlertFeed alerts={run.alerts} by="recent" compact title={`${run.alerts.length} alerts on the national series`} subtitle="Most recent first." maxHeight="420px" /></div>
  </>
}

export function ReplayPart({ run, dataset }: { run: AnalyticsRun; dataset: Dataset | null }) {
  const dates = useMemo<string[]>(() => [...new Set<string>(run.signals.map(s => String(s.observation.observation_date)))].sort(), [run])
  const [index, setIndex] = useState(() => Math.max(0, Math.floor(dates.length * .7)))
  const [playing, setPlaying] = useState(false)
  const [selectedId, setSelectedId] = useState<string>()
  useEffect(() => { setIndex(Math.max(0, Math.floor(dates.length * .7))); setPlaying(false) }, [dates])
  useEffect(() => { if (!playing) return; const timer = setInterval(() => setIndex(c => c >= dates.length - 1 ? 0 : c + 1), 700); return () => clearInterval(timer) }, [playing, dates.length])
  const date = dates[Math.min(index, dates.length - 1)]
  const view = useMemo(() => run.signals.filter(s => s.observation.observation_date <= date), [run, date])
  const now = latestByLocation(view).filter(s => s.observation.observation_date === date)
  const flagged = now.filter(s => weekStatus(s).tone !== 'normal')
  const alertsSoFar = run.alerts.filter(a => a.start_date <= date)
  const select = (s: Signal) => setSelectedId(s.observation.location_id)
  const place = dataset?.map ?? 'uganda'
  return <>
    <div className="border border-slate-800 bg-[#0d1015] p-4">
      <div className="flex flex-wrap items-center gap-3">
        <span className="min-w-[150px] text-sm text-slate-100">Week of {formatDate(date)}</span>
        <button aria-label="Previous week" onClick={() => setIndex(Math.max(0, index - 1))} className="border border-slate-700 p-2"><SkipBack size={14} /></button>
        <button aria-label={playing ? 'Pause' : 'Play'} onClick={() => setPlaying(!playing)} className="border border-cyan-800 bg-cyan-950/30 p-2 text-cyan-200">{playing ? <Pause size={14} /> : <Play size={14} />}</button>
        <button aria-label="Next week" onClick={() => setIndex(Math.min(dates.length - 1, index + 1))} className="border border-slate-700 p-2"><SkipForward size={14} /></button>
        <input aria-label="Replay week" className="min-w-[160px] flex-1 accent-cyan-500" type="range" min="0" max={dates.length - 1} value={index} onChange={e => setIndex(Number(e.target.value))} />
      </div>
      <p className="mt-3 font-sans text-sm text-slate-400">{flagged.length ? <><span className="text-amber-300">{flagged.length} {flagged.length === 1 ? 'location shows' : 'locations show'} a signal this week</span> ({flagged.map(u => displayLocationName(u.observation.location_name)).join(', ')}).</> : 'No signals this week.'} {alertsSoFar.length} alert{alertsSoFar.length === 1 ? '' : 's'} raised so far.</p>
    </div>
    <div className="mt-4 grid gap-5 lg:grid-cols-[1.1fr_.9fr]">
      {place === 'uganda' ? <SurveillanceMap signals={view} selectedId={selectedId} onSelect={select} title={`Status, week of ${formatDate(date)}`} />
        : place === 'national' ? <NationalPanel signals={view} />
        : <LocationRanking signals={view} onSelect={select} selectedId={selectedId} title={`Status, week of ${formatDate(date)}`} note="Largest change at the top." />}
      <PriorityAlertFeed alerts={alertsSoFar} by="recent" compact maxHeight="600px" title="Alerts raised so far" subtitle="Most recent first." />
    </div>
  </>
}

export function Benchmark({ run, dataset, focus }: { run: AnalyticsRun; dataset: Dataset | null; focus?: string }) {
  useEffect(() => { if (focus) setTimeout(() => document.getElementById(focus)?.scrollIntoView(), 300) }, [focus])
  return <>
    <PageTitle title="Benchmark">Proof of concept benchmark results. Each part answers one question with the same alert rules, set once and left unchanged. The implementation study in Uganda will measure performance on routine laboratory data.</PageTitle>
    <nav aria-label="Benchmark parts" className="mb-6 flex flex-wrap gap-2 text-[11px]">
      {[['#simulated', '1 · Simulated network'], ['#scotland', '2 · External validation'], ['#uganda', '3 · Ugandan series'], ['#replay', 'Retrospective replay']].map(([href, label]) => <a key={href} href={href} className="border border-slate-800 px-2.5 py-1.5 text-slate-300 hover:border-slate-600">{label}</a>)}
    </nav>
    <div className="space-y-8">
      <Part id="simulated" number={1} title="Simulated laboratory network (ground truth)" question="Does ProDrome find events whose timing is known, and stay quiet on a spike that needs no alert?">
        <p className="mb-4 max-w-3xl font-sans text-sm leading-6 text-slate-400">Six simulated laboratories over 156 weeks, 936 location weeks in all. The data holds 5 planted events and 1 test spike in one measure.</p>
        <SimulatedPart />
      </Part>
      <Part id="scotland" number={2} title="External validation on Public Health Scotland data" question="Do the frozen rules behave sensibly on an independent surveillance series from outside their development set?">
        <ScotlandPart />
      </Part>
      <Part id="uganda" number={3} title="Ugandan series (WHO FluNet replay)" question="How do the rules behave on real Ugandan influenza testing over many years?">
        <UgandaPart />
      </Part>
      <Part id="replay" number={4} title="Retrospective replay" question="What did ProDrome know each week, with the data available at that time?">
        <p className="mb-4 max-w-3xl font-sans text-sm leading-6 text-slate-400">Replay of {dataset?.title ?? 'the selected dataset'}{dataset && dataset.runs.length > 1 ? `, ${pathogenLabel(run.signals[0]?.observation.pathogen ?? '')}` : ''}. Change the dataset at the top of the page to replay another one.</p>
        <ReplayPart run={run} dataset={dataset} />
      </Part>
    </div>
  </>
}
