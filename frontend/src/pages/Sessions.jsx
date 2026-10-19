import React, { useState, useEffect } from 'react'
import {
  Plus,
  Search,
  RefreshCw,
  StopCircle,
  X,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
} from 'lucide-react'
import SessionCard from '../components/SessionCard'
import api from '../api/axios'

export default function Sessions() {
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL') // 'ALL' | 'ACTIVE' | 'CLOSED'

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEndModal, setShowEndModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedSession, setSelectedSession] = useState(null)

  // Form states
  const [formDevName, setFormDevName] = useState('')
  const [formAeName, setFormAeName] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [modalLoading, setModalLoading] = useState(false)
  const [loadingAe, setLoadingAe] = useState(false)

  // Devs and AEs options for quick dropdown
  const [devOptions, setDevOptions] = useState([])
  const [aeOptions, setAeOptions] = useState([])

  const rawUser = localStorage.getItem('user')
  let user = { name: 'User', role: 'DEV' }
  if (rawUser) {
    try {
      user = JSON.parse(rawUser)
    } catch {
      // ignore
    }
  }
  const isAdmin = (user.role || '').toUpperCase().includes('ADMIN')

  const fetchSessions = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await api.get('/sessions')
      setSessions(res.data || [])
    } catch (err) {
      setError('Failed to load sessions.')
    } finally {
      setLoading(false)
    }
  }

  const fetchUserOptions = async () => {
    setLoadingAe(true)
    try {
      if (isAdmin) {
        const [devRes, aeRes] = await Promise.all([
          api.get('/users/dev').catch(() => ({ data: [] })),
          api.get('/users/ae').catch(() => ({ data: [] })),
        ])
        setDevOptions(devRes.data || [])
        setAeOptions(aeRes.data || [])
      } else {
        const aeRes = await api.get('/users/ae').catch(() => ({ data: [] }))
        setAeOptions(aeRes.data || [])
      }
    } catch {
      // non-fatal
    } finally {
      setLoadingAe(false)
    }
  }

  useEffect(() => {
    fetchSessions()
    fetchUserOptions()
  }, [])

  // Create session
  const handleCreate = async (e) => {
    e.preventDefault()
    if (!formDevName.trim() || !formAeName.trim()) {
      alert('Please fill in both Dev Support and General Support names.')
      return
    }

    setModalLoading(true)
    try {
      await api.post('/sessions', {
        devName: formDevName.trim(),
        aeName: formAeName.trim(),
        sessionDescription: formDescription.trim() || null,
      })
      setShowCreateModal(false)
      setFormDevName('')
      setFormAeName('')
      setFormDescription('')
      setSuccessMsg('Session started successfully.')
      setTimeout(() => setSuccessMsg(''), 4000)
      fetchSessions()
    } catch (err) {
      alert('Failed to start session. Check your permissions.')
    } finally {
      setModalLoading(false)
    }
  }

  // End session
  const handleEndSubmit = async (e) => {
    e.preventDefault()
    if (!selectedSession) return

    setModalLoading(true)
    try {
      await api.put(`/sessions/${selectedSession.sessionId}/end`, {
        sessionDescription: formDescription.trim(),
      })
      setShowEndModal(false)
      setSelectedSession(null)
      setFormDescription('')
      setSuccessMsg('Session completed and closed.')
      setTimeout(() => setSuccessMsg(''), 4000)
      fetchSessions()
    } catch (err) {
      alert('Failed to end session.')
    } finally {
      setModalLoading(false)
    }
  }

  // Edit session
  const handleEditSubmit = async (e) => {
    e.preventDefault()
    if (!selectedSession) return

    setModalLoading(true)
    try {
      await api.put(`/sessions/${selectedSession.sessionId}`, {
        devName: formDevName.trim(),
        aeName: formAeName.trim(),
        sessionDescription: formDescription.trim() || null,
      })
      setShowEditModal(false)
      setSelectedSession(null)
      setFormDevName('')
      setFormAeName('')
      setFormDescription('')
      setSuccessMsg('Session updated.')
      setTimeout(() => setSuccessMsg(''), 4000)
      fetchSessions()
    } catch (err) {
      alert('Failed to update session.')
    } finally {
      setModalLoading(false)
    }
  }

  // Delete session
  const handleDelete = async (id) => {
    if (!window.confirm(`Are you sure you want to permanently delete session #${id}?`)) {
      return
    }
    try {
      await api.delete(`/sessions/${id}`)
      setSuccessMsg(`Session #${id} deleted.`)
      setTimeout(() => setSuccessMsg(''), 4000)
      fetchSessions()
    } catch {
      alert('Failed to delete session.')
    }
  }

  // Open Edit modal
  const openEdit = (session) => {
    setSelectedSession(session)
    setFormDevName(session.devName || '')
    setFormAeName(session.aeName || '')
    setFormDescription(session.sessionDescription || '')
    setShowEditModal(true)
  }

  // Open End modal
  const openEnd = (session) => {
    setSelectedSession(session)
    setFormDescription(session.sessionDescription || '')
    setShowEndModal(true)
  }

  // Filtering
  const filteredSessions = sessions.filter((s) => {
    const matchesSearch =
      (s.devName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.aeName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.sessionDescription || '').toLowerCase().includes(searchTerm.toLowerCase())

    const isClosed = Boolean(s.endTime)
    if (statusFilter === 'ACTIVE' && isClosed) return false
    if (statusFilter === 'CLOSED' && !isClosed) return false
    return matchesSearch
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gh-border">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold tracking-tight text-stone-900">
              Support Sessions
            </h1>
            <span className="badge-role">{sessions.length} total</span>
          </div>
          <p className="text-xs text-stone-500 mt-0.5">
            Active live stopwatches and logged collaboration sessions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchSessions}
            disabled={loading}
            className="btn-secondary"
          >
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={() => {
              setFormDevName(user.name)
              setFormAeName('')
              setFormDescription('')
              fetchUserOptions()
              setShowCreateModal(true)
            }}
            className="btn-primary"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Start Session</span>
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

      {/* Search & Filter Toolbar (Page-Integrated, Zero Box Shadows) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Filter sessions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input pl-8"
          />
        </div>

        <div className="flex items-center gap-1 bg-stone-100/70 p-0.5 rounded-md border border-stone-200/50 self-start sm:self-auto">
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
              statusFilter === 'ALL'
                ? 'bg-white text-stone-900 shadow-sm'
                : 'text-stone-500 hover:text-stone-900'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setStatusFilter('ACTIVE')}
            className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
              statusFilter === 'ACTIVE'
                ? 'bg-white text-emerald-800 font-semibold shadow-sm'
                : 'text-stone-500 hover:text-stone-900'
            }`}
          >
            Active
          </button>
          <button
            onClick={() => setStatusFilter('CLOSED')}
            className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
              statusFilter === 'CLOSED'
                ? 'bg-white text-stone-900 shadow-sm'
                : 'text-stone-500 hover:text-stone-900'
            }`}
          >
            Closed
          </button>
        </div>
      </div>

        {/* Sessions Grid */}
        {loading ? (
          <div className="py-20 text-center text-gh-muted">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-gh-green" />
            <p className="text-sm font-medium">Loading session telemetry...</p>
          </div>
        ) : filteredSessions.length === 0 ? (
          <div className="py-16 text-center text-stone-400">
            <p className="text-sm font-medium text-stone-700">No sessions found</p>
            <p className="text-xs text-stone-400 mt-1 max-w-sm mx-auto">
              {searchTerm || statusFilter !== 'ALL'
                ? 'Try adjusting your search criteria or status filter.'
                : 'Get started by launching a new collaborative session.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredSessions.map((session) => (
              <SessionCard
                key={session.sessionId}
                session={session}
                onEdit={openEdit}
                onEnd={openEnd}
                onDelete={handleDelete}
                isAdmin={isAdmin}
              />
            ))}
          </div>
        )}

        {/* Create Session Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-modal border border-gh-border">
              <div className="flex items-center justify-between pb-4 border-b border-gh-border mb-5">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-gh-greenLight text-gh-greenDark">
                    <Plus className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gh-text">Start Support Session</h3>
                    <p className="text-xs text-gh-muted">Initializes a live stopwatch on creation</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-gh-muted hover:text-gh-text p-1.5 rounded-lg hover:bg-gh-neutral"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="label">DevSupport Engineer</label>
                  <input
                    type="text"
                    required
                    list="dev-suggestions"
                    placeholder="e.g. dev_sarah"
                    value={formDevName}
                    onChange={(e) => setFormDevName(e.target.value)}
                    className="input"
                    readOnly={!isAdmin}
                  />
                  {!isAdmin ? (
                    <p className="text-[11px] text-emerald-700 mt-1 font-medium">
                      Starting session for your engineer account ({user.name}).
                    </p>
                  ) : (
                    <datalist id="dev-suggestions">
                      {devOptions.map((d) => (
                        <option key={d.devId} value={d.devName} />
                      ))}
                    </datalist>
                  )}
                </div>

                <div>
                  <label className="label">
                    GeneralSupport (AE) Engineer <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <select
                      required
                      value={formAeName}
                      onChange={(e) => setFormAeName(e.target.value)}
                      className="input bg-white cursor-pointer pr-10 appearance-none font-medium"
                      disabled={loadingAe}
                    >
                      <option value="" disabled>
                        {loadingAe ? 'Loading GeneralSupport engineers...' : 'Select GeneralSupport engineer...'}
                      </option>
                      {aeOptions.map((ae) => (
                        <option key={ae.aeId || ae.aeName} value={ae.aeName}>
                          {ae.aeName} {ae.team ? `(${ae.team})` : ''} {ae.role ? `• ${ae.role}` : ''}
                        </option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3.5 text-gh-muted">
                      <ChevronDown className="w-4 h-4" />
                    </div>
                  </div>
                  {!loadingAe && aeOptions.length === 0 && (
                    <p className="text-[11px] text-amber-600 mt-1">
                      No GeneralSupport engineers available.
                    </p>
                  )}
                </div>

                <div>
                  <label className="label">Topic / Initial Notes (Optional)</label>
                  <textarea
                    rows={3}
                    placeholder="Brief description of the escalation or issue..."
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    className="input resize-none"
                  />
                </div>

                <div className="pt-3 flex items-center justify-end gap-3 border-t border-gh-border">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
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
                    {modalLoading ? 'Starting...' : 'Start Session'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* End Session Modal */}
        {showEndModal && selectedSession && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-modal border border-gh-border">
              <div className="flex items-center justify-between pb-4 border-b border-gh-border mb-5">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-amber-100 text-amber-700">
                    <StopCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gh-text">End Active Session</h3>
                    <p className="text-xs text-gh-muted">
                      Session #{selectedSession.sessionId} ({selectedSession.devName} ↔ {selectedSession.aeName})
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowEndModal(false)}
                  className="text-gh-muted hover:text-gh-text p-1.5 rounded-lg hover:bg-gh-neutral"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleEndSubmit} className="space-y-4">
                <div>
                  <label className="label">
                    Resolution Reason / Summary <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    rows={4}
                    required
                    placeholder="Provide a reason / resolution description for closing this session..."
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    className="input resize-none"
                  />
                  <p className="text-[11px] text-gh-muted mt-1.5">
                    This note will be permanently logged in the audit trail and team analytics.
                  </p>
                </div>

                <div className="pt-3 flex items-center justify-end gap-3 border-t border-gh-border">
                  <button
                    type="button"
                    onClick={() => setShowEndModal(false)}
                    className="btn-secondary text-xs"
                    disabled={modalLoading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-primary bg-amber-600 hover:bg-amber-700 text-xs"
                    disabled={modalLoading}
                  >
                    {modalLoading ? 'Closing...' : 'Close & End Session'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Session Modal */}
        {showEditModal && selectedSession && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-modal border border-gh-border">
              <div className="flex items-center justify-between pb-4 border-b border-gh-border mb-5">
                <h3 className="text-lg font-bold text-gh-text">Edit Session #{selectedSession.sessionId}</h3>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="text-gh-muted hover:text-gh-text p-1.5 rounded-lg hover:bg-gh-neutral"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleEditSubmit} className="space-y-4">
                <div>
                  <label className="label">DevSupport Engineer</label>
                  <input
                    type="text"
                    required
                    value={formDevName}
                    onChange={(e) => setFormDevName(e.target.value)}
                    className="input"
                    readOnly={!isAdmin}
                  />
                  {!isAdmin && (
                    <p className="text-[11px] text-gh-muted mt-1">
                      Engineer assignment cannot be changed by non-admin.
                    </p>
                  )}
                </div>

                <div>
                  <label className="label">
                    GeneralSupport (AE) Engineer <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <select
                      required
                      value={formAeName}
                      onChange={(e) => setFormAeName(e.target.value)}
                      className="input bg-white cursor-pointer pr-10 appearance-none font-medium"
                    >
                      <option value="" disabled>Select GeneralSupport engineer...</option>
                      {aeOptions.map((ae) => (
                        <option key={ae.aeId || ae.aeName} value={ae.aeName}>
                          {ae.aeName} {ae.team ? `(${ae.team})` : ''} {ae.role ? `• ${ae.role}` : ''}
                        </option>
                      ))}
                      {formAeName && !aeOptions.some((a) => a.aeName === formAeName) && (
                        <option value={formAeName}>{formAeName}</option>
                      )}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3.5 text-gh-muted">
                      <ChevronDown className="w-4 h-4" />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="label">Session Description / Resolution</label>
                  <textarea
                    rows={3}
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    className="input resize-none"
                  />
                </div>

                <div className="pt-3 flex items-center justify-end gap-3 border-t border-gh-border">
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
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
                    {modalLoading ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
    </div>
  )
}
