import { useEffect, useState } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { CheckIcon, SearchIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getAvatarInitials, getAvatarColorClass, normalizeUserData } from '@/lib/avatar'

export default function UserListDialog({
  open,
  onOpenChange,
  onSelectUser,
  selectedUsers = [],
  users = [],
  title = 'Select User',
  description = 'Choose users from the list below.',
  confirmLabel,
}) {
  const [searchQuery, setSearchQuery] = useState('')
  const [tempSelected, setTempSelected] = useState([])

  useEffect(() => {
    if (open) {
      setSearchQuery('')
      setTempSelected((selectedUsers || []).map(normalizeUserData))
    }
  }, [open, selectedUsers])

  const normalizedUsers = (users || []).map(normalizeUserData)

  const filteredUsers = normalizedUsers.filter(user => {
    const q = searchQuery.toLowerCase().trim()
    if (!q) return true
    return (
      (user.name || '').toLowerCase().includes(q) ||
      (user.devName || '').toLowerCase().includes(q) ||
      (user.email || '').toLowerCase().includes(q) ||
      (user.role || '').toLowerCase().includes(q) ||
      (user.team || '').toLowerCase().includes(q)
    )
  })

  const isUserSelected = (user) => {
    const key = user.devName || user.name || user.id
    return tempSelected.some(u => (u.devName || u.name || u.id) === key)
  }

  const handleUserClick = (user) => {
    const targetKey = user.devName || user.name || user.id
    setTempSelected(prev =>
      prev.some(u => (u.devName || u.name || u.id) === targetKey)
        ? prev.filter(u => (u.devName || u.name || u.id) !== targetKey)
        : [...prev, user]
    )
  }

  const handleConfirm = () => {
    onSelectUser(tempSelected)
    onOpenChange(false)
  }

  // Determine button text contextually (Add X Members vs Assign X Members)
  const isAssignMode = title.toLowerCase().includes('assign')
  const count = tempSelected.length
  const defaultActionText = count > 0
    ? (isAssignMode ? `Assign ${count} Member${count > 1 ? 's' : ''}` : `Add ${count} Member${count > 1 ? 's' : ''}`)
    : 'Select Users'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-md gap-0 p-0 overflow-hidden'>
        <DialogHeader className='px-6 pb-4 pt-6'>
          <DialogTitle className='text-base font-semibold'>{title}</DialogTitle>
          {description && <DialogDescription className='text-sm text-muted-foreground'>{description}</DialogDescription>}
        </DialogHeader>

        <div className='px-6 pb-3'>
          <div className='relative'>
            <SearchIcon className='absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
            <input
              placeholder='Search by name, role, or team...'
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className='input h-9 pl-9 text-sm'
            />
          </div>
        </div>

        <div className='scrollbar-hide max-h-[300px] overflow-y-auto px-6 pb-4'>
          <div className='space-y-1'>
            {filteredUsers.length === 0 ? (
              <div className='py-8 text-center text-sm text-muted-foreground'>
                {searchQuery ? 'No users matching your search' : 'No users available'}
              </div>
            ) : (
              filteredUsers.map(user => {
                const selected = isUserSelected(user)
                const userKey = user.devName || user.name || user.id
                const roleText = user.role
                  ? (user.team ? `${user.role} • ${user.team}` : user.role)
                  : (user.email || user.team || 'Developer')

                return (
                  <button
                    key={userKey}
                    type='button'
                    onClick={() => handleUserClick(user)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-md p-2.5 text-left transition-colors hover:bg-muted/60',
                      selected && 'bg-emerald-50/70 dark:bg-emerald-950/30'
                    )}
                  >
                    <Avatar className='h-9 w-9 shrink-0 border'>
                      <AvatarImage src={user.avatar} alt={user.name} />
                      <AvatarFallback className={cn('text-xs font-semibold', getAvatarColorClass(user.name))}>
                        {user.initials || getAvatarInitials(user.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className='min-w-0 flex-1'>
                      <div className='flex items-center gap-2'>
                        <p className='text-sm font-medium leading-none truncate text-foreground'>
                          {user.name}
                        </p>
                        {user.type === 'admin' && (
                          <span className='rounded bg-stone-100 px-1.5 py-0.5 text-[10px] font-medium text-stone-600 dark:bg-stone-800 dark:text-stone-300'>
                            Admin
                          </span>
                        )}
                      </div>
                      <p className='truncate text-xs text-muted-foreground mt-1'>
                        {roleText}
                      </p>
                    </div>
                    {selected && <CheckIcon className='h-4 w-4 shrink-0 text-gh-green' />}
                  </button>
                )
              })
            )}
          </div>
        </div>

        <DialogFooter className='px-6 pb-6 pt-2 bg-muted/20 border-t'>
          <Button variant='outline' size='sm' onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            size='sm'
            className='bg-gh-green hover:bg-gh-greenHover text-white shadow-xs font-medium transition-colors'
            onClick={handleConfirm}
            disabled={count === 0}
          >
            {confirmLabel || defaultActionText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
