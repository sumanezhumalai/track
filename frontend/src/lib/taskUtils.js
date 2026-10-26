// Shared utility functions for task management

export function getPriorityColor(priority) {
  switch (priority) {
    case 'high':
      return 'bg-rose-500'
    case 'medium':
      return 'bg-amber-500'
    case 'low':
      return 'bg-slate-400'
    default:
      return 'bg-slate-400'
  }
}

export function getPriorityStyles(priority) {
  const styles = {
    low: 'border-stone-200/90 bg-stone-100/90 text-stone-600',
    medium: 'border-[#EADCC8] bg-[#FAF5EB] text-[#8C5D1E]',
    high: 'border-[#F1D0D0] bg-[#FAF0F0] text-[#9E2B2B]',
  }
  return styles[priority] || styles.low
}

export function calculateProgress(subtasks = []) {
  if (subtasks.length === 0) return 0
  const completed = subtasks.filter(st => st.completed).length
  return Math.round((completed / subtasks.length) * 100)
}

/**
 * Formats a Date or ISO date string using native Intl/toLocaleDateString.
 * Default style: "Oct 26, 2026"
 */
export function formatDate(dateInput, fallback = '') {
  if (!dateInput) return fallback
  const d = dateInput instanceof Date ? dateInput : new Date(dateInput)
  if (isNaN(d.getTime())) return fallback
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

/**
 * Converts a Date or date string to local "YYYY-MM-DD" format for backend APIs.
 */
export function toDateString(dateInput) {
  if (!dateInput) return null
  const d = dateInput instanceof Date ? dateInput : new Date(dateInput)
  if (isNaN(d.getTime())) return null
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
