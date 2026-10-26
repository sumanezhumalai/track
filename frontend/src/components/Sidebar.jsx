import React from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Radio,
  Layers,
  Users2,
  LineChart,
  LogOut,
  Shield,
  Terminal,
} from 'lucide-react'
import api from '../api/axios'
import egsLogo from '../assets/egs.png'
import fingerprintSvg from '../assets/fingerprint.svg'
import { getAvatarInitials, getStoredUser } from '../lib/avatar'

export default function Sidebar() {
  const navigate = useNavigate()
  const user = getStoredUser()
  const isAdmin = user.isAdmin

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout')
    } catch {
      // ignore
    } finally {
      localStorage.removeItem('user')
      navigate('/')
    }
  }

  const getInitials = (name) => getAvatarInitials(name)

  return (
    <aside className="w-60 bg-white border-r border-gh-border h-full flex flex-col justify-between shrink-0 select-none z-10 relative overflow-hidden">
      <div>
        {/* Greenhouse-style Clean Brand Header */}
        <div className="h-16 flex items-center gap-3 px-5 border-b border-gh-border">
          <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0 shadow-sm border border-stone-200/80 bg-white flex items-center justify-center p-0.5">
            <img
              src={egsLogo}
              alt="EGS Support"
              className="w-full h-full object-contain"
            />
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-sm tracking-tight text-stone-900 truncate">
              EGS Support
            </div>
            <div className="text-[11px] text-stone-400 font-normal truncate">
              Support Analytics
            </div>
          </div>
        </div>

        {/* Navigation Section */}
        <div className="p-3.5 space-y-6">
          <div>
            <div className="px-2.5 text-[10px] uppercase font-semibold tracking-wider text-stone-400 mb-1.5">
              Operations
            </div>
            <nav className="space-y-0.5">
              <NavLink
                to="/dashboard"
                className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
              >
                <LayoutDashboard className="w-3.5 h-3.5 shrink-0 opacity-80" />
                <span>Dashboard</span>
              </NavLink>

              <NavLink
                to="/features"
                className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
              >
                <Layers className="w-3.5 h-3.5 shrink-0 opacity-80" />
                <span>Features & Modules</span>
              </NavLink>

              <NavLink
                to="/sessions"
                className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
              >
                <Radio className="w-3.5 h-3.5 shrink-0 opacity-80" />
                <span>Sessions</span>
              </NavLink>
            </nav>
          </div>

          {isAdmin && (
            <div>
              <div className="px-2.5 text-[10px] uppercase font-semibold tracking-wider text-stone-400 mb-1.5 flex items-center justify-between">
                <span>Management</span>
                <span className="text-[9px] bg-emerald-50 text-emerald-800 px-1 py-0.2 rounded font-medium border border-emerald-200/40">
                  ADMIN
                </span>
              </div>
              <nav className="space-y-0.5">
                <NavLink
                  to="/users"
                  className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                >
                  <Users2 className="w-3.5 h-3.5 shrink-0 opacity-80" />
                  <span>User Management</span>
                </NavLink>

                <NavLink
                  to="/analytics"
                  className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                >
                  <LineChart className="w-3.5 h-3.5 shrink-0 opacity-80" />
                  <span>Team Analytics</span>
                </NavLink>
              </nav>
            </div>
          )}
        </div>
      </div>

      {/* Decorative Fingerprint Linework above bottom user profile */}
      <div className="relative w-full flex-1 pointer-events-none select-none flex items-end justify-end overflow-visible">
        <img
          src={fingerprintSvg}
          alt=""
          className="w-48 h-auto opacity-[0.14] rotate-[15deg] translate-x-6 translate-y-6 pointer-events-none"
        />
      </div>

      {/* User Profile & Sign Out - Page Integrated, No Heavy Boxes */}
      <div className="p-3 border-t border-gh-border relative z-10 bg-white">
        <div className="flex items-center justify-between gap-2 px-2.5 py-2 rounded-md hover:bg-stone-50 transition-colors">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-full bg-stone-100 text-stone-700 font-semibold text-[11px] flex items-center justify-center shrink-0 border border-stone-200">
              {getInitials(user.name)}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-medium text-stone-900 truncate">{user.name}</div>
              <div className="flex items-center gap-1">
                {isAdmin ? (
                  <span className="text-[10px] text-emerald-700 font-medium">Admin</span>
                ) : (
                  <span className="text-[10px] text-stone-400 font-medium">Engineer</span>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={handleLogout}
            title="Sign Out"
            className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  )
}
