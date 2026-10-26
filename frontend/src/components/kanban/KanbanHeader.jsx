import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import ProjectBreadcrumb from '@/components/kanban/ProjectBreadcrumb'
import TeamAvatarGroup from '@/components/kanban/TeamAvatarGroup'
import { PlusIcon, ArrowLeftIcon, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function KanbanHeader({
  project,
  activeVersion,
  members = [],
  users = [],
  onAddMember,
  onNewModule,
  onRefresh,
  isRefreshing = false,
  onBack,
  onVersionChange,
  isAdmin = false,
}) {
  const [version, setVersion] = useState('')

  useEffect(() => {
    if (activeVersion) {
      setVersion(activeVersion.label || `v${activeVersion.versionNumber}`)
    }
  }, [activeVersion])

  const handleVersionChange = (v) => {
    setVersion(v.label || `v${v.versionNumber}`)
    onVersionChange?.(v)
  }

  return (
    <div className='flex h-16 shrink-0 items-center justify-between border-b bg-background px-6 gap-4'>
      <div className='flex items-center gap-3 min-w-0'>
        <button
          type='button'
          onClick={onBack}
          className='p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0 cursor-pointer'
          title='Back to Features & Modules'
        >
          <ArrowLeftIcon className='h-4 w-4' />
        </button>
        <ProjectBreadcrumb
          projectName={project?.projectName ?? ''}
          version={version}
          versions={project?.allVersions ?? []}
          onVersionChange={handleVersionChange}
          onBack={onBack}
        />
      </div>

      <div className='flex items-center gap-2.5 shrink-0'>
        <TeamAvatarGroup
          members={members}
          users={users}
          onAddMember={onAddMember}
          isAdmin={isAdmin}
        />

        <button
          type='button'
          onClick={onRefresh}
          disabled={isRefreshing}
          className='inline-flex items-center justify-center h-8 w-8 rounded-md border border-gh-border bg-white text-stone-600 hover:text-stone-900 hover:bg-stone-50 hover:border-gh-borderDark transition-colors shadow-xs disabled:opacity-50 cursor-pointer'
          title='Refresh board'
          aria-label='Refresh board'
        >
          <RefreshCw className={cn('h-3.5 w-3.5 transition-transform', isRefreshing && 'animate-spin text-gh-green')} />
        </button>

        {isAdmin && (
          <Button
            size='sm'
            className='gap-2 bg-gh-green hover:bg-gh-greenHover text-white shadow-xs font-medium transition-colors'
            onClick={onNewModule}
          >
            <PlusIcon className='h-4 w-4' />
            New Module
          </Button>
        )}
      </div>
    </div>
  )
}
