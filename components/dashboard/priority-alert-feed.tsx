'use client'

import type { RunAlert } from '@/lib/surveillance'
import { severityRank } from '@/lib/surveillance'
import type { AlertReview, NewReviewEntry } from '@/lib/reviews'
import { AlertCard } from './alert-card'

export function sortAlerts(alerts: RunAlert[], by: 'priority' | 'recent' = 'priority') {
  return [...alerts].sort((a, b) => by === 'recent'
    ? b.start_date.localeCompare(a.start_date)
    : severityRank(b.severity) - severityRank(a.severity) || b.risk_score - a.risk_score || b.start_date.localeCompare(a.start_date))
}

export type FeedReviews = { reviews: Record<string, AlertReview>; record: (entry: Omit<NewReviewEntry, 'datasetId'>) => Promise<unknown> }

export function PriorityAlertFeed({ alerts, limit, compact = false, title = 'Alerts to check', subtitle = 'Most important first. Each alert says what changed and what to do next.', by = 'priority', maxHeight, reviews, openId, empty = 'No alerts in this period.' }: { alerts: RunAlert[]; limit?: number; compact?: boolean; title?: string; subtitle?: string; by?: 'priority' | 'recent'; maxHeight?: string; reviews?: FeedReviews; openId?: string; empty?: string }) {
  const ordered = sortAlerts(alerts, by).slice(0, limit)
  return <section className="flex flex-col border border-slate-800 bg-[#0d1015]">
    <div className="flex items-start justify-between gap-3 border-b border-slate-800 px-4 py-3">
      <div><h2 className="text-sm text-slate-100">{title}</h2><p className="mt-0.5 font-sans text-xs text-slate-500">{subtitle}</p></div>
      <span className="border border-slate-700 px-2 py-0.5 text-xs text-slate-300">{alerts.length}</span>
    </div>
    <div className="overflow-y-auto" style={maxHeight ? { maxHeight } : undefined}>
      {ordered.length ? ordered.map(alert => <AlertCard key={alert.alert_id} alert={alert} compact={compact} defaultOpen={alert.alert_id === openId}
        review={reviews?.reviews[alert.alert_id]} onRecord={reviews?.record} />) : <p className="p-4 font-sans text-sm text-slate-500">{empty}</p>}
    </div>
  </section>
}
