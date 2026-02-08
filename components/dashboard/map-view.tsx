'use client'

import { useState } from 'react'
import { Facility } from '@/lib/mock-data'
import { MapPin, X } from 'lucide-react'

interface MapViewProps {
  facilities: Facility[]
}

export function MapView({ facilities }: MapViewProps) {
  const [selectedFacility, setSelectedFacility] = useState<Facility | null>(null)

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'alert':
        return '#ef4444'
      case 'warning':
        return '#f97316'
      case 'caution':
        return '#eab308'
      case 'normal':
      default:
        return '#22c55e'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'alert':
        return 'Alert'
      case 'warning':
        return 'Warning'
      case 'caution':
        return 'Caution'
      case 'normal':
      default:
        return 'Normal'
    }
  }

  // Uganda bounds (approximate)
  const minLat = -1.5
  const maxLat = 4.5
  const minLng = 29.5
  const maxLng = 35.5
  const width = 100
  const height = 100

  const latToY = (lat: number) => {
    return ((maxLat - lat) / (maxLat - minLat)) * height
  }

  const lngToX = (lng: number) => {
    return ((lng - minLng) / (maxLng - minLng)) * width
  }

  // Count facilities by status
  const statusCounts = {
    normal: facilities.filter((f) => f.status === 'normal').length,
    caution: facilities.filter((f) => f.status === 'caution').length,
    warning: facilities.filter((f) => f.status === 'warning').length,
    alert: facilities.filter((f) => f.status === 'alert').length,
  }

  return (
    <div className="w-full h-full flex flex-col">
      {/* Legend */}
      <div className="p-4 border-b border-border flex items-center gap-4 flex-wrap">
        <div className="text-sm font-semibold text-foreground">Facility Status</div>
        {[
          { status: 'normal', label: 'Normal', color: '#22c55e' },
          { status: 'caution', label: 'Caution', color: '#eab308' },
          { status: 'warning', label: 'Warning', color: '#f97316' },
          { status: 'alert', label: 'Alert', color: '#ef4444' },
        ].map((item) => (
          <div key={item.status} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-xs text-muted-foreground">
              {item.label} ({statusCounts[item.status as keyof typeof statusCounts]})
            </span>
          </div>
        ))}
      </div>

      {/* Map Container */}
      <div className="flex-1 p-4 relative overflow-auto bg-card/30">
        <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
          {/* Uganda outline (simplified) */}
          <path
            d="M 50 10 L 65 12 L 68 25 L 70 35 L 65 45 L 60 50 L 55 48 L 50 50 L 45 48 L 40 50 L 35 45 L 32 35 L 35 25 L 40 15 Z"
            fill="none"
            stroke="hsl(var(--border))"
            strokeWidth="0.5"
            opacity="0.3"
          />

          {/* Facility markers */}
          {facilities.map((facility) => {
            const x = lngToX(facility.lng)
            const y = latToY(facility.lat)
            const color = getStatusColor(facility.status)

            return (
              <g key={facility.id}>
                {/* Outer ring for alert visibility */}
                {facility.status === 'alert' && (
                  <circle cx={x} cy={y} r="1.5" fill="none" stroke={color} strokeWidth="0.5" opacity="0.3" />
                )}

                {/* Main marker */}
                <circle
                  cx={x}
                  cy={y}
                  r="1"
                  fill={color}
                  stroke="hsl(var(--card))"
                  strokeWidth="0.3"
                  className="cursor-pointer hover:opacity-80 transition"
                  onClick={() => setSelectedFacility(facility)}
                />
              </g>
            )
          })}
        </svg>

        {/* Popup */}
        {selectedFacility && (
          <div className="absolute bottom-4 left-4 bg-card border border-border rounded-lg p-4 w-64 shadow-lg z-10">
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="font-semibold text-foreground text-sm">{selectedFacility.name}</p>
                <p className="text-xs text-muted-foreground">{selectedFacility.district}</p>
              </div>
              <button
                onClick={() => setSelectedFacility(null)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: getStatusColor(selectedFacility.status) }}
                />
                <span className="text-foreground font-medium">{getStatusLabel(selectedFacility.status)}</span>
              </div>

              <div className="pt-2 border-t border-border">
                <div className="flex justify-between text-muted-foreground">
                  <span>Tests (24h)</span>
                  <span className="text-foreground font-medium">
                    {selectedFacility.metrics[selectedFacility.metrics.length - 1]?.testVolume || 0}
                  </span>
                </div>
                <div className="flex justify-between text-muted-foreground mt-1">
                  <span>Avg TAT</span>
                  <span className="text-foreground font-medium">
                    {selectedFacility.metrics[selectedFacility.metrics.length - 1]?.avgTAT || 0}h
                  </span>
                </div>
                <div className="flex justify-between text-muted-foreground mt-1">
                  <span>Positivity</span>
                  <span className="text-foreground font-medium">
                    {selectedFacility.metrics[selectedFacility.metrics.length - 1]?.positivityRate || 0}%
                  </span>
                </div>
              </div>

              <button className="w-full mt-2 px-2 py-1 bg-primary text-primary-foreground text-xs rounded hover:opacity-90 transition">
                View Facility
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
