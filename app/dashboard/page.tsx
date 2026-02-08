'use client'

import { useState, useEffect } from 'react'
import { generateMockData, getKPIs } from '@/lib/mock-data'
import type { Facility, Alert } from '@/lib/mock-data'
import DashboardHeader from '@/components/dashboard/header'
import KPICards from '@/components/dashboard/kpi-cards'
import AlertFeed from '@/components/dashboard/alert-feed'
import TimeSeriesChart from '@/components/dashboard/time-series-chart'
import FacilityTable from '@/components/dashboard/facility-table'
import MapView from '@/components/dashboard/map-view'

export default function DashboardPage() {
  const [facilities, setFacilities] = useState<Facility[]>([])
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [expandedAlerts, setExpandedAlerts] = useState<Set<string>>(new Set())
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const { facilities, alerts } = generateMockData()
    setFacilities(facilities)
    setAlerts(alerts)
    setLoading(false)
  }, [])

  // Simulate live timestamp updates
  useEffect(() => {
    const timer = setInterval(() => {
      setLastUpdate(new Date())
    }, 60000) // Update every minute
    return () => clearInterval(timer)
  }, [])

  const toggleAlert = (alertId: string) => {
    setExpandedAlerts((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(alertId)) {
        newSet.delete(alertId)
      } else {
        newSet.add(alertId)
      }
      return newSet
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-foreground">Loading dashboard...</div>
      </div>
    )
  }

  const kpis = getKPIs(facilities, alerts)

  return (
    <main className="min-h-screen bg-background">
      <DashboardHeader lastUpdate={lastUpdate} />

      {/* KPI Cards */}
      <div className="container mx-auto px-4 py-8">
        <KPICards kpis={kpis} />

        {/* Main Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
          {/* Left: Map (60%) */}
          <div className="lg:col-span-2">
            <div className="bg-card border border-border rounded-lg overflow-hidden h-full min-h-[500px]">
              <MapView facilities={facilities} />
            </div>
          </div>

          {/* Right: Alert Feed (40%) */}
          <div className="lg:col-span-1">
            <div className="bg-card border border-border rounded-lg overflow-hidden h-full min-h-[500px]">
              <AlertFeed alerts={alerts} expandedAlerts={expandedAlerts} onToggleAlert={toggleAlert} />
            </div>
          </div>
        </div>

        {/* Time Series Chart */}
        <div className="mt-8">
          <div className="bg-card border border-border rounded-lg p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">30-Day Risk Trend</h2>
            <TimeSeriesChart facilities={facilities} />
          </div>
        </div>

        {/* Facility Table */}
        <div className="mt-8">
          <div className="bg-card border border-border rounded-lg p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">Facility Status</h2>
            <FacilityTable facilities={facilities} />
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-border mt-12 py-6">
        <div className="container mx-auto px-4">
          <p className="text-xs text-muted-foreground text-center">
            This is a prototype with simulated data for demonstration purposes only. No real patient data is used.
          </p>
        </div>
      </footer>
    </main>
  )
}
