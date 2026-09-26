export type Driver = { metric: string; observed: number | null; expected: number | null; z_score?: number }
export type Signal = { risk_score: number; persistence: number; drivers: Driver[]; observation: Record<string, any> }
export type RunAlert = { alert_id: string; severity: 'low' | 'medium' | 'high' | 'critical'; location: string; pathogen: string; risk_score: number; persistence: number; primary_driver: Driver; supporting_drivers: Driver[]; start_date: string; verification_action: string }
export type AnalyticsRun = { run_id: string; model_version: string; configuration_version: string; created_at: string; records_scored: number; alerts: RunAlert[]; signals: Signal[] }

export const metricLabels: Record<string, string> = {
  tests_completed: 'Tests', positive_tests: 'Positives', positivity_rate: 'Positivity',
  median_tat_hours: 'Turnaround time', backlog_count: 'Backlog', rejected_samples: 'Rejected samples',
  qc_failures: 'QC failures', reagent_consumption: 'Reagent consumption',
}

export function formatMetric(metric: string, value: number | null | undefined) {
  if (value == null) return '—'
  if (metric === 'positivity_rate') return `${(value * 100).toFixed(1)}%`
  return Number.isInteger(value) ? String(value) : value.toFixed(1)
}

export function driverText(driver?: Driver) {
  if (!driver?.metric) return 'Combined surveillance indicators'
  const baseline = driver.expected == null ? '' : ` vs expected ${formatMetric(driver.metric, driver.expected)}`
  return `${metricLabels[driver.metric] ?? driver.metric}: ${formatMetric(driver.metric, driver.observed)}${baseline}`
}

export function severityRank(severity: string) { return ({ critical: 4, high: 3, medium: 2, low: 1 } as Record<string, number>)[severity] ?? 0 }

export function latestByLocation(signals: Signal[]) {
  const latest = new Map<string, Signal>()
  for (const signal of signals) {
    const key = signal.observation.location_id
    const current = latest.get(key)
    if (!current || signal.observation.observation_date > current.observation.observation_date) latest.set(key, signal)
  }
  return [...latest.values()]
}

export function availableMetrics(signals: Signal[]) {
  return Object.keys(metricLabels).filter(metric => signals.some(s => s.observation[metric] != null))
}
