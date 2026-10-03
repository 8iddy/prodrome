'use client'

import { useCallback, useEffect, useState } from 'react'

/* Alert review records.
 * Screens talk to the ReviewStore interface only. The prototype keeps reviews in this browser
 * (LocalReviewStore). For the implementation study, a store backed by Cloudflare D1 with named
 * user accounts can implement the same interface, and getReviewStore() returns it instead. */

export type AlertStatus = 'new' | 'under_review' | 'verified' | 'dismissed'

export const STATUS_LABEL: Record<AlertStatus, string> = {
  new: 'New', under_review: 'Under review', verified: 'Verified', dismissed: 'Dismissed',
}

export const STATUS_ORDER: AlertStatus[] = ['new', 'under_review', 'verified', 'dismissed']

/** Checks a reviewer can tick. Edit this list after feedback from laboratory and surveillance staff. */
export const REVIEW_CHECKS: { id: string; label: string }[] = [
  { id: 'lab_confirmed', label: 'Lab confirmed the numbers' },
  { id: 'data_quality_checked', label: 'Data entry and reporting checked' },
  { id: 'cases_compared', label: 'Case reports compared' },
  { id: 'district_contacted', label: 'District team contacted' },
]

export type ReviewEntry = {
  id: string; datasetId: string; alertId: string; status: AlertStatus; checks: string[]
  response: string; note: string; reviewer: string; recordedAt: string
}

export type AlertReview = { datasetId: string; alertId: string; status: AlertStatus; history: ReviewEntry[]; updatedAt: string }

export type NewReviewEntry = Omit<ReviewEntry, 'id' | 'recordedAt'>

export interface ReviewStore {
  /** All reviews for one dataset, keyed by alert ID. */
  list(datasetId: string): Promise<Record<string, AlertReview>>
  /** Adds an entry to the alert's history and sets its status. */
  record(entry: NewReviewEntry): Promise<AlertReview>
}

const PREFIX = 'prodrome.reviews.'
const CHANGE_EVENT = 'prodrome:reviews-changed'

export class LocalReviewStore implements ReviewStore {
  private read(datasetId: string): Record<string, AlertReview> {
    try { return JSON.parse(window.localStorage.getItem(PREFIX + datasetId) ?? '{}') } catch { return {} }
  }

  async list(datasetId: string) { return this.read(datasetId) }

  async record(entry: NewReviewEntry) {
    const all = this.read(entry.datasetId)
    const full: ReviewEntry = { ...entry, id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`, recordedAt: new Date().toISOString() }
    const previous = all[entry.alertId]
    const review: AlertReview = { datasetId: entry.datasetId, alertId: entry.alertId, status: entry.status, history: [...(previous?.history ?? []), full], updatedAt: full.recordedAt }
    all[entry.alertId] = review
    try { window.localStorage.setItem(PREFIX + entry.datasetId, JSON.stringify(all)) } catch { throw new Error('This browser blocks local storage. Allow site data for ProDrome and save again.') }
    try { window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: entry.datasetId })) } catch { /* no window events */ }
    return review
  }
}

let store: ReviewStore | null = null
export function getReviewStore(): ReviewStore {
  store ??= new LocalReviewStore()
  return store
}

export function statusOf(reviews: Record<string, AlertReview>, alertId: string): AlertStatus {
  return reviews[alertId]?.status ?? 'new'
}

export function countByStatus(reviews: Record<string, AlertReview>, alertIds: string[]) {
  const counts: Record<AlertStatus, number> = { new: 0, under_review: 0, verified: 0, dismissed: 0 }
  alertIds.forEach(id => { counts[statusOf(reviews, id)] += 1 })
  return counts
}

/** Reviews for one dataset. Every component using it updates when any card saves a review. */
export function useReviews(datasetId: string | null | undefined) {
  const [reviews, setReviews] = useState<Record<string, AlertReview>>({})
  const refresh = useCallback(() => { if (datasetId) getReviewStore().list(datasetId).then(setReviews).catch(() => setReviews({})) }, [datasetId])
  useEffect(() => {
    refresh()
    const onChange = (e: Event) => { if ((e as CustomEvent).detail === datasetId) refresh() }
    window.addEventListener(CHANGE_EVENT, onChange)
    return () => window.removeEventListener(CHANGE_EVENT, onChange)
  }, [datasetId, refresh])
  const record = useCallback((entry: Omit<NewReviewEntry, 'datasetId'>) => {
    if (!datasetId) return Promise.reject(new Error('No dataset selected.'))
    return getReviewStore().record({ ...entry, datasetId })
  }, [datasetId])
  return { reviews, record }
}

const REVIEWER_KEY = 'prodrome.reviewer'
export function rememberedReviewer() { try { return window.localStorage.getItem(REVIEWER_KEY) ?? '' } catch { return '' } }
export function rememberReviewer(name: string) { try { window.localStorage.setItem(REVIEWER_KEY, name) } catch { /* optional */ } }
