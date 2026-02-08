'use client'

import { Alert } from '@/lib/mock-data'
import { Button } from '@/components/ui/button'
import { ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react'

interface AlertFeedProps {
  alerts: Alert[]
  expandedAlerts: Set<string>
  onToggleAlert: (alertId: string) => void
}

export default function AlertFeed({ alerts, expandedAlerts, onToggleAlert }: AlertFeedProps) {
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-500/20 text-red-500 border-red-500/30'
      case 'medium':
        return 'bg-orange-500/20 text-orange-500 border-orange-500/30'
      case 'low':
        return 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30'
      default:
        return ''
    }
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    return `${diffDays}d ago`
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-border">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-orange-500" />
          Active Alerts Feed
        </h3>
      </div>

      <div className="flex-1 overflow-y-auto">
        {alerts.map((alert) => (
          <div key={alert.id} className="border-b border-border last:border-b-0">
            <button
              onClick={() => onToggleAlert(alert.id)}
              className="w-full p-4 hover:bg-card/50 transition text-left"
            >
              <div className="flex items-start gap-3">
                {/* Priority Badge */}
                <div
                  className={`px-2 py-1 rounded text-xs font-semibold border flex-shrink-0 mt-0.5 ${getPriorityColor(alert.priority)}`}
                >
                  {alert.priority.charAt(0).toUpperCase() + alert.priority.slice(1)}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{alert.facilityName}</p>
                  <p className="text-xs text-muted-foreground mb-1">{alert.district}</p>
                  <p className="text-xs text-muted-foreground mb-2">{formatTime(alert.detectedTime)}</p>
                  <p className="text-xs bg-primary/10 text-primary inline-block px-2 py-1 rounded">
                    {alert.category}
                  </p>
                </div>

                {expandedAlerts.has(alert.id) ? (
                  <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                )}
              </div>
            </button>

            {/* Expanded Details */}
            {expandedAlerts.has(alert.id) && (
              <div className="px-4 pb-4 bg-card/50 border-t border-border">
                <div className="space-y-3">
                  {/* Signals */}
                  <div>
                    <p className="text-xs font-semibold text-foreground mb-2">Signals Driving Alert:</p>
                    <div className="space-y-1">
                      {alert.signals.map((signal, idx) => (
                        <div key={idx} className="text-xs text-muted-foreground flex justify-between">
                          <span>• {signal.name}</span>
                          <span className="text-foreground font-medium">
                            {signal.value} {signal.baseline && `(vs ${signal.baseline})`}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Confidence */}
                  <div>
                    <p className="text-xs font-semibold text-foreground mb-1">Confidence Score</p>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary"
                          style={{ width: `${alert.confidence}%` }}
                        />
                      </div>
                      <span className="text-xs font-semibold text-foreground w-8 text-right">
                        {alert.confidence}%
                      </span>
                    </div>
                  </div>

                  {/* Recommendation */}
                  <div>
                    <p className="text-xs font-semibold text-foreground mb-1">Recommended Verification Steps:</p>
                    <p className="text-xs text-muted-foreground">{alert.recommendation}</p>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-2">
                    <Button size="sm" variant="outline" className="flex-1 h-7 text-xs bg-transparent">
                      View Details
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1 h-7 text-xs bg-transparent">
                      Dismiss
                    </Button>
                    <Button size="sm" className="flex-1 h-7 text-xs">
                      Action
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
