'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, BellRing, LayoutDashboard, ListChecks, BookOpen } from 'lucide-react'
import { CartesianGrid, Line, LineChart, ReferenceArea, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useAnalyticsRun } from '@/hooks/use-analytics-run'
import type { AnalyticsRun, RunAlert, Signal } from '@/lib/surveillance'
import { SIGNAL_THRESHOLD, displayLocationName, formatDate, formatMetric, metricLabels, rollingMedian } from '@/lib/surveillance'
import { OperationsHeader } from '@/components/dashboard/operations-header'
import { SiteFooter } from '@/components/dashboard/operations-dashboard'
import { AlertCard } from '@/components/dashboard/alert-card'

type Ctx = {
  value: (lab: string, date: string, metric: string) => number | null
  normal: (lab: string, date: string, metric: string) => number | null
  name: (lab: string) => string
  alert: (lab: string) => RunAlert | undefined
}

type Step = {
  kicker: string; title: string; lab: string; compare?: string; metric: string
  from: string; to: string; reveal: string; highlight?: [string, string]; showAlertLine?: boolean
  body: (c: Ctx) => React.ReactNode; stats?: (c: Ctx) => [string, string][]; card?: boolean; final?: boolean
}

const MBALE = 'synthetic-mbale', ARUA = 'synthetic-arua', SOROTI = 'synthetic-soroti'
const pos = 'positive_tests', rate = 'positivity_rate', tests = 'tests_completed'

const STEPS: Step[] = [
  {
    kicker: 'The setting', title: 'Meet one laboratory', lab: MBALE, metric: pos, from: '2024-09-02', to: '2025-10-27', reveal: '2025-07-07',
    body: c => <>
      <p>This is {c.name(MBALE)}. Every week it tells the surveillance system how many influenza tests it ran, and how many came back positive.</p>
      <p>The blue line shows positive tests each week. The dashed line is the <b>normal level</b> for this lab. ProDrome works it out from the lab’s own past year.</p>
      <p>The numbers rise and fall with the season. Every week stays close enough to the normal level, so ProDrome leaves each one unmarked.</p>
    </>,
    stats: c => [['Positive tests, normal week', `about ${formatMetric(pos, c.normal(MBALE, '2025-07-14', pos))}`], ['Tests, normal week', `about ${formatMetric(tests, c.normal(MBALE, '2025-07-14', tests))}`], ['Share positive, normal', `about ${formatMetric(rate, c.normal(MBALE, '2025-07-14', rate))}`]],
  },
  {
    kicker: 'Week of 14 Jul 2025', title: 'Something changes', lab: MBALE, metric: pos, from: '2024-09-02', to: '2025-10-27', reveal: '2025-07-14', highlight: ['2025-07-14', '2025-07-14'],
    body: c => <>
      <p>Positive tests jump to <b>{formatMetric(pos, c.value(MBALE, '2025-07-14', pos))}</b>. The share of tests that are positive rises to <b>{formatMetric(rate, c.value(MBALE, '2025-07-14', rate))}</b>.</p>
      <p>ProDrome marks the week as a <span className="text-amber-300">signal</span> (the amber dot) and keeps watching. <b>It waits for a second week before it raises an alert.</b></p>
      <p>A single signal can come from a data entry error, a backlog of old samples or a short testing drive. Waiting for a second week keeps false alarms low.</p>
    </>,
    stats: c => [['Positive tests', `${formatMetric(pos, c.value(MBALE, '2025-07-14', pos))} (normal ${formatMetric(pos, c.normal(MBALE, '2025-07-14', pos))})`], ['Share positive', `${formatMetric(rate, c.value(MBALE, '2025-07-14', rate))} (normal ${formatMetric(rate, c.normal(MBALE, '2025-07-14', rate))})`], ['Alert status', 'Watching']],
  },
  {
    kicker: 'Week of 21 Jul 2025', title: 'The change holds, and another lab sees it too', lab: MBALE, compare: ARUA, metric: pos, from: '2024-09-02', to: '2025-10-27', reveal: '2025-07-21', highlight: ['2025-07-14', '2025-07-21'], showAlertLine: true,
    body: c => <>
      <p>A second signal: <b>{formatMetric(pos, c.value(MBALE, '2025-07-21', pos))}</b> positive tests at {c.name(MBALE)}.</p>
      <p>In the same weeks, {c.name(ARUA)} (purple line), in another region, shows the same rise.</p>
      <p>Now the signs line up. More tests are positive, and a larger share of them. The rise has lasted two weeks. A second lab sees it too. <b>ProDrome raises an alert.</b></p>
    </>,
    stats: () => [['Weeks in a row', '2'], ['Signs that agree', 'Count + share positive'], ['Other labs with a change', '1']],
  },
  {
    kicker: 'The alert', title: 'What the surveillance officer receives', lab: MBALE, compare: ARUA, metric: pos, from: '2024-09-02', to: '2025-10-27', reveal: '2025-07-21', showAlertLine: true, card: true,
    body: () => <>
      <p>The alert states what changed, how large the change is, and what to do next. It also names the person who should act.</p>
      <p>The surveillance officer then checks recent case reports, contacts the lab and decides on the response.</p>
    </>,
  },
  {
    kicker: 'July to September 2025', title: 'One alert for the whole episode', lab: MBALE, compare: ARUA, metric: pos, from: '2024-09-02', to: '2025-10-27', reveal: '2025-10-27', highlight: ['2025-07-14', '2025-09-15'], showAlertLine: true,
    body: () => <>
      <p>The rise lasted about ten weeks before the numbers went back to normal.</p>
      <p>ProDrome kept <b>one alert</b> open for the whole period. The team received one message for the episode and could follow it until the numbers returned to normal.</p>
    </>,
    stats: () => [['Weeks above normal', '10'], ['Alerts sent', '1 per lab'], ['Days from first change to alert', '7']],
  },
  {
    kicker: 'May 2024 · a different lab', title: 'A spike that needed no alert', lab: SOROTI, metric: tests, from: '2023-11-06', to: '2024-10-28', reveal: '2024-10-28', highlight: ['2024-05-20', '2024-05-27'],
    body: c => <>
      <p>For two weeks, {c.name(SOROTI)} ran more than twice its normal number of tests: <b>{formatMetric(tests, c.value(SOROTI, '2024-05-20', tests))}</b> against a normal {formatMetric(tests, c.normal(SOROTI, '2024-05-20', tests))}.</p>
      <p>Positive tests rose with them, and the <b>share</b> of positive tests stayed close to normal ({formatMetric(rate, c.value(SOROTI, '2024-05-20', rate))} against {formatMetric(rate, c.normal(SOROTI, '2024-05-20', rate))}). That pattern usually points to more testing.</p>
      <p>One kind of sign changed, and the other labs stayed normal. ProDrome kept watching and <b>held the alert</b>. We placed this test spike in the data on purpose, to check that ProDrome stays quiet in this case.</p>
    </>,
    stats: () => [['Kind of sign', 'Test volume'], ['Other labs with a change', '0'], ['Alert status', 'Held, as expected']],
  },
  {
    kicker: 'Your turn', title: 'Now explore the dashboard', lab: MBALE, compare: ARUA, metric: pos, from: '2023-01-02', to: '2025-12-22', reveal: '2025-12-22', showAlertLine: true, final: true,
    body: () => <>
      <p>You have followed the full path: weekly numbers, a signal, a pattern that holds, the alert, and a test spike that needed no alert.</p>
      <p>The dashboard shows the same thing for all six labs. It also shows two other kinds of alert: a <span className="text-violet-300">lab operations problem</span> (slow results, failed quality checks) and a <span className="text-sky-300">reporting gap</span> (missing weekly reports).</p>
    </>,
  },
]

function useCtx(run: AnalyticsRun | null): { ctx: Ctx; series: Map<string, Signal[]> } {
  return useMemo(() => {
    const series = new Map<string, Signal[]>()
    run?.signals.forEach(s => { const k = s.observation.location_id; series.set(k, [...(series.get(k) ?? []), s]) })
    series.forEach(v => v.sort((a, b) => a.observation.observation_date.localeCompare(b.observation.observation_date)))
    const baselines = new Map<string, (number | null)[]>()
    const base = (lab: string, metric: string) => { const key = `${lab}:${metric}`; if (!baselines.has(key)) baselines.set(key, rollingMedian((series.get(lab) ?? []).map(s => s.observation[metric] ?? null))); return baselines.get(key)! }
    const idx = (lab: string, date: string) => (series.get(lab) ?? []).findIndex(s => s.observation.observation_date === date)
    const ctx: Ctx = {
      value: (lab, date, metric) => (series.get(lab) ?? [])[idx(lab, date)]?.observation[metric] ?? null,
      normal: (lab, date, metric) => { const v = base(lab, metric)[idx(lab, date)] ?? null; return v != null && (metric === pos || metric === tests) ? Math.round(v) : v },
      name: lab => displayLocationName(series.get(lab)?.[0]?.observation.location_name ?? lab),
      alert: lab => run?.alerts.find(a => a.location_id === lab),
    }
    return { ctx, series }
  }, [run])
}

const tick = { fontSize: 10, fill: '#64748b' }
const monthTick = (v: string) => new Date(`${v}T00:00:00Z`).toLocaleDateString('en-GB', { month: 'short', year: '2-digit', timeZone: 'UTC' })

function StoryChart({ step, series, ctx }: { step: Step; series: Map<string, Signal[]>; ctx: Ctx }) {
  const data = useMemo(() => {
    const main = series.get(step.lab) ?? []
    const base = rollingMedian(main.map(s => s.observation[step.metric] ?? null))
    const cmp = new Map((series.get(step.compare ?? '') ?? []).map(s => [s.observation.observation_date, s.observation[step.metric]]))
    return main.map((s, i) => ({ s, base: base[i] })).filter(({ s }) => s.observation.observation_date >= step.from && s.observation.observation_date <= step.to).map(({ s, base }) => {
      const d = s.observation.observation_date, shown = d <= step.reveal
      const flagged = shown && (s.anomaly_signal ?? (s.risk_score >= SIGNAL_THRESHOLD && (s.drivers?.length ?? 0) > 0))
      return { date: d, all: s.observation[step.metric], observed: shown ? s.observation[step.metric] : null, normal: shown ? base : null, compare: shown && step.compare ? cmp.get(d) ?? null : null, flag: flagged ? s.observation[step.metric] : null }
    })
  }, [step, series])
  const cmpAll = new Map((series.get(step.compare ?? '') ?? []).map(x => [x.observation.observation_date, x.observation[step.metric]]))
  const cmpMax = (r: { date: string }) => step.compare ? cmpAll.get(r.date) ?? 0 : 0
  const alert = step.showAlertLine ? ctx.alert(step.lab) : undefined
  const pad = (d: string, dir: -1 | 1) => { const i = data.findIndex(r => r.date === d); return data[Math.min(data.length - 1, Math.max(0, i + dir))]?.date ?? d }
  return <div className="h-[250px] sm:h-[360px] lg:h-[420px]">
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 22, right: 12, left: -12, bottom: 0 }}>
        <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="date" tick={tick} tickFormatter={monthTick} minTickGap={36} />
        <YAxis tick={tick} width={44} domain={[0, Math.ceil(Math.max(10, ...data.map(r => Math.max(Number(r.all) || 0, Number(cmpMax(r)) || 0))) / 10) * 10]} />
        <Tooltip contentStyle={{ background: '#0b1016', border: '1px solid #334155', fontSize: 12 }} labelFormatter={v => `Week of ${formatDate(String(v))}`} formatter={(v: any, n: string) => [formatMetric(step.metric, v), n]} />
        {step.highlight && <ReferenceArea x1={pad(step.highlight[0], -1)} x2={pad(step.highlight[1], 1)} fill="#f59e0b" fillOpacity={0.08} stroke="#f59e0b" strokeOpacity={0.25} />}
        {alert && alert.start_date <= step.reveal && <ReferenceLine x={alert.start_date} stroke="#fb7185" strokeWidth={1.5} label={{ value: 'Alert raised', position: 'insideTopLeft', fill: '#fda4af', fontSize: 11, dy: -14 }} />}
        <Line dataKey="normal" name="Normal level" stroke="#94a3b8" strokeDasharray="5 4" dot={false} strokeWidth={1.4} isAnimationActive={false} connectNulls />
        {step.compare && <Line dataKey="compare" name={ctx.name(step.compare)} stroke="#a78bfa" dot={false} strokeWidth={1.6} strokeOpacity={0.85} isAnimationActive={false} />}
        <Line dataKey="observed" name={ctx.name(step.lab)} stroke="#22d3ee" dot={false} strokeWidth={2.2} isAnimationActive={false} />
        <Line dataKey="flag" name="Signal" stroke="none" legendType="none" dot={{ r: 4, fill: '#f59e0b', stroke: '#0d1015', strokeWidth: 1.5 }} activeDot={false} isAnimationActive={false} />
      </LineChart>
    </ResponsiveContainer>
  </div>
}

export function GuidedExample() {
  const { run, loading } = useAnalyticsRun()
  const { ctx, series } = useCtx(run)
  const [index, setIndex] = useState(0)
  const step = STEPS[index]
  const go = useCallback((n: number) => setIndex(Math.min(STEPS.length - 1, Math.max(0, n))), [])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if ((e.target as HTMLElement)?.tagName === 'SELECT') return; if (e.key === 'ArrowRight') go(index + 1); if (e.key === 'ArrowLeft') go(index - 1) }
    window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey)
  }, [index, go])
  const alert = ctx.alert(step.lab)
  return <div className="min-h-screen bg-[#080a0d] font-mono text-slate-300">
    <OperationsHeader minimal />
    <main className="mx-auto max-w-7xl px-4 py-6 md:px-6 md:py-8">
      <div className="max-w-3xl">
        <p className="text-[10px] uppercase tracking-[.18em] text-cyan-300/80">Guided example · about 2 minutes</p>
        <h1 className="mt-2 font-sans text-2xl font-semibold text-slate-50 md:text-3xl">Follow one alert from start to finish</h1>
        <p className="mt-2 font-sans text-sm leading-6 text-slate-400">See how ProDrome turns weekly laboratory numbers into an alert for the surveillance team. The example uses the simulated laboratory network, where the timing of each event is known.</p>
      </div>
      <ol className="mt-6 grid grid-cols-7 gap-1.5" aria-label="Steps">
        {STEPS.map((s, i) => <li key={s.title}><button onClick={() => go(i)} aria-current={i === index ? 'step' : undefined} aria-label={`Step ${i + 1}: ${s.title}`} className="group block w-full text-left">
          <span className={`block h-1 w-full transition ${i < index ? 'bg-cyan-700' : i === index ? 'bg-cyan-300' : 'bg-slate-800 group-hover:bg-slate-700'}`} />
          <span className={`mt-2 hidden truncate text-[10px] md:block ${i === index ? 'text-slate-100' : 'text-slate-500'}`}>{i + 1}. {s.title}</span>
        </button></li>)}
      </ol>
      {loading || !run ? <div className="mt-6 border border-slate-800 bg-[#0d1015] p-6 font-sans text-sm text-slate-500">{loading ? 'Loading example data…' : 'Run the analytics pipeline to load the example data.'}</div> :
        <div className="mt-6 grid items-start gap-5 lg:grid-cols-[1.35fr_1fr]">
          <section className="border border-slate-800 bg-[#0d1015] p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="inline-flex flex-wrap items-center gap-2 text-sm text-slate-100">{metricLabels[step.metric]} per week · {ctx.name(step.lab)}</p>
              <div className="flex flex-wrap gap-3 text-[10px] text-slate-400">
                <span className="inline-flex items-center gap-1.5"><i className="h-0.5 w-4 bg-cyan-400" />{ctx.name(step.lab)}</span>
                {step.compare && <span className="inline-flex items-center gap-1.5"><i className="h-0.5 w-4 bg-violet-400" />{ctx.name(step.compare)}</span>}
                <span className="inline-flex items-center gap-1.5"><i className="w-4 border-t border-dashed border-slate-400" />Normal level</span>
                <span className="inline-flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-amber-400" />Signal</span>
              </div>
            </div>
            <div className="mt-3"><StoryChart step={step} series={series} ctx={ctx} /></div>
            {step.stats && <dl className="mt-4 grid gap-3 border-t border-slate-800 pt-4 sm:grid-cols-3">{step.stats(ctx).map(([k, v]) => <div key={k}><dt className="text-[10px] uppercase tracking-wider text-slate-500">{k}</dt><dd className="mt-1 text-sm text-slate-100">{v}</dd></div>)}</dl>}
          </section>
          <section className="flex flex-col border border-slate-800 bg-[#0d1015]" aria-live="polite">
            <div className="flex-1 p-5">
              <p className="text-[10px] uppercase tracking-[.16em] text-cyan-300/80">Step {index + 1} of {STEPS.length} · {step.kicker}</p>
              <h2 className="mt-2 font-sans text-xl font-semibold leading-snug text-slate-50">{step.title}</h2>
              <div className="mt-3 space-y-3 font-sans text-[15px] leading-7 text-slate-300 [&_b]:font-semibold [&_b]:text-slate-100">{step.body(ctx)}</div>
              {step.card && alert && <div className="mt-4 border border-slate-700 bg-[#0b0e13]"><p className="flex items-center gap-2 border-b border-slate-800 px-4 py-2 text-[10px] uppercase tracking-wider text-slate-400"><BellRing size={12} className="text-rose-300" />Alert as it appears in ProDrome</p><AlertCard alert={alert} defaultOpen /></div>}
              {step.final && <div className="mt-5 grid gap-2">
                <Link href="/dashboard" className="flex items-center gap-3 border border-cyan-800 bg-cyan-950/40 px-4 py-3 text-sm text-cyan-100 hover:bg-cyan-900/50"><LayoutDashboard size={16} />Open the dashboard<ArrowRight size={14} className="ml-auto" /></Link>
                <Link href="/alerts" className="flex items-center gap-3 border border-slate-700 px-4 py-3 text-sm text-slate-200 hover:border-slate-500"><ListChecks size={16} />See all alerts<ArrowRight size={14} className="ml-auto" /></Link>
                <Link href="/methods" className="flex items-center gap-3 border border-slate-700 px-4 py-3 text-sm text-slate-200 hover:border-slate-500"><BookOpen size={16} />Read how ProDrome decides<ArrowRight size={14} className="ml-auto" /></Link>
              </div>}
            </div>
            <div className="flex items-center justify-between gap-3 border-t border-slate-800 p-4">
              <button onClick={() => go(index - 1)} disabled={index === 0} className="inline-flex items-center gap-2 border border-slate-700 px-3 py-2 text-xs text-slate-200 disabled:opacity-30"><ArrowLeft size={14} />Back</button>
              <span className="hidden text-[10px] text-slate-500 sm:inline">Tip: use the arrow keys</span>
              {index < STEPS.length - 1 ? <button onClick={() => go(index + 1)} className="inline-flex items-center gap-2 border border-cyan-700 bg-cyan-500/15 px-4 py-2 text-xs font-semibold text-cyan-100 hover:bg-cyan-500/25">Next<ArrowRight size={14} /></button>
                : <button onClick={() => go(0)} className="inline-flex items-center gap-2 border border-slate-700 px-3 py-2 text-xs text-slate-200">Start again</button>}
            </div>
          </section>
        </div>}
    </main>
    <SiteFooter />
  </div>
}
