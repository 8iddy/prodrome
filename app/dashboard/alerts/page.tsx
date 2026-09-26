'use client'

import { useState, useEffect } from 'react'
import { generateMockData } from '@/lib/mock-data'
import type { Alert } from '@/lib/mock-data'
import DashboardHeader from '@/components/dashboard/header'
import AlertFeed from '@/components/dashboard/alert-feed'

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [expandedAlerts, setExpandedAlerts] = useState<Set<string>>(new Set())
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const { alerts } = generateMockData()
    setAlerts(alerts)
    setLoading(false)
  }, [])

  useEffect(() => {
    const timer = setInterval(() => {
      setLastUpdate(new Date())
    }, 60000)
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
        <div className="text-foreground">Loading alerts...</div>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-background">
      <DashboardHeader lastUpdate={lastUpdate} />

      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Alert History</h1>
          <p className="text-muted-foreground">{alerts.length} active alerts detected</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Alerts Feed (Full Width) */}
          <div className="lg:col-span-2">
            <div className="bg-card border border-border rounded-lg overflow-hidden">
              <AlertFeed alerts={alerts} expandedAlerts={expandedAlerts} onToggleAlert={toggleAlert} />
            </div>
          </div>

          {/* Alert Summary Sidebar */}
          <div className="space-y-4">
            <div className="bg-card border border-border rounded-lg p-4">
              <h3 className="text-sm font-semibold text-foreground mb-3">Alert Summary</h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Total Alerts</span>
                  <span className="text-lg font-bold text-foreground">{alerts.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">High Priority</span>
                  <span className="text-lg font-bold text-red-500">
                    {alerts.filter((a) => a.severity === 'high').length}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Medium Priority</span>
                  <span className="text-lg font-bold text-orange-500">
                    {alerts.filter((a) => a.severity === 'medium').length}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Low Priority</span>
                  <span className="text-lg font-bold text-yellow-500">
                    {alerts.filter((a) => a.severity === 'low').length}
                  </span>
                </div>
              </div>
            </div>

            {/* Average Confidence */}
            <div className="bg-card border border-border rounded-lg p-4">
              <h3 className="text-sm font-semibold text-foreground mb-3">Average Confidence</h3>
              <div className="text-3xl font-bold text-primary mb-2">
                {alerts.length ? Math.round(alerts.reduce((sum, a) => sum + a.confidence, 0) / alerts.length * 100) : 0}%
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary"
                  style={{
                    width: `${alerts.length ? Math.round(alerts.reduce((sum, a) => sum + a.confidence, 0) / alerts.length * 100) : 0}%`,
                  }}
                />
              </div>
            </div>
          </div>
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
