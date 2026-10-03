'use client'

import { useEffect, useState } from 'react'
import type { AnalyticsRun } from '@/lib/surveillance'

export const SIMULATED_RUN_PATH = '/analytics/latest-run.json'

const cache = new Map<string, Promise<any>>()

/** Fetches a JSON artefact once per browser session and shares it between pages. */
export function loadJson<T>(path: string): Promise<T | null> {
  if (!cache.has(path)) cache.set(path, fetch(path).then(r => r.ok ? r.json() : null).catch(() => null))
  return cache.get(path)!
}

export function useJson<T>(path: string | null | undefined) {
  const [state, setState] = useState<{ path?: string | null; value: T | null }>({ value: null })
  useEffect(() => {
    let active = true
    if (!path) { setState({ path, value: null }); return }
    loadJson<T>(path).then(value => { if (active) setState({ path, value }) })
    return () => { active = false }
  }, [path])
  const loading = Boolean(path) && state.path !== path
  return { value: loading ? null : state.value, loading }
}

/** Loads a model run. The default is the simulated network, which the guided example and front page use. */
export function useAnalyticsRun(path: string | null = SIMULATED_RUN_PATH) {
  const { value, loading } = useJson<AnalyticsRun>(path)
  return { run: value, loading }
}
