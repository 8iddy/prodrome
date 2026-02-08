'use client'

import { useEffect, useState } from 'react'

export function SystemStatus() {
  const [currentTime, setCurrentTime] = useState<string>('')

  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      setCurrentTime(now.toLocaleTimeString('en-US', { hour12: false }))
    }
    updateTime()
    const interval = setInterval(updateTime, 1000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="flex items-center gap-6 text-xs">
      <div className="text-right">
        <p className="text-muted-foreground">SYSTEM TIME</p>
        <p className="font-mono text-foreground text-sm">{currentTime || '--:--:--'}</p>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
        <span className="text-muted-foreground">LIVE</span>
      </div>
    </div>
  )
}
