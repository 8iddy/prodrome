'use client'

import { useState, useEffect } from 'react'
import { generateMockData } from '@/lib/mock-data'
import type { Facility } from '@/lib/mock-data'
import DashboardHeader from '@/components/dashboard/header'
import FacilityTable from '@/components/dashboard/facility-table'

export default function FacilitiesPage() {
  const [facilities, setFacilities] = useState<Facility[]>([])
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const { facilities } = generateMockData()
    setFacilities(facilities)
    setLoading(false)
  }, [])

  useEffect(() => {
    const timer = setInterval(() => {
      setLastUpdate(new Date())
    }, 60000)
    return () => clearInterval(timer)
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-foreground">Loading facilities...</div>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-background">
      <DashboardHeader lastUpdate={lastUpdate} />

      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Monitored Facilities</h1>
          <p className="text-muted-foreground">Browse and filter facilities across {facilities.length} locations</p>
        </div>

        <div className="bg-card border border-border rounded-lg p-6">
          <FacilityTable facilities={facilities} />
        </div>
      </div>

      <footer className="border-t border-border mt-12 py-6">
        <div className="container mx-auto px-4">
          <p className="text-xs text-muted-foreground text-center">
            This is a prototype with simulated data for demonstration purposes only.
          </p>
        </div>
      </footer>
    </main>
  )
}
