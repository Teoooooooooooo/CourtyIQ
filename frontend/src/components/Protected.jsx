import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

export default function Protected({ children }) {
  const token = useAuthStore(s => s.token)
  return token ? children : <Navigate to="/login" replace />
}