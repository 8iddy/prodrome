'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { PlayCircle } from 'lucide-react'
import { DataModeBadge } from './data-mode-badge'

const routes: [string, string][] = [
  ['/dashboard', 'Overview'], ['/alerts', 'Alerts'], ['/surveillance', 'Explore data'], ['/locations', 'Labs'],
  ['/replay', 'Replay'], ['/evaluation', 'Evaluation'], ['/methods', 'How it works'], ['/data', 'Data'],
]

const clean = (path: string) => (path.replace(/\/+$/, '') || '/')

export function OperationsHeader({ minimal = false }: { minimal?: boolean }) {
  const pathname = clean(usePathname() ?? '/')
  return <header className="sticky top-0 z-30 border-b border-slate-800 bg-[#090b0f]/95 backdrop-blur">
    <div className="mx-auto flex max-w-7xl items-center gap-2 px-4 py-2.5 sm:gap-3">
      <Link href="/" className="flex shrink-0 items-center gap-2 text-sm font-bold tracking-[.2em] text-slate-100" aria-label="ProDrome home"><img src="/brand/prodrome-symbol.png" alt="" aria-hidden="true" className="h-6 w-auto object-contain sm:h-7" />PRODROME</Link>
      <span className="hidden text-xs text-slate-500 lg:inline">Laboratory early warning</span>
      <DataModeBadge />
      <div className="ml-auto flex items-center gap-2">
        {pathname !== '/example' && <Link href="/example" className="inline-flex items-center gap-1.5 border border-cyan-800 bg-cyan-950/40 px-2.5 py-1.5 text-[11px] text-cyan-200 transition hover:bg-cyan-900/50"><PlayCircle size={14} aria-hidden="true" /><span className="hidden sm:inline">Guided example</span><span className="sr-only sm:hidden">Guided example</span></Link>}
        {minimal && <Link href="/dashboard" className="hidden border border-slate-700 px-2.5 py-1.5 text-[11px] text-slate-200 transition hover:border-slate-500 sm:inline-block">Open dashboard</Link>}
      </div>
    </div>
    {!minimal && <div className="relative mx-auto max-w-7xl">
      <nav aria-label="Dashboard sections" className="flex gap-1 overflow-x-auto px-3 pb-2 text-[11px] [scrollbar-width:none]">
        {routes.map(([href, label]) => {
          const active = pathname === href || (href === '/dashboard' && pathname === '/dashboard')
          return <Link key={href} href={href} aria-current={active ? 'page' : undefined} className={`whitespace-nowrap border-b-2 px-2.5 py-1.5 transition ${active ? 'border-cyan-400 text-slate-100' : 'border-transparent text-slate-400 hover:text-white'}`}>{label}</Link>
        })}
      </nav>
      <div className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-[#090b0f] md:hidden" />
    </div>}
  </header>
}
