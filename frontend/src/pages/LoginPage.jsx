import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { mockUser } from '../mocks/index'
import client from '../api/client'

const USE_MOCKS = import.meta.env.VITE_USE_MOCKS === 'true'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const login = useAuthStore(s => s.login)
  const navigate = useNavigate()

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')

    if (USE_MOCKS) {
      login('mock-token-123', mockUser)
      if (mockUser.role === 'club') {
        navigate('/dashboard')
      } else {
        navigate('/')
      }
      return
    }

    setLoading(true)
    try {
      const { data } = await client.post('/auth/login', { email, password })
      login(data.token, data.user)
      if (data.user.role === 'club') {
        navigate('/dashboard')
      } else {
        navigate('/')
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex-1 flex items-center justify-center p-6">
      <div className="w-full">
        <div className="text-center mb-8">
          <span className="font-condensed text-4xl font-extrabold">
            <span className="text-[#00C47D]">Court</span>
            <span className="text-[#0d1b2a]">IQ</span>
          </span>
          <p className="text-slate-400 text-sm mt-2">Book your next padel match</p>
        </div>
        <form onSubmit={handleLogin} className="flex flex-col gap-3">
          <input
            value={email}
            onChange={e => setEmail(e.target.value)}
            type="email"
            placeholder="Email"
            className="border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#00C47D] bg-white transition-colors"
          />
          <input
            value={password}
            onChange={e => setPassword(e.target.value)}
            type="password"
            placeholder="Password"
            className="border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#00C47D] bg-white transition-colors"
          />
          {error && (
            <p className="text-red-500 text-xs text-center bg-red-50 rounded-lg py-2">{error}</p>
          )}
          <button type="submit" disabled={loading}
            className="bg-[#0d1b2a] text-white rounded-xl py-3 font-semibold text-sm mt-1 disabled:opacity-50 transition-opacity">
            {loading ? 'Logging in...' : 'Log in'}
          </button>
          <p className="text-center text-xs text-slate-400 mt-1">
            No account?{' '}
            <span onClick={() => navigate('/register')}
              className="text-[#00C47D] cursor-pointer font-medium">
              Register
            </span>
          </p>
        </form>
        <div className="mt-6 p-3 bg-slate-50 rounded-xl border border-slate-200">
          <p className="text-xs text-slate-400 text-center mb-2">Demo credentials</p>
          <p className="text-xs text-center font-mono text-slate-600">demo@courtiq.com / demo123</p>
        </div>
      </div>
    </div>
  )
}