import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  Kanban,
  KanbanBoard as KanbanBoardUI,
  KanbanColumn,
  KanbanColumnContent,
  KanbanItem,
  KanbanItemHandle,
  KanbanOverlay,
} from '@/components/ui/kanban'
import TaskDetailSheet from '@/components/kanban/TaskDetailSheet'
import KanbanHeader from '@/components/kanban/KanbanHeader'
import NewModuleForm from '@/components/kanban/NewModuleForm'
import { cn } from '@/lib/utils'
import { getPriorityStyles, calculateProgress } from '@/lib/taskUtils'
import { CalendarClockIcon, Loader2Icon, AlertCircleIcon, ListTodo } from 'lucide-react'
import api from '@/api/axios'
import { getAvatarInitials, getAvatarColorClass, normalizeUserData } from '@/lib/avatar'
import ErrorBoundary from '@/components/ErrorBoundary'

// Static column config — not from DB (as per KANBAN_UI_NOTES)
const COLUMN_CONFIG = {
  ToBeDone: {
    id: 'ToBeDone',
    title: 'To Be Done',
    eyebrow: 'Backlog',
    dot: 'bg-sky-500',
    accent: 'from-sky-500/20 via-sky-500/5 to-transparent',
    order: 0,
  },
  start: {
    id: 'start',
    title: 'Start',
    eyebrow: 'In Progress',
    dot: 'bg-amber-500',
    accent: 'from-amber-600/20 via-amber-600/5 to-transparent',
    order: 1,
  },
  testing: {
    id: 'testing',
    title: 'Reviews',
    eyebrow: 'Testing',
    dot: 'bg-violet-500',
    accent: 'from-violet-500/20 via-violet-500/5 to-transparent',
    order: 2,
  },
  production: {
    id: 'production',
    title: 'Inflight',
    eyebrow: 'Production',
    dot: 'bg-green-600',
    accent: 'from-green-600/20 via-green-600/5 to-transparent',
    order: 3,
  },
}

const COLUMNS = Object.values(COLUMN_CONFIG).sort((a, b) => a.order - b.order)

// Enrich board modules: map moduleId→string id, enrich assignees with display info
function enrichModules(columns, userMap) {
  const tasksByStatus = { ToBeDone: [], start: [], testing: [], production: [] }
  Object.entries(columns).forEach(([status, modules]) => {
    if (!tasksByStatus[status]) return
    tasksByStatus[status] = [...modules]
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
      .map(m => {
        const devNames = m.assigneeDevNames ?? []
        const assignees = devNames.map(devName => userMap[devName] || normalizeUserData(devName))
        return {
          ...m,
          id: String(m.moduleId),          // dnd-kit requires string IDs
          assignees,
          subtasks: (m.subtasks ?? []).map(st => ({
            ...st,
            id: String(st.subtaskId ?? st.id),
          })),
        }
      })
  })
  return tasksByStatus
}

// ─────────────────────────── TaskCard ───────────────────────────
function TaskCard({ task, isOverlay, onTaskClick, isHighlighted, ...props }) {
  const assignees = task.assignees ?? []
  const subtasks = task.subtasks ?? []
  const hasSubtasks = subtasks.length > 0
  const completedSubtasks = subtasks.filter(st => st.completed).length
  const progress = calculateProgress(subtasks)

  const cardContent = (
    <div
      className={cn(
        'bg-card text-card-foreground relative overflow-hidden rounded-lg border p-3 shadow-xs transition-all duration-300',
        !isOverlay && 'hover:shadow-sm hover:border-stone-300/80 cursor-pointer',
        isHighlighted && 'ring-2 ring-emerald-500/70 bg-emerald-50/20 shadow-sm'
      )}
      onClick={() => !isOverlay && onTaskClick?.(task)}
    >
      <div className='space-y-2.5'>
        <div className='flex items-start justify-between gap-2'>
          <div className='min-w-0 flex-1'>
            <h3 className='line-clamp-2 text-sm leading-snug font-medium tracking-tight text-foreground'>
              {task.title}
            </h3>
          </div>
          <span
            className={cn(
              'rounded-full border px-2 py-0.5 text-[10px] leading-3 font-semibold capitalize shrink-0',
              getPriorityStyles(task.priority)
            )}
          >
            {task.priority}
          </span>
        </div>

        {task.description && (
          <p className='text-muted-foreground line-clamp-2 text-xs leading-relaxed'>{task.description}</p>
        )}

        {/* Elegant Micro-Progress Bar (only rendered when module has subtasks) */}
        {hasSubtasks && (
          <div className='space-y-1.5 pt-0.5'>
            <div className='flex items-center justify-between text-[10px] text-stone-500 font-mono'>
              <span className='inline-flex items-center gap-1 text-stone-500'>
                <ListTodo className='size-3 text-stone-400' />
                <span>{completedSubtasks}/{subtasks.length}</span>
              </span>
              <span className='font-medium text-stone-400'>{progress}%</span>
            </div>
            <div
              className='relative h-[2.5px] w-full overflow-hidden rounded-full bg-stone-100 border border-stone-200/50'
              role='progressbar'
              aria-valuenow={progress}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label='Subtask progress'
            >
              <div
                className={cn(
                  'absolute inset-y-0 left-0 rounded-full transition-all duration-500 ease-out',
                  progress === 100 ? 'bg-emerald-600' : 'bg-gh-green'
                )}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        <div className='flex items-center justify-between gap-2 pt-0.5'>
          {assignees.length > 0 ? (
            <div className='flex min-w-0 items-center gap-1.5'>
              <div className='flex -space-x-1 shrink-0'>
                {assignees.slice(0, 3).map(assignee => (
                  <Avatar key={assignee.id || assignee.name} className='size-5.5 ring-1.5 ring-white shadow-2xs' title={assignee.name}>
                    <AvatarImage src={assignee.avatar} alt={assignee.name} />
                    <AvatarFallback className={cn('text-[9px] font-semibold tracking-tighter', getAvatarColorClass(assignee.name))}>
                      {assignee.initials || getAvatarInitials(assignee.name)}
                    </AvatarFallback>
                  </Avatar>
                ))}
              </div>
              <span className='text-muted-foreground truncate text-[11px] font-normal'>
                {assignees.length === 1 ? assignees[0].name : `${assignees[0].name} +${assignees.length - 1}`}
              </span>
            </div>
          ) : (
            <span className='text-muted-foreground text-[11px] font-normal'>Unassigned</span>
          )}
          {task.dueDate && (
            <time className='text-muted-foreground flex shrink-0 items-center gap-1 text-[11px] whitespace-nowrap tabular-nums ml-auto'>
              <CalendarClockIcon className='size-3 opacity-70' />
              {new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </time>
          )}
        </div>
      </div>
    </div>
  )

  return (
    <KanbanItem value={task.id} {...props}>
      {isOverlay ? cardContent : <KanbanItemHandle>{cardContent}</KanbanItemHandle>}
    </KanbanItem>
  )
}

// ─────────────────────────── TaskColumn ───────────────────────────
function TaskColumn({ value, column, tasks, isOverlay, onTaskClick, highlightedTaskId, isFiltered, ...props }) {
  return (
    <KanbanColumn value={value} className='flex-1 min-w-[260px] max-w-[420px]' {...props}>
      <div className='bg-muted/40 flex flex-col rounded-xl border p-2.5 shadow-2xs flex-1'>
        <div className={cn('mb-2 rounded-lg bg-gradient-to-r p-3', column.accent)}>
          <div className='flex items-start justify-between gap-2'>
            <div className='space-y-1 min-w-0'>
              <div className='text-muted-foreground flex items-center gap-2 text-[11px] font-semibold tracking-wider uppercase truncate'>
                <span className={cn('size-2 rounded-full shrink-0', column.dot)} />
                <span className='truncate'>{column.eyebrow}</span>
              </div>
              <div className='flex items-center gap-2'>
                <h2 className='text-sm font-semibold truncate'>{column.title}</h2>
                <span className='text-xs px-1.5 py-0 font-medium rounded border border-border bg-background'>{tasks.length}</span>
              </div>
            </div>
          </div>
        </div>
        <KanbanColumnContent value={value} className='min-h-[420px] gap-2.5 flex-1 pr-0.5'>
          {tasks.length === 0 ? (
            <div className='h-32 border border-dashed border-stone-200/80 rounded-lg flex flex-col items-center justify-center text-center p-4 bg-white/40 select-none'>
              <p className='text-xs font-medium text-stone-400'>No modules</p>
              <p className='text-[10px] text-stone-300 mt-0.5'>
                {isFiltered ? 'No modules match active filter' : 'Drag modules here'}
              </p>
            </div>
          ) : (
            tasks.map(task => (
              <TaskCard
                key={task.id}
                task={task}
                isOverlay={isOverlay}
                onTaskClick={onTaskClick}
                isHighlighted={task.id === highlightedTaskId}
              />
            ))
          )}
        </KanbanColumnContent>
      </div>
    </KanbanColumn>
  )
}

// ─────────────────────────── KanbanBoard (main) ───────────────────────────
export default function KanbanBoard({
  projectId,
  isAdmin = false,
  onBack,
}) {
  const [boardData, setBoardData] = useState(null)   // raw KanbanBoardResponse
  const [tasksByStatus, setTasksByStatus] = useState({ ToBeDone: [], start: [], testing: [], production: [] })
  const [projectMembers, setProjectMembers] = useState([])  // enriched member list
  const [allUsers, setAllUsers] = useState([])              // all dev users (admin only)
  const [userMap, setUserMap] = useState({})               // devName → user info
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeVersionId, setActiveVersionId] = useState(null)
  const [selectedTask, setSelectedTask] = useState(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [isNewModuleOpen, setIsNewModuleOpen] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [highlightedTaskId, setHighlightedTaskId] = useState(null)
  const [selectedMemberDevNames, setSelectedMemberDevNames] = useState([])

  const handleToggleMemberFilter = useCallback((devName, isMulti) => {
    setSelectedMemberDevNames(prev => {
      if (isMulti) {
        return prev.includes(devName)
          ? prev.filter(n => n !== devName)
          : [...prev, devName]
      } else {
        return prev.length === 1 && prev[0] === devName ? [] : [devName]
      }
    })
  }, [])

  const handleClearMemberFilter = useCallback(() => {
    setSelectedMemberDevNames([])
  }, [])

  const isFilterActive = selectedMemberDevNames.length > 0

  const displayedTasksByStatus = useMemo(() => {
    if (!isFilterActive) return tasksByStatus
    const filtered = {}
    Object.keys(tasksByStatus).forEach(status => {
      filtered[status] = (tasksByStatus[status] || []).filter(task => {
        const assignees = task.assigneeDevNames ?? []
        return assignees.some(name => selectedMemberDevNames.includes(name))
      })
    })
    return filtered
  }, [tasksByStatus, isFilterActive, selectedMemberDevNames])

  // Keep refs for active states in intervals & callbacks without stale closures
  const tasksByStatusRef = useRef(tasksByStatus)
  const isDraggingRef = useRef(false)
  const activeVersionIdRef = useRef(activeVersionId)
  const selectedTaskRef = useRef(selectedTask)
  const userMapRef = useRef(userMap)

  useEffect(() => {
    tasksByStatusRef.current = tasksByStatus
  }, [tasksByStatus])

  useEffect(() => {
    activeVersionIdRef.current = activeVersionId
  }, [activeVersionId])

  useEffect(() => {
    selectedTaskRef.current = selectedTask
  }, [selectedTask])

  useEffect(() => {
    userMapRef.current = userMap
  }, [userMap])

  const loadBoard = useCallback(async (pid, vId, { silent = false } = {}) => {
    if (!silent) {
      setLoading(true)
    }
    setError(null)
    try {
      const targetVersionId = vId !== undefined && vId !== null ? vId : activeVersionIdRef.current
      const params = targetVersionId ? `?versionId=${targetVersionId}` : ''
      const boardRes = await api.get(`/kanban/projects/${pid}/board${params}`)
      const board = boardRes.data

      // Try to get full user list (admin) for enrichment
      let uMap = userMapRef.current || {}
      let enrichedDevUsers = []
      try {
        const usersRes = await api.get('/users/dev')
        const rawUsers = usersRes.data || []
        enrichedDevUsers = rawUsers.map(normalizeUserData)
        uMap = Object.fromEntries(enrichedDevUsers.map(u => [u.devName, u]))
        userMapRef.current = uMap
      } catch {
        // Dev user — 403 is expected, use existing userMap or initials
      }

      // Build project members list from board response memberDevNames
      const memberDevNames = board.memberDevNames ?? []
      const enrichedMembers = memberDevNames.map(devName => uMap[devName] || normalizeUserData(devName))

      const enriched = enrichModules(board.columns ?? {}, uMap)

      setBoardData(board)
      setTasksByStatus(enriched)
      setProjectMembers(enrichedMembers)
      if (enrichedDevUsers.length > 0) {
        setAllUsers(enrichedDevUsers)
        setUserMap(uMap)
      }
      setActiveVersionId(board.versionId)
      activeVersionIdRef.current = board.versionId

      // Keep open TaskDetailSheet in sync with latest server state
      if (selectedTaskRef.current) {
        const curId = String(selectedTaskRef.current.moduleId || selectedTaskRef.current.id)
        const updatedSelected = Object.values(enriched).flat().find(t => t.id === curId)
        if (updatedSelected) {
          setSelectedTask(updatedSelected)
        }
      }
    } catch (err) {
      if (!silent) {
        setError(err.response?.data?.message || 'Could not load board data.')
      }
    } finally {
      if (!silent) {
        setLoading(false)
      }
    }
  }, [])

  const syncBoardSilently = useCallback((vId) => {
    if (!projectId) return
    loadBoard(projectId, vId !== undefined && vId !== null ? vId : activeVersionIdRef.current, { silent: true })
  }, [projectId, loadBoard])

  // Initial load on projectId change
  useEffect(() => {
    if (projectId) loadBoard(projectId, null)
  }, [projectId, loadBoard])

  // Periodic 4-second background refresh with visibility awareness (silent, non-blinking)
  useEffect(() => {
    if (!projectId) return

    const poll = () => {
      if (document.hidden) return
      if (isDraggingRef.current) return
      loadBoard(projectId, activeVersionIdRef.current, { silent: true })
    }

    const intervalId = setInterval(poll, 4000)

    // Immediate sync when user switches back to this tab or window
    const handleVisibilityOrFocus = () => {
      if (!document.hidden && !isDraggingRef.current) {
        loadBoard(projectId, activeVersionIdRef.current, { silent: true })
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityOrFocus)
    window.addEventListener('focus', handleVisibilityOrFocus)

    return () => {
      clearInterval(intervalId)
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus)
      window.removeEventListener('focus', handleVisibilityOrFocus)
    }
  }, [projectId, loadBoard])

  const handleVersionChange = (version) => {
    loadBoard(projectId, version.versionId)
  }

  const handleMove = useCallback(async ({ event, activeContainer, activeIndex, overContainer, overIndex }) => {
    const cols = tasksByStatusRef.current
    const activeId = event?.active?.id ? String(event.active.id) : null
    const movedTask = activeId
      ? Object.values(cols).flat().find(t => String(t.id) === activeId)
      : cols[activeContainer]?.[activeIndex]
    if (!movedTask) return

    const realActiveIndex = cols[activeContainer]?.findIndex(t => String(t.id) === String(movedTask.id))
    if (realActiveIndex === undefined || realActiveIndex === -1) return

    // Optimistic update
    if (activeContainer === overContainer) {
      // Same-column reorder
      const newItems = [...cols[activeContainer]]
      const [item] = newItems.splice(realActiveIndex, 1)

      const overId = event?.over?.id ? String(event.over.id) : null
      let targetIndex = newItems.length
      if (overId && overId !== overContainer) {
        const foundIdx = newItems.findIndex(t => String(t.id) === overId)
        if (foundIdx !== -1) targetIndex = foundIdx
      } else if (overIndex !== undefined && overIndex >= 0 && overIndex <= newItems.length) {
        targetIndex = Math.min(overIndex, newItems.length)
      }

      newItems.splice(targetIndex, 0, item)
      setTasksByStatus(prev => ({ ...prev, [activeContainer]: newItems }))

      // Persist: POST /reorder
      try {
        await api.post('/kanban/modules/reorder', {
          versionId: activeVersionIdRef.current,
          status: activeContainer,
          orderedModuleIds: newItems.map(t => parseInt(t.id, 10)),
        })
        syncBoardSilently()
      } catch (err) {
        console.error('Reorder failed:', err)
        // Revert
        setTasksByStatus(prev => ({ ...prev, [activeContainer]: cols[activeContainer] }))
      }
    } else {
      // Cross-column move: update status in item to prevent stale rollback
      const newActiveItems = [...(cols[activeContainer] || [])]
      const newOverItems = [...(cols[overContainer] || [])]
      const [item] = newActiveItems.splice(realActiveIndex, 1)
      const updatedItem = { ...item, status: overContainer }

      const overId = event?.over?.id ? String(event.over.id) : null
      let targetIndex = newOverItems.length
      if (overId && overId !== overContainer) {
        const foundIdx = newOverItems.findIndex(t => String(t.id) === overId)
        if (foundIdx !== -1) targetIndex = foundIdx
      } else if (overIndex !== undefined && overIndex >= 0 && overIndex <= newOverItems.length) {
        targetIndex = Math.min(overIndex, newOverItems.length)
      }

      newOverItems.splice(targetIndex, 0, updatedItem)

      setTasksByStatus(prev => ({
        ...prev,
        [activeContainer]: newActiveItems,
        [overContainer]: newOverItems,
      }))

      // Persist: PATCH /move + reorder BOTH columns
      try {
        await api.patch(`/kanban/modules/${movedTask.id}/move`, {
          status: overContainer,
          position: targetIndex,
        })
        const reorderPromises = []
        if (newActiveItems.length > 0) {
          reorderPromises.push(
            api.post('/kanban/modules/reorder', {
              versionId: activeVersionIdRef.current,
              status: activeContainer,
              orderedModuleIds: newActiveItems.map(t => parseInt(t.id, 10)),
            })
          )
        }
        if (newOverItems.length > 0) {
          reorderPromises.push(
            api.post('/kanban/modules/reorder', {
              versionId: activeVersionIdRef.current,
              status: overContainer,
              orderedModuleIds: newOverItems.map(t => parseInt(t.id, 10)),
            })
          )
        }
        await Promise.all(reorderPromises)
        syncBoardSilently()
      } catch (err) {
        console.error('Move failed:', err)
        // Revert
        setTasksByStatus(prev => ({
          ...prev,
          [activeContainer]: cols[activeContainer],
          [overContainer]: cols[overContainer],
        }))
      }
    }
  }, [syncBoardSilently])

  const handleTaskClick = (task) => {
    setSelectedTask(task)
    setIsDetailOpen(true)
  }

  const handleRefresh = async () => {
    if (isRefreshing || loading) return
    setIsRefreshing(true)
    try {
      await loadBoard(projectId, activeVersionIdRef.current, { silent: true })
    } finally {
      setIsRefreshing(false)
    }
  }

  // Called when TaskDetailSheet updates a task (status change, subtask toggle, edit)
  const handleTaskUpdate = (updatedTask, options = {}) => {
    const updatedId = String(updatedTask.moduleId || updatedTask.id)
    if (options.highlight !== false) {
      setHighlightedTaskId(updatedId)
      setTimeout(() => setHighlightedTaskId(null), 1800)
    }

    setTasksByStatus(prev => {
      const newState = { ...prev }
      const targetCol = updatedTask.status || selectedTask?.status || 'ToBeDone'

      const enrichedTask = {
        ...updatedTask,
        id: updatedId,
        status: targetCol,
        assignees: (updatedTask.assigneeDevNames ?? selectedTask?.assigneeDevNames ?? []).map(devName => {
          return userMap[devName] || normalizeUserData(devName)
        }),
        subtasks: (updatedTask.subtasks ?? []).map(st => ({ ...st, id: String(st.subtaskId ?? st.id) })),
      }

      // Check if task currently exists in targetCol
      const existingCol = Object.keys(newState).find(colId =>
        (newState[colId] || []).some(t => t.id === updatedId)
      )

      if (existingCol === targetCol) {
        // In-place replacement preserving exact position!
        newState[targetCol] = (newState[targetCol] || []).map(t =>
          t.id === updatedId ? { ...t, ...enrichedTask } : t
        )
      } else {
        // Remove from old column if different, insert into new column
        if (existingCol) {
          newState[existingCol] = (newState[existingCol] || []).filter(t => t.id !== updatedId)
        }
        newState[targetCol] = [enrichedTask, ...(newState[targetCol] || [])]
      }

      return newState
    })

    // Keep detail sheet task in sync
    if (selectedTask?.id === updatedId || selectedTask?.moduleId === updatedTask.moduleId) {
      setSelectedTask(prev => ({ ...prev, ...updatedTask, id: updatedId }))
    }

    // Action-wise silent sync with server
    syncBoardSilently()
  }

  // Called when admin deletes a task from detail sheet
  const handleTaskDelete = (taskId) => {
    setTasksByStatus(prev => {
      const newState = { ...prev }
      COLUMNS.forEach(col => {
        newState[col.id] = (newState[col.id] || []).filter(t => t.id !== String(taskId))
      })
      return newState
    })
    setIsDetailOpen(false)
    setSelectedTask(null)
    syncBoardSilently()
  }

  // Called when admin creates a new module
  const handleModuleCreated = (newModule) => {
    const enrichedTask = {
      ...newModule,
      id: String(newModule.moduleId),
      assignees: (newModule.assigneeDevNames ?? []).map(devName => {
        return userMap[devName] || normalizeUserData(devName)
      }),
      subtasks: (newModule.subtasks ?? []).map(st => ({ ...st, id: String(st.subtaskId ?? st.id) })),
    }
    const status = enrichedTask.status || 'ToBeDone'
    setTasksByStatus(prev => ({
      ...prev,
      [status]: [enrichedTask, ...(prev[status] || [])],
    }))
    syncBoardSilently()
  }

  const handleAddMember = async (user) => {
    try {
      const devName = user.devName || user.name
      if (!devName) return
      await api.post(`/kanban/projects/${projectId}/members`, {
        devName,
      })
      const normalized = userMap[devName] || normalizeUserData(user)
      setProjectMembers(prev =>
        prev.some(m => (m.devName || m.name) === devName) ? prev : [...prev, normalized]
      )
      syncBoardSilently()
    } catch (err) {
      console.error('Failed to add member:', err)
    }
  }

  // ── Loading state ────────────────────────────────────────────────
  if (loading) {
    return (
      <div className='flex h-full items-center justify-center'>
        <Loader2Icon className='size-6 animate-spin text-muted-foreground' />
      </div>
    )
  }

  if (error) {
    return (
      <div className='flex h-full items-center justify-center px-6'>
        <div className='max-w-sm space-y-3 rounded-lg border bg-card p-6 text-center'>
          <AlertCircleIcon className='size-8 text-muted-foreground mx-auto' />
          <p className='text-sm font-medium'>Unable to load board</p>
          <p className='text-muted-foreground text-xs'>{error}</p>
          <Button size='sm' onClick={() => loadBoard(projectId, activeVersionId)}>
            Retry
          </Button>
        </div>
      </div>
    )
  }

  // Build project object for header (matches KanbanBoardResponse shape)
  const project = boardData ? {
    projectId: boardData.projectId,
    projectName: boardData.projectName,
    allVersions: boardData.allVersions ?? [],
  } : null

  const activeVersion = boardData?.allVersions?.find(v => v.versionId === activeVersionId)

  return (
    <div className='h-full w-full flex flex-col bg-background'>
      <KanbanHeader
        project={project}
        activeVersion={activeVersion}
        members={projectMembers}
        users={allUsers.length > 0 ? allUsers : projectMembers}
        onAddMember={handleAddMember}
        onNewModule={() => setIsNewModuleOpen(true)}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
        onBack={onBack}
        onVersionChange={handleVersionChange}
        isAdmin={isAdmin}
        selectedMemberDevNames={selectedMemberDevNames}
        onToggleMemberFilter={handleToggleMemberFilter}
        onClearMemberFilter={handleClearMemberFilter}
      />

      <div className='flex-1 overflow-x-auto overflow-y-auto px-6 py-6 min-h-0'>
        <Kanban
          value={displayedTasksByStatus}
          onValueChange={setTasksByStatus}
          getItemValue={item => item.id}
          onMove={handleMove}
          onDragStart={() => { isDraggingRef.current = true }}
          onDragEnd={() => { isDraggingRef.current = false }}
          className='min-h-full flex flex-col'
        >
          <KanbanBoardUI className='min-h-full flex-1 flex flex-row flex-nowrap items-stretch gap-4 min-w-full pb-6'>
            {COLUMNS.map(column => (
              <TaskColumn
                key={column.id}
                value={column.id}
                column={column}
                tasks={displayedTasksByStatus[column.id] || []}
                onTaskClick={handleTaskClick}
                highlightedTaskId={highlightedTaskId}
                isFiltered={isFilterActive}
              />
            ))}
          </KanbanBoardUI>
          <KanbanOverlay>
            {({ value, variant }) => {
              const activeValue = String(value)
              const column = COLUMN_CONFIG[activeValue]

              if (variant === 'column' && column) {
                return (
                  <TaskColumn
                    value={activeValue}
                    column={column}
                    tasks={displayedTasksByStatus[activeValue] || []}
                    isOverlay
                    isFiltered={isFilterActive}
                  />
                )
              }

              const task = Object.values(tasksByStatus).flat().find(t => t.id === activeValue)
              return task ? <TaskCard task={task} isOverlay /> : null
            }}
          </KanbanOverlay>
        </Kanban>
      </div>

      <ErrorBoundary
        title='Failed to open module details'
        onReset={() => setIsDetailOpen(false)}
      >
        <TaskDetailSheet
          open={isDetailOpen}
          onOpenChange={setIsDetailOpen}
          task={selectedTask}
          isAdmin={isAdmin}
          projectMembers={projectMembers}
          onTaskUpdate={handleTaskUpdate}
          onTaskDelete={handleTaskDelete}
        />
      </ErrorBoundary>

      {isAdmin && (
        <ErrorBoundary
          title='Failed to open module creation form'
          onReset={() => setIsNewModuleOpen(false)}
        >
          <NewModuleForm
            open={isNewModuleOpen}
            onOpenChange={setIsNewModuleOpen}
            onModuleCreated={handleModuleCreated}
            projectMembers={projectMembers}
            versionId={activeVersionId}
          />
        </ErrorBoundary>
      )}
    </div>
  )
}
