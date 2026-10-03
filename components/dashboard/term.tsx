'use client'

import { useState } from 'react'
import * as Popover from '@radix-ui/react-popover'
import { GLOSSARY, type GlossaryKey } from '@/lib/glossary'

/** A word with a short plain definition. Opens on hover, keyboard focus or tap. */
export function Term({ k, children, className = '' }: { k: GlossaryKey; children?: React.ReactNode; className?: string }) {
  const [open, setOpen] = useState(false)
  const entry = GLOSSARY[k]
  return <Popover.Root open={open} onOpenChange={setOpen}>
    <Popover.Trigger asChild>
      <button type="button" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}
        className={`cursor-help border-b border-dotted border-slate-500 text-inherit underline-offset-2 outline-none focus-visible:text-cyan-200 ${className}`}>
        {children ?? entry.term}
      </button>
    </Popover.Trigger>
    <Popover.Portal>
      <Popover.Content side="top" sideOffset={6} collisionPadding={12} onOpenAutoFocus={e => e.preventDefault()}
        className="z-50 max-w-[280px] border border-slate-700 bg-[#0b1016] px-3 py-2 font-sans text-xs leading-5 text-slate-300 shadow-xl">
        <span className="block font-semibold text-slate-100">{entry.term}</span>{entry.text}
        <Popover.Arrow className="fill-slate-700" />
      </Popover.Content>
    </Popover.Portal>
  </Popover.Root>
}
