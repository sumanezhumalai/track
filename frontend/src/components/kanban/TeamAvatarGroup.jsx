import { useState, useRef } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { PlusIcon, X } from 'lucide-react'
import UserListDialog from '@/components/kanban/UserListDialog'
import { getAvatarColorClass, normalizeUserData } from '@/lib/avatar'
import { cn } from '@/lib/utils'

export default function TeamAvatarGroup({
  members = [],
  users = [],
  onAddMember,
  isAdmin = false,
  selectedMemberDevNames = [],
  onToggleMemberFilter,
  onClearMemberFilter,
}) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const hoverTimeoutRef = useRef(null)

  // Normalize project members so they always have 2-letter initials and display info
  const enrichedMembers = members.map(normalizeUserData)
  const availableUsers = (users && users.length > 0 ? users : members).map(normalizeUserData)

  const isFilterActive = selectedMemberDevNames.length > 0
  const isExpanded = isHovered || isFilterActive

  const handleMouseEnter = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
      hoverTimeoutRef.current = null
    }
    setIsHovered(true)
  }

  const handleMouseLeave = () => {
    hoverTimeoutRef.current = setTimeout(() => {
      setIsHovered(false)
    }, 180)
  }

  const handleSelectUsers = (selected) => {
    selected
      .filter(user => !enrichedMembers.some(m => (m.devName || m.name) === (user.devName || user.name)))
      .forEach(user => onAddMember?.(user))
  }

  return (
    <>
      <div
        className='relative z-20 flex items-center justify-end select-none h-8'
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {/* Active Filter Clear Pill */}
        {isFilterActive && (
          <button
            type='button'
            onClick={onClearMemberFilter}
            className='group relative inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200/80 hover:bg-emerald-100 hover:text-emerald-950 transition-colors cursor-pointer mr-2 shrink-0 shadow-2xs hover:z-30 focus:z-30'
            aria-label='Clear member filter'
          >
            <span>Filter: {selectedMemberDevNames.length}</span>
            <X className='size-3 text-emerald-700' />

            {/* Instant Tooltip for Clear Filter matching Application Theme */}
            <span
              role='tooltip'
              className='pointer-events-none absolute left-1/2 -translate-x-1/2 top-full mt-2 z-50 flex flex-col items-center opacity-0 scale-95 -translate-y-1 group-hover:opacity-100 group-hover:scale-100 group-hover:translate-y-0 group-focus-visible:opacity-100 group-focus-visible:scale-100 group-focus-visible:translate-y-0 transition-all duration-100 ease-out whitespace-nowrap'
            >
              <span className='w-2 h-2 bg-white border-t border-l border-stone-200/90 rotate-45 -mb-1 z-10' />
              <span className='bg-white text-stone-700 px-2.5 py-1 rounded-lg shadow-dropdown border border-stone-200/90 text-[11px] font-medium'>
                Clear member filter
              </span>
            </span>
          </button>
        )}

        {/* Degrouping Avatars Container */}
        <div
          className={cn(
            'flex items-center transition-all duration-300 ease-out h-8',
            isExpanded ? 'gap-2' : ''
          )}
        >
          {enrichedMembers.map((member, idx) => {
            const memberKey = member.devName || member.name
            const isSelected = selectedMemberDevNames.includes(memberKey)
            const isDimmed = isFilterActive && !isSelected

            return (
              <button
                key={member.id || memberKey}
                type='button'
                onClick={(e) => {
                  onToggleMemberFilter?.(memberKey, e.shiftKey)
                }}
                aria-label={`Filter by ${member.name || memberKey}`}
                className={cn(
                  'group relative h-8 w-8 rounded-full shrink-0 p-0 border-0 bg-transparent cursor-pointer transition-all duration-300 ease-out focus:outline-none hover:z-30 focus:z-30',
                  !isExpanded && idx !== 0 && '-ml-2'
                )}
              >
                <Avatar
                  className={cn(
                    'h-8 w-8 rounded-full shadow-2xs transition-all duration-200',
                    isSelected
                      ? 'ring-2 ring-emerald-600'
                      : 'ring-2 ring-white hover:ring-stone-300',
                    isDimmed ? 'opacity-40 group-hover:opacity-85' : 'opacity-100'
                  )}
                >
                  <AvatarImage src={member.avatar} alt={member.name} />
                  <AvatarFallback className={cn('text-xs font-semibold', getAvatarColorClass(member.name))}>
                    {member.initials}
                  </AvatarFallback>
                </Avatar>

                {/* Instant Styled Tooltip matching Application Theme */}
                <span
                  role='tooltip'
                  className='pointer-events-none absolute left-1/2 -translate-x-1/2 top-full mt-2 z-50 flex flex-col items-center opacity-0 scale-95 -translate-y-1 group-hover:opacity-100 group-hover:scale-100 group-hover:translate-y-0 group-focus-visible:opacity-100 group-focus-visible:scale-100 group-focus-visible:translate-y-0 transition-all duration-100 ease-out whitespace-nowrap'
                >
                  <span className='w-2 h-2 bg-white border-t border-l border-stone-200/90 rotate-45 -mb-1 z-10' />
                  <span className='bg-white text-stone-900 px-3 py-1.5 rounded-lg shadow-dropdown border border-stone-200/90 flex flex-col items-center text-center min-w-[90px]'>
                    <span className='text-xs font-semibold text-stone-900 flex items-center gap-1.5'>
                      <span>{member.name || memberKey}</span>
                      {isSelected && (
                        <span className='inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200/70'>
                          Active
                        </span>
                      )}
                    </span>
                    <span className='text-[10px] text-stone-500 font-normal mt-0.5'>
                      {isSelected
                        ? 'Click to remove filter'
                        : isFilterActive
                          ? 'Click to isolate • Shift+click to add'
                          : 'Click to filter'}
                    </span>
                  </span>
                </span>
              </button>
            )
          })}

          {/* Admin Add Member Button */}
          {isAdmin && (
            <button
              type='button'
              onClick={(e) => {
                e.stopPropagation()
                setIsDialogOpen(true)
              }}
              className={cn(
                'group relative bg-stone-100 ring-2 ring-white flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-stone-600 transition-all duration-300 hover:bg-emerald-50 hover:text-gh-green focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gh-green shadow-2xs hover:z-30 focus:z-30',
                !isExpanded && enrichedMembers.length > 0 && '-ml-2'
              )}
              aria-label='Add member to project'
            >
              <PlusIcon className='h-4 w-4' />
              <span className='sr-only'>Add member</span>

              {/* Instant Tooltip for Add Member matching Application Theme */}
              <span
                role='tooltip'
                className='pointer-events-none absolute left-1/2 -translate-x-1/2 top-full mt-2 z-50 flex flex-col items-center opacity-0 scale-95 -translate-y-1 group-hover:opacity-100 group-hover:scale-100 group-hover:translate-y-0 group-focus-visible:opacity-100 group-focus-visible:scale-100 group-focus-visible:translate-y-0 transition-all duration-100 ease-out whitespace-nowrap'
              >
                <span className='w-2 h-2 bg-white border-t border-l border-stone-200/90 rotate-45 -mb-1 z-10' />
                <span className='bg-white text-stone-700 px-2.5 py-1 rounded-lg shadow-dropdown border border-stone-200/90 text-[11px] font-medium'>
                  Add member to project
                </span>
              </span>
            </button>
          )}
        </div>
      </div>

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
