'use client'

import { useEffect, useState } from 'react'
import type { AnalyticsRun } from '@/lib/surveillance'

let cache: Promise<AnalyticsRun | null> | null = null

function loadRun() {
  cache ??= fetch('/analytics/latest-run.json').then(r => r.ok ? r.json() : null).catch(() => null)
  return cache
}

/** Loads the generated model run once per browser session and shares it between pages. */
export function useAnalyticsRun() {
  const [run, setRun] = useState<AnalyticsRun | null>(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    let active = true
    loadRun().then(value => { if (active) { setRun(value); setLoading(false) } })
    return () => { active = false }
  }, [])
  return { run, loading }
}
