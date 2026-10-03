'use client'

import type { Signal } from '@/lib/surveillance'
import { displayLocationName, driverText, formatDate, formatMetric, latestByLocation, weekStatus } from '@/lib/surveillance'
import { TONE } from './surveillance-map'

/** One national series, for example WHO FluNet for Uganda: the latest week and its status. */
export function NationalPanel({ signals }: { signals: Signal[] }) {
  const latest = latestByLocation(signals)[0]
  if (!latest) return null
  const o = latest.observation
  const status = weekStatus(latest)
  const t = TONE[status.tone]
  const cells: [string, string, string][] = [
    ['Tests', 'tests_completed', formatMetric('tests_completed', o.tests_completed)],
    ['Positive tests', 'positive_tests', formatMetric('positive_tests', o.positive_tests)],
    ['Positivity', 'positivity_rate', formatMetric('positivity_rate', o.positivity_rate)],
  ]
  return <section className="flex flex-col border border-slate-800 bg-[#0b1016]" aria-label="National series">
    <div className="border-b border-slate-800 px-4 py-3">
      <h2 className="text-sm text-slate-100">{displayLocationName(o.location_name)}, national series</h2>
      <p className="mt-0.5 font-sans text-xs text-slate-500">Weekly totals from the national influenza surveillance laboratories.</p>
    </div>
    <div className="flex flex-1 flex-col justify-center gap-5 p-5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="h-3 w-3 rounded-full" style={{ background: t.color }} />
        <span className={`text-lg ${t.text}`}>{status.label}</span>
        <span className="text-xs text-slate-500">· week of {formatDate(o.observation_date)}</span>
      </div>
      <div className="grid grid-cols-3 gap-3">{cells.map(([label, , value]) => <div key={label} className="border border-slate-800 bg-[#0d1015] p-3"><p className="text-[10px] uppercase tracking-wider text-slate-500">{label}</p><p className="mt-1 text-2xl text-slate-100">{value}</p></div>)}</div>
      <p className="font-sans text-sm leading-6 text-slate-400">{status.tone === 'normal' ? 'Influenza testing is within the normal range for this series.' : `Main change: ${driverText(latest.drivers?.[0])}.`}</p>
    </div>
  </section>
}
