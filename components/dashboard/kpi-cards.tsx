import { AlertCircle, Building2, TrendingUp, CheckCircle } from 'lucide-react'

interface FacilitiesByStatus {
  normal: number
  caution: number
  warning: number
  alert: number
}

interface KPIsProps {
  kpis: {
    activeAlerts: number
    severityBreakdown: {
      high: number
      medium: number
      low: number
    }
    facilitiesMonitored: number
    facilitiesByStatus: FacilitiesByStatus
    detectionLeadTime: string
    systemHealth: string
  }
}

export default function KPICards({ kpis }: KPIsProps) {
  const cards = [
    {
      title: 'Active Alerts',
      value: kpis.activeAlerts.toString(),
      subtitle: '↑ 2 from yesterday',
      icon: AlertCircle,
      color: 'text-red-500',
      bgColor: 'bg-red-500/10',
      chips: [
        { label: `${kpis.severityBreakdown.high} High`, color: 'bg-red-500/20 text-red-500' },
        { label: `${kpis.severityBreakdown.medium} Med`, color: 'bg-orange-500/20 text-orange-500' },
        { label: `${kpis.severityBreakdown.low} Low`, color: 'bg-yellow-500/20 text-yellow-500' },
      ],
    },
    {
      title: 'Facilities Monitored',
      value: kpis.facilitiesMonitored.toString(),
      subtitle: `${kpis.facilitiesByStatus.normal} Normal | ${kpis.facilitiesByStatus.caution} Caution | ${kpis.facilitiesByStatus.warning} Warning | ${kpis.facilitiesByStatus.alert} Alert`,
      icon: Building2,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
    },
    {
      title: 'Detection Lead Time',
      value: kpis.detectionLeadTime,
      subtitle: 'Ahead of clinical confirmation',
      icon: TrendingUp,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
    },
    {
      title: 'System Health',
      value: kpis.systemHealth,
      subtitle: 'Last updated: 2 mins ago',
      icon: CheckCircle,
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-500/10',
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, idx) => {
        const Icon = card.icon
        return (
          <div key={idx} className="bg-card border border-border rounded-lg p-4 hover:border-primary/50 transition">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase mb-1">{card.title}</p>
                <p className="text-2xl font-bold text-foreground mb-1">{card.value}</p>
                <p className="text-xs text-muted-foreground">{card.subtitle}</p>
                {card.chips && (
                  <div className="flex gap-2 mt-3 flex-wrap">
                    {card.chips.map((chip, chipIdx) => (
                      <span key={chipIdx} className={`text-xs px-2 py-1 rounded ${chip.color}`}>
                        {chip.label}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className={`${card.bgColor} p-2 rounded-lg`}>
                <Icon className={`w-6 h-6 ${card.color}`} />
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
