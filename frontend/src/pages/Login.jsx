import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, AlertCircle, GripVertical } from 'lucide-react'
import api from '../api/axios'
import topographyPattern from '../assets/topography.svg'
import portraitImg from '../assets/hero-portrait.jpg'

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
    <div className="h-screen w-screen flex overflow-hidden bg-white text-stone-900">
      {/* Left Artwork Panel: Deep Green with Topography Linework & Leaf Portrait Cutout */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#0E3A24] relative overflow-hidden items-center justify-center p-12 select-none">
        {/* Topography Ambient Watermark */}
        <div
          className="absolute inset-0 bg-repeat opacity-[0.14] pointer-events-none invert mix-blend-screen"
          style={{
            backgroundImage: `url(${topographyPattern})`,
            backgroundSize: '450px 450px',
          }}
        />

        {/* Ambient glow effects */}
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-emerald-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-emerald-800/30 rounded-full blur-3xl pointer-events-none" />

        {/* Leaf Portrait Artwork Container */}
        <div className="relative z-10 w-[360px] h-[480px] max-w-full flex items-center justify-center">
          {/* Background Shadow Leaf with Etching Accent */}
          <svg
            viewBox="0 0 400 540"
            className="absolute -left-6 -top-4 w-full h-full text-[#082215] opacity-90 drop-shadow-2xl pointer-events-none"
          >
            <path
              d="M 200 15 C 330 90 380 240 330 380 C 290 460 230 500 170 520 C 130 530 100 510 90 470 C 50 330 70 150 200 15 Z"
              fill="currentColor"
            />
          </svg>

          {/* Masked Portrait Leaf Cutout */}
          <div className="relative w-[340px] h-[460px] drop-shadow-[0_20px_35px_rgba(0,0,0,0.45)]">
            <svg className="w-full h-full" viewBox="0 0 400 540">
              <defs>
                <clipPath id="leafClip" clipPathUnits="userSpaceOnUse">
                  <path d="M 200 15 C 330 90 380 240 330 380 C 290 460 230 500 170 520 C 130 530 100 510 90 470 C 50 330 70 150 200 15 Z" />
                </clipPath>
              </defs>
              <image
                href={portraitImg}
                x="-20"
                y="35"
                width="440"
                height="490"
                preserveAspectRatio="xMidYMid meet"
                clipPath="url(#leafClip)"
              />
              <path
                d="M 200 15 C 330 90 380 240 330 380 C 290 460 230 500 170 520 C 130 530 100 510 90 470 C 50 330 70 150 200 15 Z"
                fill="none"
                stroke="#1B633C"
                strokeWidth="2.5"
                className="opacity-40"
              />
            </svg>
          </div>

          {/* Floating Live Telemetry Card (Inspired by Greenhouse list card) */}
          <div className="absolute -top-6 -right-3 w-52 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-white/60 overflow-hidden select-none z-20">
            <div className="px-3.5 py-2.5 bg-stone-50/90 border-b border-stone-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                <span className="text-[11px] font-semibold tracking-tight text-stone-800">
                  Live telemetry
                </span>
              </div>
              <span className="text-[9px] font-semibold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded-full border border-emerald-200/60">
                Active
              </span>
            </div>

            <div className="p-2 space-y-0.5">
              <div className="flex items-center gap-2 px-2 py-1.5 rounded text-stone-700">
                <GripVertical className="w-3 h-3 text-stone-300 shrink-0" />
                <span className="text-xs font-medium text-stone-800 tracking-tight">Active sessions</span>
              </div>
              <div className="flex items-center gap-2 px-2 py-1.5 rounded text-stone-700 border-t border-stone-100/80">
                <GripVertical className="w-3 h-3 text-stone-300 shrink-0" />
                <span className="text-xs font-medium text-stone-800 tracking-tight">Live stopwatches</span>
              </div>
              <div className="flex items-center gap-2 px-2 py-1.5 rounded text-stone-700 border-t border-stone-100/80">
                <GripVertical className="w-3 h-3 text-stone-300 shrink-0" />
                <span className="text-xs font-medium text-stone-800 tracking-tight">Escalation routing</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Page-Integrated Form Panel (Zero Card Box, Pure Direct Canvas Placement) */}
      <div className="w-full lg:w-1/2 h-full overflow-y-auto flex items-center justify-center p-8 sm:p-14 lg:p-20 bg-white relative">
        <div className="w-full max-w-md relative z-10">
          {/* Greenhouse-style Brand Header */}
          <div className="mb-8">
            <span className="font-sans font-bold text-2xl tracking-tight text-stone-900 lowercase">
              egs support
            </span>
          </div>

          {/* Catchy Editorial Heading (UntitledSerif-Regular / Newsreader) */}
          <h1 className="font-untitled text-4xl sm:text-5xl text-stone-900 font-normal tracking-tight leading-[1.14] mb-3">
            <em className="italic">Resolve</em> for<br />
            what’s next.
          </h1>

          <p className="text-stone-600 text-sm leading-relaxed mb-8 max-w-sm">
            Search smarter, track faster, and take control of team escalations with EGS Support.
          </p>

          {/* Error Message */}
          {error && (
            <div className="mb-5 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          {/* Direct Integrated Form */}
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

          {/* Quiet Guidance & Legal Notes */}
          <div className="mt-8 text-xs text-stone-500 leading-relaxed">
            By continuing, you agree to the{' '}
            <span className="text-emerald-800 hover:underline cursor-pointer">Security Policy</span>{' '}
            and{' '}
            <span className="text-emerald-800 hover:underline cursor-pointer">Operational Guidelines</span>.
          </div>


        </div>
      </div>
    </div>
  )
}
