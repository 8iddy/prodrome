'use client'

import { Facility } from '@/lib/mock-data'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, Band } from 'recharts'

interface TimeSeriesChartProps {
  facilities: Facility[]
}

export default function TimeSeriesChart({ facilities }: TimeSeriesChartProps) {
  // Aggregate metrics across all facilities
  const aggregatedData = facilities[0]?.metrics.map((_, dayIdx) => {
    const dayMetrics = facilities.map((f) => f.metrics[dayIdx])
    return {
      date: dayMetrics[0]?.date || '',
      volumeAnomaly: Math.round(dayMetrics.reduce((sum, m) => sum + (m?.volumeAnomaly || 0), 0) / dayMetrics.length),
      tatAnomaly: Math.round(dayMetrics.reduce((sum, m) => sum + (m?.tatAnomaly || 0), 0) / dayMetrics.length),
      positivityAnomaly: Math.round(
        dayMetrics.reduce((sum, m) => sum + (m?.positivityAnomaly || 0), 0) / dayMetrics.length
      ),
      combinedRisk: Math.round(dayMetrics.reduce((sum, m) => sum + (m?.combinedRisk || 0), 0) / dayMetrics.length),
    }
  }) || []

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
          <p className="text-xs font-semibold text-foreground mb-2">{payload[0].payload.date}</p>
          {payload.map((entry: any, idx: number) => (
            <p key={idx} className="text-xs" style={{ color: entry.color }}>
              {entry.name}: {entry.value}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  return (
    <div className="w-full h-96">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={aggregatedData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
          <defs>
            <linearGradient id="cautionGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="30%" stopColor="hsl(45, 100%, 50%)" stopOpacity={0.1} />
              <stop offset="100%" stopColor="hsl(45, 100%, 50%)" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="warningGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="30%" stopColor="hsl(25, 100%, 56%)" stopOpacity={0.1} />
              <stop offset="100%" stopColor="hsl(25, 100%, 56%)" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="alertGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="30%" stopColor="hsl(0, 84%, 60%)" stopOpacity={0.1} />
              <stop offset="100%" stopColor="hsl(0, 84%, 60%)" stopOpacity={0} />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />

          {/* Risk threshold bands */}
          <ReferenceLine y={30} stroke="hsl(45, 100%, 50%)" strokeDasharray="5 5" opacity={0.3} />
          <ReferenceLine y={50} stroke="hsl(25, 100%, 56%)" strokeDasharray="5 5" opacity={0.3} />
          <ReferenceLine y={70} stroke="hsl(0, 84%, 60%)" strokeDasharray="5 5" opacity={0.3} />

          <XAxis
            dataKey="date"
            stroke="hsl(var(--muted-foreground))"
            style={{ fontSize: '12px' }}
            tick={{ fill: 'hsl(var(--muted-foreground))' }}
            interval={4}
          />

          <YAxis
            stroke="hsl(var(--muted-foreground))"
            style={{ fontSize: '12px' }}
            tick={{ fill: 'hsl(var(--muted-foreground))' }}
            label={{ value: 'Anomaly Score', angle: -90, position: 'insideLeft', style: { fill: 'hsl(var(--muted-foreground))' } }}
          />

          <Tooltip content={<CustomTooltip />} />

          <Legend
            wrapperStyle={{ paddingTop: '20px' }}
            iconType="line"
            formatter={(value) => <span style={{ color: 'hsl(var(--foreground))' }}>{value}</span>}
          />

          {/* Lines */}
          <Line
            type="monotone"
            dataKey="volumeAnomaly"
            stroke="hsl(224, 71%, 50%)"
            dot={false}
            strokeWidth={2}
            name="Volume Anomaly"
            isAnimationActive={false}
          />

          <Line
            type="monotone"
            dataKey="tatAnomaly"
            stroke="hsl(180, 65%, 45%)"
            dot={false}
            strokeWidth={2}
            name="TAT Anomaly"
            isAnimationActive={false}
          />

          <Line
            type="monotone"
            dataKey="positivityAnomaly"
            stroke="hsl(25, 100%, 56%)"
            dot={false}
            strokeWidth={2}
            name="Positivity Anomaly"
            isAnimationActive={false}
          />

          <Line
            type="monotone"
            dataKey="combinedRisk"
            stroke="hsl(0, 84%, 60%)"
            dot={false}
            strokeWidth={3}
            name="Combined Risk Score"
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>

      {/* Legend for thresholds */}
      <div className="flex items-center justify-center gap-6 mt-4 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-3 h-0.5 bg-yellow-500" />
          <span className="text-muted-foreground">Caution (30+)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-0.5 bg-orange-500" />
          <span className="text-muted-foreground">Warning (50+)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-0.5 bg-red-500" />
          <span className="text-muted-foreground">Alert (70+)</span>
        </div>
      </div>
    </div>
  )
}
