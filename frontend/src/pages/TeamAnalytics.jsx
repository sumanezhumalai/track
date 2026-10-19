import React, { useState, useEffect, useMemo } from 'react'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'
import {
  Calendar,
  Filter,
  RefreshCw,
  Users,
  Clock,
  TrendingUp,
  PieChart as PieIcon,
  BarChart2,
  AlertCircle,
  FileSpreadsheet,
} from 'lucide-react'
import api from '../api/axios'

// Greenhouse harmonious greens and complementary chart palette
const GREEN_PALETTE = [
  '#1B7F4A', // Primary Forest Green
  '#2E9F64', // Emerald Green
  '#52B788', // Mint Sage
  '#74C69D', // Soft Green
  '#0F4A2C', // Deep Pine
  '#145C35', // Dark Jade
  '#B7E4C7', // Pale Meadow
  '#D8F3DC', // Ice Green
]

export default function TeamAnalytics() {
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Date filters
  const [preset, setPreset] = useState('MONTH') // 'WEEK' | 'MONTH' | 'ALL' | 'CUSTOM'
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  // Compute default dates on mount (Month preset)
  useEffect(() => {
    applyPreset('MONTH')
  }, [])

  const applyPreset = (p) => {
    setPreset(p)
    const now = new Date()
    const toStr = now.toISOString().split('T')[0]

    if (p === 'WEEK') {
      const from = new Date()
      from.setDate(now.getDate() - 7)
      setFromDate(from.toISOString().split('T')[0])
      setToDate(toStr)
      fetchAnalytics(from.toISOString().split('T')[0], toStr)
    } else if (p === 'MONTH') {
      const from = new Date()
      from.setDate(now.getDate() - 30)
      setFromDate(from.toISOString().split('T')[0])
      setToDate(toStr)
      fetchAnalytics(from.toISOString().split('T')[0], toStr)
    } else if (p === 'ALL') {
      setFromDate('')
      setToDate('')
      fetchAnalytics('', '')
    }
  }

  const fetchAnalytics = async (from, to) => {
    setLoading(true)
    setError('')
    try {
      let url = '/analytics/sessions'
      const params = new URLSearchParams()
      if (from) params.append('from', `${from}T00:00:00`)
      if (to) params.append('to', `${to}T23:59:59`)
      const queryString = params.toString()
      if (queryString) url += `?${queryString}`

      const res = await api.get(url)
      setSessions(res.data || [])
    } catch {
      setError('Failed to fetch analytics data. Verify Admin authorization.')
    } finally {
      setLoading(false)
    }
  }

  const handleCustomFilterSubmit = (e) => {
    e.preventDefault()
    setPreset('CUSTOM')
    fetchAnalytics(fromDate, toDate)
  }

  // Analytics Computations
  const stats = useMemo(() => {
    const total = sessions.length
    const devSet = new Set()
    const aeSet = new Set()
    let totalMinutes = 0

    sessions.forEach((s) => {
      if (s.devName) devSet.add(s.devName)
      if (s.aeName) aeSet.add(s.aeName)
      if (s.startTime && s.endTime) {
        const start = new Date(s.startTime).getTime()
        const end = new Date(s.endTime).getTime()
        totalMinutes += Math.max(0, Math.floor((end - start) / 60000))
      }
    })

    const totalHours = (totalMinutes / 60).toFixed(1)
    const avgDuration = total ? Math.round(totalMinutes / total) : 0

    return {
      total,
      uniqueDevs: devSet.size,
      uniqueAEs: aeSet.size,
      totalHours,
      avgDuration,
    }
  }, [sessions])

  // BarChart: Sessions per Dev
  const devDistributionData = useMemo(() => {
    const counts = {}
    const durations = {}

    sessions.forEach((s) => {
      const dev = s.devName || 'Unknown'
      counts[dev] = (counts[dev] || 0) + 1
      if (s.startTime && s.endTime) {
        const diffMins = Math.max(0, Math.floor((new Date(s.endTime) - new Date(s.startTime)) / 60000))
        durations[dev] = (durations[dev] || 0) + diffMins
      }
    })

    return Object.entries(counts)
      .map(([dev, count]) => ({
        dev,
        count,
        totalMinutes: durations[dev] || 0,
      }))
      .sort((a, b) => b.count - a.count)
  }, [sessions])

  // LineChart: Daily trend
  const dailyTrendData = useMemo(() => {
    const map = {}
    sessions.forEach((s) => {
      if (!s.startTime) return
      const date = s.startTime.split('T')[0]
      map[date] = (map[date] || 0) + 1
    })

    const sortedDates = Object.keys(map).sort()
    return sortedDates.map((date) => {
      const d = new Date(date + 'T00:00:00')
      const formatted = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      return {
        date: formatted,
        fullDate: date,
        sessions: map[date],
      }
    })
  }, [sessions])

  // PieChart: GeneralSupport AE share
  const aeShareData = useMemo(() => {
    const counts = {}
    sessions.forEach((s) => {
      const ae = s.aeName || 'Unassigned'
      counts[ae] = (counts[ae] || 0) + 1
    })

    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8) // Top 8 AEs for clean pie chart
  }, [sessions])

  // Custom tooltip for dev bar chart
  const DevTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-white p-3 rounded-lg border border-gh-border shadow-elevated text-xs">
          <div className="font-bold text-gh-text text-sm mb-1">{data.dev}</div>
          <div className="text-emerald-700 font-semibold">Sessions Handled: {data.count}</div>
          <div className="text-gh-muted mt-0.5">Total Support Time: {Math.round(data.totalMinutes / 60)}h {data.totalMinutes % 60}m</div>
        </div>
      )
    }
    return null
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gh-border">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold tracking-tight text-stone-900">
              Team Analytics & Insights
            </h1>
            <span className="badge-role">Admin</span>
          </div>
          <p className="text-xs text-stone-500 mt-0.5">
            Operational throughput, support delivery hours, and collaboration metrics.
          </p>
        </div>

        <button
          onClick={() => fetchAnalytics(fromDate, toDate)}
          disabled={loading}
          className="btn-secondary self-start sm:self-auto"
        >
          <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Data</span>
        </button>
      </div>

      {error && (
        <div className="p-3 rounded-md bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 text-red-500" />
          <span>{error}</span>
        </div>
      )}

      {/* Date Filter Toolbar (Integrated, Zero Box Shadows) */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex items-center gap-1 bg-stone-100/70 p-0.5 rounded-md border border-stone-200/50 self-start lg:self-auto">
          <button
            onClick={() => applyPreset('WEEK')}
            className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${preset === 'WEEK'
                ? 'bg-white text-stone-900 font-semibold shadow-sm'
                : 'text-stone-500 hover:text-stone-900'
              }`}
          >
            Past 7 Days
          </button>
          <button
            onClick={() => applyPreset('MONTH')}
            className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${preset === 'MONTH'
                ? 'bg-white text-stone-900 font-semibold shadow-sm'
                : 'text-stone-500 hover:text-stone-900'
              }`}
          >
            Past 30 Days
          </button>
          <button
            onClick={() => applyPreset('ALL')}
            className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${preset === 'ALL'
                ? 'bg-white text-stone-900 font-semibold shadow-sm'
                : 'text-stone-500 hover:text-stone-900'
              }`}
          >
            All Time
          </button>
        </div>

        <form onSubmit={handleCustomFilterSubmit} className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-stone-400 font-medium">Custom:</span>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => {
              setPreset('CUSTOM')
              setFromDate(e.target.value)
            }}
            className="input py-1 px-2.5 text-xs w-32"
          />
          <span className="text-stone-400">to</span>
          <input
            type="date"
            value={toDate}
            onChange={(e) => {
              setPreset('CUSTOM')
              setToDate(e.target.value)
            }}
            className="input py-1 px-2.5 text-xs w-32"
          />
          <button type="submit" className="btn-secondary py-1 px-2.5">
            Apply
          </button>
        </form>
      </div>

      {/* Integrated KPI Strip */}
      <div className="bg-white border border-gh-border rounded-lg grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x divide-gh-border">
        <div className="p-5">
          <div className="text-[11px] font-medium uppercase tracking-wider text-stone-400">
            Total Volume
          </div>
          <div className="text-2xl font-semibold text-stone-900 mt-1">
            {loading ? '—' : stats.total}
          </div>
          <div className="text-[11px] text-stone-400 mt-1">Sessions in range</div>
        </div>

        <div className="p-5">
          <div className="text-[11px] font-medium uppercase tracking-wider text-stone-400">
            Hours Delivered
          </div>
          <div className="text-2xl font-semibold text-emerald-800 mt-1">
            {loading ? '—' : `${stats.totalHours}h`}
          </div>
          <div className="text-[11px] text-stone-400 mt-1">Total support time</div>
        </div>

        <div className="p-5">
          <div className="text-[11px] font-medium uppercase tracking-wider text-stone-400">
            Active Devs
          </div>
          <div className="text-2xl font-semibold text-stone-900 mt-1">
            {loading ? '—' : stats.uniqueDevs}
          </div>
          <div className="text-[11px] text-stone-400 mt-1">Engineers involved</div>
        </div>

        <div className="p-5">
          <div className="text-[11px] font-medium uppercase tracking-wider text-stone-400">
            AEs Assisted
          </div>
          <div className="text-2xl font-semibold text-stone-900 mt-1">
            {loading ? '—' : stats.uniqueAEs}
          </div>
          <div className="text-[11px] text-stone-400 mt-1">GeneralSupport helped</div>
        </div>
      </div>

      {/* Chart Row 1: Dev Support Distribution (BarChart) & Daily Trend (LineChart) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* BarChart: Sessions per Dev */}
        <div className="bg-white border border-gh-border rounded-lg p-5">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-gh-border">
            <div className="flex items-center gap-2">
              <BarChart2 className="w-3.5 h-3.5 text-gh-green" />
              <h3 className="font-semibold text-xs text-stone-900 uppercase tracking-wider">Sessions per DevSupport</h3>
            </div>
            <span className="badge-role">Allocation</span>
          </div>

          <div className="h-64 w-full">
            {devDistributionData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-stone-400">
                No session telemetry in this date range.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={devDistributionData} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EAEAE6" />
                  <XAxis
                    dataKey="dev"
                    stroke="#999994"
                    fontSize={11}
                    interval={0}
                    angle={-20}
                    textAnchor="end"
                    tickLine={false}
                  />
                  <YAxis stroke="#999994" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip content={<DevTooltip />} />
                  <Bar dataKey="count" name="Sessions" fill="#0E6237" radius={[4, 4, 0, 0]} maxBarSize={36} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* LineChart: Daily Trend */}
        <div className="bg-white border border-gh-border rounded-lg p-5">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-gh-border">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-700" />
              <h3 className="font-semibold text-xs text-stone-900 uppercase tracking-wider">Daily Escalation Trend</h3>
            </div>
            <span className="badge-role">Trend</span>
          </div>

          <div className="h-64 w-full">
            {dailyTrendData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-stone-400">
                No activity points recorded in this window.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailyTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EAEAE6" />
                  <XAxis dataKey="date" stroke="#999994" fontSize={11} tickLine={false} />
                  <YAxis stroke="#999994" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      borderRadius: '6px',
                      border: '1px solid #EAEAE6',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.04)',
                      fontSize: '11px',
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="sessions"
                    name="Sessions"
                    stroke="#0E6237"
                    strokeWidth={2.5}
                    dot={{ fill: '#0E6237', strokeWidth: 1.5, r: 3 }}
                    activeDot={{ r: 5, fill: '#0A4A28' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Chart Row 2: GeneralSupport AE Share (PieChart) & Sessions Detail Log */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* PieChart (1 col) */}
        <div className="bg-white border border-gh-border rounded-lg p-5">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-gh-border">
            <div className="flex items-center gap-2">
              <PieIcon className="w-3.5 h-3.5 text-emerald-700" />
              <h3 className="font-semibold text-xs text-stone-900 uppercase tracking-wider">AE Requests</h3>
            </div>
            <span className="badge-role">Share</span>
          </div>

          <div className="h-60 w-full">
            {aeShareData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-stone-400">
                No AE participation records.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={aeShareData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={70}
                    paddingAngle={3}
                  >
                    {aeShareData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={GREEN_PALETTE[index % GREEN_PALETTE.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value, name) => [`${value} sessions`, name]}
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      borderRadius: '6px',
                      border: '1px solid #EAEAE6',
                      fontSize: '11px',
                    }}
                  />
                  <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Recent Records Log (2 cols) */}
        <div className="lg:col-span-2 bg-white border border-gh-border rounded-lg p-5">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-gh-border">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-3.5 h-3.5 text-gh-green" />
              <h3 className="font-semibold text-xs text-stone-900 uppercase tracking-wider">Session Telemetry Log</h3>
            </div>
            <span className="text-[11px] text-stone-400">{sessions.length} records</span>
          </div>

          <div className="overflow-x-auto max-h-72 overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAFAF9] sticky top-0 border-b border-gh-border text-[11px] text-stone-500 uppercase font-medium">
                <tr>
                  <th className="py-2.5 px-3">DevSupport</th>
                  <th className="py-2.5 px-3">GeneralSupport (AE)</th>
                  <th className="py-2.5 px-3">Started</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gh-border">
                {sessions.slice(0, 15).map((s) => (
                  <tr key={s.sessionId} className="hover:bg-gh-neutral/50 transition-colors">
                    <td className="py-2.5 px-3 font-semibold text-gh-text">{s.devName}</td>
                    <td className="py-2.5 px-3 font-medium text-gh-muted">{s.aeName}</td>
                    <td className="py-2.5 px-3 text-gh-muted">
                      {s.startTime ? new Date(s.startTime).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}
                    </td>
                    <td className="py-2.5 px-3">
                      {s.endTime ? (
                        <span className="text-[10px] font-semibold text-gray-700 bg-gray-100 px-2 py-0.5 rounded">
                          Closed
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          Active
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-gh-muted truncate max-w-xs">
                      {s.sessionDescription || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
