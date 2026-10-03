'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { PlayCircle } from 'lucide-react'
import { DatasetSwitcher } from './dataset-switcher'

/** Menu groups. Old routes stay live and map to the section that now holds their content. */
const groups: { label: string; routes: { href: string; label: string; also?: string[] }[] }[] = [
  { label: 'Monitor', routes: [
    { href: '/dashboard', label: 'Overview' },
    { href: '/alerts', label: 'Alerts', also: ['/dashboard/alerts'] },
    { href: '/locations', label: 'Labs', also: ['/surveillance', '/dashboard/facilities'] },
  ] },
  { label: 'Evidence', routes: [
    { href: '/evaluation', label: 'Benchmark', also: ['/replay'] },
    { href: '/methods', label: 'Methods' },
    { href: '/data', label: 'Data sources', also: ['/research'] },
  ] },
]

const clean = (path: string) => (path.replace(/\/+$/, '') || '/')

export function OperationsHeader({ minimal = false }: { minimal?: boolean }) {
  const pathname = clean(usePathname() ?? '/')
  return <header className="sticky top-0 z-30 border-b border-slate-800 bg-[#090b0f]/95 backdrop-blur">
    <div className="mx-auto flex max-w-7xl items-center gap-2 px-4 py-2.5 sm:gap-3">
      <Link href="/" className="flex shrink-0 items-center gap-2 text-sm font-bold tracking-[.2em] text-slate-100" aria-label="ProDrome home"><img src="/brand/prodrome-symbol.png" alt="" aria-hidden="true" className="h-6 w-auto object-contain sm:h-7" /><span className="hidden min-[400px]:inline">PRODROME</span></Link>
      <span className="hidden text-xs text-slate-500 xl:inline">Laboratory early warning</span>
      <DatasetSwitcher />
      <div className="ml-auto flex shrink-0 items-center gap-2">
        {pathname !== '/example' && <Link href="/example" className="inline-flex items-center gap-1.5 border border-cyan-800 bg-cyan-950/40 px-2.5 py-1.5 text-[11px] text-cyan-200 transition hover:bg-cyan-900/50"><PlayCircle size={14} aria-hidden="true" /><span className="hidden sm:inline">Guided example</span><span className="sr-only sm:hidden">Guided example</span></Link>}
        {minimal && <Link href="/dashboard" className="hidden border border-slate-700 px-2.5 py-1.5 text-[11px] text-slate-200 transition hover:border-slate-500 sm:inline-block">Open dashboard</Link>}
      </div>
    </div>
    {!minimal && <div className="relative mx-auto max-w-7xl">
      <nav aria-label="Dashboard sections" className="flex items-center gap-1 overflow-x-auto px-3 pb-2 text-[11px] [scrollbar-width:none]">
        {groups.map((group, gi) => <div key={group.label} className={`flex shrink-0 items-center gap-1 ${gi ? 'ml-2 border-l border-slate-800 pl-3' : ''}`}>
          <span className="pr-1 text-[9px] uppercase tracking-[.16em] text-slate-600">{group.label}</span>
          {group.routes.map(route => {
            const active = pathname === route.href || route.also?.includes(pathname)
            return <Link key={route.href} href={route.href} aria-current={active ? 'page' : undefined} className={`whitespace-nowrap border-b-2 px-2 py-1.5 transition ${active ? 'border-cyan-400 text-slate-100' : 'border-transparent text-slate-400 hover:text-white'}`}>{route.label}</Link>
          })}
        </div>)}
      </nav>
      <div className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-[#090b0f] md:hidden" />
    </div>}
  </header>
}
