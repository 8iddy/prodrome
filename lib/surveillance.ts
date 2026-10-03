export type Driver = { metric: string; observed: number | null; expected: number | null; z_score?: number }
export type Signal = { risk_score: number; persistence: number; drivers?: Driver[]; observation: Record<string, any>; anomaly_signal?: boolean; spatial_corroboration?: number }
export type RunAlert = { alert_id: string; dataset_id?: string; severity: 'low' | 'medium' | 'high' | 'critical'; location: string; location_id?: string; pathogen: string; risk_score: number; persistence: number; primary_driver: Driver; supporting_drivers: Driver[]; start_date: string; verification_action: string; spatial_corroboration?: number; data_quality?: string[] }
export type AnalyticsRun = { run_id: string; dataset_id?: string; metadata?: Record<string, any>; model_version: string; configuration_version: string; created_at: string; records_scored: number; alerts: RunAlert[]; signals: Signal[] }

/** Score at which a week counts as unusual (configs/scoring/v2-balanced.json → severity_thresholds.low). */
export const SIGNAL_THRESHOLD = 0.58

export const metricLabels: Record<string, string> = {
  tests_completed: 'Tests', positive_tests: 'Positive tests', positivity_rate: 'Positivity',
  median_tat_hours: 'Turnaround time', backlog_count: 'Backlog', rejected_samples: 'Rejected samples',
  qc_failures: 'QC failures', reagent_consumption: 'Reagent use', reporting_completeness: 'Reports received',
}

export const metricHelp: Record<string, string> = {
  tests_completed: 'Number of tests the lab completed in the week.',
  positive_tests: 'Number of tests with a positive result in the week.',
  positivity_rate: 'Share of completed tests that were positive.',
  median_tat_hours: 'Median time from sample arrival to result, in hours.',
  backlog_count: 'Samples waiting for a result at the end of the week.',
  rejected_samples: 'Samples the lab rejected for testing.',
  qc_failures: 'Failed quality control runs.',
  reagent_consumption: 'Reagent units used in the week.',
  reporting_completeness: 'Share of expected weekly reports that arrived.',
}

export function formatMetric(metric: string, value: number | null | undefined) {
  if (value == null) return '—'
  if (metric === 'positivity_rate' || metric === 'reporting_completeness') return `${Math.round(value * 100)}%`
  if (metric === 'median_tat_hours') return `${Math.round(value)} h`
  return Number.isInteger(value) ? String(value) : value.toFixed(1)
}

/** Short display name: "Synthetic Mbale Laboratory" → "Mbale lab". Canonical names stay unchanged in the data. */
export function displayLocationName(locationName: string | null | undefined) {
  return (locationName ?? '').replace(/^synthetic\s+/i, '').replace(/\s+laboratory$/i, ' lab').replace(/^NHS\s+/, '')
}

/** A week counts as a signal when the model marked it, or when its score passed the signal level with a driver. */
export function isSignal(signal: Signal) {
  return Boolean(signal.anomaly_signal ?? (signal.risk_score >= SIGNAL_THRESHOLD && signal.drivers?.length))
}

export function formatDate(value: string | null | undefined) {
  if (!value) return '—'
  const date = new Date(`${value.slice(0, 10)}T00:00:00Z`)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
}

const RATE_METRICS = new Set(['positivity_rate', 'reporting_completeness', 'median_tat_hours'])

/** Expected levels of counts read as whole numbers in alert text: "about 14", never "about 14.5". */
function expectedValue(metric: string, value: number | null) {
  return value == null || RATE_METRICS.has(metric) ? value : Math.round(value)
}

export function driverText(driver?: Driver) {
  if (!driver?.metric) return 'Within normal range'
  const baseline = driver.expected == null ? '' : ` (normal: ${formatMetric(driver.metric, expectedValue(driver.metric, driver.expected))})`
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

/* ---------- Plain-language alert model ---------- */

export type AlertKind = 'infection' | 'operations' | 'reporting'

const KIND_BY_METRIC: Record<string, AlertKind> = {
  positive_tests: 'infection', positivity_rate: 'infection', tests_completed: 'infection',
  median_tat_hours: 'operations', backlog_count: 'operations', qc_failures: 'operations',
  reagent_consumption: 'operations', rejected_samples: 'operations',
  reporting_completeness: 'reporting',
}

export const alertKinds: Record<AlertKind, { label: string; short: string; meaning: string; nextStep: string; who: string }> = {
  infection: {
    label: 'Unusual rise in positive tests',
    short: 'Possible rise in infections',
    meaning: 'More tests than usual came back positive. This can be an early sign of more infections in the area.',
    nextStep: 'Compare with recent case reports from the district, and ask the lab to confirm the numbers.',
    who: 'District surveillance officer',
  },
  operations: {
    label: 'Laboratory operations problem',
    short: 'Lab is under strain',
    meaning: 'The lab takes longer to return results or has quality problems. Slow results can delay other signals from the same lab.',
    nextStep: 'Contact the lab manager to check staff, equipment, reagents and quality control.',
    who: 'Laboratory manager',
  },
  reporting: {
    label: 'Reporting gap',
    short: 'Weekly reports are missing',
    meaning: 'Fewer weekly reports arrived than expected. Missing reports can hide a rise in infections.',
    nextStep: 'Contact the lab or district data officer to find and submit the missing reports.',
    who: 'District data officer',
  },
}

export function alertKind(driver?: Driver): AlertKind {
  return KIND_BY_METRIC[driver?.metric ?? ''] ?? 'infection'
}

function times(observed: number | null, expected: number | null) {
  if (observed == null || expected == null || expected <= 0) return ''
  const ratio = observed / expected
  return ratio >= 1.8 ? ` This is about ${Math.round(ratio)} times the normal level.` : ''
}

function driverSentence(driver: Driver) {
  const o = driver.observed, e = expectedValue(driver.metric, driver.expected)
  const f = (v: number | null) => formatMetric(driver.metric, v)
  switch (driver.metric) {
    case 'positive_tests': return `${f(o)} positive tests in one week. A normal week has about ${f(e)}.${times(o, e)}`
    case 'positivity_rate': return `${f(o)} of tests were positive. Normal is about ${f(e)}.`
    case 'tests_completed': return `${f(o)} tests completed in one week. A normal week has about ${f(e)}.`
    case 'median_tat_hours': return `Results took ${f(o)} to come back. Normal is about ${f(e)}.`
    case 'backlog_count': return `${f(o)} samples were waiting for a result. Normal is about ${f(e)}.`
    case 'qc_failures': return `${f(o)} quality control runs failed. Normal is ${f(e)}.`
    case 'reagent_consumption': return `Reagent use was ${f(o)} units. Normal is about ${f(e)}.`
    case 'rejected_samples': return `${f(o)} samples were rejected. Normal is about ${f(e)}.`
    case 'reporting_completeness': return `${f(o)} of expected weekly reports arrived. Normally ${f(e)} arrive.`
    default: return driverText(driver) + '.'
  }
}

export function explainAlert(alert: Pick<RunAlert, 'primary_driver' | 'supporting_drivers' | 'persistence' | 'spatial_corroboration' | 'pathogen'>) {
  const kind = alertKind(alert.primary_driver)
  const info = alertKinds[kind]
  const evidence = [alert.primary_driver, ...(alert.supporting_drivers ?? [])].filter(d => d?.metric).slice(0, 3).map(driverSentence)
  const pattern: string[] = []
  if (alert.persistence > 1) pattern.push(`The change lasted ${alert.persistence} weeks in a row.`)
  if ((alert.spatial_corroboration ?? 0) > 0) pattern.push(`${alert.spatial_corroboration} other lab${alert.spatial_corroboration === 1 ? '' : 's'} showed an unusual change in the same week.`)
  const pathogen = alert.pathogen === 'rsv' ? 'RSV' : alert.pathogen
  const title = kind !== 'infection' ? info.label
    : alert.primary_driver?.metric === 'tests_completed' ? `Unusual rise in ${pathogen} testing`
    : `Unusual rise in positive ${pathogen} tests`
  return { kind, title, info, evidence, pattern }
}

export function levelWord(severity: string) {
  return ({ critical: 'Urgent', high: 'High', medium: 'Medium', low: 'Low' } as Record<string, string>)[severity] ?? severity
}

/** Plain status for a single week at a lab. */
export function weekStatus(signal: Signal): { label: string; tone: 'normal' | 'watch' | 'unusual' } {
  if (signal.risk_score >= 0.68 && signal.drivers?.length) return { label: 'Strong signal', tone: 'unusual' }
  if (signal.risk_score >= SIGNAL_THRESHOLD && signal.drivers?.length) return { label: 'Signal', tone: 'watch' }
  return { label: 'Normal', tone: 'normal' }
}

/** Median of the previous `window` values — a display-only "normal level" that mirrors the model's robust baseline. */
export function rollingMedian(values: (number | null)[], window = 52, minimum = 12) {
  return values.map((_, index) => {
    const prior = values.slice(Math.max(0, index - window), index).filter((v): v is number => v != null).sort((a, b) => a - b)
    if (prior.length < minimum) return null
    const mid = Math.floor(prior.length / 2)
    return prior.length % 2 ? prior[mid] : (prior[mid - 1] + prior[mid]) / 2
  })
}
