import React, { useState, useEffect } from 'react'
import {
  Users,
  UserPlus,
  Edit2,
  Trash2,
  Search,
  RefreshCw,
  Shield,
  Terminal,
  CheckCircle2,
  AlertCircle,
  X,
  Lock,
  Building2,
  UserCheck,
  Clock,
} from 'lucide-react'
import api from '../api/axios'

export default function UserManagement() {
  const [activeTab, setActiveTab] = useState('DEV') // 'DEV' | 'AE'
  const [devUsers, setDevUsers] = useState([])
  const [aeUsers, setAeUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [searchTerm, setSearchTerm] = useState('')

  // Modal State
  const [showModal, setShowModal] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [selectedUser, setSelectedUser] = useState(null)
  const [modalLoading, setModalLoading] = useState(false)

  // Form Fields
  const [formName, setFormName] = useState('')
  const [formRole, setFormRole] = useState('')
  const [formTeam, setFormTeam] = useState('')
  const [formType, setFormType] = useState('dev') // 'dev' | 'admin'
  const [formPassword, setFormPassword] = useState('')

  const fetchUsers = async () => {
    setLoading(true)
    setError('')
    try {
      const [devRes, aeRes] = await Promise.all([
        api.get('/users/dev'),
        api.get('/users/ae'),
      ])
      setDevUsers(devRes.data || [])
      setAeUsers(aeRes.data || [])
    } catch {
      setError('Failed to fetch user directory. Admin privileges required.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  const resetForm = () => {
    setFormName('')
    setFormRole('')
    setFormTeam('')
    setFormType('dev')
    setFormPassword('')
    setSelectedUser(null)
    setIsEditing(false)
  }

  const openAddModal = () => {
    resetForm()
    setShowModal(true)
  }

  const openEditModal = (user) => {
    setSelectedUser(user)
    setIsEditing(true)
    if (activeTab === 'DEV') {
      setFormName(user.devName || '')
      setFormRole(user.role || '')
      setFormTeam(user.team || '')
      setFormType(user.type || 'dev')
      setFormPassword('') // Optional when editing
    } else {
      setFormName(user.aeName || '')
      setFormRole(user.role || '')
      setFormTeam(user.team || '')
    }
    setShowModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formName.trim() || !formRole.trim()) {
      alert('Name and Role are required.')
      return
    }

    if (activeTab === 'DEV' && !isEditing && !formPassword) {
      alert('Please assign an initial temporary password for the new DevSupport member.')
      return
    }

    setModalLoading(true)
    try {
      if (activeTab === 'DEV') {
        const payload = {
          name: formName.trim(),
          role: formRole.trim(),
          team: formTeam.trim() || 'Engineering',
          type: formType,
          password: formPassword ? formPassword : null,
        }

        if (isEditing) {
          await api.put(`/users/dev/${selectedUser.devId}`, payload)
          setSuccessMsg(`Updated DevSupport member "${formName}".`)
        } else {
          await api.post('/users/dev', payload)
          setSuccessMsg(`Created DevSupport member "${formName}". Temporary password assigned.`)
        }
      } else {
        const payload = {
          name: formName.trim(),
          role: formRole.trim(),
          team: formTeam.trim() || 'General Support',
          type: null,
          password: null,
        }

        if (isEditing) {
          await api.put(`/users/ae/${selectedUser.aeId}`, payload)
          setSuccessMsg(`Updated GeneralSupport member "${formName}".`)
        } else {
          await api.post('/users/ae', payload)
          setSuccessMsg(`Created GeneralSupport member "${formName}".`)
        }
      }

      setShowModal(false)
      resetForm()
      setTimeout(() => setSuccessMsg(''), 4000)
      fetchUsers()
    } catch (err) {
      const msg = err.response?.data?.message || 'Operation failed. Please verify input data.'
      alert(msg)
    } finally {
      setModalLoading(false)
    }
  }

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to permanently delete member "${name}"?`)) {
      return
    }

    try {
      if (activeTab === 'DEV') {
        await api.delete(`/users/dev/${id}`)
      } else {
        await api.delete(`/users/ae/${id}`)
      }
      setSuccessMsg(`Deleted member "${name}".`)
      setTimeout(() => setSuccessMsg(''), 4000)
      fetchUsers()
    } catch {
      alert('Failed to delete member.')
    }
  }

  // Filter current tab members
  const currentList = activeTab === 'DEV' ? devUsers : aeUsers
  const filteredList = currentList.filter((u) => {
    const name = activeTab === 'DEV' ? u.devName : u.aeName
    const role = u.role || ''
    const team = u.team || ''
    const q = searchTerm.toLowerCase()
    return (
      (name || '').toLowerCase().includes(q) ||
      role.toLowerCase().includes(q) ||
      team.toLowerCase().includes(q)
    )
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gh-border">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold tracking-tight text-stone-900">
              User Directory
            </h1>
            <span className="badge-role">Admin Only</span>
          </div>
          <p className="text-xs text-stone-500 mt-0.5">
            Manage access and accounts for DevSupport and GeneralSupport members.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchUsers}
            disabled={loading}
            className="btn-secondary"
          >
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={openAddModal}
            className="btn-primary"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Add {activeTab === 'DEV' ? 'Dev Engineer' : 'General Support'}</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="p-3 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {error && (
        <div className="p-3 rounded-md bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 text-red-500" />
          <span>{error}</span>
        </div>
      )}

      {/* Integrated Tabs & Search Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1 bg-stone-100/70 p-0.5 rounded-md border border-stone-200/50 self-start sm:self-auto">
          <button
            onClick={() => setActiveTab('DEV')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors ${
              activeTab === 'DEV'
                ? 'bg-white text-stone-900 font-semibold shadow-sm'
                : 'text-stone-500 hover:text-stone-900'
            }`}
          >
            <Terminal className="w-3 h-3 opacity-70" />
            <span>Dev Support</span>
            <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-stone-100 text-stone-600 font-normal">
              {devUsers.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('AE')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors ${
              activeTab === 'AE'
                ? 'bg-white text-stone-900 font-semibold shadow-sm'
                : 'text-stone-500 hover:text-stone-900'
            }`}
          >
            <Users className="w-3 h-3 opacity-70" />
            <span>General Support (AE)</span>
            <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-stone-100 text-stone-600 font-normal">
              {aeUsers.length}
            </span>
          </button>
        </div>

        <div className="relative w-full sm:w-80">
          <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={`Filter ${activeTab === 'DEV' ? 'devs' : 'AEs'}...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input pl-8"
          />
        </div>
      </div>

      {/* Directory Table (Page-Integrated, Zero Box Shadows) */}
      <div className="bg-white border border-gh-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FAFAF9] border-b border-gh-border text-[11px] font-medium uppercase tracking-wider text-stone-500">
                <tr>
                  <th className="py-3.5 px-6">Member</th>
                  <th className="py-3.5 px-6">Role & Team</th>
                  {activeTab === 'DEV' && <th className="py-3.5 px-6">Permission / Type</th>}
                  {activeTab === 'DEV' && <th className="py-3.5 px-6">Password Status</th>}
                  <th className="py-3.5 px-6">Joined / Created</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gh-border">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-gh-muted">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-gh-green" />
                      Loading team members...
                    </td>
                  </tr>
                ) : filteredList.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-gh-muted">
                      No team members found matching your search.
                    </td>
                  </tr>
                ) : (
                  filteredList.map((user) => {
                    const id = activeTab === 'DEV' ? user.devId : user.aeId
                    const name = activeTab === 'DEV' ? user.devName : user.aeName
                    const isAdminUser = activeTab === 'DEV' && user.type === 'admin'

                    return (
                      <tr key={id} className="hover:bg-gh-neutral/40 transition-colors">
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs ${
                                activeTab === 'DEV'
                                  ? 'bg-gh-greenLight text-gh-greenDark'
                                  : 'bg-emerald-100/70 text-emerald-800'
                              }`}
                            >
                              {name ? name.slice(0, 2).toUpperCase() : 'U'}
                            </div>
                            <div>
                              <div className="font-bold text-gh-text">{name}</div>
                              <div className="text-[11px] text-gh-muted">ID: #{id}</div>
                            </div>
                          </div>
                        </td>

                        <td className="py-4 px-6">
                          <div className="font-medium text-gh-text">{user.role || 'Member'}</div>
                          <div className="text-xs text-gh-muted flex items-center gap-1 mt-0.5">
                            <Building2 className="w-3 h-3 text-gh-lightMuted" />
                            {user.team || 'Standard Support'}
                          </div>
                        </td>

                        {activeTab === 'DEV' && (
                          <td className="py-4 px-6">
                            {isAdminUser ? (
                              <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800 bg-emerald-100/80 px-2.5 py-1 rounded-md border border-emerald-200">
                                <Shield className="w-3 h-3" /> Admin
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-700 bg-gray-100 px-2.5 py-1 rounded-md border border-gray-200">
                                <Terminal className="w-3 h-3" /> Developer
                              </span>
                            )}
                          </td>
                        )}

                        {activeTab === 'DEV' && (
                          <td className="py-4 px-6">
                            {user.passwordOnboard ? (
                              <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                <UserCheck className="w-3 h-3" /> Active
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                                <Clock className="w-3 h-3" /> Needs 1st Login
                              </span>
                            )}
                          </td>
                        )}

                        <td className="py-4 px-6 text-xs text-gh-muted">
                          {user.createdAt
                            ? new Date(user.createdAt).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })
                            : 'System'}
                          <div className="text-[11px] text-gh-lightMuted mt-0.5">
                            by {user.createdBy || 'Admin'}
                          </div>
                        </td>

                        <td className="py-4 px-6 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => openEditModal(user)}
                              className="p-1.5 text-gh-muted hover:text-gh-text hover:bg-gh-neutral rounded-md transition-colors"
                              title="Edit member"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(id, name)}
                              className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
                              title="Delete member"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Add/Edit Modal */}
        {showModal && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-modal border border-gh-border">
              <div className="flex items-center justify-between pb-4 border-b border-gh-border mb-5">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-gh-greenLight text-gh-greenDark">
                    <UserPlus className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gh-text">
                      {isEditing ? 'Edit' : 'Add'} {activeTab === 'DEV' ? 'DevSupport Member' : 'GeneralSupport (AE)'}
                    </h3>
                    <p className="text-xs text-gh-muted">Configure member account and permissions</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gh-muted hover:text-gh-text p-1.5 rounded-lg hover:bg-gh-neutral"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="label">
                    Full Name / Handle <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. alex_chen"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="input"
                    disabled={modalLoading}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">
                      Role / Title <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Senior Lead"
                      value={formRole}
                      onChange={(e) => setFormRole(e.target.value)}
                      className="input"
                      disabled={modalLoading}
                    />
                  </div>

                  <div>
                    <label className="label">Team / Pod</label>
                    <input
                      type="text"
                      placeholder="e.g. Core Platform"
                      value={formTeam}
                      onChange={(e) => setFormTeam(e.target.value)}
                      className="input"
                      disabled={modalLoading}
                    />
                  </div>
                </div>

                {activeTab === 'DEV' && (
                  <>
                    <div>
                      <label className="label">Access Role</label>
                      <select
                        value={formType}
                        onChange={(e) => setFormType(e.target.value)}
                        className="input"
                        disabled={modalLoading}
                      >
                        <option value="dev">Developer (Operations & Sessions)</option>
                        <option value="admin">Administrator (Full Access & User Mgmt)</option>
                      </select>
                    </div>

                    <div>
                      <label className="label">
                        {isEditing ? 'Update Password (optional)' : 'Initial Temporary Password'}{' '}
                        {!isEditing && <span className="text-red-500">*</span>}
                      </label>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-gh-muted absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="password"
                          required={!isEditing}
                          placeholder={isEditing ? 'Leave blank to keep current' : 'Temporary onboarding password'}
                          value={formPassword}
                          onChange={(e) => setFormPassword(e.target.value)}
                          className="input pl-10"
                          disabled={modalLoading}
                        />
                      </div>
                      <p className="text-[11px] text-gh-muted mt-1.5">
                        {isEditing
                          ? 'Only fill this if you want to reset their password.'
                          : 'Member will be prompted to replace this on their very first sign-in.'}
                      </p>
                    </div>
                  </>
                )}

                <div className="pt-3 flex items-center justify-end gap-3 border-t border-gh-border">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="btn-secondary text-xs"
                    disabled={modalLoading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-primary text-xs"
                    disabled={modalLoading}
                  >
                    {modalLoading ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Member'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
    </div>
  )
}
