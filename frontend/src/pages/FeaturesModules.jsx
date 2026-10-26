import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Layers,
  Plus,
  RefreshCw,
  Search,
  AlertCircle,
  FolderGit2,
} from 'lucide-react'
import api from '../api/axios'
import ProjectCard from '../components/ProjectCard'
import NewProjectModal from '../components/NewProjectModal'
import EditProjectModal from '../components/EditProjectModal'
import BranchManagementModal from '../components/BranchManagementModal'
import ConfirmDeleteModal from '../components/ConfirmDeleteModal'
import { getStoredUser } from '../lib/avatar'

export default function FeaturesModules() {
  const navigate = useNavigate()
  const [projects, setProjects] = useState([])
  const [versionsMap, setVersionsMap] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')

  // Modals state
  const [showNewModal, setShowNewModal] = useState(false)
  const [projectToEdit, setProjectToEdit] = useState(null)
  const [projectToDelete, setProjectToDelete] = useState(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [projectForBranches, setProjectForBranches] = useState(null)

  // Auth / Role
  const { isAdmin } = getStoredUser()

  // Fetch all projects & parallel versions
  const fetchProjectsAndVersions = async () => {
    setLoading(true)
    setError('')
    try {
      const pRes = await api.get('/kanban/projects')
      const projs = pRes.data || []
      setProjects(projs)

      // Fetch versions for all projects concurrently
      const vMap = {}
      await Promise.all(
        projs.map(async (p) => {
          try {
            const vRes = await api.get(`/kanban/projects/${p.projectId}/versions`)
            vMap[p.projectId] = vRes.data || []
          } catch {
            vMap[p.projectId] = []
          }
        })
      )
      setVersionsMap(vMap)
    } catch (err) {
      setError(
        err.response?.data?.message ||
          'Failed to load projects. Please verify your connection or login session.'
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProjectsAndVersions()
  }, [])

  // Delete project confirmed
  const confirmDeleteProject = async () => {
    if (!projectToDelete) return
    setDeleteLoading(true)
    try {
      await api.delete(`/kanban/projects/${projectToDelete.projectId}`)
      setProjectToDelete(null)
      fetchProjectsAndVersions()
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete project.')
    } finally {
      setDeleteLoading(false)
    }
  }

  // Navigate to Kanban board for the project's active version
  const handleSelectProject = (project) => {
    navigate(`/features/${project.projectId}/modules`)
  }

  // Filtered projects
  const filteredProjects = projects.filter((p) => {
    const nameMatch = (p.projectName || '')
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
    const descMatch = (p.description || '')
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
    return nameMatch || descMatch
  })

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gh-border">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold tracking-tight text-stone-900 font-untitled">
              Features & Modules
            </h1>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-stone-100 text-stone-700 border border-stone-200">
              {projects.length} {projects.length === 1 ? 'project' : 'projects'}
            </span>
          </div>
          <p className="text-xs text-stone-500 mt-0.5">
            Project initiatives, version branches, and module workflow boards.
          </p>
        </div>

        {/* Top Action Bar */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Search bar */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              placeholder="Search initiatives..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs rounded-md border border-gh-border bg-white text-stone-800 placeholder:text-stone-400 focus:outline-none focus:border-stone-400 focus:ring-1 focus:ring-stone-400 w-44 sm:w-56"
            />
          </div>

          {/* Refresh */}
          <button
            onClick={fetchProjectsAndVersions}
            disabled={loading}
            title="Refresh projects"
            className="btn-secondary px-2.5 py-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>

          {/* Add Project (Admin only) */}
          {isAdmin && (
            <button
              onClick={() => setShowNewModal(true)}
              className="btn-primary"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Project</span>
            </button>
          )}
        </div>
      </div>

      {/* Error alert */}
      {error && (
        <div className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
          <span>{error}</span>
        </div>
      )}

      {/* Project Listings Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="bg-white border border-gh-border rounded-xl p-5 h-44 animate-pulse flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="h-4 bg-stone-200 rounded w-1/2" />
                  <div className="h-4 bg-stone-100 rounded w-16" />
                </div>
                <div className="h-3 bg-stone-100 rounded w-full" />
                <div className="h-3 bg-stone-100 rounded w-3/4" />
              </div>
              <div className="h-4 bg-stone-100 rounded w-1/3" />
            </div>
          ))}
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="bg-white border border-gh-border rounded-xl p-12 text-center max-w-lg mx-auto">
          <div className="w-12 h-12 rounded-2xl bg-stone-100 text-stone-500 flex items-center justify-center mx-auto mb-3">
            <FolderGit2 className="w-6 h-6 text-stone-400" />
          </div>
          <h3 className="text-sm font-semibold text-stone-900 mb-1">
            {searchTerm ? 'No matching projects' : 'No projects created yet'}
          </h3>
          <p className="text-xs text-stone-500 mb-4 max-w-sm mx-auto">
            {searchTerm
              ? `No initiatives match your query "${searchTerm}". Try searching by another keyword.`
              : 'Initialize your first project initiative to start tracking versions and Kanban module boards.'}
          </p>
          {isAdmin && !searchTerm && (
            <button
              onClick={() => setShowNewModal(true)}
              className="btn-primary"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create First Project</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredProjects.map((project) => (
            <ProjectCard
              key={project.projectId}
              project={project}
              versions={versionsMap[project.projectId] || []}
              isAdmin={isAdmin}
              onOpenBranches={(p) => setProjectForBranches(p)}
              onEditProject={(p) => setProjectToEdit(p)}
              onDeleteProject={(p) => setProjectToDelete(p)}
              onSelectProject={handleSelectProject}
            />
          ))}
        </div>
      )}

      {/* Add Project Modal */}
      <NewProjectModal
        isOpen={showNewModal}
        onClose={() => setShowNewModal(false)}
        onCreated={() => fetchProjectsAndVersions()}
      />

      {/* Edit Project Modal */}
      <EditProjectModal
        isOpen={Boolean(projectToEdit)}
        project={projectToEdit}
        onClose={() => setProjectToEdit(null)}
        onUpdated={() => fetchProjectsAndVersions()}
      />

      {/* Branch Management Studio Modal */}
      <BranchManagementModal
        isOpen={Boolean(projectForBranches)}
        project={projectForBranches}
        versions={projectForBranches ? versionsMap[projectForBranches.projectId] || [] : []}
        isAdmin={isAdmin}
        onClose={() => setProjectForBranches(null)}
        onVersionsChanged={() => fetchProjectsAndVersions()}
      />

      {/* Delete Project Confirmation Modal (Typed 'confirm') */}
      <ConfirmDeleteModal
        isOpen={Boolean(projectToDelete)}
        onClose={() => setProjectToDelete(null)}
        onConfirm={confirmDeleteProject}
        title="Delete Project Initiative"
        itemType="Project"
        itemName={projectToDelete?.projectName}
        description={`Are you sure you want to delete project "${projectToDelete?.projectName}"?`}
        confirmWord="confirm"
        loading={deleteLoading}
      />
    </div>
  )
}
