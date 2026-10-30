import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import api from '../api/axios'
import AuthLayout from '../components/AuthLayout'

export default function SetPassword() {
  const navigate = useNavigate()
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!newPassword || !confirmPassword) {
      setError('Please fill in both password fields.')
      return
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long.')
      return
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match. Please verify.')
      return
    }

    setLoading(true)
    setError('')

    try {
      await api.patch('/auth/change-password', { newPassword })

      const raw = localStorage.getItem('user')
      if (raw) {
        const user = JSON.parse(raw)
        localStorage.setItem(
          'user',
          JSON.stringify({ ...user, passwordOnboard: true })
        )
      }

      navigate('/dashboard')
    } catch (err) {
      if (err.response && err.response.data && err.response.data.message) {
        setError(err.response.data.message)
      } else if (err.response && err.response.status === 401) {
        setError('Session expired. Please sign in again.')
        navigate('/')
      } else {
        setError('Failed to update password. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout
      badge="Required"
      telemetryTitle="Security gate"
      telemetryItems={['Permanent key', 'Credential verify', 'Workspace access']}
      heading={
        <>
          <em className="italic">Define</em> your<br />
          new workspace.
        </>
      }
      description="Initial account onboarding requires setting your permanent password before entering the operational portal."
      error={error}
      footer={
        <div className="mt-12 text-xs text-stone-500 border-t border-stone-100 pt-6">
          Need assistance with account credentials? Contact your system administrator.
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="relative">
          <input
            id="newPassword"
            type={showPassword ? 'text' : 'password'}
            required
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="New Password (min. 6 characters)"
            className="w-full h-12 px-4 pr-11 rounded-lg border border-stone-300 bg-white text-stone-900 text-sm placeholder:text-stone-400 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition-colors"
            disabled={loading}
            autoFocus
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 transition-colors p-1"
            tabIndex={-1}
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>

        <div>
          <input
            id="confirmPassword"
            type={showPassword ? 'text' : 'password'}
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm New Password"
            className="w-full h-12 px-4 rounded-lg border border-stone-300 bg-white text-stone-900 text-sm placeholder:text-stone-400 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition-colors"
            disabled={loading}
          />
        </div>

        <div className="p-3 rounded-lg bg-stone-50 border border-stone-200/60 text-xs text-stone-600 space-y-1">
          <p className="font-medium text-stone-700">Security criteria:</p>
          <p>• Must be at least 6 characters in length</p>
          <p>• Will be your permanent credential for future logins</p>
        </div>

        <div className="pt-2 flex items-center gap-3">
          <button
            type="submit"
            disabled={loading}
            className="bg-[#2B6CB0] hover:bg-[#205493] text-white px-7 py-3 rounded-lg text-sm font-medium transition-colors shadow-sm disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Set Password & Enter'}
          </button>
        </div>
      </form>
    </AuthLayout>
  )
}
