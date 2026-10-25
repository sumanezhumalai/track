import React from 'react'
import {
  GitBranch,
  Tag,
  Edit2,
  Trash2,
  ArrowRight,
} from 'lucide-react'

export default function ProjectCard({
  project,
  versions = [],
  isAdmin = false,
  onOpenBranches,
  onEditProject,
  onDeleteProject,
  onSelectProject,
}) {
  const sortedVersions = [...versions].sort(
    (a, b) => (b.versionNumber || 0) - (a.versionNumber || 0)
  )
  const activeVersion = sortedVersions[0]
  const activeVersionLabel =
    activeVersion?.label || (activeVersion ? `v${activeVersion.versionNumber}.0.0` : 'v1.0.0')

  const versionCount = sortedVersions.length || 1

  // Format timestamp: only month and year (e.g. "Oct 2026")
  const formattedDate = project.createdAt
    ? new Date(project.createdAt).toLocaleDateString('en-US', {
        month: 'short',
        year: 'numeric',
      })
    : 'Oct 2026'

  const handleCardClick = () => {
    if (onSelectProject) {
      onSelectProject(project, activeVersion)
    }
  }

  const handleBranchClick = (e) => {
    e.stopPropagation()
    if (onOpenBranches) {
      onOpenBranches(project)
    }
  }

  const handleEditClick = (e) => {
    e.stopPropagation()
    if (onEditProject) {
      onEditProject(project)
    }
  }

  const handleDeleteClick = (e) => {
    e.stopPropagation()
    if (onDeleteProject) {
      onDeleteProject(project)
    }
  }

  return (
    <div
      onClick={handleCardClick}
      className="group bg-white border border-gh-border rounded-xl p-5 hover:border-stone-400/80 hover:shadow-dropdown transition-all duration-200 flex flex-col justify-between cursor-pointer relative select-none"
    >
      <div>
        {/* Top Header Row: Clean Left Title + Right Action Cluster */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold text-stone-900 truncate tracking-tight group-hover:text-gh-greenDark transition-colors">
              {project.projectName}
            </h3>
            <div className="flex items-center gap-1.5 text-[11px] text-stone-400 font-normal mt-0.5 truncate">
              <span>{project.createdBy || 'Admin'}</span>
              <span>•</span>
              <span>{formattedDate}</span>
            </div>
          </div>

          {/* Action Cluster (Branch icon alone + Admin edit/delete) */}
          <div className="flex items-center gap-1 shrink-0">
            {/* Branch Trigger Icon Button (Icon alone) */}
            <button
              type="button"
              onClick={handleBranchClick}
              title={`${versionCount} ${versionCount === 1 ? 'branch' : 'branches'} (Manage branches)`}
              className="p-1.5 rounded-md text-stone-500 hover:text-emerald-800 hover:bg-emerald-50 border border-transparent hover:border-emerald-200/80 transition-colors"
            >
              <GitBranch className="w-4 h-4 text-emerald-700" />
            </button>

            {/* Admin Edit & Delete Actions */}
            {isAdmin && (
              <>
                <button
                  type="button"
                  onClick={handleEditClick}
                  title="Edit project"
                  className="p-1.5 text-stone-400 hover:text-stone-800 hover:bg-stone-100 rounded-md transition-colors"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={handleDeleteClick}
                  title="Delete project"
                  className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Project Description */}
        <p className="text-xs text-stone-600 leading-relaxed line-clamp-2 my-3 min-h-[36px]">
          {project.description || (
            <span className="text-stone-400 italic">No description provided.</span>
          )}
        </p>
      </div>

      {/* Footer / Meta Strip */}
      <div className="pt-3 border-t border-gh-border flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-mono font-medium bg-emerald-50 text-emerald-900 border border-emerald-200/70">
            <Tag className="w-3 h-3 text-emerald-700" />
            <span>Active: {activeVersionLabel}</span>
          </span>
        </div>

        {/* Interactive Cue */}
        <span className="text-[11px] text-stone-400 group-hover:text-gh-green font-medium flex items-center gap-1 transition-colors">
          <span>View Modules</span>
          <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
        </span>
      </div>
    </div>
  )
}
