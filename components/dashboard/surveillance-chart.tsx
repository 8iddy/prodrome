'use client'

import { useMemo } from 'react'
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { RunAlert, Signal } from '@/lib/surveillance'
import { SIGNAL_THRESHOLD, displayLocationName, isSignal, formatDate, formatMetric, metricHelp, metricLabels, rollingMedian } from '@/lib/surveillance'

const tick = { fontSize: 10, fill: '#64748b' }
const tooltipStyle = { background: '#0b1016', border: '1px solid #334155', fontSize: 12, fontFamily: 'inherit' }
const shortDate = (value: string) => { const d = new Date(`${value}T00:00:00Z`); return d.toLocaleDateString('en-GB', { month: 'short', year: '2-digit', timeZone: 'UTC' }) }

export function ChartNote({ children }: { children: React.ReactNode }) {
  return <p className="mt-1 max-w-2xl font-sans text-xs leading-5 text-slate-500">{children}</p>
}

function Key({ swatch, label }: { swatch: React.ReactNode; label: string }) {
  return <span className="inline-flex items-center gap-1.5 whitespace-nowrap">{swatch}{label}</span>
}

export function SurveillanceChart({ signals, metric = 'positive_tests', onMetric, alerts = [], height = 340 }: { signals: Signal[]; metric?: string; onMetric?: (metric: string) => void; alerts?: RunAlert[]; height?: number }) {
  const available = ['positive_tests', 'positivity_rate', 'tests_completed', 'median_tat_hours', 'backlog_count', 'reporting_completeness'].filter(key => signals.some(s => s.observation[key] != null))
  const single = new Set(signals.map(s => s.observation.location_id)).size === 1
  const name = single ? displayLocationName(signals[0]?.observation.location_name) : 'All locations'
  const data = useMemo(() => {
    const rows = signals.slice().sort((a, b) => a.observation.observation_date.localeCompare(b.observation.observation_date))
    const baseline = rollingMedian(rows.map(s => s.observation[metric] ?? null))
    return rows.map((s, i) => {
      const flagged = isSignal(s)
      return { date: s.observation.observation_date, observed: s.observation[metric], expected: baseline[i], flag: flagged ? s.observation[metric] : null }
    })
  }, [signals, metric])
  const alertDates = single ? alerts.filter(a => (a.location_id ?? '') === signals[0]?.observation.location_id || a.location === signals[0]?.observation.location_name).map(a => a.start_date) : []
  const pct = metric === 'positivity_rate' || metric === 'reporting_completeness'
  return <section className="border border-slate-800 bg-[#0d1015] p-4">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h2 className="text-sm text-slate-100">{metricLabels[metric]} per week · {name}</h2><ChartNote>{metricHelp[metric]} The dashed line is the normal level (median of the past 52 weeks). Amber dots mark signals, the weeks ProDrome found unusual.</ChartNote></div>
      {onMetric && <div className="flex max-w-full gap-1 overflow-x-auto">{available.map(key => <button key={key} onClick={() => onMetric(key)} className={`whitespace-nowrap border px-2 py-1 text-[11px] ${metric === key ? 'border-cyan-700 bg-cyan-950/40 text-cyan-200' : 'border-slate-800 text-slate-500 hover:text-slate-200'}`}>{metricLabels[key]}</button>)}</div>}
    </div>
    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-slate-400">
      <Key swatch={<i className="h-0.5 w-4 bg-cyan-400" />} label="Reported" />
      <Key swatch={<i className="w-4 border-t border-dashed border-slate-400" />} label="Normal level" />
      <Key swatch={<i className="h-2 w-2 rounded-full bg-amber-400" />} label="Signal" />
      {alertDates.length > 0 && <Key swatch={<i className="h-3 w-px bg-rose-400" />} label="Alert raised" />}
    </div>
    <div style={{ height }} className="mt-2">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 18, right: 8, left: -14, bottom: 0 }}>
          <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="date" tick={tick} tickFormatter={shortDate} minTickGap={40} />
          <YAxis tick={tick} tickFormatter={v => pct ? `${Math.round(v * 100)}%` : String(v)} width={44} />
          <Tooltip contentStyle={tooltipStyle} labelFormatter={v => `Week of ${formatDate(String(v))}`} formatter={(value: any, label: string) => [formatMetric(metric, value), label]} />
          {alertDates.map(date => <ReferenceLine key={date} x={date} stroke="#fb7185" strokeWidth={1.2} label={{ value: 'Alert', position: 'top', fill: '#fda4af', fontSize: 10 }} />)}
          <Line dataKey="expected" name="Normal level" stroke="#94a3b8" strokeDasharray="4 4" dot={false} strokeWidth={1.3} isAnimationActive={false} connectNulls />
          <Line dataKey="observed" name="Reported" stroke="#22d3ee" dot={false} strokeWidth={1.8} isAnimationActive={false} />
          <Line dataKey="flag" name="Signal" stroke="none" legendType="none" dot={{ r: 3, fill: '#f59e0b', stroke: '#0d1015', strokeWidth: 1 }} activeDot={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  </section>
}

export function RiskTrendChart({ signals, height = 220 }: { signals: Signal[]; height?: number }) {
  const data = useMemo(() => signals.slice().sort((a, b) => a.observation.observation_date.localeCompare(b.observation.observation_date)).map(s => ({ date: s.observation.observation_date, risk: s.risk_score })), [signals])
  const single = new Set(signals.map(s => s.observation.location_id)).size === 1
  return <section className="border border-slate-800 bg-[#0d1015] p-4">
    <h2 className="text-sm text-slate-100">Risk score per week{single ? ` · ${displayLocationName(signals[0]?.observation.location_name)}` : ''}</h2>
    <ChartNote>A score from 0 (normal) to 1 (very unusual). A week above the amber line with a measure far from normal is a signal. ProDrome raises an alert when the change lasts and other signs agree.</ChartNote>
    <div style={{ height }} className="mt-3">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: -14, bottom: 0 }}>
          <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="date" tick={tick} tickFormatter={shortDate} minTickGap={40} />
          <YAxis domain={[0, 1]} ticks={[0, .5, 1]} tick={tick} width={44} />
          <Tooltip contentStyle={tooltipStyle} labelFormatter={v => `Week of ${formatDate(String(v))}`} formatter={(value: any) => [Number(value).toFixed(2), 'Score']} />
          <ReferenceLine y={SIGNAL_THRESHOLD} stroke="#f59e0b" strokeDasharray="4 4" label={{ value: 'Signal level', position: 'insideTopRight', fill: '#fbbf24', fontSize: 10 }} />
          <Line dataKey="risk" name="Score" stroke="#f59e0b" dot={false} strokeWidth={1.6} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  </section>
}
