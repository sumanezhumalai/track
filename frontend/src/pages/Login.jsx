import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import api from '../api/axios'
import AuthLayout from '../components/AuthLayout'

export default function Login() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name.trim() || !password) {
      setError('Please provide both username and password.')
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await api.post('/auth/login', {
        name: name.trim(),
        password,
      })

      const data = response.data
      const userData = {
        name: data.name,
        role: data.role,
        passwordOnboard: data.passwordOnboard,
      }
      localStorage.setItem('user', JSON.stringify(userData))

      if (data.passwordOnboard === false) {
        navigate('/set-password')
      } else {
        navigate('/dashboard')
      }
    } catch (err) {
      if (err.response && (err.response.status === 401 || err.response.status === 400)) {
        setError('Invalid username or password. Please try again.')
      } else if (err.code === 'ERR_NETWORK') {
        setError('Cannot connect to server. Please verify backend is running.')
      } else {
        setError('An unexpected error occurred during sign in.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout
      badge="Active"
      telemetryTitle="Live telemetry"
      telemetryItems={['Active sessions', 'Live stopwatches', 'Escalation routing']}
      heading={
        <>
          <em className="italic">Resolve</em> for<br />
          what’s next.
        </>
      }
      description="Search smarter, track faster, and take control of team escalations with EGS Support."
      error={error}
      footer={
        <div className="mt-8 text-xs text-stone-500 leading-relaxed">
          By continuing, you agree to the{' '}
          <span className="text-emerald-800 hover:underline cursor-pointer">Security Policy</span>{' '}
          and{' '}
          <span className="text-emerald-800 hover:underline cursor-pointer">Operational Guidelines</span>.
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <input
            id="username"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Username / Member name"
            className="w-full h-12 px-4 rounded-lg border border-stone-300 bg-white text-stone-900 text-sm placeholder:text-stone-400 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition-colors"
            autoFocus
          />
        </div>

        <div className="relative">
          <input
            id="password"
            type={showPassword ? 'text' : 'password'}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="w-full h-12 px-4 pr-11 rounded-lg border border-stone-300 bg-white text-stone-900 text-sm placeholder:text-stone-400 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition-colors"
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

        <div className="pt-2 flex items-center gap-3">
          <button
            type="submit"
            disabled={loading}
            className="bg-[#2B6CB0] hover:bg-[#205493] text-white px-7 py-3 rounded-lg text-sm font-medium transition-colors shadow-sm disabled:opacity-50"
          >
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </div>
      </form>
    </AuthLayout>
  )
}
