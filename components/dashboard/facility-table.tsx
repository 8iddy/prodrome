'use client'

import { useState, useMemo } from 'react'
import { Facility } from '@/lib/mock-data'
import { ChevronUp, ChevronDown } from 'lucide-react'

interface FacilityTableProps {
  facilities: Facility[]
}

type SortKey = 'name' | 'district' | 'status' | 'testVolume' | 'avgTAT' | 'positivityRate' | 'lastUpdate'
type SortOrder = 'asc' | 'desc'

export default function FacilityTable({ facilities }: FacilityTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('name')
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc')
  const [filterDistrict, setFilterDistrict] = useState<string>('')

  // Get unique districts
  const districts = useMemo(() => {
    return Array.from(new Set(facilities.map((f) => f.district))).sort()
  }, [facilities])

  // Filter and sort facilities
  const filteredAndSortedFacilities = useMemo(() => {
    let result = [...facilities]

    // Filter by district
    if (filterDistrict) {
      result = result.filter((f) => f.district === filterDistrict)
    }

    // Sort
    result.sort((a, b) => {
      let aValue: string | number = ''
      let bValue: string | number = ''

      if (sortKey === 'name') {
        aValue = a.name
        bValue = b.name
      } else if (sortKey === 'district') {
        aValue = a.district
        bValue = b.district
      } else if (sortKey === 'status') {
        const statusOrder = { alert: 0, warning: 1, caution: 2, normal: 3 }
        aValue = statusOrder[a.status as keyof typeof statusOrder]
        bValue = statusOrder[b.status as keyof typeof statusOrder]
      } else if (sortKey === 'testVolume') {
        aValue = a.metrics[a.metrics.length - 1]?.testVolume || 0
        bValue = b.metrics[b.metrics.length - 1]?.testVolume || 0
      } else if (sortKey === 'avgTAT') {
        aValue = a.metrics[a.metrics.length - 1]?.avgTAT || 0
        bValue = b.metrics[b.metrics.length - 1]?.avgTAT || 0
      } else if (sortKey === 'positivityRate') {
        aValue = a.metrics[a.metrics.length - 1]?.positivityRate || 0
        bValue = b.metrics[b.metrics.length - 1]?.positivityRate || 0
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortOrder === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue)
      } else {
        return sortOrder === 'asc' ? (aValue > bValue ? 1 : -1) : (aValue > bValue ? -1 : 1)
      }
    })

    return result
  }, [facilities, filterDistrict, sortKey, sortOrder])

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortOrder('asc')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'alert':
        return 'text-red-500 bg-red-500/10'
      case 'warning':
        return 'text-orange-500 bg-orange-500/10'
      case 'caution':
        return 'text-yellow-500 bg-yellow-500/10'
      case 'normal':
      default:
        return 'text-green-500 bg-green-500/10'
    }
  }

  const SortHeader = ({ label, sortKeyValue }: { label: string; sortKeyValue: SortKey }) => (
    <button
      onClick={() => handleSort(sortKeyValue)}
      className="flex items-center gap-1 hover:text-primary transition font-semibold"
    >
      {label}
      {sortKey === sortKeyValue && (
        sortOrder === 'asc' ? (
          <ChevronUp className="w-4 h-4" />
        ) : (
          <ChevronDown className="w-4 h-4" />
        )
      )}
    </button>
  )

  return (
    <div className="w-full">
      {/* Filter */}
      <div className="mb-4 flex items-center gap-2">
        <label className="text-sm font-medium text-foreground">Filter by District:</label>
        <select
          value={filterDistrict}
          onChange={(e) => setFilterDistrict(e.target.value)}
          className="px-3 py-1 bg-input border border-border rounded text-sm text-foreground"
        >
          <option value="">All Districts</option>
          {districts.map((district) => (
            <option key={district} value={district}>
              {district}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="px-4 py-3 text-left text-muted-foreground">
                <SortHeader label="Facility" sortKeyValue="name" />
              </th>
              <th className="px-4 py-3 text-left text-muted-foreground">
                <SortHeader label="District" sortKeyValue="district" />
              </th>
              <th className="px-4 py-3 text-left text-muted-foreground">
                <SortHeader label="Status" sortKeyValue="status" />
              </th>
              <th className="px-4 py-3 text-right text-muted-foreground">
                <SortHeader label="Tests (24h)" sortKeyValue="testVolume" />
              </th>
              <th className="px-4 py-3 text-right text-muted-foreground">
                <SortHeader label="Avg TAT" sortKeyValue="avgTAT" />
              </th>
              <th className="px-4 py-3 text-right text-muted-foreground">
                <SortHeader label="Positivity" sortKeyValue="positivityRate" />
              </th>
              <th className="px-4 py-3 text-left text-muted-foreground text-xs">Last Updated</th>
            </tr>
          </thead>
          <tbody>
            {filteredAndSortedFacilities.slice(0, 10).map((facility) => {
              const latestMetric = facility.metrics[facility.metrics.length - 1]
              const lastUpdateTime = new Date(facility.lastUpdate)
              const now = new Date()
              const diffMins = Math.floor((now.getTime() - lastUpdateTime.getTime()) / 60000)

              return (
                <tr key={facility.id} className="border-b border-border hover:bg-card/50 transition">
                  <td className="px-4 py-3 font-medium text-foreground">{facility.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{facility.district}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${getStatusColor(facility.status)}`}>
                      {facility.status.charAt(0).toUpperCase() + facility.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-foreground">{latestMetric?.testVolume || '-'}</td>
                  <td className="px-4 py-3 text-right text-foreground">{latestMetric?.avgTAT || '-'}h</td>
                  <td className="px-4 py-3 text-right text-foreground">{latestMetric?.positivityRate || '-'}%</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{diffMins}m ago</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-4 text-xs text-muted-foreground">
        Showing {Math.min(10, filteredAndSortedFacilities.length)} of {filteredAndSortedFacilities.length} facilities
      </div>
    </div>
  )
}
