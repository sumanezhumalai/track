import { useCallback, useEffect, useRef, useState } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Kanban,
  KanbanBoard as KanbanBoardUI,
  KanbanColumn,
  KanbanColumnContent,
  KanbanColumnHandle,
  KanbanItem,
  KanbanItemHandle,
  KanbanOverlay,
} from '@/components/ui/kanban'
import TaskDetailSheet from '@/components/kanban/TaskDetailSheet'
import KanbanHeader from '@/components/kanban/KanbanHeader'
import NewModuleForm from '@/components/kanban/NewModuleForm'
import { cn } from '@/lib/utils'
import { getPriorityStyles, calculateProgress } from '@/lib/taskUtils'
import { CalendarClockIcon, GripVerticalIcon, Loader2Icon, AlertCircleIcon } from 'lucide-react'
import api from '@/api/axios'
import { getAvatarInitials, getAvatarColorClass, normalizeUserData } from '@/lib/avatar'
import ErrorBoundary from '@/components/ErrorBoundary'

// Static column config — not from DB (as per KANBAN_UI_NOTES)
const COLUMN_CONFIG = {
  start: {
    id: 'start',
    title: 'Start',
    eyebrow: 'Start',
    dot: 'bg-amber-500',
    accent: 'from-amber-600/20 via-amber-600/5 to-transparent',
    order: 0,
  },
  testing: {
    id: 'testing',
    title: 'Reviews',
    eyebrow: 'Testing',
    dot: 'bg-violet-500',
    accent: 'from-violet-500/20 via-violet-500/5 to-transparent',
    order: 1,
  },
  production: {
    id: 'production',
    title: 'Inflight',
    eyebrow: 'Production',
    dot: 'bg-green-600',
    accent: 'from-green-600/20 via-green-600/5 to-transparent',
    order: 2,
  },
}

const COLUMNS = Object.values(COLUMN_CONFIG)

// Enrich board modules: map moduleId→string id, enrich assignees with display info
function enrichModules(columns, userMap) {
  const tasksByStatus = { start: [], testing: [], production: [] }
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
  const progress = calculateProgress(task.subtasks)

  const cardContent = (
    <div
      className={cn(
        'bg-card text-card-foreground relative overflow-hidden rounded-lg border p-3 shadow-xs transition-all duration-500',
        !isOverlay && 'hover:shadow-sm cursor-pointer',
        isHighlighted && 'ring-2 ring-emerald-500/70 bg-emerald-50/20 shadow-sm'
      )}
      onClick={() => !isOverlay && onTaskClick?.(task)}
    >
      <div className='space-y-3'>
        <div className='flex items-start justify-between gap-3'>
          <div className='min-w-0 space-y-1'>
            <h3 className='line-clamp-2 text-sm leading-snug font-medium'>{task.title}</h3>
          </div>
          <span
            className={cn(
              'rounded-full border px-2 py-0.5 text-xs leading-4 font-medium capitalize shrink-0',
              getPriorityStyles(task.priority)
            )}
          >
            {task.priority}
          </span>
        </div>

        {task.description && (
          <p className='text-muted-foreground line-clamp-2 text-xs leading-relaxed'>{task.description}</p>
        )}

        {/* Progress bar */}
        <div
          className='relative h-px w-full overflow-hidden rounded-full bg-border'
          role='progressbar'
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label='Subtask progress'
        >
          <div
            className='absolute inset-y-0 left-0 rounded-full bg-foreground/80 transition-[width] duration-500 ease-out'
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className='flex items-center justify-between gap-3'>
          {assignees.length > 0 ? (
            <div className='flex min-w-0 items-center gap-2'>
              <div className='flex -space-x-2'>
                {assignees.slice(0, 3).map(assignee => (
                  <Avatar key={assignee.id || assignee.name} className='size-6 border-2 border-background' title={assignee.name}>
                    <AvatarImage src={assignee.avatar} alt={assignee.name} />
                    <AvatarFallback className={cn('text-[10px] font-semibold', getAvatarColorClass(assignee.name))}>
                      {assignee.initials || getAvatarInitials(assignee.name)}
                    </AvatarFallback>
                  </Avatar>
                ))}
              </div>
              <span className='text-muted-foreground line-clamp-1 text-xs'>
                {assignees.map(a => a.name).join(', ')}
              </span>
            </div>
          ) : (
            <span className='text-muted-foreground text-xs'>Unassigned</span>
          )}
          {task.dueDate && (
            <time className='text-muted-foreground flex shrink-0 items-center gap-1 text-xs whitespace-nowrap tabular-nums'>
              <CalendarClockIcon className='size-3' />
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
function TaskColumn({ value, column, tasks, isOverlay, onTaskClick, highlightedTaskId, ...props }) {
  return (
    <KanbanColumn value={value} {...props}>
      <div className='bg-muted/50 flex flex-col rounded-xl border p-2 shadow-xs h-full'>
        <div className={cn('mb-2 rounded-lg bg-gradient-to-r p-3', column.accent)}>
          <div className='flex items-start justify-between gap-3'>
            <div className='space-y-1'>
              <div className='text-muted-foreground flex items-center gap-2 text-xs font-medium tracking-wide uppercase'>
                <span className={cn('size-2 rounded-full', column.dot)} />
                {column.eyebrow}
              </div>
              <div className='flex items-center gap-2'>
                <h2 className='text-sm font-semibold'>{column.title}</h2>
                <Badge variant='outline'>{tasks.length}</Badge>
              </div>
            </div>
            <KanbanColumnHandle
              render={handleProps => (
                <Button {...handleProps} size='icon-xs' variant='ghost' aria-label={`Move ${column.title} column`}>
                  <GripVerticalIcon />
                </Button>
              )}
            />
          </div>
        </div>
        <KanbanColumnContent value={value} className='min-h-[420px] gap-2.5 flex-1 overflow-y-auto'>
          {tasks.map(task => (
            <TaskCard
              key={task.id}
              task={task}
              isOverlay={isOverlay}
              onTaskClick={onTaskClick}
              isHighlighted={task.id === highlightedTaskId}
            />
          ))}
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
  const [tasksByStatus, setTasksByStatus] = useState({ start: [], testing: [], production: [] })
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

  // Keep a ref to tasksByStatus for use in dnd callbacks without stale closure
  const tasksByStatusRef = useRef(tasksByStatus)
  tasksByStatusRef.current = tasksByStatus

  const loadBoard = useCallback(async (pid, vId) => {
    setLoading(true)
    setError(null)
    try {
      const params = vId ? `?versionId=${vId}` : ''
      const boardRes = await api.get(`/kanban/projects/${pid}/board${params}`)
      const board = boardRes.data

      // Try to get full user list (admin) for enrichment
      let uMap = {}
      let enrichedDevUsers = []
      try {
        const usersRes = await api.get('/users/dev')
        const rawUsers = usersRes.data || []
        enrichedDevUsers = rawUsers.map(normalizeUserData)
        uMap = Object.fromEntries(enrichedDevUsers.map(u => [u.devName, u]))
      } catch {
        // Dev user — 403 is expected, we'll use devName initials directly
      }

      // Build project members list from board response memberDevNames
      const memberDevNames = board.memberDevNames ?? []
      const enrichedMembers = memberDevNames.map(devName => uMap[devName] || normalizeUserData(devName))

      const enriched = enrichModules(board.columns ?? {}, uMap)

      setBoardData(board)
      setTasksByStatus(enriched)
      setProjectMembers(enrichedMembers)
      setAllUsers(enrichedDevUsers)
      setUserMap(uMap)
      setActiveVersionId(board.versionId)
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load board data.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (projectId) loadBoard(projectId, null)
  }, [projectId, loadBoard])

  const handleVersionChange = (version) => {
    loadBoard(projectId, version.versionId)
  }

  const handleMove = useCallback(async ({ activeContainer, activeIndex, overContainer, overIndex }) => {
    const cols = tasksByStatusRef.current
    const movedTask = cols[activeContainer]?.[activeIndex]
    if (!movedTask) return

    // Optimistic update
    if (activeContainer === overContainer) {
      // Same-column reorder
      const newItems = [...cols[activeContainer]]
      const [item] = newItems.splice(activeIndex, 1)
      newItems.splice(overIndex, 0, item)
      setTasksByStatus(prev => ({ ...prev, [activeContainer]: newItems }))

      // Persist: POST /reorder
      try {
        await api.post('/kanban/modules/reorder', {
          versionId: activeVersionId,
          status: activeContainer,
          orderedModuleIds: newItems.map(t => parseInt(t.id, 10)),
        })
      } catch (err) {
        console.error('Reorder failed:', err)
        // Revert
        setTasksByStatus(prev => ({ ...prev, [activeContainer]: cols[activeContainer] }))
      }
    } else {
      // Cross-column move
      const newActiveItems = [...(cols[activeContainer] || [])]
      const newOverItems = [...(cols[overContainer] || [])]
      const [item] = newActiveItems.splice(activeIndex, 1)
      newOverItems.splice(overIndex, 0, item)
      setTasksByStatus(prev => ({
        ...prev,
        [activeContainer]: newActiveItems,
        [overContainer]: newOverItems,
      }))

      // Persist: PATCH /move
      try {
        await api.patch(`/kanban/modules/${movedTask.id}/move`, {
          status: overContainer,
          position: overIndex,
        })
        // Also persist source column reorder
        if (newActiveItems.length > 0) {
          await api.post('/kanban/modules/reorder', {
            versionId: activeVersionId,
            status: activeContainer,
            orderedModuleIds: newActiveItems.map(t => parseInt(t.id, 10)),
          })
        }
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
  }, [activeVersionId])

  const handleTaskClick = (task) => {
    setSelectedTask(task)
    setIsDetailOpen(true)
  }

  const handleRefresh = async () => {
    if (isRefreshing || loading) return
    setIsRefreshing(true)
    try {
      await loadBoard(projectId, activeVersionId)
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
      const targetCol = updatedTask.status || selectedTask?.status || 'start'

      const enrichedTask = {
        ...updatedTask,
        id: updatedId,
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
    if (selectedTask?.id === updatedId) {
      setSelectedTask(prev => ({ ...prev, ...updatedTask, id: updatedId }))
    }
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
    const status = enrichedTask.status || 'start'
    setTasksByStatus(prev => ({
      ...prev,
      [status]: [enrichedTask, ...(prev[status] || [])],
    }))
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
      />

      <div className='flex-1 overflow-auto px-6 py-6 min-h-0'>
        <Kanban
          value={tasksByStatus}
          onValueChange={setTasksByStatus}
          getItemValue={item => item.id}
          onMove={handleMove}
          className='h-full'
        >
          <KanbanBoardUI className='h-full grid auto-rows-fr grid-cols-[repeat(3,minmax(18rem,1fr))] gap-4'>
            {COLUMNS.map(column => (
              <TaskColumn
                key={column.id}
                value={column.id}
                column={column}
                tasks={tasksByStatus[column.id] || []}
                onTaskClick={handleTaskClick}
                highlightedTaskId={highlightedTaskId}
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
                    tasks={tasksByStatus[activeValue] || []}
                    isOverlay
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
