import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

export default function Protected({ children, clubOnly = false }) {
  const token = useAuthStore(s => s.token)
  const user = useAuthStore(s => s.user)
  const { pathname } = useLocation()

  if (!token) return <Navigate to="/login" replace />

  // Club users can access /dashboard and /profile
  if (user?.role === 'club' && pathname !== '/dashboard' && pathname !== '/profile') {
    return <Navigate to="/dashboard" replace />
  }

  // Player users cannot access /dashboard
  if (user?.role !== 'club' && pathname === '/dashboard') {
    return <Navigate to="/" replace />
  }

  return children
}