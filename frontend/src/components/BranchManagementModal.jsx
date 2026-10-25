import React, { useState } from 'react'
import {
  GitBranch,
  GitFork,
  X,
  CheckCircle2,
  Edit2,
  Trash2,
  Loader2,
  AlertCircle,
  Plus,
  Calendar,
  User,
  Check,
} from 'lucide-react'
import api from '../api/axios'
import ConfirmDeleteModal from './ConfirmDeleteModal'

export default function BranchManagementModal({
  isOpen,
  onClose,
  project,
  versions = [],
  isAdmin = false,
  onVersionsChanged,
}) {
  // Incremental Branch Form state
  const [newLabel, setNewLabel] = useState('')
  const [newReleaseNotes, setNewReleaseNotes] = useState('')
  const [createLoading, setCreateLoading] = useState(false)
  const [error, setError] = useState('')

  // Inline Version Edit state
  const [editingVersionId, setEditingVersionId] = useState(null)
  const [editLabel, setEditLabel] = useState('')
  const [editReleaseNotes, setEditReleaseNotes] = useState('')
  const [editLoading, setEditLoading] = useState(false)

  // Version Delete Confirmation state
  const [versionToDelete, setVersionToDelete] = useState(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  if (!isOpen || !project) return null

  // Sorted versions: newest first
  const sortedVersions = [...versions].sort(
    (a, b) => (b.versionNumber || 0) - (a.versionNumber || 0)
  )

  const maxVersionNum = sortedVersions.reduce(
    (max, v) => Math.max(max, v.versionNumber || 0),
    0
  )
  const nextVersionNum = maxVersionNum + 1

  // ── Create Branch Handler ──────────────────────────────────────────────
  const handleCreateBranch = async (e) => {
    e.preventDefault()
    setCreateLoading(true)
    setError('')
    try {
      await api.post(`/kanban/projects/${project.projectId}/versions`, {
        label: newLabel.trim() || `v${nextVersionNum}.0.0`,
        releaseNotes: newReleaseNotes.trim() || null,
      })
      setNewLabel('')
      setNewReleaseNotes('')
      if (onVersionsChanged) onVersionsChanged()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create new branch.')
    } finally {
      setCreateLoading(false)
    }
  }

  // ── Inline Edit Handlers ───────────────────────────────────────────────
  const startEditingVersion = (v) => {
    setEditingVersionId(v.versionId)
    setEditLabel(v.label || `v${v.versionNumber}.0.0`)
    setEditReleaseNotes(v.releaseNotes || '')
  }

  const cancelEditingVersion = () => {
    setEditingVersionId(null)
    setEditLabel('')
    setEditReleaseNotes('')
  }

  const handleSaveVersionEdit = async (versionId) => {
    setEditLoading(true)
    setError('')
    try {
      await api.put(`/kanban/projects/${project.projectId}/versions/${versionId}`, {
        label: editLabel.trim(),
        releaseNotes: editReleaseNotes.trim() || null,
      })
      setEditingVersionId(null)
      if (onVersionsChanged) onVersionsChanged()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update branch.')
    } finally {
      setEditLoading(false)
    }
  }

  // ── Delete Version Handlers ────────────────────────────────────────────
  const confirmDeleteVersion = async () => {
    if (!versionToDelete) return
    setDeleteLoading(true)
    setError('')
    try {
      await api.delete(
        `/kanban/projects/${project.projectId}/versions/${versionToDelete.versionId}`
      )
      setVersionToDelete(null)
      if (onVersionsChanged) onVersionsChanged()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete branch.')
    } finally {
      setDeleteLoading(false)
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
        <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[88vh] flex flex-col shadow-dropdown border border-gh-border overflow-hidden">
          {/* Header */}
          <div className="p-5 border-b border-gh-border flex items-center justify-between shrink-0 bg-stone-50/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gh-greenLight text-gh-greenDark flex items-center justify-center shrink-0 border border-emerald-200/60 shadow-sm">
                <GitBranch className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-semibold text-stone-900 tracking-tight">
                    {project.projectName}
                  </h3>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-stone-100 text-stone-700 border border-stone-200">
                    {sortedVersions.length} {sortedVersions.length === 1 ? 'branch' : 'branches'}
                  </span>
                </div>
                <p className="text-xs text-stone-500 font-normal mt-0.5">
                  Version branches, release milestones, and active boards
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-stone-400 hover:text-stone-700 p-1.5 rounded-lg hover:bg-stone-100 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {error && (
            <div className="mx-5 mt-4 p-3 rounded-md bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          {/* Modal Scrollable Body */}
          <div className="p-5 overflow-y-auto space-y-6 flex-1">
            {/* 1. Branch Timeline Section */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-medium uppercase tracking-wider text-stone-400">
                  Branch History & Versions
                </span>
                <span className="text-[11px] text-stone-500">
                  Active board points to newest branch
                </span>
              </div>

              <div className="space-y-3">
                {sortedVersions.map((v, idx) => {
                  const isActive = idx === 0
                  const isEditing = editingVersionId === v.versionId
                  const displayLabel = v.label || `v${v.versionNumber}.0.0`

                  return (
                    <div
                      key={v.versionId}
                      className={`p-4 rounded-xl border transition-all ${
                        isActive
                          ? 'border-emerald-300 bg-emerald-50/20 shadow-sm'
                          : 'border-gh-border bg-white hover:border-stone-300'
                      }`}
                    >
                      {isEditing ? (
                        /* Inline Edit Mode */
                        <div className="space-y-3">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-semibold text-stone-800">
                              Edit Branch v{v.versionNumber}
                            </span>
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={cancelEditingVersion}
                                disabled={editLoading}
                                className="btn-secondary px-2 py-1 text-[11px]"
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSaveVersionEdit(v.versionId)}
                                disabled={editLoading || !editLabel.trim()}
                                className="btn-primary px-2.5 py-1 text-[11px] flex items-center gap-1"
                              >
                                {editLoading ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <Check className="w-3 h-3" />
                                )}
                                <span>Save</span>
                              </button>
                            </div>
                          </div>
                          <div>
                            <label className="label">Branch Label</label>
                            <input
                              type="text"
                              value={editLabel}
                              onChange={(e) => setEditLabel(e.target.value)}
                              className="input text-xs font-mono"
                            />
                          </div>
                          <div>
                            <label className="label">Release Notes</label>
                            <textarea
                              rows={2}
                              value={editReleaseNotes}
                              onChange={(e) => setEditReleaseNotes(e.target.value)}
                              className="input text-xs resize-none"
                            />
                          </div>
                        </div>
                      ) : (
                        /* Normal View Mode */
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                          <div className="space-y-1.5 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono text-xs font-semibold px-2.5 py-0.5 rounded-md bg-stone-100 text-stone-800 border border-stone-200">
                                {displayLabel}
                              </span>

                              {isActive && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100/80 text-emerald-800 border border-emerald-200">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                                  Active Branch
                                </span>
                              )}

                              <span className="text-[11px] text-stone-400 font-mono">
                                (seq #{v.versionNumber})
                              </span>
                            </div>

                            <p className="text-xs text-stone-600 leading-relaxed pt-0.5">
                              {v.releaseNotes || (
                                <span className="text-stone-400 italic">No release notes provided.</span>
                              )}
                            </p>

                            <div className="flex items-center gap-3 text-[11px] text-stone-400 pt-1">
                              <span className="flex items-center gap-1">
                                <User className="w-3 h-3" />
                                {v.createdBy || 'Admin'}
                              </span>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {v.createdAt
                                  ? new Date(v.createdAt).toLocaleDateString('en-US', {
                                      month: 'short',
                                      day: 'numeric',
                                      year: 'numeric',
                                    })
                                  : 'Recently'}
                              </span>
                            </div>
                          </div>

                          {/* Admin Actions */}
                          {isAdmin && (
                            <div className="flex items-center gap-1 shrink-0 self-end sm:self-start">
                              <button
                                onClick={() => startEditingVersion(v)}
                                title="Edit branch details"
                                className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-md transition-colors"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={() => setVersionToDelete(v)}
                                disabled={sortedVersions.length <= 1}
                                title={
                                  sortedVersions.length <= 1
                                    ? 'Cannot delete the only branch'
                                    : 'Delete branch and cascade modules'
                                }
                                className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors disabled:opacity-30 disabled:pointer-events-none"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* 2. Incremental Branch Creator (Admin only) */}
            {isAdmin && (
              <div className="pt-4 border-t border-gh-border">
                <div className="p-4 rounded-xl bg-stone-50 border border-stone-200/80">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-1 rounded bg-emerald-100 text-emerald-800">
                      <GitFork className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold text-stone-900">
                        Create New Incremental Branch
                      </h4>
                      <p className="text-[11px] text-stone-500">
                        Next sequence integer is <strong className="text-stone-800">#{nextVersionNum}</strong>
                      </p>
                    </div>
                  </div>

                  <form onSubmit={handleCreateBranch} className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="label">Branch Label (Optional)</label>
                        <input
                          type="text"
                          disabled={createLoading}
                          value={newLabel}
                          onChange={(e) => setNewLabel(e.target.value)}
                          placeholder={`e.g. v${nextVersionNum}.0.0`}
                          className="input font-mono text-xs"
                        />
                      </div>
                      <div>
                        <label className="label">Default Assigned Version</label>
                        <input
                          type="text"
                          readOnly
                          value={`Sequence v${nextVersionNum}`}
                          className="input bg-stone-100/70 text-stone-500 text-xs font-mono cursor-not-allowed"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="label">Release Notes / Milestone Scope</label>
                      <textarea
                        rows={2}
                        disabled={createLoading}
                        value={newReleaseNotes}
                        onChange={(e) => setNewReleaseNotes(e.target.value)}
                        placeholder="Document key changes, milestones, or bug fixes for this branch..."
                        className="input resize-none py-2 text-xs"
                      />
                    </div>

                    <div className="flex justify-end pt-1">
                      <button
                        type="submit"
                        disabled={createLoading}
                        className="btn-primary flex items-center gap-1.5"
                      >
                        {createLoading ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Plus className="w-3.5 h-3.5" />
                        )}
                        <span>Create Branch</span>
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Modal for Version Deletion */}
      <ConfirmDeleteModal
        isOpen={Boolean(versionToDelete)}
        onClose={() => setVersionToDelete(null)}
        onConfirm={confirmDeleteVersion}
        title="Delete Version Branch"
        itemType="Branch"
        itemName={versionToDelete?.label || `v${versionToDelete?.versionNumber}`}
        description={`Are you sure you want to delete branch "${
          versionToDelete?.label || `v${versionToDelete?.versionNumber}`
        }"?`}
        confirmWord="confirm"
        loading={deleteLoading}
      />
    </>
  )
}
