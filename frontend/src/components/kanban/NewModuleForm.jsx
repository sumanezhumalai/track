import { useState } from 'react'
import {
  X,
  ListTodo,
  UserPlus,
  Loader2,
  Plus,
} from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import UserListDialog from '@/components/kanban/UserListDialog'
import { cn } from '@/lib/utils'
import { getPriorityColor, toDateString } from '@/lib/taskUtils'
import api from '@/api/axios'
import { getAvatarInitials, getAvatarColorClass, normalizeUserData } from '@/lib/avatar'

const STATUSES = [
  { value: 'ToBeDone', label: 'To Be Done' },
  { value: 'start', label: 'Start' },
  { value: 'testing', label: 'Testing' },
  { value: 'production', label: 'Production' },
]

export default function NewModuleForm({
  open,
  onOpenChange,
  onModuleCreated,
  projectMembers = [],
  versionId,
}) {
  const defaultForm = {
    title: '',
    description: '',
    status: 'ToBeDone',
    priority: 'medium',
    assigneeDevNames: [],
    dueDate: null,
    subtaskTexts: [],
  }
  const [formData, setFormData] = useState(defaultForm)
  const [newSubtask, setNewSubtask] = useState('')
  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const resetForm = () => {
    setFormData(defaultForm)
    setNewSubtask('')
    setError('')
  }

  const handleClose = () => {
    resetForm()
    onOpenChange(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.title.trim()) return
    setSubmitting(true)
    setError('')
    try {
      const payload = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        status: formData.status,
        priority: formData.priority,
        assigneeDevNames: formData.assigneeDevNames,
        dueDate: formData.dueDate ? toDateString(formData.dueDate) : null,
        subtaskTexts: formData.subtaskTexts,
      }
      const res = await api.post(`/kanban/modules?versionId=${versionId}`, payload)
      onModuleCreated?.(res.data)
      handleClose()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create module. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleSelectUsers = (users) => {
    setFormData(d => ({ ...d, assigneeDevNames: users.map(u => u.devName || u.name) }))
  }

  const handleAddSubtask = () => {
    if (!newSubtask.trim()) return
    setFormData(d => ({ ...d, subtaskTexts: [...d.subtaskTexts, newSubtask.trim()] }))
    setNewSubtask('')
  }

  const handleRemoveSubtask = (idx) => {
    setFormData(d => ({ ...d, subtaskTexts: d.subtaskTexts.filter((_, i) => i !== idx) }))
  }

  const normalizedProjectMembers = (projectMembers || []).map(normalizeUserData)

  const selectedMembersForDialog = normalizedProjectMembers.filter(u =>
    (formData.assigneeDevNames || []).includes(u.devName || u.name)
  )

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent className='w-full sm:max-w-[480px] p-0 overflow-y-auto'>
        {/* Header */}
        <div className='sticky top-0 z-10 bg-background border-b px-6 py-4 flex items-center justify-between'>
          <div className='flex flex-col min-w-0 flex-1'>
            <SheetTitle className='text-base font-semibold'>Create New Module</SheetTitle>
            <SheetDescription className='sr-only'>
              Create a new module for this project version.
            </SheetDescription>
          </div>
          <Button size='icon' variant='ghost' className='h-8 w-8 rounded-full' onClick={handleClose}>
            <X className='h-4 w-4' />
          </Button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className='px-6 py-6 space-y-6'>
          {error && (
            <div className='text-xs text-destructive bg-destructive/10 px-3 py-2 rounded-md'>
              {error}
            </div>
          )}

          {/* Title */}
          <div className='space-y-2'>
            <label className='text-sm font-medium'>
              Title <span className='text-destructive'>*</span>
            </label>
            <input
              value={formData.title}
              onChange={e => setFormData(d => ({ ...d, title: e.target.value }))}
              placeholder='Enter module title'
              required
              className='input'
            />
          </div>

          {/* Description */}
          <div className='space-y-2'>
            <label className='text-sm font-medium'>Description</label>
            <textarea
              value={formData.description}
              onChange={e => setFormData(d => ({ ...d, description: e.target.value }))}
              placeholder='Enter module description'
              className='input min-h-[90px] resize-none py-2'
            />
          </div>

          {/* Status */}
          <div className='space-y-2'>
            <label className='text-sm font-medium'>Status</label>
            <select
              value={formData.status}
              onChange={e => setFormData(d => ({ ...d, status: e.target.value }))}
              className='input'
            >
              {STATUSES.map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>

          {/* Priority */}
          <div className='space-y-2'>
            <label className='text-sm font-medium'>Priority</label>
            <div className='relative flex items-center'>
              <span className={cn('absolute left-3 h-2 w-2 rounded-full pointer-events-none', getPriorityColor(formData.priority))} />
              <select
                value={formData.priority}
                onChange={e => setFormData(d => ({ ...d, priority: e.target.value }))}
                className='input pl-7 capitalize'
              >
                {['low', 'medium', 'high'].map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Due Date */}
          <div className='space-y-2'>
            <label className='text-sm font-medium'>Due Date</label>
            <input
              type='date'
              value={toDateString(formData.dueDate) || ''}
              onChange={e => setFormData(d => ({ ...d, dueDate: e.target.value ? new Date(e.target.value) : null }))}
              className='input'
            />
          </div>

          {/* Assignees */}
          <div className='space-y-2'>
            <label className='text-sm font-medium'>Assignees</label>
            <div className='space-y-2'>
              {formData.assigneeDevNames.length > 0 && (
                <div className='flex flex-wrap gap-2'>
                  {formData.assigneeDevNames.map(devName => (
                    <div key={devName} className='flex items-center gap-1.5 rounded-full bg-muted pl-1 pr-2.5 py-1 text-xs'>
                      <span className={cn('size-4 rounded-full flex items-center justify-center text-[9px] font-bold border', getAvatarColorClass(devName))}>
                        {getAvatarInitials(devName)}
                      </span>
                      <span className='font-medium'>{devName}</span>
                      <button
                        type='button'
                        onClick={() => setFormData(d => ({ ...d, assigneeDevNames: d.assigneeDevNames.filter(n => n !== devName) }))}
                        className='hover:text-destructive ml-0.5'
                      >
                        <X className='h-3 w-3' />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <Button
                type='button'
                variant='outline'
                className='w-full justify-start gap-2 border-stone-200 hover:border-gh-green/50 hover:bg-emerald-50/40 hover:text-gh-green transition-colors'
                onClick={() => setIsUserDialogOpen(true)}
              >
                <UserPlus className='h-4 w-4' />
                {formData.assigneeDevNames.length > 0 ? 'Add More Assignees' : 'Add Assignees'}
              </Button>
            </div>
          </div>

          {/* Subtasks */}
          <div className='space-y-3'>
            <div className='flex items-center gap-2'>
              <ListTodo className='h-4 w-4 text-muted-foreground' />
              <label className='text-sm font-medium'>Subtasks</label>
              <span className='h-5 px-1.5 py-0.5 rounded text-xs bg-stone-100 text-stone-600 font-medium'>
                {formData.subtaskTexts.length}
              </span>
            </div>

            <div className='space-y-2'>
              {formData.subtaskTexts.map((text, idx) => (
                <div key={idx} className='flex items-center gap-2 group'>
                  <input type='checkbox' checked={false} disabled className='rounded border-stone-300 text-emerald-600' />
                  <span className='text-sm flex-1'>{text}</span>
                  <Button
                    type='button'
                    size='icon'
                    variant='ghost'
                    className='h-6 w-6 opacity-0 group-hover:opacity-100'
                    onClick={() => handleRemoveSubtask(idx)}
                  >
                    <X className='h-3 w-3' />
                  </Button>
                </div>
              ))}
              <div className='flex items-center gap-2 pt-1'>
                <input
                  placeholder='Add a subtask...'
                  value={newSubtask}
                  onChange={e => setNewSubtask(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddSubtask() } }}
                  className='input h-9 text-sm'
                />
                <Button type='button' size='icon' variant='ghost' className='h-9 w-9 shrink-0' onClick={handleAddSubtask}>
                  <Plus className='h-4 w-4' />
                </Button>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className='flex gap-3 pt-4'>
            <Button type='button' variant='outline' className='flex-1' onClick={handleClose} disabled={submitting}>
              Cancel
            </Button>
            <Button
              type='submit'
              className='flex-1 bg-gh-green hover:bg-gh-greenHover text-white shadow-xs font-medium transition-colors'
              disabled={submitting || !formData.title.trim()}
            >
              {submitting ? <><Loader2 className='h-4 w-4 mr-2 animate-spin' />Creating...</> : 'Create Module'}
            </Button>
          </div>
        </form>

        <UserListDialog
          open={isUserDialogOpen}
          onOpenChange={setIsUserDialogOpen}
          onSelectUser={handleSelectUsers}
          selectedUsers={selectedMembersForDialog}
          users={normalizedProjectMembers}
          title='Add Assignees'
          confirmLabel='Add Assignees'
          description='Select project members to assign to this module.'
        />
      </SheetContent>
    </Sheet>
  )
}
