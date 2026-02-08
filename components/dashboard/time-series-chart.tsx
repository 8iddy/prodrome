'use client'

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Legend } from 'recharts'

export function TimeSeriesChart() {
  // Generate 30-day risk trend data
  const aggregatedData = Array.from({ length: 30 }, (_, i) => {
    const date = new Date()
    date.setDate(date.getDate() - (29 - i))

    // Simulate baseline with noise
    let risk = 25 + Math.random() * 15

    // Add anomalies on specific days
    if (i === 7) risk = 35 + Math.random() * 10 // Day 8
    if (i === 21) risk = 32 + Math.random() * 10 // Day 22
    if (i >= 26) risk = 40 + (i - 25) * 8 + Math.random() * 10 // Days 27-30

    return {
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      risk: Math.round(risk),
    }
  })

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border border-border p-2 text-xs">
          <p className="font-mono text-foreground">{payload[0].payload.date}</p>
          <p className="text-muted-foreground">Risk: {payload[0].value}</p>
        </div>
      )
    }
    return null
  }

  return (
    <div className="w-full h-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={aggregatedData} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
          <CartesianGrid stroke="hsl(var(--border))" opacity={0.2} />
          <ReferenceLine y={40} stroke="hsl(45, 90%, 50%)" strokeDasharray="4 4" opacity={0.3} />
          <ReferenceLine y={70} stroke="hsl(0, 100%, 45%)" strokeDasharray="4 4" opacity={0.3} />
          <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" style={{ fontSize: '11px' }} interval={4} />
          <YAxis stroke="hsl(var(--muted-foreground))" style={{ fontSize: '11px' }} domain={[0, 100]} />
          <Tooltip content={<CustomTooltip />} />
          <Line
            type="monotone"
            dataKey="risk"
            stroke="hsl(200, 100%, 42%)"
            dot={false}
            strokeWidth={2}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
