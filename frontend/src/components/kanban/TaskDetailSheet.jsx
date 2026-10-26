import { useEffect, useState, useRef } from 'react'
import {
  X,
  Calendar as CalendarIcon,
  Plus,
  ListTodo,
  Edit2,
  Trash2,
  Save,
  XCircle,
  Check,
  Loader2,
} from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import UserListDialog from '@/components/kanban/UserListDialog'
import { cn } from '@/lib/utils'
import { getPriorityColor, calculateProgress, formatDate, toDateString } from '@/lib/taskUtils'
import api from '@/api/axios'
import { getAvatarInitials, getAvatarColorClass, normalizeUserData } from '@/lib/avatar'

const COLUMN_CONFIG = {
  start:      { label: 'Start' },
  testing:    { label: 'Testing' },
  production: { label: 'Production' },
}

function parseValidDate(dateInput) {
  if (!dateInput) return null
  const d = new Date(dateInput)
  return isNaN(d.getTime()) ? null : d
}

export default function TaskDetailSheet({
  open,
  onOpenChange,
  task,
  isAdmin = false,
  projectMembers = [],
  onTaskUpdate,
  onTaskDelete,
}) {
  const [subtasks, setSubtasks] = useState([])
  const [newSubtask, setNewSubtask] = useState('')
  const [status, setStatus] = useState('start')
  const [isEditMode, setIsEditMode] = useState(false)
  const [editData, setEditData] = useState({
    title: '',
    description: '',
    priority: 'medium',
    dueDate: null,
    assigneeDevNames: [],
  })
  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false)
  const [savingStatus, setSavingStatus] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const lastTaskIdRef = useRef(null)

  useEffect(() => {
    if (!open) {
      setIsEditMode(false)
      lastTaskIdRef.current = null
      return
    }

    if (!task) return

    const taskId = String(task.id || task.moduleId)
    const isDifferentTask = lastTaskIdRef.current !== taskId

    if (isDifferentTask) {
      // Switched to a new module or opened sheet fresh: initialize everything
      lastTaskIdRef.current = taskId
      setIsEditMode(false)
      setNewSubtask('')
      setStatus(task.status ?? 'start')
      setSubtasks(task.subtasks ?? [])
      setEditData({
        title: task.title ?? '',
        description: task.description ?? '',
        priority: task.priority ?? 'medium',
        dueDate: parseValidDate(task.dueDate),
        assigneeDevNames: task.assigneeDevNames ?? [],
      })
    } else {
      // Same module updated (e.g. subtask added, toggled, or status changed)
      // Synchronize subtasks
      if (task.subtasks) {
        setSubtasks(task.subtasks)
      }
      // Synchronize status only if not actively editing
      if (task.status && !isEditMode) {
        setStatus(task.status)
      }
      // Note: We DO NOT exit edit mode (setIsEditMode) and DO NOT reset editData
      // so the user's active module form edits remain completely intact!
    }
  }, [task, open, isEditMode])

  if (!task) return null

  const completedSubtasks = subtasks.filter(st => st.completed).length
  const totalSubtasks = subtasks.length
  const progress = calculateProgress(subtasks)
  const dueDate = parseValidDate(task.dueDate)

  const normalizedProjectMembers = (projectMembers || []).map(normalizeUserData)

  // Assignees enriched display for view mode
  const assignees = (task.assigneeDevNames ?? []).map(devName => {
    const found = normalizedProjectMembers.find(u => (u.devName || u.name) === devName)
    return found || normalizeUserData(devName)
  })

  // Safe assignees dev names for edit mode
  const editAssigneeNames = Array.isArray(editData.assigneeDevNames) ? editData.assigneeDevNames : []

  const handleToggleSubtask = async (subtask) => {
    const nextCompleted = !subtask.completed
    const nextSubtasks = subtasks.map(st =>
      st.id === subtask.id ? { ...st, completed: nextCompleted } : st
    )
    // Optimistic update
    setSubtasks(nextSubtasks)
    try {
      await api.patch(`/kanban/modules/subtasks/${subtask.id}/toggle`)
      // Notify parent board of updated subtasks & progress
      onTaskUpdate?.({ ...task, subtasks: nextSubtasks }, { highlight: false })
    } catch {
      // Revert on error
      setSubtasks(subtasks)
    }
  }

  const handleAddSubtask = async () => {
    if (!isAdmin || !newSubtask.trim()) return
    const textToAdd = newSubtask.trim()
    setNewSubtask('')
    try {
      const res = await api.post(`/kanban/modules/${task.id}/subtasks`, { text: textToAdd })
      const newSt = {
        id: String(res.data.subtaskId),
        text: res.data.text,
        completed: res.data.completed ?? false,
      }
      const updatedList = [...subtasks, newSt]
      setSubtasks(updatedList)
      onTaskUpdate?.({ ...task, subtasks: updatedList }, { highlight: false })
    } catch (err) {
      console.error('Failed to add subtask:', err)
      setNewSubtask(textToAdd)
    }
  }

  const handleDeleteSubtask = async (subtaskId) => {
    if (!isAdmin) return
    const prevSubtasks = [...subtasks]
    const updatedList = subtasks.filter(st => String(st.id) !== String(subtaskId))
    setSubtasks(updatedList)
    try {
      await api.delete(`/kanban/modules/subtasks/${subtaskId}`)
      onTaskUpdate?.({ ...task, subtasks: updatedList }, { highlight: false })
    } catch (err) {
      console.error('Failed to delete subtask:', err)
      setSubtasks(prevSubtasks)
    }
  }

  const handleStatusChange = async (newStatus) => {
    if (!isAdmin) return // Devs cannot change status via dropdown
    const oldStatus = status
    setStatus(newStatus)
    setSavingStatus(true)
    try {
      await api.patch(`/kanban/modules/${task.id}/move`, {
        status: newStatus,
        position: 0,
      })
      onTaskUpdate?.({ ...task, status: newStatus }, { highlight: true })
    } catch {
      setStatus(oldStatus)
    } finally {
      setSavingStatus(false)
    }
  }

  const handleSaveEdit = async () => {
    if (!isAdmin) return
    setSaving(true)
    try {
      const formattedDueDate = editData.dueDate ? toDateString(editData.dueDate) : null

      await api.put(`/kanban/modules/${task.id}`, {
        title: editData.title.trim(),
        description: editData.description.trim(),
        priority: editData.priority,
        dueDate: formattedDueDate,
        assigneeDevNames: editAssigneeNames,
      })
      onTaskUpdate?.({
        ...task,
        ...editData,
        title: editData.title.trim(),
        description: editData.description.trim(),
        dueDate: formattedDueDate,
        assigneeDevNames: editAssigneeNames,
        subtasks,
      }, { highlight: true })
      setSaveSuccess(true)
      setTimeout(() => {
        setSaveSuccess(false)
        setIsEditMode(false)
      }, 550)
    } catch (err) {
      console.error('Failed to update module:', err)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!isAdmin) return
    if (!confirm(`Delete module "${task.title}"? This cannot be undone.`)) return
    try {
      await api.delete(`/kanban/modules/${task.id}`)
      onTaskDelete?.(task.id)
      onOpenChange(false)
    } catch (err) {
      console.error('Failed to delete module:', err)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className='w-full sm:max-w-[500px] p-0 overflow-y-auto'>
        {/* Header */}
        <div className='sticky top-0 z-10 bg-background border-b px-6 py-4 flex items-center justify-between gap-2'>
          <div className='flex flex-col min-w-0 flex-1'>
            <SheetTitle className='text-base font-semibold truncate'>
              {isEditMode ? 'Edit Module' : 'Module Detail'}
            </SheetTitle>
            <SheetDescription className='sr-only'>
              Module details, checklist, and assignment information.
            </SheetDescription>
          </div>
          <div className='flex items-center gap-1 shrink-0'>
            {isAdmin && !isEditMode && (
              <>
                <Button
                  size='icon'
                  variant='ghost'
                  className='h-8 w-8'
                  title='Edit module'
                  onClick={() => setIsEditMode(true)}
                >
                  <Edit2 className='h-4 w-4' />
                </Button>
                <Button
                  size='icon'
                  variant='ghost'
                  className='h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10'
                  title='Delete module'
                  onClick={handleDelete}
                >
                  <Trash2 className='h-4 w-4' />
                </Button>
              </>
            )}
            {isAdmin && isEditMode && (
              <>
                <Button
                  size='sm'
                  variant='ghost'
                  onClick={() => {
                    setIsEditMode(false)
                    setEditData({
                      title: task.title ?? '',
                      description: task.description ?? '',
                      priority: task.priority ?? 'medium',
                      dueDate: parseValidDate(task.dueDate),
                      assigneeDevNames: task.assigneeDevNames ?? [],
                    })
                  }}
                  disabled={saving}
                >
                  <XCircle className='h-4 w-4 mr-1' />
                  Cancel
                </Button>
                <Button
                  size='sm'
                  className={cn(
                    'transition-all duration-200 shadow-xs font-medium',
                    saveSuccess
                      ? 'bg-emerald-600 hover:bg-emerald-600 text-white'
                      : 'bg-gh-green hover:bg-gh-greenHover text-white'
                  )}
                  onClick={handleSaveEdit}
                  disabled={saving || saveSuccess || !editData.title.trim()}
                >
                  {saving ? (
                    <>
                      <Loader2 className='h-4 w-4 mr-1 animate-spin' />
                      Saving...
                    </>
                  ) : saveSuccess ? (
                    <>
                      <Check className='h-4 w-4 mr-1 stroke-[2.5]' />
                      Saved
                    </>
                  ) : (
                    <>
                      <Save className='h-4 w-4 mr-1' />
                      Save
                    </>
                  )}
                </Button>
              </>
            )}
            <Button
              size='icon'
              variant='ghost'
              className='h-8 w-8 rounded-full'
              onClick={() => onOpenChange(false)}
              title='Close'
            >
              <X className='h-4 w-4' />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className='px-6 py-6 space-y-6'>
          {/* Title */}
          {isEditMode ? (
            <div className='space-y-1'>
              <label className='text-xs font-medium text-muted-foreground uppercase tracking-wider'>Title</label>
              <Input
                value={editData.title}
                onChange={e => setEditData(d => ({ ...d, title: e.target.value }))}
                className='text-base font-semibold'
                placeholder='Module title'
              />
            </div>
          ) : (
            <h2 className='text-xl font-bold leading-tight'>{task.title}</h2>
          )}

          {/* Description */}
          {isEditMode ? (
            <div className='space-y-1'>
              <label className='text-xs font-medium text-muted-foreground uppercase tracking-wider'>Description</label>
              <Textarea
                value={editData.description}
                onChange={e => setEditData(d => ({ ...d, description: e.target.value }))}
                className='min-h-[80px] resize-none text-sm'
                placeholder='Add a description...'
              />
            </div>
          ) : (
            <p className='text-sm text-muted-foreground leading-relaxed'>
              {task.description || <span className='italic'>No description</span>}
            </p>
          )}

          {/* Task Properties */}
          <div className='space-y-4'>
            {/* Status — Admin editable, Dev read-only */}
            <div className='flex items-center justify-between'>
              <span className='text-sm text-muted-foreground'>Status</span>
              {isAdmin ? (
                <Select value={status} onValueChange={handleStatusChange} disabled={savingStatus}>
                  <SelectTrigger className='w-[150px] h-9'>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(COLUMN_CONFIG).map(([key, col]) => (
                      <SelectItem key={key} value={key}>
                        {col.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Badge variant='outline' className='capitalize px-3 py-1 font-medium text-xs'>
                  {COLUMN_CONFIG[status]?.label || status}
                </Badge>
              )}
            </div>

            {/* Priority — Admin edit mode selectable, otherwise read-only */}
            <div className='flex items-center justify-between'>
              <span className='text-sm text-muted-foreground'>Priority</span>
              {isEditMode ? (
                <Select value={editData.priority} onValueChange={v => setEditData(d => ({ ...d, priority: v }))}>
                  <SelectTrigger className='w-[150px] h-9'>
                    <SelectValue>
                      <div className='flex items-center gap-2'>
                        <span className={cn('h-2 w-2 rounded-full', getPriorityColor(editData.priority))} />
                        <span className='capitalize'>{editData.priority}</span>
                      </div>
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {['low', 'medium', 'high'].map(p => (
                      <SelectItem key={p} value={p}>
                        <div className='flex items-center gap-2'>
                          <span className={cn('h-2 w-2 rounded-full', getPriorityColor(p))} />
                          <span className='capitalize'>{p}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className='flex items-center gap-2'>
                  <span className={cn('h-2 w-2 rounded-full', getPriorityColor(task.priority))} />
                  <span className='text-sm capitalize font-medium'>{task.priority}</span>
                </div>
              )}
            </div>

            {/* Due Date — Admin edit mode picker, otherwise read-only */}
            <div className='flex items-center justify-between'>
              <span className='text-sm text-muted-foreground'>Due date</span>
              {isEditMode ? (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant='outline' className='w-[150px] h-9 justify-start text-left font-normal'>
                      <CalendarIcon className='mr-2 h-4 w-4' />
                      {editData.dueDate ? formatDate(editData.dueDate, 'Pick a date') : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className='w-auto p-0' align='end'>
                    <Calendar
                      selected={editData.dueDate}
                      onSelect={date => setEditData(d => ({ ...d, dueDate: date || null }))}
                      captionLayout='dropdown'
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              ) : (
                <Button variant='outline' className='w-[150px] h-9 justify-start text-left font-normal' disabled>
                  <CalendarIcon className='mr-2 h-4 w-4' />
                  {dueDate ? formatDate(dueDate, 'No date') : <span>No date</span>}
                </Button>
              )}
            </div>

            {/* Assignees — Admin edit mode manageable, otherwise view-only */}
            <div className='flex items-start justify-between gap-3'>
              <span className='text-sm text-muted-foreground shrink-0 mt-1'>Assignees</span>
              {isEditMode ? (
                <div className='flex flex-wrap gap-1.5 items-center justify-end'>
                  {editAssigneeNames.map(devName => (
                    <span
                      key={devName}
                      className='flex items-center gap-1 bg-muted rounded-full px-2 py-0.5 text-xs'
                    >
                      {devName}
                      <button
                        type='button'
                        onClick={() => setEditData(d => ({
                          ...d,
                          assigneeDevNames: (d.assigneeDevNames || []).filter(n => n !== devName)
                        }))}
                        className='ml-0.5 hover:text-destructive'
                        title={`Remove ${devName}`}
                      >
                        <X className='h-3 w-3' />
                      </button>
                    </span>
                  ))}
                  <Button
                    type='button'
                    size='sm'
                    variant='outline'
                    className='h-7 text-xs border-stone-200 hover:border-gh-green/50 hover:bg-emerald-50/40 hover:text-gh-green transition-colors'
                    onClick={() => setIsUserDialogOpen(true)}
                  >
                    <Plus className='h-3 w-3 mr-1' />
                    Add
                  </Button>
                </div>
              ) : (
                assignees.length > 0 ? (
                  <div className='flex items-center gap-2 justify-end flex-1'>
                    <div className='flex -space-x-2'>
                      {assignees.map(a => (
                        <Avatar key={a.id || a.name || a.devName} className='h-6 w-6 border-2 border-background' title={a.name}>
                          <AvatarImage src={a.avatar} alt={a.name} />
                          <AvatarFallback className={cn('text-[10px] font-semibold', getAvatarColorClass(a.name))}>
                            {a.initials || getAvatarInitials(a.name)}
                          </AvatarFallback>
                        </Avatar>
                      ))}
                    </div>
                    <span className='text-sm text-muted-foreground truncate max-w-[180px]'>
                      {assignees.map(a => a.name).join(', ')}
                    </span>
                  </div>
                ) : (
                  <span className='text-sm text-muted-foreground'>Unassigned</span>
                )
              )}
            </div>

            {/* Progress */}
            <div className='space-y-2'>
              <div className='flex items-center justify-between'>
                <span className='text-sm text-muted-foreground'>Progress</span>
                <span className='text-sm font-medium'>{progress}%</span>
              </div>
              <Progress value={progress} className='h-2' />
            </div>
          </div>

          {/* Subtasks */}
          <div className='space-y-3'>
            <div className='flex items-center justify-between'>
              <div className='flex items-center gap-2'>
                <ListTodo className='h-4 w-4 text-muted-foreground' />
                <span className='text-sm font-semibold'>Subtasks</span>
                <Badge variant='secondary' className='h-5 text-xs'>{totalSubtasks}</Badge>
              </div>
              <span className='text-xs text-muted-foreground'>
                {completedSubtasks} of {totalSubtasks} done
              </span>
            </div>

            <div className='space-y-2'>
              {subtasks.length === 0 ? (
                <p className='text-xs text-muted-foreground italic py-1'>
                  No subtasks created for this module.
                </p>
              ) : (
                subtasks.map((subtask) => (
                  <div key={subtask.id} className='flex items-center gap-3 group rounded-md p-1.5 hover:bg-muted/40 transition-colors'>
                    <Checkbox
                      checked={subtask.completed}
                      onCheckedChange={() => handleToggleSubtask(subtask)}
                      aria-label={subtask.text}
                    />
                    <span
                      className={cn(
                        'text-sm flex-1 cursor-pointer select-none',
                        subtask.completed && 'line-through text-muted-foreground'
                      )}
                      onClick={() => handleToggleSubtask(subtask)}
                    >
                      {subtask.text}
                    </span>
                    {isAdmin && (
                      <button
                        type='button'
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteSubtask(subtask.id)
                        }}
                        className='opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive p-1 rounded transition-opacity cursor-pointer'
                        title='Delete subtask'
                      >
                        <Trash2 className='h-3.5 w-3.5' />
                      </button>
                    )}
                  </div>
                ))
              )}

              {/* Add Subtask — Admin only */}
              {isAdmin && (
                <div className='flex items-center gap-2 pt-1'>
                  <Input
                    placeholder='Add a subtask...'
                    value={newSubtask}
                    onChange={e => setNewSubtask(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddSubtask() } }}
                    className='h-9 text-sm'
                  />
                  <Button
                    size='icon'
                    variant='ghost'
                    className='h-9 w-9 shrink-0'
                    onClick={handleAddSubtask}
                    title='Add subtask'
                  >
                    <Plus className='h-4 w-4' />
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* User selection dialog for edit mode assignees (Admin only) */}
        {isAdmin && (
          <UserListDialog
            open={isUserDialogOpen}
            onOpenChange={setIsUserDialogOpen}
            onSelectUser={(selected) => {
              setEditData(d => ({ ...d, assigneeDevNames: selected.map(u => u.devName || u.name) }))
            }}
            selectedUsers={normalizedProjectMembers.filter(u =>
              editAssigneeNames.includes(u.devName || u.name)
            )}
            users={normalizedProjectMembers}
            title='Add Assignees'
            confirmLabel='Add Assignees'
            description='Select members to assign to this module.'
          />
        )}
      </SheetContent>
    </Sheet>
  )
}
