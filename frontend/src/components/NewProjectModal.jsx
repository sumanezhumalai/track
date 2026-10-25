import React, { useState, useEffect } from 'react'
import { FolderPlus, X, Loader2, AlertCircle, Info } from 'lucide-react'
import api from '../api/axios'

export default function NewProjectModal({ isOpen, onClose, onCreated }) {
  const [projectName, setProjectName] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (isOpen) {
      setProjectName('')
      setDescription('')
      setError('')
      setLoading(false)
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!projectName.trim()) {
      setError('Project name is required.')
      return
    }

    setLoading(true)
    setError('')
    try {
      const res = await api.post('/kanban/projects', {
        projectName: projectName.trim(),
        description: description.trim() || null,
      })
      onCreated(res.data)
      onClose()
    } catch (err) {
      if (err.response && err.response.status === 409) {
        setError(`A project named "${projectName.trim()}" already exists.`)
      } else {
        setError(err.response?.data?.message || 'Failed to create project. Please try again.')
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
            <div className="w-9 h-9 rounded-xl bg-gh-greenLight text-gh-greenDark flex items-center justify-center shrink-0 border border-emerald-200/50">
              <FolderPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-stone-900 tracking-tight">
                Add New Project
              </h3>
              <p className="text-[11px] text-stone-500 font-normal">
                Initialize an engineering project initiative
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

          {/* Automatic Initial Branch Notice */}
          <div className="p-3 bg-stone-50 rounded-lg border border-stone-200/70 text-stone-600 text-[11px] flex items-start gap-2.5">
            <Info className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-stone-800">Automatic Initialization:</span> The system will automatically seed <span className="font-mono bg-emerald-50 text-emerald-800 px-1 py-0.2 rounded border border-emerald-200/50">v1.0.0</span> as the first active branch for this project.
            </div>
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
              <span>Create Project</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
