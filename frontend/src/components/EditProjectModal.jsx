import React, { useState, useEffect } from 'react'
import { Edit3, X, Loader2, AlertCircle } from 'lucide-react'
import api from '../api/axios'

export default function EditProjectModal({ isOpen, onClose, project, onUpdated }) {
  const [projectName, setProjectName] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (project && isOpen) {
      setProjectName(project.projectName || '')
      setDescription(project.description || '')
      setError('')
      setLoading(false)
    }
  }, [project, isOpen])

  if (!isOpen || !project) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!projectName.trim()) {
      setError('Project name is required.')
      return
    }

    setLoading(true)
    setError('')
    try {
      const res = await api.put(`/kanban/projects/${project.projectId}`, {
        projectName: projectName.trim(),
        description: description.trim() || null,
      })
      onUpdated(res.data)
      onClose()
    } catch (err) {
      if (err.response && err.response.status === 409) {
        setError(`A project named "${projectName.trim()}" already exists.`)
      } else {
        setError(err.response?.data?.message || 'Failed to update project.')
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
            <div className="w-9 h-9 rounded-xl bg-stone-100 text-stone-700 flex items-center justify-center shrink-0 border border-stone-200">
              <Edit3 className="w-5 h-5 text-emerald-800" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-stone-900 tracking-tight">
                Edit Project
              </h3>
              <p className="text-[11px] text-stone-500 font-normal">
                Update project name and initiative details
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
            <label className="label">Description</label>
            <textarea
              rows={3}
              disabled={loading}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Summary of project goals, team scope, or milestone targets..."
              className="input resize-none py-2"
            />
          </div>

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
              <span>Save Changes</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
