import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'
import {
  Radio,
  Clock,
  CheckCircle2,
  Users,
  ArrowUpRight,
  Plus,
  RefreshCw,
  Activity,
  AlertCircle,
} from 'lucide-react'
import LiveTimer from '../components/LiveTimer'
import api from '../api/axios'

export default function Dashboard() {
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const rawUser = localStorage.getItem('user')
  let user = { name: 'User', role: 'DEV' }
  if (rawUser) {
    try {
      user = JSON.parse(rawUser)
    } catch {
      // ignore
    }
  }
  const isAdmin = (user.role || '').toUpperCase().includes('ADMIN')

  const fetchSessions = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await api.get('/sessions')
      setSessions(res.data || [])
    } catch (err) {
      setError('Failed to fetch support sessions.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSessions()
  }, [])

  const totalCount = sessions.length
  const activeSessions = sessions.filter((s) => !s.endTime)
  const closedSessions = sessions.filter((s) => Boolean(s.endTime))

  const totalDurationMinutes = closedSessions.reduce((acc, s) => {
    const start = new Date(s.startTime).getTime()
    const end = new Date(s.endTime).getTime()
    return acc + Math.max(0, Math.floor((end - start) / 60000))
  }, 0)

  const avgDurationMinutes = closedSessions.length
    ? Math.round(totalDurationMinutes / closedSessions.length)
    : 0

  const getPast7DaysData = () => {
    const days = []
    const today = new Date()
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(today.getDate() - i)
      const dayStr = d.toLocaleDateString('en-US', { weekday: 'short' })
      const dateKey = d.toISOString().split('T')[0]

      const count = sessions.filter((s) => {
        if (!s.startTime) return false
        return s.startTime.startsWith(dateKey)
      }).length

      days.push({ day: dayStr, count, date: dateKey })
    }
    return days
  }

  const chartData = getPast7DaysData()

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gh-border">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-stone-900">
            Operational Overview
          </h1>
          <p className="text-xs text-stone-500 mt-0.5">
            Real-time telemetry and team engagement metrics.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchSessions}
            disabled={loading}
            className="btn-secondary"
          >
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <Link to="/sessions" className="btn-primary">
            <Plus className="w-3.5 h-3.5" />
            <span>{isAdmin ? 'Manage Sessions' : 'New Session'}</span>
          </Link>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-md bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
          <span>{error}</span>
        </div>
      )}

      {/* Page-Integrated Metric Strip (Clean single-row with hairline dividers) */}
      <div className="bg-white border border-gh-border rounded-lg grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x divide-gh-border">
        {/* Total Sessions */}
        <div className="p-5">
          <div className="text-[11px] font-medium uppercase tracking-wider text-stone-400">
            Total Sessions
          </div>
          <div className="text-2xl font-semibold text-stone-900 mt-1">
            {loading ? '—' : totalCount}
          </div>
          <div className="text-[11px] text-stone-400 mt-1">Recorded to date</div>
        </div>

        {/* Active Now */}
        <div className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium uppercase tracking-wider text-stone-400">
              Active Now
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <div className="text-2xl font-semibold text-emerald-800 mt-1">
            {loading ? '—' : activeSessions.length}
          </div>
          <div className="text-[11px] text-stone-400 mt-1">In live resolution</div>
        </div>

        {/* Resolved */}
        <div className="p-5">
          <div className="text-[11px] font-medium uppercase tracking-wider text-stone-400">
            Resolved
          </div>
          <div className="text-2xl font-semibold text-stone-900 mt-1">
            {loading ? '—' : closedSessions.length}
          </div>
          <div className="text-[11px] text-stone-400 mt-1">Completed successfully</div>
        </div>

        {/* Average Duration */}
        <div className="p-5">
          <div className="text-[11px] font-medium uppercase tracking-wider text-stone-400">
            Avg Duration
          </div>
          <div className="text-2xl font-semibold text-stone-900 mt-1">
            {loading ? '—' : `${avgDurationMinutes}m`}
          </div>
          <div className="text-[11px] text-stone-400 mt-1">Mean resolution time</div>
        </div>
      </div>

      {/* Main Content Grid: Activity Chart & Live Sessions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Activity Chart */}
        <div className="lg:col-span-2 bg-white border border-gh-border rounded-lg p-5">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-gh-border">
            <div>
              <h2 className="text-xs font-semibold text-stone-900 uppercase tracking-wider">
                7-Day Activity Trend
              </h2>
              <p className="text-[11px] text-stone-400 mt-0.5">Sessions initiated over the past week</p>
            </div>
            <span className="badge-role">Volume</span>
          </div>

          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EAEAE6" />
                <XAxis dataKey="day" stroke="#999994" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#999994" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: '6px',
                    border: '1px solid #EAEAE6',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.04)',
                    fontSize: '11px',
                  }}
                  cursor={{ fill: '#F2F8F4' }}
                />
                <Bar dataKey="count" name="Sessions" fill="#0E6237" radius={[4, 4, 0, 0]} maxBarSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Live Active Sessions Panel */}
        <div className="bg-white border border-gh-border rounded-lg p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-gh-border">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <h2 className="text-xs font-semibold text-stone-900 uppercase tracking-wider">
                  Live Sessions
                </h2>
              </div>
              <span className="text-[10px] font-medium text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/50">
                {activeSessions.length} Active
              </span>
            </div>

            {activeSessions.length === 0 ? (
              <div className="py-10 text-center text-stone-400">
                <p className="text-xs font-medium text-stone-600">No active sessions</p>
                <p className="text-[11px] text-stone-400 mt-1 max-w-[200px] mx-auto">
                  When a session begins, live duration will stream here.
                </p>
              </div>
            ) : (
              <div className="space-y-2 overflow-y-auto max-h-64 pr-1">
                {activeSessions.map((s) => (
                  <div
                    key={s.sessionId}
                    className="p-2.5 rounded-md border border-stone-100 bg-[#FAFAF9] hover:bg-stone-100/60 transition-colors"
                  >
                    <div className="flex items-center justify-between text-xs font-medium text-stone-900">
                      <span className="truncate">{s.devName} ↔ {s.aeName}</span>
                      <LiveTimer startTime={s.startTime} />
                    </div>
                    <div className="text-[10px] text-stone-400 mt-1">
                      Started {new Date(s.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-3 mt-3 border-t border-gh-border text-right">
            <Link
              to="/sessions"
              className="text-xs font-medium text-gh-green hover:text-gh-greenDark inline-flex items-center gap-1"
            >
              <span>View all sessions</span>
              <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
