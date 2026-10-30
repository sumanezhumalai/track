import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Layers,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FolderGit2,
  ArrowUpRight,
  RefreshCw,
  AlertCircle,
  Calendar,
  ListTodo,
  TrendingUp,
} from 'lucide-react'
import { fetchDashboardStats } from '../../api/modulesAnalytics'
import { getAvatarInitials } from '../../lib/avatar'

const ModulesDashboardView = forwardRef(function ModulesDashboardView({ onLoadingChange }, ref) {
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('deadlines') // 'deadlines' | 'recent'

  const loadStats = async () => {
    setLoading(true)
    onLoadingChange?.(true)
    setError('')
    try {
      const res = await fetchDashboardStats()
      setData(res)
    } catch {
      setError('Failed to load modules dashboard metrics. Please try again.')
    } finally {
      setLoading(false)
      onLoadingChange?.(false)
    }
  }

  useImperativeHandle(ref, () => ({
    refresh: loadStats,
  }))

  useEffect(() => {
    loadStats()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (loading && !data) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="bg-white border border-gh-border rounded-lg grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x divide-gh-border">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="p-5 space-y-2">
              <div className="h-3 bg-stone-200 rounded w-20" />
              <div className="h-7 bg-stone-200 rounded w-16" />
              <div className="h-2.5 bg-stone-100 rounded w-28" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-72 bg-white border border-gh-border rounded-lg p-5" />
          <div className="h-72 bg-white border border-gh-border rounded-lg p-5" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
          <span>{error}</span>
        </div>
        <button
          onClick={loadStats}
          className="btn-secondary py-1 px-2.5 text-xs inline-flex items-center gap-1.5"
        >
          <RefreshCw className="w-3 h-3" />
          <span>Retry</span>
        </button>
      </div>
    )
  }

  const isAdmin = data?.isAdmin
  const adminStats = data?.adminStats
  const devStats = data?.devStats

  return (
    <div className="space-y-6">
      {isAdmin && adminStats ? (
        <AdminDashboardContent
          stats={adminStats}
          onNavigate={(projectId) => navigate(`/features/${projectId}/modules`)}
        />
      ) : devStats ? (
        <DevDashboardContent
          stats={devStats}
          onNavigate={(projectId) => navigate(`/features/${projectId}/modules`)}
        />
      ) : null}
    </div>
  )
})

export default ModulesDashboardView

/**
 * ── Admin Content View ────────────────────────────────────────────────────────
 */
function AdminDashboardContent({ stats, onNavigate }) {
  const total = stats.totalModules || 0
  const toBeDonePct = total ? Math.round((stats.toBeDoneCount / total) * 100) : 0
  const inProgressPct = total ? Math.round((stats.inProgressCount / total) * 100) : 0
  const testingPct = total ? Math.round((stats.testingCount / total) * 100) : 0
  const productionPct = total ? Math.round((stats.productionCount / total) * 100) : 0

  return (
    <div className="space-y-6">
      {/* 4-KPI Strip */}
      <div className="bg-white border border-gh-border rounded-lg grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x divide-gh-border">
        {/* Active Initiatives */}
        <div className="p-5">
          <div className="text-[11px] font-medium uppercase tracking-wider text-stone-400">
            Initiatives
          </div>
          <div className="text-2xl font-semibold text-stone-900 mt-1">
            {stats.totalProjects}
          </div>
          <div className="text-[11px] text-stone-400 mt-1">Active project workspaces</div>
        </div>

        {/* Total Workload */}
        <div className="p-5">
          <div className="text-[11px] font-medium uppercase tracking-wider text-stone-400">
            Total Modules
          </div>
          <div className="text-2xl font-semibold text-stone-900 mt-1">
            {stats.totalModules}
          </div>
          <div className="text-[11px] text-stone-400 mt-1">
            {stats.inProgressCount + stats.testingCount} active in flight
          </div>
        </div>

        {/* Overall Delivery */}
        <div className="p-5">
          <div className="text-[11px] font-medium uppercase tracking-wider text-stone-400">
            Delivery Rate
          </div>
          <div className="text-2xl font-semibold text-emerald-800 mt-1">
            {stats.completionRate}%
          </div>
          <div className="text-[11px] text-stone-400 mt-1">
            {stats.productionCount} delivered to production
          </div>
        </div>

        {/* Overdue Attention */}
        <div className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium uppercase tracking-wider text-stone-400">
              Overdue
            </span>
            {stats.overdueCount > 0 && (
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            )}
          </div>
          <div
            className={`text-2xl font-semibold mt-1 ${
              stats.overdueCount > 0 ? 'text-red-600' : 'text-stone-900'
            }`}
          >
            {stats.overdueCount}
          </div>
          <div className="text-[11px] text-stone-400 mt-1">
            {stats.overdueCount > 0 ? 'Requires team attention' : 'All deadlines on track'}
          </div>
        </div>
      </div>

      {/* Main Grid: Pipeline Meter & Action Center */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pipeline Distribution Meter (2 cols) */}
        <div className="lg:col-span-2 bg-white border border-gh-border rounded-lg p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-gh-border">
              <div>
                <h2 className="text-xs font-semibold text-stone-900 uppercase tracking-wider">
                  Workflow Pipeline Health
                </h2>
                <p className="text-[11px] text-stone-400 mt-0.5">
                  Real-time status distribution across active Kanban columns
                </p>
              </div>
              <span className="badge-role">System-Wide</span>
            </div>

            {/* Segmented Visual Meter Bar */}
            <div className="mb-6">
              <div className="h-3 w-full bg-stone-100 rounded-full overflow-hidden flex">
                <div
                  style={{ width: `${toBeDonePct}%` }}
                  title={`To Be Done: ${stats.toBeDoneCount} (${toBeDonePct}%)`}
                  className="bg-slate-400 h-full transition-all duration-500"
                />
                <div
                  style={{ width: `${inProgressPct}%` }}
                  title={`In Dev: ${stats.inProgressCount} (${inProgressPct}%)`}
                  className="bg-sky-500 h-full transition-all duration-500"
                />
                <div
                  style={{ width: `${testingPct}%` }}
                  title={`Testing: ${stats.testingCount} (${testingPct}%)`}
                  className="bg-purple-500 h-full transition-all duration-500"
                />
                <div
                  style={{ width: `${productionPct}%` }}
                  title={`Production: ${stats.productionCount} (${productionPct}%)`}
                  className="bg-emerald-600 h-full transition-all duration-500"
                />
              </div>

              {/* Status Columns Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                {/* To Be Done */}
                <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/50">
                  <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-700">
                    <span className="w-2 h-2 rounded-full bg-slate-400" />
                    <span>To Be Done</span>
                  </div>
                  <div className="text-lg font-semibold text-slate-900 mt-1">
                    {stats.toBeDoneCount}
                  </div>
                  <div className="text-[10px] text-slate-400">{toBeDonePct}% of backlog</div>
                </div>

                {/* In Progress */}
                <div className="p-3 rounded-lg border border-sky-200 bg-sky-50/50">
                  <div className="flex items-center gap-1.5 text-[11px] font-medium text-sky-800">
                    <span className="w-2 h-2 rounded-full bg-sky-500" />
                    <span>In Dev</span>
                  </div>
                  <div className="text-lg font-semibold text-sky-950 mt-1">
                    {stats.inProgressCount}
                  </div>
                  <div className="text-[10px] text-sky-600/80">{inProgressPct}% active</div>
                </div>

                {/* Testing */}
                <div className="p-3 rounded-lg border border-purple-200 bg-purple-50/50">
                  <div className="flex items-center gap-1.5 text-[11px] font-medium text-purple-800">
                    <span className="w-2 h-2 rounded-full bg-purple-500" />
                    <span>QA / Testing</span>
                  </div>
                  <div className="text-lg font-semibold text-purple-950 mt-1">
                    {stats.testingCount}
                  </div>
                  <div className="text-[10px] text-purple-600/80">{testingPct}% in review</div>
                </div>

                {/* Production */}
                <div className="p-3 rounded-lg border border-emerald-200 bg-emerald-50/50">
                  <div className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-800">
                    <span className="w-2 h-2 rounded-full bg-emerald-600" />
                    <span>Production</span>
                  </div>
                  <div className="text-lg font-semibold text-emerald-950 mt-1">
                    {stats.productionCount}
                  </div>
                  <div className="text-[10px] text-emerald-600/80">{productionPct}% shipped</div>
                </div>
              </div>
            </div>

            {/* Priority Distribution Footer */}
            <div className="pt-3 border-t border-gh-border flex flex-wrap items-center justify-between gap-2 text-xs text-stone-500">
              <span className="font-medium text-stone-700">Priority Profile:</span>
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-red-500" />
                  <span>High: {stats.highPriorityCount}</span>
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  <span>Medium: {stats.mediumPriorityCount}</span>
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>Low: {stats.lowPriorityCount}</span>
                </span>
              </div>
            </div>
          </div>

          <div className="pt-3 mt-4 border-t border-gh-border text-right">
            <Link
              to="/features"
              className="text-xs font-medium text-gh-green hover:text-gh-greenDark inline-flex items-center gap-1"
            >
              <span>Explore all initiatives</span>
              <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* Action Center: Recent Activity & Urgent Items (1 col) */}
        <div className="bg-white border border-gh-border rounded-lg p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-gh-border">
              <h2 className="text-xs font-semibold text-stone-900 uppercase tracking-wider">
                Recent Updates
              </h2>
              <span className="text-[10px] font-medium text-stone-500 bg-stone-100 px-2 py-0.5 rounded">
                Live Feed
              </span>
            </div>

            {!stats.recentActivity || stats.recentActivity.length === 0 ? (
              <div className="py-12 text-center text-stone-400">
                <Layers className="w-8 h-8 text-stone-300 mx-auto mb-2" />
                <p className="text-xs font-medium text-stone-600">No recent module activity</p>
                <p className="text-[11px] text-stone-400 mt-0.5">
                  Updates will stream here as engineers work on tasks.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5 overflow-y-auto max-h-72 pr-1">
                {(stats.recentActivity || []).map((item) => (
                  <div
                    key={item.moduleId}
                    onClick={() => item.projectId && onNavigate(item.projectId)}
                    className="p-3 rounded-lg border border-stone-100 bg-[#FAFAF9] hover:bg-stone-100/70 cursor-pointer transition-colors group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-stone-900 truncate group-hover:text-gh-green transition-colors">
                          {item.title}
                        </div>
                        <div className="text-[10px] text-stone-400 flex items-center gap-1.5 mt-0.5">
                          <span>{item.projectName}</span>
                          <span>•</span>
                          <span>{item.versionLabel}</span>
                        </div>
                      </div>
                      <span
                        className={`text-[9px] font-medium px-1.5 py-0.5 rounded shrink-0 uppercase ${
                          item.priority === 'high'
                            ? 'bg-red-50 text-red-700 border border-red-200/60'
                            : item.priority === 'medium'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200/60'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                        }`}
                      >
                        {item.priority}
                      </span>
                    </div>

                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-stone-200/40 text-[10px] text-stone-400">
                      <span className="flex items-center gap-1">
                        <span className="w-4 h-4 rounded-full bg-stone-200 text-stone-700 font-bold text-[9px] flex items-center justify-center">
                          {getAvatarInitials(item.assignedTo || '?')}
                        </span>
                        <span className="truncate max-w-[80px]">
                          {item.assignedTo || 'Unassigned'}
                        </span>
                      </span>
                      {item.dueDate ? (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-stone-400" />
                          <span>{item.dueDate}</span>
                        </span>
                      ) : (
                        <span>No due date</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-3 mt-3 border-t border-gh-border text-right">
            <Link
              to="/analytics"
              className="text-xs font-medium text-gh-green hover:text-gh-greenDark inline-flex items-center gap-1"
            >
              <span>View full analytics studio</span>
              <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * ── Developer Personal Content View ──────────────────────────────────────────
 */
function DevDashboardContent({ stats, onNavigate }) {
  const total = stats.myAssignedModulesCount || 0
  const myCompletedPct = total ? Math.round((stats.myCompleted / total) * 100) : 0

  return (
    <div className="space-y-6">
      {/* Dev 4-KPI Strip */}
      <div className="bg-white border border-gh-border rounded-lg grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x divide-gh-border">
        {/* My Total Assigned */}
        <div className="p-5">
          <div className="text-[11px] font-medium uppercase tracking-wider text-stone-400">
            My Queue
          </div>
          <div className="text-2xl font-semibold text-stone-900 mt-1">
            {stats.myAssignedModulesCount}
          </div>
          <div className="text-[11px] text-stone-400 mt-1">
            Across {stats.myProjectsCount} active projects
          </div>
        </div>

        {/* In Active Progress */}
        <div className="p-5">
          <div className="text-[11px] font-medium uppercase tracking-wider text-stone-400">
            Work In Progress
          </div>
          <div className="text-2xl font-semibold text-sky-800 mt-1">
            {stats.myInProgress + stats.myTesting}
          </div>
          <div className="text-[11px] text-stone-400 mt-1">
            {stats.myInProgress} in dev, {stats.myTesting} in QA
          </div>
        </div>

        {/* My Completion Rate */}
        <div className="p-5">
          <div className="text-[11px] font-medium uppercase tracking-wider text-stone-400">
            My Completion
          </div>
          <div className="text-2xl font-semibold text-emerald-800 mt-1">
            {myCompletedPct}%
          </div>
          <div className="text-[11px] text-stone-400 mt-1">
            {stats.myCompleted} modules delivered
          </div>
        </div>

        {/* Subtask Execution */}
        <div className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium uppercase tracking-wider text-stone-400">
              Subtasks
            </span>
            <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
              {stats.mySubtaskProgress}%
            </span>
          </div>
          <div className="text-2xl font-semibold text-stone-900 mt-1">
            {stats.myCompletedSubtasks}
            <span className="text-sm font-normal text-stone-400"> / {stats.myTotalSubtasks}</span>
          </div>
          <div className="text-[11px] text-stone-400 mt-1">Checklist items done</div>
        </div>
      </div>

      {/* Main Grid: Personal Queue Breakdown & Urgent Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Personal Pipeline (2 cols) */}
        <div className="lg:col-span-2 bg-white border border-gh-border rounded-lg p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-gh-border">
              <div>
                <h2 className="text-xs font-semibold text-stone-900 uppercase tracking-wider">
                  My Workflow Queue
                </h2>
                <p className="text-[11px] text-stone-400 mt-0.5">
                  Tasks assigned directly to you across all project boards
                </p>
              </div>
              <span className="badge-role">Personal</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-4">
              <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/50">
                <span className="text-[11px] font-medium text-slate-600">To Do</span>
                <div className="text-xl font-bold text-slate-900 mt-1">{stats.myToBeDone}</div>
              </div>
              <div className="p-3.5 rounded-lg border border-sky-200 bg-sky-50/50">
                <span className="text-[11px] font-medium text-sky-700">In Dev</span>
                <div className="text-xl font-bold text-sky-900 mt-1">{stats.myInProgress}</div>
              </div>
              <div className="p-3.5 rounded-lg border border-purple-200 bg-purple-50/50">
                <span className="text-[11px] font-medium text-purple-700">In Testing</span>
                <div className="text-xl font-bold text-purple-900 mt-1">{stats.myTesting}</div>
              </div>
              <div className="p-3.5 rounded-lg border border-emerald-200 bg-emerald-50/50">
                <span className="text-[11px] font-medium text-emerald-700">Completed</span>
                <div className="text-xl font-bold text-emerald-900 mt-1">{stats.myCompleted}</div>
              </div>
            </div>

            {stats.myOverdueCount > 0 && (
              <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                <span>
                  You have <strong>{stats.myOverdueCount}</strong> overdue module(s) requiring
                  immediate attention.
                </span>
              </div>
            )}
          </div>

          <div className="pt-3 mt-4 border-t border-gh-border text-right">
            <Link
              to="/features"
              className="text-xs font-medium text-gh-green hover:text-gh-greenDark inline-flex items-center gap-1"
            >
              <span>View my project boards</span>
              <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* Action Center: Upcoming Deadlines (1 col) */}
        <div className="bg-white border border-gh-border rounded-lg p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-gh-border">
              <h2 className="text-xs font-semibold text-stone-900 uppercase tracking-wider">
                Upcoming Deadlines
              </h2>
              <span className="text-[10px] font-medium text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                Next In Line
              </span>
            </div>

            {!stats.myUpcomingDeadlines || stats.myUpcomingDeadlines.length === 0 ? (
              <div className="py-12 text-center text-stone-400">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                <p className="text-xs font-medium text-stone-600">No urgent deadlines</p>
                <p className="text-[11px] text-stone-400 mt-0.5">
                  You are all caught up on your scheduled delivery targets.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5 overflow-y-auto max-h-72 pr-1">
                {(stats.myUpcomingDeadlines || []).map((item) => (
                  <div
                    key={item.moduleId}
                    onClick={() => item.projectId && onNavigate(item.projectId)}
                    className="p-3 rounded-lg border border-stone-100 bg-[#FAFAF9] hover:bg-stone-100/70 cursor-pointer transition-colors group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-stone-900 truncate group-hover:text-gh-green transition-colors">
                          {item.title}
                        </div>
                        <div className="text-[10px] text-stone-400 mt-0.5">
                          {item.projectName} • {item.versionLabel}
                        </div>
                      </div>
                      <span className="text-[9px] font-medium text-stone-700 bg-stone-100 px-1.5 py-0.5 rounded uppercase">
                        {item.status}
                      </span>
                    </div>

                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-stone-200/40 text-[10px]">
                      <span className="flex items-center gap-1 text-stone-500">
                        <Calendar className="w-3 h-3 text-stone-400" />
                        <span>Due: {item.dueDate || 'Flexible'}</span>
                      </span>
                      <span className="font-medium text-gh-green group-hover:underline">
                        Open Board →
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-3 mt-3 border-t border-gh-border text-right">
            <Link
              to="/features"
              className="text-xs font-medium text-gh-green hover:text-gh-greenDark inline-flex items-center gap-1"
            >
              <span>Go to Kanban</span>
              <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
