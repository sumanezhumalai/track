import api from './axios'

/**
 * Fetch role-aware dashboard statistics for Features & Modules.
 * Returns { isAdmin, adminStats, devStats }
 */
export async function fetchDashboardStats() {
  const res = await api.get('/kanban/dashboard/stats')
  return res.data
}

/**
 * Fetch 4-tier deep modules analytics with multi-dimensional filters.
 * Admin only.
 * @param {Object} filters
 * @param {number|string} [filters.projectId]
 * @param {number|string} [filters.versionId]
 * @param {string} [filters.devName]
 * @param {string} [filters.status]
 * @param {string} [filters.priority]
 * @param {string} [filters.from] - YYYY-MM-DD
 * @param {string} [filters.to]   - YYYY-MM-DD
 */
export async function fetchModuleAnalytics(filters = {}) {
  const params = new URLSearchParams()

  if (filters.projectId) params.append('projectId', filters.projectId)
  if (filters.versionId) params.append('versionId', filters.versionId)
  if (filters.devName) params.append('devName', filters.devName)
  if (filters.status) params.append('status', filters.status)
  if (filters.priority) params.append('priority', filters.priority)
  if (filters.from) params.append('from', `${filters.from}T00:00:00`)
  if (filters.to) params.append('to', `${filters.to}T23:59:59`)

  const qs = params.toString()
  const url = qs ? `/analytics/modules?${qs}` : '/analytics/modules'
  const res = await api.get(url)
  return res.data
}

/**
 * Fetch all projects (for filter dropdowns).
 */
export async function fetchProjects() {
  try {
    const res = await api.get('/kanban/projects')
    return Array.isArray(res.data) ? res.data : []
  } catch {
    return []
  }
}

/**
 * Fetch versions for a specific project.
 */
export async function fetchProjectVersions(projectId) {
  if (!projectId) return []
  try {
    const res = await api.get(`/kanban/projects/${projectId}/versions`)
    return Array.isArray(res.data) ? res.data : []
  } catch {
    return []
  }
}

/**
 * Fetch devSupport users (for assignee filter dropdown).
 */
export async function fetchDevSupportUsers() {
  try {
    const res = await api.get('/users/dev')
    return Array.isArray(res.data) ? res.data : []
  } catch {
    return []
  }
}
