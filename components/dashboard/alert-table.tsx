'use client'

import { Alert } from '@/lib/mock-data'

interface AlertTableProps {
  alerts: Alert[]
}

const severityColors = {
  critical: 'bg-destructive/10 border-destructive/30',
  high: 'bg-orange-500/10 border-orange-500/30',
  medium: 'bg-yellow-500/10 border-yellow-500/30',
  low: 'bg-blue-500/10 border-blue-500/30',
}

const severityBadgeColors = {
  critical: 'text-destructive font-bold',
  high: 'text-orange-400 font-bold',
  medium: 'text-yellow-400',
  low: 'text-blue-400',
}

export function AlertTable({ alerts }: AlertTableProps) {
  return (
    <div className="divide-y divide-border">
      {alerts.map((alert) => (
        <button
          key={alert.id}
          className={`w-full text-left p-4 border-l-4 hover:bg-card/50 transition-colors ${
            severityColors[alert.severity as keyof typeof severityColors]
          } ${
            alert.severity === 'critical'
              ? 'border-l-destructive'
              : alert.severity === 'high'
                ? 'border-l-orange-500'
                : alert.severity === 'medium'
                  ? 'border-l-yellow-500'
                  : 'border-l-blue-500'
          }`}
        >
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-mono font-semibold text-foreground truncate">
                {alert.facility}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">{alert.region}</p>
            </div>
            <span
              className={`text-xs font-mono uppercase whitespace-nowrap ${
                severityBadgeColors[alert.severity as keyof typeof severityBadgeColors]
              }`}
            >
              {alert.severity}
            </span>
          </div>

          <div className="bg-black/20 rounded px-2 py-1.5 mb-2">
            <p className="text-xs font-mono text-foreground leading-snug">{alert.signal}</p>
          </div>

          <div className="grid grid-cols-2 gap-2 mb-2 text-xs">
            <div>
              <span className="text-muted-foreground">Confidence:</span>
              <span className="font-mono ml-1 text-foreground">{Math.round(alert.confidence * 100)}%</span>
            </div>
            <div>
              <span className="text-muted-foreground">First detected:</span>
              <span className="font-mono ml-1 text-foreground text-xs">{alert.firstDetected}</span>
            </div>
          </div>

          <div className="bg-black/20 rounded px-2 py-1.5 mb-2">
            <p className="text-xs text-foreground font-mono">
              <span className="text-muted-foreground">Action: </span>
              {alert.recommendedAction}
            </p>
          </div>

          <p className="text-xs text-muted-foreground">
            {alert.affectedTests} anomalous tests · {alert.status}
          </p>
        </button>
      ))}
    </div>
  )
}
