'use client'

import { AlertTable } from '@/components/dashboard/alert-table'
import { MapView } from '@/components/dashboard/map-view'
import { TimeSeriesChart } from '@/components/dashboard/time-series-chart'
import { SystemStatus } from '@/components/dashboard/system-status'
import { mockAlerts, mockFacilities } from '@/lib/mock-data'

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border bg-card/50 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-mono font-bold tracking-tight">PRODROME SURVEILLANCE</h1>
            <p className="text-xs text-muted-foreground mt-1">Uganda Population Health Surveillance · LIS Telemetry</p>
          </div>
          <SystemStatus />
        </div>
      </header>

      <div className="flex h-[calc(100vh-90px)]">
        {/* Left Panel: Alerts (40%) */}
        <div className="w-2/5 border-r border-border overflow-y-auto bg-background">
          <div className="p-4 border-b border-border bg-card/30 sticky top-0">
            <h2 className="text-xs font-mono font-semibold text-foreground uppercase tracking-wide">Active Alerts ({mockAlerts.length})</h2>
            <p className="text-xs text-muted-foreground mt-1">Ordered by severity and recency</p>
          </div>
          <AlertTable alerts={mockAlerts} />
        </div>

        {/* Right Panel: Map + Chart (60%) */}
        <div className="w-3/5 flex flex-col bg-background">
          {/* Map Section */}
          <div className="flex-1 border-b border-border flex flex-col min-h-0">
            <div className="p-4 border-b border-border bg-card/30">
              <h2 className="text-xs font-mono font-semibold text-foreground uppercase tracking-wide">Facility Status Map</h2>
              <p className="text-xs text-muted-foreground mt-1">{mockFacilities.length} monitored facilities</p>
            </div>
            <div className="flex-1 min-h-0">
              <MapView facilities={mockFacilities} />
            </div>
          </div>

          {/* Chart Section */}
          <div className="h-56 border-t border-border flex flex-col">
            <div className="p-4 border-b border-border bg-card/30">
              <h2 className="text-xs font-mono font-semibold text-foreground uppercase tracking-wide">30-Day Risk Trend</h2>
            </div>
            <div className="flex-1 min-h-0 px-4 py-2">
              <TimeSeriesChart />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
