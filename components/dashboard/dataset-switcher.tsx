'use client'

import { pathogenLabel, useDataset } from '@/lib/datasets'

const TONE = {
  simulated: 'border-amber-700/70 bg-amber-950/35 text-amber-300',
  public: 'border-sky-700/70 bg-sky-950/35 text-sky-200',
}

/** One label per view: the selected dataset. Outside the dashboard it names the simulated network. */
export function DatasetSwitcher() {
  const ctx = useDataset()
  if (!ctx?.manifest || !ctx.dataset) return <span className={`whitespace-nowrap border px-2 py-1 text-[10px] font-semibold tracking-[.08em] ${TONE.simulated}`}>Simulated laboratory network</span>
  const { manifest, dataset, run, select, selectPathogen } = ctx
  return <div className="flex min-w-0 items-center gap-1.5">
    <label className="min-w-0">
      <span className="sr-only">Dataset</span>
      <select value={dataset.id} onChange={e => select(e.target.value)} title={dataset.role}
        className={`max-w-[46vw] truncate border px-1.5 py-1 text-[10px] font-semibold tracking-[.06em] sm:max-w-none ${TONE[dataset.kind]}`}>
        {manifest.datasets.map(d => <option key={d.id} value={d.id} className="bg-[#0d1015] text-slate-100">{d.label}</option>)}
      </select>
    </label>
    {dataset.runs.length > 1 && <label>
      <span className="sr-only">Pathogen</span>
      <select value={run?.pathogen} onChange={e => selectPathogen(e.target.value)} className="border border-slate-700 bg-[#0d1015] px-1.5 py-1 text-[10px] text-slate-100">
        {dataset.runs.map(r => <option key={r.pathogen} value={r.pathogen}>{pathogenLabel(r.pathogen)}</option>)}
      </select>
    </label>}
  </div>
}
