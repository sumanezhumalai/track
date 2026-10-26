import { useState } from 'react'
import { Avatar, AvatarGroup, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { PlusIcon } from 'lucide-react'
import UserListDialog from '@/components/kanban/UserListDialog'
import { getAvatarColorClass, normalizeUserData } from '@/lib/avatar'
import { cn } from '@/lib/utils'

export default function TeamAvatarGroup({ members = [], users = [], onAddMember, isAdmin = false }) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  // Normalize project members so they always have 2-letter initials and display info
  const enrichedMembers = members.map(normalizeUserData)
  const availableUsers = (users && users.length > 0 ? users : members).map(normalizeUserData)

  const handleSelectUsers = (selected) => {
    selected
      .filter(user => !enrichedMembers.some(m => (m.devName || m.name) === (user.devName || user.name)))
      .forEach(user => onAddMember?.(user))
  }

  return (
    <>
      <AvatarGroup>
        {enrichedMembers.map(member => (
          <Avatar
            key={member.id || member.devName}
            className='h-8 w-8 border-2 border-background'
            title={member.name}
          >
            <AvatarImage src={member.avatar} alt={member.name} />
            <AvatarFallback className={cn('text-xs font-semibold', getAvatarColorClass(member.name))}>
              {member.initials}
            </AvatarFallback>
          </Avatar>
        ))}
        {isAdmin && (
          <button
            type='button'
            onClick={() => setIsDialogOpen(true)}
            className='bg-stone-100 ring-background flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full ring-2 text-stone-600 transition-colors hover:bg-emerald-50 hover:text-gh-green focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gh-green focus-visible:ring-offset-2'
            title='Add member to project'
          >
            <PlusIcon className='h-4 w-4' />
            <span className='sr-only'>Add member</span>
          </button>
        )}
      </AvatarGroup>

      {isAdmin && (
        <UserListDialog
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          onSelectUser={handleSelectUsers}
          selectedUsers={enrichedMembers}
          users={availableUsers}
          title='Add Project Members'
          confirmLabel='Add Project Members'
          description='Select users to add to the project.'
        />
      )}
    </>
  )
}
