'use client'

import { Alert } from '@/lib/mock-data'

interface AlertTableProps {
  alerts: Alert[]
}

export function AlertTable({ alerts }: AlertTableProps) {
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'border-l-4 border-l-destructive bg-destructive/5'
      case 'high':
        return 'border-l-4 border-l-orange-500 bg-orange-500/5'
      case 'medium':
        return 'border-l-4 border-l-yellow-500 bg-yellow-500/5'
      case 'low':
        return 'border-l-4 border-l-green-500 bg-green-500/5'
      default:
        return 'border-l-4 border-l-muted'
    }
  }

  const getSeverityLabel = (severity: string) => {
    const labels: Record<string, string> = {
      critical: 'CRITICAL',
      high: 'HIGH',
      medium: 'MED',
      low: 'LOW',
    }
    return labels[severity] || severity.toUpperCase()
  }

  const sortedAlerts = [...alerts].sort((a, b) => {
    const severityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 }
    return severityOrder[a.severity] - severityOrder[b.severity]
  })

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto">
        {sortedAlerts.map((alert) => (
          <div key={alert.id} className={`border-b border-border p-3 ${getSeverityColor(alert.severity)}`}>
            <div className="flex items-start gap-2">
              <div className="flex-shrink-0 w-12 pt-0.5">
                <span className="inline-block px-1.5 py-0.5 bg-background border border-border text-xs font-mono font-bold text-foreground">
                  {getSeverityLabel(alert.severity)}
                </span>
              </div>

              <div className="flex-1 min-w-0 text-xs">
                <p className="font-mono font-semibold text-foreground truncate">{alert.facility}</p>
                <p className="text-muted-foreground text-xs-tight">{alert.region}</p>
                <p className="text-muted-foreground text-xs-tight mt-1">{alert.signal}</p>
                <div className="flex gap-4 mt-2">
                  <span className="text-foreground font-mono">
                    Conf: <span className="font-bold">{Math.round(alert.confidence * 100)}%</span>
                  </span>
                  <span className="text-muted-foreground">|</span>
                  <span className="text-muted-foreground text-xs">{alert.firstDetected}</span>
                </div>
                <p className="text-muted-foreground text-xs-tight mt-1">
                  <span className="font-mono">Action:</span> {alert.recommendedAction}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
