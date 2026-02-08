'use client'

import { useState, useEffect } from 'react'
import { mockAlerts, mockFacilities, type Alert } from '@/lib/mock-data'
import { Radio, Clock, ChevronRight, AlertTriangle } from 'lucide-react'

const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 }

export default function OperationsCenter() {
  const [selectedAlert, setSelectedAlert] = useState<string | null>(null)
  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const sortedAlerts = [...mockAlerts].sort(
    (a, b) => severityOrder[a.severity] - severityOrder[b.severity]
  )

  const statusCounts = {
    alert: mockFacilities.filter(f => f.status === 'alert').length,
    warning: mockFacilities.filter(f => f.status === 'warning').length,
    caution: mockFacilities.filter(f => f.status === 'caution').length,
    normal: mockFacilities.filter(f => f.status === 'normal').length,
  }

  const criticalCount = sortedAlerts.filter(a => a.severity === 'critical').length
  const highCount = sortedAlerts.filter(a => a.severity === 'high').length

  const getSeverityStyles = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'border-l-red-600 bg-red-950/30'
      case 'high':
        return 'border-l-amber-600 bg-amber-950/15'
      case 'medium':
        return 'border-l-yellow-700/60 bg-yellow-950/10'
      case 'low':
        return 'border-l-slate-600 bg-slate-900/20'
      default:
        return 'border-l-slate-700'
    }
  }

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-700 text-red-50'
      case 'high':
        return 'bg-amber-700/80 text-amber-50'
      case 'medium':
        return 'bg-yellow-800/60 text-yellow-100'
      case 'low':
        return 'bg-slate-700/60 text-slate-300'
      default:
        return 'bg-slate-800'
    }
  }

  // Muted color palette - red ONLY for critical
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'alert': return '#b91c1c' // red-700 - only for facilities with critical alerts
      case 'warning': return '#b45309' // amber-700
      case 'caution': return '#a16207' // yellow-700
      case 'normal': return '#475569' // slate-600 - muted, nearly invisible
      default: return '#475569'
    }
  }

  // Map projection for Uganda
  const minLat = -1.5, maxLat = 4.5, minLng = 29.5, maxLng = 35.5
  const latToY = (lat: number) => ((maxLat - lat) / (maxLat - minLat)) * 100
  const lngToX = (lng: number) => ((lng - minLng) / (maxLng - minLng)) * 100

  return (
    <div className="h-screen bg-[#080a0d] text-slate-400 flex flex-col overflow-hidden font-mono">
      {/* Compact Header */}
      <header className="flex-shrink-0 border-b border-slate-800/80 bg-[#0a0c10] px-4 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Radio className="w-3 h-3 text-emerald-500" />
              <span className="text-[10px] text-emerald-500 uppercase tracking-wider">Live</span>
            </div>
            <div className="h-3 w-px bg-slate-800" />
            <span className="text-xs text-slate-300 tracking-wide">PRODROME OPS</span>
            <span className="text-[10px] text-slate-600">Uganda Health Surveillance</span>
          </div>
          <div className="flex items-center gap-4 text-[10px] text-slate-600">
            <span className="text-slate-500">{currentTime.toISOString().slice(0, 10)}</span>
            <span className="font-medium text-slate-400">{currentTime.toISOString().slice(11, 19)} UTC</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex min-h-0">
        {/* LEFT: Alert Queue - Primary Focus (48%) */}
        <div className="w-[48%] flex flex-col border-r border-slate-800/80 bg-[#090b0e]">
          {/* Alert Header */}
          <div className="flex-shrink-0 px-3 py-2 border-b border-slate-800/80 bg-[#0b0d11] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              <span className="text-[10px] text-slate-400 uppercase tracking-wider">Active Alerts</span>
              <span className="text-[10px] text-slate-600">({sortedAlerts.length})</span>
            </div>
            <div className="flex items-center gap-3 text-[10px]">
              {criticalCount > 0 && <span className="text-red-500 font-medium">{criticalCount} CRIT</span>}
              {highCount > 0 && <span className="text-amber-500">{highCount} HIGH</span>}
            </div>
          </div>

          {/* Alert List */}
          <div className="flex-1 overflow-y-auto">
            {sortedAlerts.map((alert) => (
              <div
                key={alert.id}
                className={`border-l-[3px] border-b border-slate-800/50 ${getSeverityStyles(alert.severity)} ${
                  selectedAlert === alert.id ? 'bg-slate-800/30' : ''
                }`}
              >
                <button
                  onClick={() => setSelectedAlert(selectedAlert === alert.id ? null : alert.id)}
                  className="w-full text-left p-3 hover:bg-slate-800/20 transition-colors"
                >
                  {/* Row 1: Severity + Facility + Time */}
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${getSeverityBadge(alert.severity)}`}>
                        {alert.severity}
                      </span>
                      <span className="text-xs text-slate-200 truncate">{alert.facility}</span>
                      <span className="text-[10px] text-slate-600">{alert.region}</span>
                    </div>
                    <div className="flex items-center gap-1 text-[9px] text-slate-600 flex-shrink-0">
                      <Clock className="w-2.5 h-2.5" />
                      {alert.firstDetected}
                    </div>
                  </div>

                  {/* Row 2: Signal */}
                  <div className="text-[11px] text-slate-500 leading-snug mb-2">
                    {alert.signal}
                  </div>

                  {/* Row 3: Metrics */}
                  <div className="flex items-center gap-3 text-[9px]">
                    <span className="text-slate-600">
                      Conf <span className="text-slate-400 font-medium">{Math.round(alert.confidence * 100)}%</span>
                    </span>
                    <span className="text-slate-700">|</span>
                    <span className="text-slate-600">
                      Tests <span className="text-slate-400">{alert.affectedTests}</span>
                    </span>
                    <span className="text-slate-700">|</span>
                    <span className="text-slate-500">{alert.status}</span>
                  </div>
                </button>

                {/* Expanded: Action Required */}
                {selectedAlert === alert.id && (
                  <div className="px-3 pb-3 border-t border-slate-800/40 bg-slate-900/30">
                    <div className="pt-2.5">
                      <div className="text-[9px] text-slate-600 uppercase tracking-wide mb-1">
                        → What to do next
                      </div>
                      <div className="text-[11px] text-slate-300 leading-relaxed mb-3">
                        {alert.recommendedAction}
                      </div>
                      <div className="flex gap-2">
                        <button className="flex-1 px-2 py-1.5 text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors border border-slate-700/50">
                          Acknowledge
                        </button>
                        <button className="flex-1 px-2 py-1.5 text-[10px] bg-blue-900/40 hover:bg-blue-900/60 text-blue-300 transition-colors border border-blue-800/30 flex items-center justify-center gap-1">
                          Investigate <ChevronRight className="w-3 h-3" />
                        </button>
                        {alert.severity === 'critical' && (
                          <button className="flex-1 px-2 py-1.5 text-[10px] bg-red-900/50 hover:bg-red-900/70 text-red-200 transition-colors border border-red-800/40">
                            Escalate
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT: Map + Stats (52%) */}
        <div className="flex-1 flex flex-col min-w-0 bg-[#080a0c]">
          {/* Map Header */}
          <div className="flex-shrink-0 px-3 py-2 border-b border-slate-800/80 bg-[#0a0c10] flex items-center justify-between">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider">
              Facility Status — {mockFacilities.length} sites
            </span>
            <div className="flex items-center gap-4 text-[9px]">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-red-700"></span>
                <span className="text-slate-600">Critical ({statusCounts.alert})</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-amber-700"></span>
                <span className="text-slate-600">Warning ({statusCounts.warning})</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-yellow-700/60"></span>
                <span className="text-slate-600">Caution ({statusCounts.caution})</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-slate-600"></span>
                <span className="text-slate-600">Normal ({statusCounts.normal})</span>
              </span>
            </div>
          </div>

          {/* Map */}
          <div className="flex-1 relative min-h-0">
            <svg
              viewBox="0 0 100 100"
              className="w-full h-full"
              preserveAspectRatio="xMidYMid meet"
            >
              {/* Subtle grid */}
              {[25, 50, 75].map(v => (
                <g key={v}>
                  <line x1={v} y1="0" x2={v} y2="100" stroke="#1e293b" strokeWidth="0.15" />
                  <line x1="0" y1={v} x2="100" y2={v} stroke="#1e293b" strokeWidth="0.15" />
                </g>
              ))}

              {/* Uganda outline */}
              <path
                d="M 45 8 L 58 10 L 72 18 L 75 28 L 73 42 L 68 52 L 58 58 L 48 55 L 38 58 L 28 52 L 22 42 L 25 28 L 32 18 L 42 10 Z"
                fill="#0f1318"
                stroke="#334155"
                strokeWidth="0.25"
              />

              {/* Facility markers - sorted so alerts render on top */}
              {[...mockFacilities]
                .sort((a, b) => {
                  const order = { normal: 0, caution: 1, warning: 2, alert: 3 }
                  return order[a.status] - order[b.status]
                })
                .map((facility) => {
                  const x = lngToX(facility.lng)
                  const y = latToY(facility.lat)
                  const color = getStatusColor(facility.status)
                  const isAlert = facility.status === 'alert'
                  const isWarning = facility.status === 'warning'

                  return (
                    <g key={facility.id}>
                      {isAlert && (
                        <circle cx={x} cy={y} r="2" fill="none" stroke={color} strokeWidth="0.3" opacity="0.5" />
                      )}
                      {isWarning && (
                        <circle cx={x} cy={y} r="1.5" fill="none" stroke={color} strokeWidth="0.2" opacity="0.4" />
                      )}
                      <circle
                        cx={x}
                        cy={y}
                        r={isAlert ? "1" : isWarning ? "0.8" : "0.6"}
                        fill={color}
                      />
                    </g>
                  )
                })}
            </svg>
          </div>

          {/* Bottom Stats Bar */}
          <div className="flex-shrink-0 border-t border-slate-800/80 bg-[#0a0c10]">
            <div className="grid grid-cols-4 divide-x divide-slate-800/60">
              <div className="px-3 py-2">
                <div className="text-[9px] text-slate-600 uppercase mb-0.5">Active Alerts</div>
                <div className="text-sm text-slate-300">{mockAlerts.length}</div>
              </div>
              <div className="px-3 py-2">
                <div className="text-[9px] text-slate-600 uppercase mb-0.5">Facilities Affected</div>
                <div className="text-sm text-slate-300">{statusCounts.alert + statusCounts.warning}</div>
              </div>
              <div className="px-3 py-2">
                <div className="text-[9px] text-slate-600 uppercase mb-0.5">Detection Lead</div>
                <div className="text-sm text-slate-300">52h <span className="text-[9px] text-slate-600">avg</span></div>
              </div>
              <div className="px-3 py-2">
                <div className="text-[9px] text-slate-600 uppercase mb-0.5">System</div>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-emerald-600"></span>
                  <span className="text-xs text-emerald-500">Operational</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
