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

export function groupTasksByStatus(tasks, columns, users) {
  const grouped = Object.fromEntries(columns.map(column => [column.id, []]))

  tasks.forEach(task => {
    const assignees = (task.assigneeIds || [])
      .map(id => users.find(user => user.id === id))
      .filter(Boolean)

    const enriched = {
      ...task,
      assignees
    }

    ;(grouped[task.status] ||= []).push(enriched)
  })

  return grouped
}
