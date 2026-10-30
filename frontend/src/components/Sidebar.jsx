import React from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Radio,
  Layers,
  Users2,
  LineChart,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react'
import api from '../api/axios'
import egsLogo from '../assets/egs.png'
import fingerprintSvg from '../assets/fingerprint.svg'
import { getAvatarInitials, getStoredUser } from '../lib/avatar'
import { cn } from '../lib/utils'

export default function Sidebar() {
  const navigate = useNavigate()
  const user = getStoredUser()
  const isAdmin = user.isAdmin

  const [isCollapsed, setIsCollapsed] = React.useState(() => {
    return localStorage.getItem('egs_sidebar_collapsed') === 'true'
  })

  const toggleCollapsed = () => {
    setIsCollapsed(prev => {
      const next = !prev
      localStorage.setItem('egs_sidebar_collapsed', String(next))
      return next
    })
  }

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
    <aside
      className={cn(
        'bg-white border-r border-gh-border h-full flex flex-col justify-between shrink-0 select-none z-20 relative overflow-hidden transition-all duration-300 ease-in-out',
        isCollapsed ? 'w-16' : 'w-60'
      )}
    >
      <div>
        {/* Brand Header & Toggle */}
        <div
          className={cn(
            'h-16 flex items-center border-b border-gh-border transition-all duration-300',
            isCollapsed ? 'justify-center px-2' : 'justify-between px-4'
          )}
        >
          {!isCollapsed ? (
            <>
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0 shadow-xs border border-stone-200/80 bg-white flex items-center justify-center p-0.5">
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
              <button
                onClick={toggleCollapsed}
                title="Collapse sidebar"
                className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-md transition-colors cursor-pointer"
                aria-label="Collapse sidebar"
              >
                <PanelLeftClose className="w-4 h-4" />
              </button>
            </>
          ) : (
            <button
              onClick={toggleCollapsed}
              title="Expand sidebar"
              className="w-10 h-10 rounded-lg flex items-center justify-center hover:bg-stone-100 text-stone-600 transition-colors group cursor-pointer relative"
              aria-label="Expand sidebar"
            >
              <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0 shadow-xs border border-stone-200/80 bg-white flex items-center justify-center p-0.5 group-hover:opacity-0 transition-opacity">
                <img
                  src={egsLogo}
                  alt="EGS Support"
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="absolute inset-0 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-stone-100 text-stone-700">
                <PanelLeftOpen className="w-4 h-4" />
              </div>
            </button>
          )}
        </div>

        {/* Navigation Section */}
        <div className={cn('space-y-5 transition-all duration-300', isCollapsed ? 'p-2' : 'p-3.5')}>
          <div>
            {!isCollapsed ? (
              <div className="px-2.5 text-[10px] uppercase font-semibold tracking-wider text-stone-400 mb-1.5">
                Operations
              </div>
            ) : (
              <div className="my-1.5 border-t border-stone-100" />
            )}
            <nav className="space-y-1">
              <NavLink
                to="/dashboard"
                title={isCollapsed ? 'Dashboard' : undefined}
                className={({ isActive }) =>
                  cn(
                    isCollapsed
                      ? 'w-10 h-10 mx-auto flex items-center justify-center rounded-lg transition-colors'
                      : 'sidebar-link',
                    isActive
                      ? 'bg-gh-greenLight text-gh-greenDark font-semibold'
                      : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100/80'
                  )
                }
              >
                <LayoutDashboard className="w-4 h-4 shrink-0 opacity-80" />
                {!isCollapsed && <span>Dashboard</span>}
              </NavLink>

              <NavLink
                to="/features"
                title={isCollapsed ? 'Features & Modules' : undefined}
                className={({ isActive }) =>
                  cn(
                    isCollapsed
                      ? 'w-10 h-10 mx-auto flex items-center justify-center rounded-lg transition-colors'
                      : 'sidebar-link',
                    isActive
                      ? 'bg-gh-greenLight text-gh-greenDark font-semibold'
                      : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100/80'
                  )
                }
              >
                <Layers className="w-4 h-4 shrink-0 opacity-80" />
                {!isCollapsed && <span>Features & Modules</span>}
              </NavLink>

              <NavLink
                to="/sessions"
                title={isCollapsed ? 'Sessions' : undefined}
                className={({ isActive }) =>
                  cn(
                    isCollapsed
                      ? 'w-10 h-10 mx-auto flex items-center justify-center rounded-lg transition-colors'
                      : 'sidebar-link',
                    isActive
                      ? 'bg-gh-greenLight text-gh-greenDark font-semibold'
                      : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100/80'
                  )
                }
              >
                <Radio className="w-4 h-4 shrink-0 opacity-80" />
                {!isCollapsed && <span>Sessions</span>}
              </NavLink>
            </nav>
          </div>

          {isAdmin && (
            <div>
              {!isCollapsed ? (
                <div className="px-2.5 text-[10px] uppercase font-semibold tracking-wider text-stone-400 mb-1.5 flex items-center justify-between">
                  <span>Management</span>
                  <span className="text-[9px] bg-emerald-50 text-emerald-800 px-1 py-0.2 rounded font-medium border border-emerald-200/40">
                    ADMIN
                  </span>
                </div>
              ) : (
                <div className="my-1.5 border-t border-stone-200/60" />
              )}
              <nav className="space-y-1">
                <NavLink
                  to="/users"
                  title={isCollapsed ? 'User Management' : undefined}
                  className={({ isActive }) =>
                    cn(
                      isCollapsed
                        ? 'w-10 h-10 mx-auto flex items-center justify-center rounded-lg transition-colors'
                        : 'sidebar-link',
                      isActive
                        ? 'bg-gh-greenLight text-gh-greenDark font-semibold'
                        : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100/80'
                    )
                  }
                >
                  <Users2 className="w-4 h-4 shrink-0 opacity-80" />
                  {!isCollapsed && <span>User Management</span>}
                </NavLink>

                <NavLink
                  to="/analytics"
                  title={isCollapsed ? 'Team Analytics' : undefined}
                  className={({ isActive }) =>
                    cn(
                      isCollapsed
                        ? 'w-10 h-10 mx-auto flex items-center justify-center rounded-lg transition-colors'
                        : 'sidebar-link',
                      isActive
                        ? 'bg-gh-greenLight text-gh-greenDark font-semibold'
                        : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100/80'
                    )
                  }
                >
                  <LineChart className="w-4 h-4 shrink-0 opacity-80" />
                  {!isCollapsed && <span>Team Analytics</span>}
                </NavLink>
              </nav>
            </div>
          )}
        </div>
      </div>

      {/* Decorative Fingerprint Linework (visible when expanded) */}
      {!isCollapsed && (
        <div className="relative w-full flex-1 pointer-events-none select-none flex items-end justify-end overflow-visible">
          <img
            src={fingerprintSvg}
            alt=""
            className="w-48 h-auto opacity-[0.14] rotate-[15deg] translate-x-6 translate-y-6 pointer-events-none"
          />
        </div>
      )}

      {/* User Profile & Sign Out */}
      <div
        className={cn(
          'border-t border-gh-border relative z-10 bg-white transition-all duration-300',
          isCollapsed ? 'p-2' : 'p-3'
        )}
      >
        {!isCollapsed ? (
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
              className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 py-1">
            <div
              title={`${user.name} (${isAdmin ? 'Admin' : 'Engineer'})`}
              className="w-8 h-8 rounded-full bg-stone-100 text-stone-700 font-semibold text-[11px] flex items-center justify-center shrink-0 border border-stone-200 shadow-2xs"
            >
              {getInitials(user.name)}
            </div>
            <button
              onClick={handleLogout}
              title="Sign Out"
              className="w-8 h-8 flex items-center justify-center text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </aside>
  )
}
