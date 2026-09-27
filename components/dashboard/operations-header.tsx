'use client'

import Link from 'next/link'
import { DataModeBadge } from './data-mode-badge'
import type { AnalyticsRun } from '@/lib/surveillance'

const routes = [['/', 'Overview'], ['/alerts', 'Alerts'], ['/surveillance', 'Surveillance'], ['/locations', 'Locations'], ['/replay', 'Replay'], ['/evaluation', 'Evaluation'], ['/data', 'Data'], ['/methods', 'Methods'], ['/research', 'Research']]

export function OperationsHeader({ run }: { run: AnalyticsRun | null }) {
  return <header className="sticky top-0 z-30 border-b border-slate-800 bg-[#090b0f]/95 px-4 py-2 backdrop-blur">
    <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-4 gap-y-2">
      <Link href="/" className="flex items-center gap-2 text-sm font-bold tracking-[.2em] text-slate-100"><img src="/brand/prodrome-symbol.png" alt="" aria-hidden="true" className="h-6 w-auto object-contain sm:h-7" />PRODROME</Link>
      <span className="text-xs text-slate-500">Early Warning Laboratory Surveillance</span>
      <DataModeBadge />
      <span className="ml-auto text-[10px] text-slate-500">{run ? `${run.model_version} · ${run.run_id}` : 'Loading model run…'}</span>
    </div>
    <nav className="mx-auto mt-3 flex max-w-7xl gap-1 overflow-x-auto text-[11px]">{routes.map(([href, label]) => <Link key={href} href={href} className="whitespace-nowrap px-2 py-1 text-slate-400 transition hover:bg-slate-800 hover:text-white">{label}</Link>)}</nav>
  </header>
}
