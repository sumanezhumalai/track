import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import SetPassword from './pages/SetPassword'
import Dashboard from './pages/Dashboard'
import Sessions from './pages/Sessions'
import UserManagement from './pages/UserManagement'
import TeamAnalytics from './pages/TeamAnalytics'
import ProtectedRoute from './components/ProtectedRoute'
import AppLayout from './components/AppLayout'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/set-password" element={<SetPassword />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <AppLayout>
              <Dashboard />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/sessions"
        element={
          <ProtectedRoute>
            <AppLayout>
              <Sessions />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/users"
        element={
          <ProtectedRoute roles={['admin']}>
            <AppLayout>
              <UserManagement />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/analytics"
        element={
          <ProtectedRoute roles={['admin']}>
            <AppLayout>
              <TeamAnalytics />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
