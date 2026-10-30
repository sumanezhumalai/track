import React, { useState, useEffect, useMemo, forwardRef, useImperativeHandle } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'
import {
  Filter,
  RefreshCw,
  Search,
  AlertCircle,
  FolderGit2,
  GitBranch,
  User,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  Calendar,
  RotateCcw,
  FileSpreadsheet,
  Layers,
  BarChart2,
  Users2,
} from 'lucide-react'
import {
  fetchModuleAnalytics,
  fetchProjects,
  fetchProjectVersions,
  fetchDevSupportUsers,
} from '../../api/modulesAnalytics'
import { getAvatarInitials } from '../../lib/avatar'
import StyledSelect from './StyledSelect'

// Greenhouse harmonious greens and complementary chart palette
const PRIORITY_COLORS = {
  high: '#B91C1C', // Crimson / deep red for high priority
  medium: '#D97706', // Warm amber for medium priority
  low: '#10B981', // Emerald for low priority
}

const STATUS_LABELS = {
  ToBeDone: 'To Be Done',
  start: 'In Dev',
  testing: 'Testing / QA',
  production: 'Production',
}

const ModulesAnalyticsView = forwardRef(function ModulesAnalyticsView({ onLoadingChange }, ref) {
  const navigate = useNavigate()

  // Filter state
  const [projectId, setProjectId] = useState('')
  const [versionId, setVersionId] = useState('')
  const [devName, setDevName] = useState('')
  const [status, setStatus] = useState('')
  const [priority, setPriority] = useState('')
  const [datePreset, setDatePreset] = useState('ALL') // 'WEEK' | 'MONTH' | 'ALL' | 'CUSTOM'
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [tableSearch, setTableSearch] = useState('')

  // Options
  const [projects, setProjects] = useState([])
  const [versions, setVersions] = useState([])
  const [devUsers, setDevUsers] = useState([])

  // Analytics data
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // 1. Initial dropdown options load
  useEffect(() => {
    const loadOptions = async () => {
      try {
        const [projs, users] = await Promise.all([
          fetchProjects(),
          fetchDevSupportUsers(),
        ])
        setProjects(Array.isArray(projs) ? projs : [])
        setDevUsers(Array.isArray(users) ? users : [])
      } catch {
        setProjects([])
        setDevUsers([])
      }
    }
    loadOptions()
  }, [])

  // 2. Load versions when projectId changes
  useEffect(() => {
    if (projectId) {
      fetchProjectVersions(projectId)
        .then((v) => setVersions(Array.isArray(v) ? v : []))
        .catch(() => setVersions([]))
    } else {
      setVersions([])
      setVersionId('')
    }
  }, [projectId])

  // 3. Date presets handler
  const handleDatePreset = (preset) => {
    setDatePreset(preset)
    const now = new Date()
    const toStr = now.toISOString().split('T')[0]

    if (preset === 'WEEK') {
      const from = new Date()
      from.setDate(now.getDate() - 7)
      setFromDate(from.toISOString().split('T')[0])
      setToDate(toStr)
    } else if (preset === 'MONTH') {
      const from = new Date()
      from.setDate(now.getDate() - 30)
      setFromDate(from.toISOString().split('T')[0])
      setToDate(toStr)
    } else if (preset === 'ALL') {
      setFromDate('')
      setToDate('')
    }
  }

  // 4. Fetch Analytics on filter change
  const loadAnalytics = async () => {
    setLoading(true)
    onLoadingChange?.(true)
    setError('')
    try {
      const res = await fetchModuleAnalytics({
        projectId,
        versionId,
        devName,
        status,
        priority,
        from: fromDate,
        to: toDate,
      })
      setData(res)
    } catch {
      setError('Failed to load module analytics telemetry. Verify Admin permissions.')
    } finally {
      setLoading(false)
      onLoadingChange?.(false)
    }
  }

  useImperativeHandle(ref, () => ({
    refresh: loadAnalytics,
  }))

  useEffect(() => {
    loadAnalytics()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, versionId, devName, status, priority, fromDate, toDate])

  const activeFilterCount = useMemo(() => {
    let count = 0
    if (projectId) count++
    if (versionId) count++
    if (devName) count++
    if (status) count++
    if (priority) count++
    if (datePreset !== 'ALL' || fromDate || toDate) count++
    return count
  }, [projectId, versionId, devName, status, priority, datePreset, fromDate, toDate])

  const hasActiveFilters = activeFilterCount > 0

  const clearFilters = () => {
    setProjectId('')
    setVersionId('')
    setDevName('')
    setStatus('')
    setPriority('')
    setDatePreset('ALL')
    setFromDate('')
    setToDate('')
  }

  const projectOptions = useMemo(() => [
    { value: '', label: 'All Projects' },
    ...(Array.isArray(projects) ? projects.map((p) => ({
      value: p.projectId,
      label: p.projectName,
      subtitle: p.description || '',
    })) : [])
  ], [projects])

  const versionOptions = useMemo(() => [
    { value: '', label: 'All Versions' },
    ...(Array.isArray(versions) ? versions.map((v) => ({
      value: v.versionId,
      label: v.label || `v${v.versionNumber}`,
    })) : [])
  ], [versions])

  const assigneeOptions = useMemo(() => [
    { value: '', label: 'All Engineers' },
    ...(Array.isArray(devUsers) ? devUsers.map((u) => ({
      value: u.devName,
      label: u.devName,
      devName: u.devName,
      subtitle: u.role || u.team || '',
    })) : [])
  ], [devUsers])

  const statusOptions = useMemo(() => [
    { value: '', label: 'All Statuses' },
    { value: 'ToBeDone', label: 'To Be Done', dot: 'bg-sky-500' },
    { value: 'start', label: 'In Development', dot: 'bg-amber-500' },
    { value: 'testing', label: 'QA / Testing', dot: 'bg-violet-500' },
    { value: 'production', label: 'Production', dot: 'bg-emerald-600' },
  ], [])

  const priorityOptions = useMemo(() => [
    { value: '', label: 'All Priorities' },
    { value: 'high', label: 'High Priority', dot: 'bg-rose-500', badgeClass: 'bg-rose-50 text-rose-700 border-rose-200' },
    { value: 'medium', label: 'Medium Priority', dot: 'bg-amber-500', badgeClass: 'bg-amber-50 text-amber-700 border-amber-200' },
    { value: 'low', label: 'Low Priority', dot: 'bg-emerald-500', badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  ], [])

  // 5. Filter table modules by search input
  const filteredTableModules = useMemo(() => {
    if (!data?.filteredModules) return []
    if (!tableSearch.trim()) return data.filteredModules

    const query = tableSearch.toLowerCase()
    return data.filteredModules.filter((m) => {
      const titleMatch = (m.title || '').toLowerCase().includes(query)
      const projectMatch = (m.projectName || '').toLowerCase().includes(query)
      const devMatch = (m.assignedTo || '').toLowerCase().includes(query)
      const idMatch = String(m.moduleId || '').includes(query)
      return titleMatch || projectMatch || devMatch || idMatch
    })
  }, [data?.filteredModules, tableSearch])

  // Custom tooltips for Recharts
  const PipelineTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload
      return (
        <div className="bg-white p-3 rounded-lg border border-gh-border shadow-elevated text-xs space-y-1">
          <div className="font-bold text-stone-900 border-b border-gh-border pb-1">
            {STATUS_LABELS[label] || label}
          </div>
          <div className="text-stone-600">Total Cards: <strong>{item.total}</strong></div>
          <div className="text-red-700">High: {item.high}</div>
          <div className="text-amber-700">Medium: {item.medium}</div>
          <div className="text-emerald-700">Low: {item.low}</div>
        </div>
      )
    }
    return null
  }

  const WorkloadTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload
      return (
        <div className="bg-white p-3 rounded-lg border border-gh-border shadow-elevated text-xs space-y-1">
          <div className="font-bold text-stone-900 border-b border-gh-border pb-1">
            {item.devName}
          </div>
          <div className="text-stone-700">Total Assigned: <strong>{item.assignedTotal}</strong></div>
          <div className="text-sky-700">In Dev: {item.inProgress}</div>
          <div className="text-purple-700">Testing: {item.testing}</div>
          <div className="text-emerald-700">Completed: {item.completed}</div>
          <div className="text-red-600">Overdue: {item.overdueCount}</div>
          <div className="text-stone-500 pt-1 border-t border-gh-border">
            Subtasks: {item.subtasksDone} / {item.subtasksTotal}
          </div>
        </div>
      )
    }
    return null
  }

  const summary = data?.summary
  const pipelineDistribution = Array.isArray(data?.pipelineDistribution) ? data.pipelineDistribution : []
  const developerWorkload = Array.isArray(data?.developerWorkload) ? data.developerWorkload : []
  const projectProgress = Array.isArray(data?.projectProgress) ? data.projectProgress : []

  return (
    <div className="space-y-6">
      {/* ── Filter Controls Container ────────────────────────────────────────── */}
      <div className="space-y-2.5">
        {/* Top Control Bar: Filter/Reset on Left, Time Horizon on Right */}
        <div className="flex items-center justify-between gap-3">
          {/* Filter button that turns into reset icon when any filter applied */}
          <button
            type="button"
            onClick={hasActiveFilters ? clearFilters : undefined}
            className={`h-8 w-8 rounded-lg border flex items-center justify-center transition-all duration-150 shadow-2xs group ${
              hasActiveFilters
                ? 'bg-rose-50/70 border-rose-200 text-rose-600 hover:bg-rose-100/80 hover:border-rose-300 hover:text-rose-700 cursor-pointer shadow-xs active:scale-95'
                : 'bg-white border-gh-border text-stone-400 cursor-default'
            }`}
            title={hasActiveFilters ? 'Reset all filters' : 'Telemetry filters'}
            aria-label={hasActiveFilters ? 'Reset all filters' : 'Telemetry filters'}
          >
            {hasActiveFilters ? (
              <RotateCcw className="w-3.5 h-3.5 transition-transform group-hover:-rotate-45" />
            ) : (
              <Filter className="w-3.5 h-3.5" />
            )}
          </button>

          {/* Time Horizon Segmented Control */}
          <div className="flex items-center gap-1 bg-stone-100/90 p-0.5 rounded-lg border border-stone-200/80 h-8">
            <button
              type="button"
              onClick={() => handleDatePreset('WEEK')}
              className={`px-3 h-full rounded-md text-[11px] font-medium transition-all cursor-pointer ${
                datePreset === 'WEEK'
                  ? 'bg-white text-stone-900 font-semibold shadow-xs border border-stone-200/60'
                  : 'text-stone-500 hover:text-stone-900 hover:bg-stone-200/40'
              }`}
            >
              7D
            </button>
            <button
              type="button"
              onClick={() => handleDatePreset('MONTH')}
              className={`px-3 h-full rounded-md text-[11px] font-medium transition-all cursor-pointer ${
                datePreset === 'MONTH'
                  ? 'bg-white text-stone-900 font-semibold shadow-xs border border-stone-200/60'
                  : 'text-stone-500 hover:text-stone-900 hover:bg-stone-200/40'
              }`}
            >
              30D
            </button>
            <button
              type="button"
              onClick={() => handleDatePreset('ALL')}
              className={`px-3 h-full rounded-md text-[11px] font-medium transition-all cursor-pointer ${
                datePreset === 'ALL'
                  ? 'bg-white text-stone-900 font-semibold shadow-xs border border-stone-200/60'
                  : 'text-stone-500 hover:text-stone-900 hover:bg-stone-200/40'
              }`}
            >
              All
            </button>
          </div>
        </div>

        {/* Filter Card (5 Dropdowns Only) */}
        <div className="bg-white border border-gh-border rounded-xl p-3.5 shadow-2xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 text-xs">
            <StyledSelect
              label="Project"
              icon={FolderGit2}
              value={projectId}
              onChange={setProjectId}
              options={projectOptions}
              placeholder="All Projects"
              searchable
            />

            <StyledSelect
              label="Version Branch"
              icon={GitBranch}
              value={versionId}
              onChange={setVersionId}
              options={versionOptions}
              placeholder="All Versions"
              disabled={!projectId}
            />

            <StyledSelect
              label="Assignee"
              icon={User}
              value={devName}
              onChange={setDevName}
              options={assigneeOptions}
              placeholder="All Engineers"
              searchable
            />

            <StyledSelect
              label="Status Column"
              icon={Layers}
              value={status}
              onChange={setStatus}
              options={statusOptions}
              placeholder="All Statuses"
            />

            <StyledSelect
              label="Priority"
              icon={AlertCircle}
              value={priority}
              onChange={setPriority}
              options={priorityOptions}
              placeholder="All Priorities"
              align="right"
            />
          </div>

          {/* Custom date range if selected */}
          {datePreset === 'CUSTOM' && (
            <div className="flex items-center gap-2 pt-3 mt-3 border-t border-stone-100 text-xs">
              <span className="text-stone-500 font-medium">Custom Range:</span>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="input py-1 px-2 text-xs w-36"
              />
              <span className="text-stone-400">to</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="input py-1 px-2 text-xs w-36"
              />
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-md bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
          <span>{error}</span>
        </div>
      )}

      {/* ── Tier 1: 5 KPI Summary Strip ────────────────────────────────────── */}
      <div className="bg-white border border-gh-border rounded-lg grid grid-cols-2 lg:grid-cols-5 divide-y lg:divide-y-0 lg:divide-x divide-gh-border">
        {/* Total In Scope */}
        <div className="p-4">
          <div className="text-[10px] font-medium uppercase tracking-wider text-stone-400">
            Total In Scope
          </div>
          <div className="text-2xl font-semibold text-stone-900 mt-1">
            {loading ? '—' : summary?.totalModules ?? 0}
          </div>
          <div className="text-[10px] text-stone-400 mt-0.5">Matching filtered criteria</div>
        </div>

        {/* Completion Rate */}
        <div className="p-4">
          <div className="text-[10px] font-medium uppercase tracking-wider text-stone-400">
            Delivery Rate
          </div>
          <div className="text-2xl font-semibold text-emerald-800 mt-1">
            {loading ? '—' : `${summary?.completionRate ?? 0}%`}
          </div>
          <div className="text-[10px] text-stone-400 mt-0.5">
            {summary?.completedModules ?? 0} modules delivered
          </div>
        </div>

        {/* Active WIP */}
        <div className="p-4">
          <div className="text-[10px] font-medium uppercase tracking-wider text-stone-400">
            Active WIP
          </div>
          <div className="text-2xl font-semibold text-sky-800 mt-1">
            {loading ? '—' : summary?.activeWipCount ?? 0}
          </div>
          <div className="text-[10px] text-stone-400 mt-0.5">In dev or QA testing</div>
        </div>

        {/* Overdue / At-Risk */}
        <div className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-medium uppercase tracking-wider text-stone-400">
              Overdue
            </span>
            {(summary?.overdueCount ?? 0) > 0 && (
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            )}
          </div>
          <div
            className={`text-2xl font-semibold mt-1 ${
              (summary?.overdueCount ?? 0) > 0 ? 'text-red-600' : 'text-stone-900'
            }`}
          >
            {loading ? '—' : summary?.overdueCount ?? 0}
          </div>
          <div className="text-[10px] text-stone-400 mt-0.5">
            {summary?.overdueRate ?? 0}% of active workload
          </div>
        </div>

        {/* Subtask Velocity */}
        <div className="p-4">
          <div className="text-[10px] font-medium uppercase tracking-wider text-stone-400">
            Subtask Velocity
          </div>
          <div className="text-2xl font-semibold text-stone-900 mt-1">
            {loading ? '—' : `${summary?.subtaskVelocity ?? 0}%`}
          </div>
          <div className="text-[10px] text-stone-400 mt-0.5">
            {summary?.completedSubtasks ?? 0} / {summary?.totalSubtasks ?? 0} checklist items
          </div>
        </div>
      </div>

      {/* ── Tier 2 & 3: Charts Row ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tier 2: Pipeline & Priority Stacked BarChart */}
        <div className="bg-white border border-gh-border rounded-lg p-5">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-gh-border">
            <div className="flex items-center gap-2">
              <BarChart2 className="w-3.5 h-3.5 text-gh-green" />
              <h3 className="font-semibold text-xs text-stone-900 uppercase tracking-wider">
                Workflow Pipeline by Priority
              </h3>
            </div>
            <span className="badge-role">Stacked</span>
          </div>

          <div className="h-64 w-full">
            {pipelineDistribution.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-stone-400">
                No pipeline data matching current filters.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={pipelineDistribution}
                  margin={{ top: 10, right: 10, left: -20, bottom: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EAEAE6" />
                  <XAxis
                    dataKey="status"
                    stroke="#999994"
                    fontSize={11}
                    tickLine={false}
                    tickFormatter={(val) => STATUS_LABELS[val] || val}
                  />
                  <YAxis
                    stroke="#999994"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip content={<PipelineTooltip />} />
                  <Legend
                    iconType="circle"
                    iconSize={7}
                    wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }}
                    payload={[
                      { value: 'High Priority', type: 'circle', color: PRIORITY_COLORS.high },
                      { value: 'Medium Priority', type: 'circle', color: PRIORITY_COLORS.medium },
                      { value: 'Low Priority', type: 'circle', color: PRIORITY_COLORS.low },
                    ]}
                  />
                  <Bar
                    dataKey="high"
                    name="High Priority"
                    stackId="a"
                    fill={PRIORITY_COLORS.high}
                    maxBarSize={36}
                  />
                  <Bar
                    dataKey="medium"
                    name="Medium Priority"
                    stackId="a"
                    fill={PRIORITY_COLORS.medium}
                    maxBarSize={36}
                  />
                  <Bar
                    dataKey="low"
                    name="Low Priority"
                    stackId="a"
                    fill={PRIORITY_COLORS.low}
                    radius={[4, 4, 0, 0]}
                    maxBarSize={36}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Tier 3: Developer Workload & Velocity Grouped BarChart */}
        <div className="bg-white border border-gh-border rounded-lg p-5">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-gh-border">
            <div className="flex items-center gap-2">
              <Users2 className="w-3.5 h-3.5 text-emerald-700" />
              <h3 className="font-semibold text-xs text-stone-900 uppercase tracking-wider">
                Engineer Workload Distribution
              </h3>
            </div>
            <span className="badge-role">Allocation</span>
          </div>

          <div className="h-64 w-full">
            {developerWorkload.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-stone-400">
                No developer assignments recorded in this scope.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={developerWorkload}
                  margin={{ top: 10, right: 10, left: -20, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EAEAE6" />
                  <XAxis
                    dataKey="devName"
                    stroke="#999994"
                    fontSize={11}
                    tickLine={false}
                    interval={0}
                    angle={-15}
                    textAnchor="end"
                  />
                  <YAxis
                    stroke="#999994"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip content={<WorkloadTooltip />} />
                  <Legend
                    iconType="circle"
                    iconSize={7}
                    wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }}
                    payload={[
                      { value: 'In Dev', type: 'circle', color: '#0284C7' },
                      { value: 'Testing', type: 'circle', color: '#9333EA' },
                      { value: 'Completed', type: 'circle', color: '#15803D' },
                    ]}
                  />
                  <Bar
                    dataKey="inProgress"
                    name="In Dev"
                    fill="#0284C7"
                    radius={[3, 3, 0, 0]}
                    maxBarSize={24}
                  />
                  <Bar
                    dataKey="testing"
                    name="Testing"
                    fill="#9333EA"
                    radius={[3, 3, 0, 0]}
                    maxBarSize={24}
                  />
                  <Bar
                    dataKey="completed"
                    name="Completed"
                    fill="#15803D"
                    radius={[3, 3, 0, 0]}
                    maxBarSize={24}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* ── Tier 4: Initiative Progress Gauges ──────────────────────────────── */}
      {projectProgress.length > 0 && (
        <div className="bg-white border border-gh-border rounded-lg p-5">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-gh-border">
            <div className="flex items-center gap-2">
              <FolderGit2 className="w-3.5 h-3.5 text-stone-600" />
              <h3 className="font-semibold text-xs text-stone-900 uppercase tracking-wider">
                Initiative Delivery Progress
              </h3>
            </div>
            <span className="text-[11px] text-stone-400">
              {projectProgress.length} active initiatives
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {Array.isArray(projectProgress) && projectProgress.map((p) => (
              <div
                key={p.projectId}
                onClick={() => navigate(`/features/${p.projectId}/modules`)}
                className="p-3.5 rounded-lg border border-stone-200 bg-[#FAFAF9] hover:bg-stone-100/70 cursor-pointer transition-colors group"
              >
                <div className="flex items-center justify-between text-xs font-semibold text-stone-900 group-hover:text-gh-green transition-colors">
                  <span className="truncate">{p.projectName}</span>
                  <span className="text-emerald-800 text-[11px] font-bold">
                    {p.progressPercentage}%
                  </span>
                </div>
                <div className="h-2 w-full bg-stone-200 rounded-full overflow-hidden mt-2">
                  <div
                    style={{ width: `${p.progressPercentage}%` }}
                    className="bg-emerald-600 h-full rounded-full transition-all duration-500"
                  />
                </div>
                <div className="flex items-center justify-between mt-2 text-[10px] text-stone-400">
                  <span>{p.completedModules} of {p.totalModules} completed</span>
                  <span className="text-gh-green font-medium group-hover:underline">
                    Open Board →
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Tier 4: Interactive Telemetry Matrix Table ──────────────────────── */}
      <div className="bg-white border border-gh-border rounded-lg p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gh-border">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-3.5 h-3.5 text-gh-green" />
            <h3 className="font-semibold text-xs text-stone-900 uppercase tracking-wider">
              Module Telemetry Matrix
            </h3>
            <span className="text-[10px] font-mono text-stone-500 bg-stone-100 px-2 py-0.5 rounded">
              {filteredTableModules.length} records
            </span>
          </div>

          {/* Real-time search filter */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              placeholder="Search title, dev, project..."
              value={tableSearch}
              onChange={(e) => setTableSearch(e.target.value)}
              className="pl-8 pr-3 py-1 text-xs rounded-md border border-gh-border bg-white text-stone-800 placeholder:text-stone-400 focus:outline-none focus:border-stone-400 w-52 sm:w-64"
            />
          </div>
        </div>

        {/* Table View */}
        <div className="overflow-x-auto max-h-96 overflow-y-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FAFAF9] sticky top-0 border-b border-gh-border text-[10px] text-stone-500 uppercase font-medium">
              <tr>
                <th className="py-2.5 px-3">Module</th>
                <th className="py-2.5 px-3">Project / Version</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Priority</th>
                <th className="py-2.5 px-3">Assignees</th>
                <th className="py-2.5 px-3">Subtasks</th>
                <th className="py-2.5 px-3">Due Date</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gh-border">
              {filteredTableModules.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-stone-400 text-xs">
                    No modules match the current criteria or search query.
                  </td>
                </tr>
              ) : (
                Array.isArray(filteredTableModules) && filteredTableModules.map((m) => (
                  <tr
                    key={m.moduleId}
                    className="hover:bg-gh-neutral/50 transition-colors"
                  >
                    {/* Title */}
                    <td className="py-2.5 px-3 font-semibold text-stone-900 max-w-xs truncate">
                      <span className="text-[10px] text-stone-400 font-mono mr-1">
                        #{m.moduleId}
                      </span>
                      <span>{m.title}</span>
                    </td>

                    {/* Project / Version */}
                    <td className="py-2.5 px-3 text-stone-600">
                      <div className="font-medium text-stone-800">{m.projectName}</div>
                      <div className="text-[10px] text-stone-400 font-mono">{m.versionLabel}</div>
                    </td>

                    {/* Status */}
                    <td className="py-2.5 px-3">
                      <span
                        className={`text-[10px] font-medium px-2 py-0.5 rounded border ${
                          m.status === 'production'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : m.status === 'testing'
                            ? 'bg-purple-50 text-purple-800 border-purple-200'
                            : m.status === 'start'
                            ? 'bg-sky-50 text-sky-800 border-sky-200'
                            : 'bg-stone-100 text-stone-700 border-stone-200'
                        }`}
                      >
                        {STATUS_LABELS[m.status] || m.status}
                      </span>
                    </td>

                    {/* Priority */}
                    <td className="py-2.5 px-3">
                      <span
                        className={`text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded ${
                          m.priority === 'high'
                            ? 'bg-red-50 text-red-700 border border-red-200/60'
                            : m.priority === 'medium'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200/60'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                        }`}
                      >
                        {m.priority}
                      </span>
                    </td>

                    {/* Assignees */}
                    <td className="py-2.5 px-3">
                      <div className="flex items-center -space-x-1">
                        {Array.isArray(m.assigneeDevNames) && m.assigneeDevNames.length > 0 ? (
                          m.assigneeDevNames.slice(0, 3).map((dev, idx) => (
                            <span
                              key={idx}
                              title={dev}
                              className="w-5 h-5 rounded-full bg-stone-200 text-stone-800 font-bold text-[9px] flex items-center justify-center border border-white"
                            >
                              {getAvatarInitials(dev)}
                            </span>
                          ))
                        ) : (
                          <span className="text-stone-400 text-[10px]">Unassigned</span>
                        )}
                        {m.assigneeDevNames && m.assigneeDevNames.length > 3 && (
                          <span className="text-[9px] text-stone-400 pl-2">
                            +{m.assigneeDevNames.length - 3}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Subtasks */}
                    <td className="py-2.5 px-3">
                      {m.totalSubtasks > 0 ? (
                        <div className="space-y-1 w-24">
                          <div className="flex items-center justify-between text-[10px] text-stone-500">
                            <span>{m.completedSubtasks}/{m.totalSubtasks}</span>
                            <span className="font-semibold">{m.subtaskProgress}%</span>
                          </div>
                          <div className="h-1.5 w-full bg-stone-100 rounded-full overflow-hidden">
                            <div
                              style={{ width: `${m.subtaskProgress}%` }}
                              className="bg-gh-green h-full rounded-full"
                            />
                          </div>
                        </div>
                      ) : (
                        <span className="text-stone-400 text-[10px]">—</span>
                      )}
                    </td>

                    {/* Due Date & Overdue Badge */}
                    <td className="py-2.5 px-3 text-stone-600">
                      {m.dueDate ? (
                        <div className="flex items-center gap-1.5">
                          <span>{m.dueDate}</span>
                          {m.isOverdue && (
                            <span className="text-[9px] font-bold text-red-700 bg-red-100 px-1 py-0.2 rounded">
                              Overdue
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-stone-400 text-[10px]">No date</span>
                      )}
                    </td>

                    {/* Action */}
                    <td className="py-2.5 px-3 text-right">
                      {m.projectId ? (
                        <button
                          onClick={() => navigate(`/features/${m.projectId}/modules`)}
                          title="Open in Kanban board"
                          className="p-1 text-stone-400 hover:text-gh-green hover:bg-stone-100 rounded transition-colors inline-flex items-center gap-1"
                        >
                          <span className="text-[11px] font-medium hidden sm:inline">Board</span>
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
})

export default ModulesAnalyticsView
