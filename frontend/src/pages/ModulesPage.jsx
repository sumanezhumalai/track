import React from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import KanbanBoard from '@/components/kanban/KanbanBoard'
import Sidebar from '@/components/Sidebar'

import ErrorBoundary from '@/components/ErrorBoundary'

/**
 * ModulesPage — full-page Kanban board for a specific project.
 *
 * Layout: Sidebar (unchanged) + full-height Kanban board (no max-width constraint).
 * This page breaks out of the AppLayout container so the board has full available width.
 */
export default function ModulesPage() {
  const { projectId } = useParams()
  const navigate = useNavigate()

  // Read role from localStorage (same pattern as rest of app)
  const rawUser = localStorage.getItem('user')
  let user = { name: 'User', role: 'DEV' }
  if (rawUser) {
    try { user = JSON.parse(rawUser) } catch { /* ignore */ }
  }
  const role = (user.role || '').toUpperCase().replace(/^ROLE_/, '')
  const isAdmin = role === 'ADMIN'

  const handleBack = () => navigate('/features')

  return (
    <div className='h-screen w-screen flex overflow-hidden bg-background text-foreground'>
      <Sidebar />
      {/* Board takes all remaining space, h-full, no padding/max-width constraint */}
      <div className='flex-1 h-screen overflow-hidden'>
        <ErrorBoundary title='Failed to load Kanban Board' onReset={handleBack}>
          <KanbanBoard
            projectId={projectId}
            isAdmin={isAdmin}
            onBack={handleBack}
          />
        </ErrorBoundary>
      </div>
    </div>
  )
}
