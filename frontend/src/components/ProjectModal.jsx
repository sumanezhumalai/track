import React, { useState, useEffect } from 'react'
import { FolderPlus, Edit3, X, Loader2, AlertCircle, Info } from 'lucide-react'
import api from '../api/axios'

export default function ProjectModal({ isOpen, project, onClose, onSaved }) {
  const isEditing = Boolean(project)
  const [projectName, setProjectName] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (isOpen) {
      setProjectName(project?.projectName || '')
      setDescription(project?.description || '')
      setError('')
      setLoading(false)
    }
  }, [isOpen, project])

  if (!isOpen) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    const trimmedName = projectName.trim()
    if (!trimmedName) {
      setError('Project name is required.')
      return
    }

    setLoading(true)
    setError('')
    try {
      const payload = {
        projectName: trimmedName,
        description: description.trim() || null,
      }
      const res = isEditing
        ? await api.put(`/kanban/projects/${project.projectId}`, payload)
        : await api.post('/kanban/projects', payload)

      onSaved?.(res.data)
      onClose()
    } catch (err) {
      if (err.response?.status === 409) {
        setError(`A project named "${trimmedName}" already exists.`)
      } else {
        setError(err.response?.data?.message || `Failed to ${isEditing ? 'update' : 'create'} project.`)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-dropdown border border-gh-border relative">
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-gh-border">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
              isEditing
                ? 'bg-stone-100 text-stone-700 border-stone-200'
                : 'bg-gh-greenLight text-gh-greenDark border-emerald-200/50'
            }`}>
              {isEditing ? <Edit3 className="w-5 h-5 text-emerald-800" /> : <FolderPlus className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-base font-semibold text-stone-900 tracking-tight">
                {isEditing ? 'Edit Project' : 'Add New Project'}
              </h3>
              <p className="text-[11px] text-stone-500 font-normal">
                {isEditing ? 'Modify initiative name or scope details' : 'Initialize an engineering project initiative'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="text-stone-400 hover:text-stone-700 p-1.5 rounded-md hover:bg-stone-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-md bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="label">
              Project Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              autoFocus
              disabled={loading}
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="e.g. Cloud Gateway Automation"
              className="input"
              maxLength={150}
            />
          </div>

          <div>
            <label className="label">Description (Optional)</label>
            <textarea
              rows={3}
              disabled={loading}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Summary of project goals, team scope, or milestone targets..."
              className="input resize-none py-2"
            />
          </div>

          {!isEditing && (
            <div className="p-3 bg-stone-50 rounded-lg border border-stone-200/70 text-stone-600 text-[11px] flex items-start gap-2.5">
              <Info className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-stone-800">Automatic Initialization:</span> The system will automatically seed <span className="font-mono bg-emerald-50 text-emerald-800 px-1 py-0.2 rounded border border-emerald-200/50">v1.0.0</span> as the first active branch for this project.
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-gh-border">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !projectName.trim()}
              className="btn-primary"
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{isEditing ? 'Save Changes' : 'Create Project'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
