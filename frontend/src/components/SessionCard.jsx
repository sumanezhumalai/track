import React from 'react'
import { Clock, Calendar, Edit3, Trash2, StopCircle, ArrowRight } from 'lucide-react'
import LiveTimer from './LiveTimer'

export default function SessionCard({ session, onEdit, onEnd, onDelete, isAdmin }) {
  const isClosed = Boolean(session.endTime)

  const formatDateTime = (dateStr) => {
    if (!dateStr) return '-'
    const d = new Date(dateStr)
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
  }

  const calculateClosedDuration = (startStr, endStr) => {
    if (!startStr || !endStr) return '-'
    const start = new Date(startStr).getTime()
    const end = new Date(endStr).getTime()
    const diffSec = Math.max(0, Math.floor((end - start) / 1000))
    const hours = Math.floor(diffSec / 3600)
    const minutes = Math.floor((diffSec % 3600) / 60)
    const seconds = diffSec % 60
    if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`
    if (minutes > 0) return `${minutes}m ${seconds}s`
    return `${seconds}s`
  }

  const rawUser = localStorage.getItem('user')
  let currentUsername = ''
  if (rawUser) {
    try {
      currentUsername = JSON.parse(rawUser).name || ''
    } catch {}
  }
  const isOwner =
    currentUsername &&
    session.devName &&
    session.devName.toLowerCase() === currentUsername.toLowerCase()
  const canEnd = !isClosed && (isAdmin || isOwner)
  const canEdit = isAdmin || isOwner
  const canDelete = isAdmin || isOwner

  return (
    <div className="bg-white border border-gh-border rounded-lg p-4 flex flex-col justify-between hover:border-stone-300 transition-colors">
      <div>
        {/* Top Header: Status & Duration */}
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-gh-border">
          <div className="flex items-center gap-2">
            {isClosed ? (
              <span className="badge-closed">Closed</span>
            ) : (
              <span className="badge-active">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                Live
              </span>
            )}
            <span className="text-[11px] font-mono text-stone-400">#{session.sessionId}</span>
          </div>

          <div className="text-xs font-mono text-stone-600">
            {isClosed ? (
              <span className="flex items-center gap-1 text-[11px] text-stone-500">
                <Clock className="w-3 h-3 text-stone-400" />
                {calculateClosedDuration(session.startTime, session.endTime)}
              </span>
            ) : (
              <LiveTimer startTime={session.startTime} />
            )}
          </div>
        </div>

        {/* Engineers Collaboration (Integrated, Unboxed) */}
        <div className="space-y-1.5 mb-3">
          <div className="flex items-baseline justify-between text-xs">
            <span className="text-[11px] font-medium text-stone-400 uppercase tracking-wider">Dev</span>
            <span className="font-medium text-stone-900 truncate max-w-[170px]">{session.devName || 'Unassigned'}</span>
          </div>
          <div className="flex items-baseline justify-between text-xs">
            <span className="text-[11px] font-medium text-stone-400 uppercase tracking-wider">General</span>
            <span className="font-medium text-stone-900 truncate max-w-[170px]">{session.aeName || 'Unassigned'}</span>
          </div>
        </div>

        {/* Timestamps (Quiet, Clean) */}
        <div className="text-[11px] text-stone-400 space-y-0.5 mb-3">
          <div className="flex items-center justify-between">
            <span>Started</span>
            <span className="text-stone-600">{formatDateTime(session.startTime)}</span>
          </div>
          {isClosed && (
            <div className="flex items-center justify-between">
              <span>Ended</span>
              <span className="text-stone-600">{formatDateTime(session.endTime)}</span>
            </div>
          )}
        </div>

        {/* Notes / Resolution */}
        {session.sessionDescription && (
          <div className="mb-3 pl-2.5 border-l-2 border-emerald-500 text-xs text-stone-600">
            <p className="line-clamp-2 italic">{session.sessionDescription}</p>
          </div>
        )}
      </div>

      {/* Action Controls */}
      <div className="pt-2.5 mt-2 border-t border-gh-border flex items-center justify-between gap-2">
        {canEnd ? (
          <button
            onClick={() => onEnd(session)}
            className="btn-primary py-1 px-2.5 text-[11px] bg-amber-700 hover:bg-amber-800"
            title="End session"
          >
            <StopCircle className="w-3 h-3" />
            <span>End Session</span>
          </button>
        ) : isClosed ? (
          <span className="text-[11px] text-stone-400 italic">Resolved</span>
        ) : (
          <span className="text-[11px] text-emerald-700 font-medium flex items-center gap-1">
            <span className="w-1 h-1 rounded-full bg-emerald-500" /> In Progress
          </span>
        )}

        <div className="flex items-center gap-0.5 ml-auto">
          {canEdit && (
            <button
              onClick={() => onEdit(session)}
              className="p-1 text-stone-400 hover:text-stone-700 rounded transition-colors"
              title="Edit session"
            >
              <Edit3 className="w-3.5 h-3.5" />
            </button>
          )}
          {canDelete && (
            <button
              onClick={() => onDelete(session.sessionId)}
              className="p-1 text-stone-400 hover:text-red-600 rounded transition-colors"
              title="Delete session"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
