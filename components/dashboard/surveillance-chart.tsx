'use client'

import { useMemo } from 'react'
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { Signal } from '@/lib/surveillance'
import { formatMetric, metricLabels } from '@/lib/surveillance'

export function SurveillanceChart({ signals, metric = 'tests_completed', onMetric }: { signals: Signal[]; metric?: string; onMetric?: (metric: string) => void }) {
  const available = Object.keys(metricLabels).filter(key => signals.some(s => s.observation[key] != null))
  const data = useMemo(() => signals.slice().sort((a,b)=>a.observation.observation_date.localeCompare(b.observation.observation_date)).map(s => {
    const driver = s.drivers.find(d => d.metric === metric)
    return { date: s.observation.observation_date, observed: s.observation[metric], expected: driver?.expected ?? null, risk: s.risk_score, alert: s.risk_score >= .55 ? s.observation[metric] : null }
  }), [signals, metric])
  return <section className="h-[330px] border border-slate-800 bg-[#0d1015] p-3"><div className="mb-2 flex flex-wrap items-center justify-between gap-2"><div><p className="text-xs text-slate-200">Surveillance trend</p><p className="text-[10px] text-slate-500">Observed values, expected baseline where available, and signal periods</p></div>{onMetric && <div className="flex gap-1 overflow-x-auto">{available.slice(0,5).map(key => <button key={key} onClick={() => onMetric(key)} className={`whitespace-nowrap border px-2 py-1 text-[10px] ${metric===key ? 'border-cyan-700 bg-cyan-950/40 text-cyan-200' : 'border-slate-800 text-slate-500 hover:text-slate-200'}`}>{metricLabels[key]}</button>)}</div>}</div><ResponsiveContainer width="100%" height="88%"><LineChart data={data} margin={{top:10,right:10,left:-20,bottom:0}}><CartesianGrid stroke="#1e293b" strokeDasharray="3 3"/><XAxis dataKey="date" tick={{fontSize:10,fill:'#64748b'}} minTickGap={32}/><YAxis tick={{fontSize:10,fill:'#64748b'}}/><Tooltip contentStyle={{background:'#0b1016',border:'1px solid #334155',fontSize:12}} formatter={(value:any, name:string) => [formatMetric(metric, value), name]}/>{data.some(row=>row.expected != null) && <Line dataKey="expected" name="Expected baseline" stroke="#64748b" strokeDasharray="4 4" dot={false} strokeWidth={1.5}/>}<Line dataKey="observed" name={metricLabels[metric]} stroke="#22d3ee" dot={false} strokeWidth={2}/><ReferenceLine y={metric==='positivity_rate' ? .2 : undefined} stroke="#f59e0b" strokeDasharray="4 4" opacity={.55}/></LineChart></ResponsiveContainer></section>
}

export function RiskTrendChart({ signals }: { signals: Signal[] }) {
  const data = useMemo(() => signals.slice().sort((a,b)=>a.observation.observation_date.localeCompare(b.observation.observation_date)).map(s=>({date:s.observation.observation_date,risk:s.risk_score})),[signals])
  return <section className="h-[330px] border border-slate-800 bg-[#0d1015] p-3"><div className="mb-2"><p className="text-xs text-slate-200">Risk trend</p><p className="text-[10px] text-slate-500">Composite signal score through time</p></div><ResponsiveContainer width="100%" height="88%"><LineChart data={data} margin={{top:10,right:10,left:-20,bottom:0}}><CartesianGrid stroke="#1e293b" strokeDasharray="3 3"/><XAxis dataKey="date" tick={{fontSize:10,fill:'#64748b'}} minTickGap={32}/><YAxis domain={[0,1]} tick={{fontSize:10,fill:'#64748b'}}/><Tooltip contentStyle={{background:'#0b1016',border:'1px solid #334155',fontSize:12}}/><ReferenceLine y={.55} stroke="#f59e0b" strokeDasharray="4 4"/><Line dataKey="risk" name="Risk score" stroke="#f59e0b" dot={false} strokeWidth={2}/></LineChart></ResponsiveContainer></section>
}
