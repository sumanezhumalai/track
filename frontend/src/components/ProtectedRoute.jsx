import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'

export default function ProtectedRoute({ children, roles }) {
  const location = useLocation()
  const rawUser = localStorage.getItem('user')
  let user = null

  if (rawUser) {
    try {
      user = JSON.parse(rawUser)
    } catch {
      localStorage.removeItem('user')
    }
  }

  // Not logged in -> redirect to login
  if (!user || !user.name) {
    return <Navigate to="/" state={{ from: location }} replace />
  }

  // Member must change temporary password before accessing any other page
  if (user.passwordOnboard === false) {
    return <Navigate to="/set-password" replace />
  }

  // Role restriction (e.g. ['ADMIN'] or ['admin'])
  if (roles && roles.length > 0) {
    const userRole = (user.role || '').toUpperCase().replace(/^ROLE_/, '')
    const normalizedRequired = roles.map((r) => r.toUpperCase().replace(/^ROLE_/, ''))
    if (!normalizedRequired.includes(userRole)) {
      return <Navigate to="/dashboard" replace />
    }
  }

  return children
}
