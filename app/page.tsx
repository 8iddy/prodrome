import ProDromeConsole from '@/components/prodrome-console'

export default function Page() { return <ProDromeConsole /> }
/*

import { useState, useEffect } from 'react'
import { mockAlerts, mockFacilities, type Alert } from '@/lib/mock-data'
import { Radio, Clock, ChevronRight, AlertTriangle, Check, Search, Bell } from 'lucide-react'
import { toast } from 'sonner'

const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 }

export default function OperationsCenter() {
  const [selectedAlert, setSelectedAlert] = useState<string | null>(null)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [acknowledgedAlerts, setAcknowledgedAlerts] = useState<Set<string>>(new Set())

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

  const handleAcknowledge = (alert: Alert) => {
    setAcknowledgedAlerts(prev => new Set([...prev, alert.id]))
    toast.success(`Alert acknowledged`, {
      description: `${alert.facility} - ${alert.severity.toUpperCase()}`,
      icon: <Check className="w-4 h-4" />,
    })
  }

  const handleInvestigate = (alert: Alert) => {
    toast.info(`Investigation started`, {
      description: `Opening case file for ${alert.facility}`,
      icon: <Search className="w-4 h-4" />,
    })
  }

  const handleEscalate = (alert: Alert) => {
    toast.warning(`Alert escalated`, {
      description: `Notifying regional supervisor and MOH duty officer`,
      icon: <Bell className="w-4 h-4" />,
    })
  }

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
      case 'alert': return '#dc2626' // red-600 for visibility
      case 'warning': return '#d97706' // amber-600
      case 'caution': return '#ca8a04' // yellow-600
      case 'normal': return '#64748b' // slate-500 - visible but muted
      default: return '#64748b'
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
                } ${acknowledgedAlerts.has(alert.id) ? 'opacity-60' : ''}`}
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
                      {acknowledgedAlerts.has(alert.id) && (
                        <Check className="w-3 h-3 text-emerald-500" />
                      )}
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
                        <button
                          onClick={() => handleAcknowledge(alert)}
                          disabled={acknowledgedAlerts.has(alert.id)}
                          className={`flex-1 px-2 py-1.5 text-[10px] transition-colors border ${
                            acknowledgedAlerts.has(alert.id)
                              ? 'bg-emerald-900/30 border-emerald-800/50 text-emerald-400'
                              : 'bg-slate-800 hover:bg-slate-700 border-slate-700/50 text-slate-300'
                          }`}
                        >
                          {acknowledgedAlerts.has(alert.id) ? 'Acknowledged' : 'Acknowledge'}
                        </button>
                        <button
                          onClick={() => handleInvestigate(alert)}
                          className="flex-1 px-2 py-1.5 text-[10px] bg-blue-900/40 hover:bg-blue-900/60 text-blue-300 transition-colors border border-blue-800/30 flex items-center justify-center gap-1"
                        >
                          Investigate <ChevronRight className="w-3 h-3" />
                        </button>
                        {alert.severity === 'critical' && (
                          <button
                            onClick={() => handleEscalate(alert)}
                            className="flex-1 px-2 py-1.5 text-[10px] bg-red-900/50 hover:bg-red-900/70 text-red-200 transition-colors border border-red-800/40"
                          >
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
                <span className="w-2 h-2 rounded-full bg-red-600"></span>
                <span className="text-slate-500">Critical ({statusCounts.alert})</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-600"></span>
                <span className="text-slate-500">Warning ({statusCounts.warning})</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-yellow-600"></span>
                <span className="text-slate-500">Caution ({statusCounts.caution})</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-slate-500"></span>
                <span className="text-slate-500">Normal ({statusCounts.normal})</span>
              </span>
            </div>
          </div>

          {/* Map */}
          <div className="flex-1 relative min-h-0 bg-[#0c1015]">
            <svg
              viewBox="0 0 100 100"
              className="w-full h-full"
              preserveAspectRatio="xMidYMid meet"
            >
              {/* Background grid */}
              {[20, 40, 60, 80].map(v => (
                <g key={v}>
                  <line x1={v} y1="0" x2={v} y2="100" stroke="#1e293b" strokeWidth="0.2" opacity="0.5" />
                  <line x1="0" y1={v} x2="100" y2={v} stroke="#1e293b" strokeWidth="0.2" opacity="0.5" />
                </g>
              ))}

              {/* Uganda country outline - more accurate and visible */}
              <path
                d="M 42 5
                   L 55 6 L 62 8 L 70 12 L 78 20 L 82 30
                   L 80 40 L 76 50 L 70 58 L 62 65
                   L 52 68 L 42 65 L 32 68 L 22 62
                   L 18 52 L 16 42 L 18 32 L 22 22
                   L 28 14 L 36 8 Z"
                fill="#151c24"
                stroke="#3b82f6"
                strokeWidth="0.5"
                opacity="0.9"
              />

              {/* Lake Victoria (bottom) */}
              <ellipse
                cx="58"
                cy="62"
                rx="12"
                ry="8"
                fill="#1e3a5f"
                stroke="#3b82f6"
                strokeWidth="0.3"
                opacity="0.6"
              />

              {/* Lake Albert (west) */}
              <ellipse
                cx="22"
                cy="38"
                rx="4"
                ry="10"
                fill="#1e3a5f"
                stroke="#3b82f6"
                strokeWidth="0.2"
                opacity="0.5"
              />

              {/* Country label */}
              <text
                x="48"
                y="38"
                fill="#64748b"
                fontSize="6"
                fontFamily="monospace"
                textAnchor="middle"
                fontWeight="bold"
                letterSpacing="0.5"
              >
                UGANDA
              </text>

              {/* Region labels */}
              <text x="48" y="18" fill="#475569" fontSize="2.5" fontFamily="monospace" textAnchor="middle">NORTH</text>
              <text x="70" y="35" fill="#475569" fontSize="2.5" fontFamily="monospace" textAnchor="middle">EAST</text>
              <text x="28" y="50" fill="#475569" fontSize="2.5" fontFamily="monospace" textAnchor="middle">WEST</text>
              <text x="48" y="55" fill="#475569" fontSize="2.5" fontFamily="monospace" textAnchor="middle">CENTRAL</text>

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
                      {/* Pulse effect for alerts */}
                      {isAlert && (
                        <>
                          <circle cx={x} cy={y} r="3" fill="none" stroke={color} strokeWidth="0.3" opacity="0.3" />
                          <circle cx={x} cy={y} r="2" fill="none" stroke={color} strokeWidth="0.4" opacity="0.5" />
                        </>
                      )}
                      {isWarning && (
                        <circle cx={x} cy={y} r="2" fill="none" stroke={color} strokeWidth="0.3" opacity="0.4" />
                      )}
                      {/* Main marker */}
                      <circle
                        cx={x}
                        cy={y}
                        r={isAlert ? "1.2" : isWarning ? "1" : "0.7"}
                        fill={color}
                        stroke="#0c1015"
                        strokeWidth="0.2"
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
*/
