'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useJson } from '@/hooks/use-analytics-run'

export type DatasetRun = { pathogen: string; path: string }
export type Dataset = {
  id: string; title: string; label: string; kind: 'simulated' | 'public'; role: string; publisher: string; licence: string
  source_url?: string; period: [string, string]; locations: number; location_noun: [string, string]; indicators: string[]
  map: 'uganda' | 'list' | 'national'; runs: DatasetRun[]; validation?: string
}
export type DatasetManifest = { generated_at: string; datasets: Dataset[] }

export const DEFAULT_DATASET = 'simulated-network'
const STORAGE_KEY = 'prodrome.dataset'

export const pathogenLabel = (pathogen: string) => ({ influenza: 'Influenza', rsv: 'RSV', 'covid-19': 'COVID-19' } as Record<string, string>)[pathogen] ?? pathogen

function readStored(): { id?: string; pathogen?: string } {
  try { return JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '{}') } catch { return {} }
}

function writeStored(value: { id: string; pathogen: string }) {
  try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value)) } catch { /* storage may be blocked */ }
}

type DatasetContextValue = {
  manifest: DatasetManifest | null; ready: boolean; dataset: Dataset | null; run: DatasetRun | null
  select: (id: string) => void; selectPathogen: (pathogen: string) => void
  /** Singular and plural noun for a location in this dataset, for example "lab" and "labs". */
  noun: (count?: number) => string
}

const DatasetContext = createContext<DatasetContextValue | null>(null)

export function DatasetProvider({ children }: { children: React.ReactNode }) {
  const { value: manifest, loading } = useJson<DatasetManifest>('/datasets/index.json')
  const [choice, setChoice] = useState<{ id: string; pathogen?: string }>({ id: DEFAULT_DATASET })
  useEffect(() => { const stored = readStored(); if (stored.id) setChoice({ id: stored.id, pathogen: stored.pathogen }) }, [])
  const dataset = manifest?.datasets.find(d => d.id === choice.id) ?? manifest?.datasets[0] ?? null
  const run = dataset ? dataset.runs.find(r => r.pathogen === choice.pathogen) ?? dataset.runs[0] : null
  const select = useCallback((id: string) => {
    const next = manifest?.datasets.find(d => d.id === id)
    const pathogen = next?.runs[0]?.pathogen ?? 'influenza'
    setChoice({ id, pathogen }); writeStored({ id, pathogen })
  }, [manifest])
  const selectPathogen = useCallback((pathogen: string) => {
    setChoice(c => { writeStored({ id: c.id, pathogen }); return { ...c, pathogen } })
  }, [])
  const value = useMemo<DatasetContextValue>(() => ({
    manifest, ready: !loading, dataset, run, select, selectPathogen,
    noun: (count = 1) => (dataset?.location_noun ?? ['lab', 'labs'])[count === 1 ? 0 : 1],
  }), [manifest, loading, dataset, run, select, selectPathogen])
  return <DatasetContext.Provider value={value}>{children}</DatasetContext.Provider>
}

/** Null outside the dashboard, for example on the front page and the guided example. */
export function useDataset() {
  return useContext(DatasetContext)
}
