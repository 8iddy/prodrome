'use client'

import Link from 'next/link'
import { useMemo } from 'react'
import { ArrowRight, Building2, ClipboardCheck, Database, Eye, FlaskConical, LineChart as LineIcon, Lock, PlayCircle, UserCheck, Users } from 'lucide-react'
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, XAxis, YAxis } from 'recharts'
import { useAnalyticsRun } from '@/hooks/use-analytics-run'
import type { AlertKind } from '@/lib/surveillance'
import { SIGNAL_THRESHOLD, alertKinds, displayLocationName, rollingMedian } from '@/lib/surveillance'
import { OperationsHeader } from '@/components/dashboard/operations-header'
import { SiteFooter } from '@/components/dashboard/operations-dashboard'
import { AlertCard, KIND_STYLE } from '@/components/dashboard/alert-card'

const LAB = 'synthetic-mbale'

function HeroVisual() {
  const { run } = useAnalyticsRun()
  const { data, name, alert } = useMemo(() => {
    const s = (run?.signals ?? []).filter(x => x.observation.location_id === LAB).sort((a, b) => a.observation.observation_date.localeCompare(b.observation.observation_date))
    const base = rollingMedian(s.map(x => x.observation.positive_tests ?? null))
    const rows = s.map((x, i) => ({ date: x.observation.observation_date, observed: x.observation.positive_tests, normal: base[i], flag: (x.anomaly_signal ?? x.risk_score >= SIGNAL_THRESHOLD) ? x.observation.positive_tests : null }))
      .filter(r => r.date >= '2025-02-03' && r.date <= '2025-10-27')
    return { data: rows, name: displayLocationName(s[0]?.observation.location_name), alert: run?.alerts.find(a => a.location_id === LAB) }
  }, [run])
  return <div className="border border-slate-800 bg-[#0b0f14] shadow-[0_0_80px_-30px_rgba(34,211,238,.35)]">
    <div className="flex items-center justify-between border-b border-slate-800 px-4 py-2.5">
      <p className="text-[10px] uppercase tracking-[.16em] text-slate-400">Example · positive tests per week</p>
      <span className="inline-flex items-center gap-1.5 text-xs text-slate-300">{name || '…'}</span>
    </div>
    <div className="h-[170px] px-2 pt-3">
      {data.length > 0 && <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 6, right: 8, left: -24, bottom: 0 }}>
          <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="date" ticks={data.filter((r, i) => i === 0 || r.date.slice(5, 7) !== data[i - 1].date.slice(5, 7)).filter((_, i) => i % 2 === 0).map(r => r.date)} tick={{ fontSize: 9, fill: '#64748b' }} tickFormatter={v => new Date(`${v}T00:00:00Z`).toLocaleDateString('en-GB', { month: 'short', timeZone: 'UTC' })} />
          <YAxis tick={{ fontSize: 9, fill: '#64748b' }} width={40} />
          {alert && <ReferenceLine x={alert.start_date} stroke="#fb7185" label={{ value: 'Alert', position: 'insideTopLeft', fill: '#fda4af', fontSize: 10, dx: 2 }} />}
          <Line dataKey="normal" stroke="#94a3b8" strokeDasharray="4 4" dot={false} strokeWidth={1.2} isAnimationActive={false} connectNulls />
          <Line dataKey="observed" stroke="#22d3ee" dot={false} strokeWidth={2} isAnimationActive={false} />
          <Line dataKey="flag" stroke="none" dot={{ r: 3, fill: '#f59e0b', stroke: '#0b0f14', strokeWidth: 1 }} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>}
    </div>
    <div className="flex flex-wrap gap-x-4 gap-y-1 px-4 pb-3 pt-1 text-[10px] text-slate-500">
      <span className="inline-flex items-center gap-1.5"><i className="h-0.5 w-4 bg-cyan-400" />Reported</span>
      <span className="inline-flex items-center gap-1.5"><i className="w-4 border-t border-dashed border-slate-400" />Normal level</span>
      <span className="inline-flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-amber-400" />Signal</span>
    </div>
    {alert ? <div className="border-t border-slate-800"><p className="px-4 pt-3 text-[10px] uppercase tracking-[.16em] text-slate-400">The alert ProDrome sends</p><AlertCard alert={alert} compact /></div> : <div className="h-40" />}
  </div>
}

const STEPS: [typeof Database, string, string][] = [
  [Database, 'Labs report weekly totals', 'Each lab reports its weekly totals: tests done, positive results, time to result and failed quality checks.'],
  [LineIcon, 'ProDrome compares with normal', 'ProDrome compares each week with the same lab’s past year and marks the weeks that are far from normal.'],
  [UserCheck, 'The team checks the alert', 'When a change lasts or other signs agree, ProDrome sends an alert that says what changed and who should act.'],
]

const AUDIENCE: [typeof Users, string, string][] = [
  [Users, 'District surveillance officers', 'See which lab needs a closer look this week, and why.'],
  [FlaskConical, 'Laboratory managers', 'Spot slow results, backlogs and failed quality checks early.'],
  [Building2, 'National surveillance teams', 'Follow many labs at once from one screen.'],
]

const SAFEGUARDS: [typeof UserCheck, string, string][] = [
  [UserCheck, 'People make the decision', 'Every alert goes to the surveillance team, who check it and decide on the response.'],
  [Lock, 'Weekly totals', 'ProDrome reads weekly totals from each lab. Patient names and individual results stay at the lab.'],
  [Eye, 'Every alert shows its reasons', 'Each alert lists the numbers behind it, so anyone can check the logic.'],
]

export function Landing() {
  return <div className="min-h-screen bg-[#080a0d] font-mono text-slate-300">
    <OperationsHeader minimal />
    <main>
      <section className="relative overflow-hidden border-b border-slate-800">
        <div className="pointer-events-none absolute inset-0 opacity-[.35]" style={{ backgroundImage: 'linear-gradient(#141c26 1px, transparent 1px), linear-gradient(90deg, #141c26 1px, transparent 1px)', backgroundSize: '48px 48px', maskImage: 'radial-gradient(ellipse at 30% 40%, black 30%, transparent 75%)' }} />
        <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-4 py-12 md:px-6 md:py-20 lg:grid-cols-[1.05fr_1fr]">
          <div>
            <p className="text-[11px] uppercase tracking-[.2em] text-cyan-300/90">Laboratory early warning · Research prototype</p>
            <h1 className="mt-4 font-sans text-4xl font-semibold leading-[1.1] tracking-tight text-slate-50 md:text-5xl">Know when laboratory data starts to look unusual.</h1>
            <p className="mt-5 max-w-xl font-sans text-lg leading-8 text-slate-400">Labs report their test results every week. ProDrome compares each week with what is normal for that lab. When a change lasts or other signs agree, it tells the surveillance team what changed and what to do next.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/example" className="inline-flex items-center gap-2 bg-cyan-400 px-5 py-3 text-sm font-semibold text-[#06121a] transition hover:bg-cyan-300"><PlayCircle size={18} />See how it works · 2 min</Link>
              <Link href="/dashboard" className="inline-flex items-center gap-2 border border-slate-600 px-5 py-3 text-sm text-slate-100 transition hover:border-slate-400">Open the dashboard<ArrowRight size={16} /></Link>
            </div>
            <p className="mt-5 font-sans text-xs text-slate-500">The example uses the simulated laboratory network. ProDrome also runs on public surveillance data from WHO FluNet for Uganda and Public Health Scotland.</p>
          </div>
          <HeroVisual />
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-8 px-4 py-14 md:px-6 lg:grid-cols-[.9fr_1.1fr]">
        <div><p className="text-[11px] uppercase tracking-[.2em] text-slate-500">The problem</p><h2 className="mt-3 font-sans text-2xl font-semibold leading-snug text-slate-50 md:text-3xl">Lab data carries early signals. Reading every number by hand takes time.</h2></div>
        <div className="space-y-4 font-sans text-base leading-7 text-slate-400">
          <p>When an infection spreads, more samples test positive. Labs often see this early, sometimes before case reports reach the district.</p>
          <p>One district can depend on several labs, and each lab reports many numbers every week. A real change is easy to miss, and a short spike is easy to mistake for a real change.</p>
          <p className="text-slate-200">ProDrome reads every number, every week, and points the team to the few that need a person to look.</p>
        </div>
      </section>

      <section className="border-y border-slate-800 bg-[#0a0d11]">
        <div className="mx-auto max-w-7xl px-4 py-14 md:px-6">
          <p className="text-[11px] uppercase tracking-[.2em] text-slate-500">How it works</p>
          <h2 className="mt-3 font-sans text-2xl font-semibold text-slate-50 md:text-3xl">Three steps, every week</h2>
          <ol className="mt-8 grid gap-4 md:grid-cols-3">{STEPS.map(([Icon, title, body], i) => <li key={title} className="relative border border-slate-800 bg-[#0d1015] p-5">
            <div className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center bg-cyan-500/10 text-cyan-300"><Icon size={18} /></span><span className="text-xs text-slate-500">0{i + 1}</span></div>
            <h3 className="mt-4 font-sans text-lg font-semibold text-slate-100">{title}</h3>
            <p className="mt-2 font-sans text-sm leading-6 text-slate-400">{body}</p>
            {i < 2 && <ArrowRight size={18} className="absolute -right-3.5 top-1/2 z-10 hidden -translate-y-1/2 bg-[#0a0d11] text-slate-600 md:block" />}
          </li>)}</ol>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14 md:px-6">
        <p className="text-[11px] uppercase tracking-[.2em] text-slate-500">What it looks for</p>
        <h2 className="mt-3 font-sans text-2xl font-semibold text-slate-50 md:text-3xl">Three kinds of alert</h2>
        <p className="mt-3 max-w-2xl font-sans text-base leading-7 text-slate-400">Unusual weeks have different causes. ProDrome names the kind of problem it sees, so the right person acts.</p>
        <div className="mt-8 grid gap-4 md:grid-cols-3">{(Object.keys(alertKinds) as AlertKind[]).map(k => { const s = KIND_STYLE[k]; const Icon = s.icon; const info = alertKinds[k]; return <div key={k} className="border border-slate-800 bg-[#0d1015] p-5" style={{ boxShadow: `inset 0 3px 0 ${s.accent}` }}>
          <span className={`grid h-9 w-9 place-items-center ${s.soft}`}><Icon size={18} className={s.text} /></span>
          <h3 className="mt-4 font-sans text-lg font-semibold text-slate-100">{info.label}</h3>
          <p className="mt-2 font-sans text-sm leading-6 text-slate-400">{info.meaning}</p>
          <p className="mt-4 border-t border-slate-800 pt-3 text-[11px] text-slate-500">Who acts: <span className="text-slate-300">{info.who}</span></p>
        </div> })}</div>
      </section>

      <section className="border-y border-slate-800 bg-[#0a0d11]">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 md:px-6 lg:grid-cols-2">
          <div>
            <p className="text-[11px] uppercase tracking-[.2em] text-slate-500">Who it is for</p>
            <ul className="mt-6 space-y-5">{AUDIENCE.map(([Icon, title, body]) => <li key={title} className="flex gap-4"><span className="grid h-9 w-9 shrink-0 place-items-center bg-slate-800/60 text-slate-200"><Icon size={17} /></span><div><h3 className="font-sans text-base font-semibold text-slate-100">{title}</h3><p className="mt-1 font-sans text-sm leading-6 text-slate-400">{body}</p></div></li>)}</ul>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-[.2em] text-slate-500">Safeguards</p>
            <ul className="mt-6 space-y-5">{SAFEGUARDS.map(([Icon, title, body]) => <li key={title} className="flex gap-4"><span className="grid h-9 w-9 shrink-0 place-items-center bg-slate-800/60 text-slate-200"><Icon size={17} /></span><div><h3 className="font-sans text-base font-semibold text-slate-100">{title}</h3><p className="mt-1 font-sans text-sm leading-6 text-slate-400">{body}</p></div></li>)}</ul>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14 md:px-6">
        <div className="flex flex-col items-start gap-6 border border-cyan-900/60 bg-gradient-to-r from-cyan-950/40 to-transparent p-6 md:flex-row md:items-center md:justify-between md:p-8">
          <div><h2 className="font-sans text-2xl font-semibold text-slate-50">Follow one alert from start to finish</h2><p className="mt-2 max-w-xl font-sans text-sm leading-6 text-slate-400">Seven steps: a normal lab, a signal, the alert, and a test spike that needed no alert.</p></div>
          <div className="flex flex-wrap gap-3">
            <Link href="/example" className="inline-flex items-center gap-2 bg-cyan-400 px-5 py-3 text-sm font-semibold text-[#06121a] hover:bg-cyan-300"><PlayCircle size={18} />Start the example</Link>
            <Link href="/methods" className="inline-flex items-center gap-2 border border-slate-600 px-5 py-3 text-sm text-slate-100 hover:border-slate-400"><ClipboardCheck size={16} />How it decides</Link>
          </div>
        </div>
      </section>
    </main>
    <SiteFooter />
  </div>
}
