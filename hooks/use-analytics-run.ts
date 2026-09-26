'use client'

import { useEffect, useState } from 'react'
import type { AnalyticsRun } from '@/lib/surveillance'

export function useAnalyticsRun() {
  const [run, setRun] = useState<AnalyticsRun | null>(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    fetch('/analytics/latest-run.json')
      .then(response => response.ok ? response.json() : null)
      .then(value => setRun(value))
      .finally(() => setLoading(false))
  }, [])
  return { run, loading }
}
