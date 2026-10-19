import React, { useState, useEffect } from 'react'

export default function LiveTimer({ startTime }) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0)

  useEffect(() => {
    if (!startTime) return

    const calculateElapsed = () => {
      const start = new Date(startTime).getTime()
      const now = Date.now()
      const diffSec = Math.max(0, Math.floor((now - start) / 1000))
      setElapsedSeconds(diffSec)
    }

    calculateElapsed()
    const timer = setInterval(calculateElapsed, 1000)

    return () => clearInterval(timer)
  }, [startTime])

  const formatDuration = (totalSeconds) => {
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60

    const pad = (n) => String(n).padStart(2, '0')
    if (hours > 24) {
      const days = Math.floor(hours / 24)
      const remainingHours = hours % 24
      return `${days}d ${pad(remainingHours)}:${pad(minutes)}:${pad(seconds)}`
    }
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
  }

  return (
    <span className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
      {formatDuration(elapsedSeconds)}
    </span>
  )
}
