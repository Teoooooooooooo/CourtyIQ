import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { mockUser } from '../mocks/index'
import client from '../api/client'

const USE_MOCKS = import.meta.env.VITE_USE_MOCKS === 'true'

export default function RegisterPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const login = useAuthStore(s => s.login)
  const navigate = useNavigate()

  const handleRegister = async (e) => {
    e.preventDefault()
    setError('')

    if (password !== confirm) {
      setError('Passwords do not match')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    if (USE_MOCKS) {
      login('mock-token-123', { ...mockUser, name, email })
      navigate('/')
      return
    }

    setLoading(true)
    try {
      const { data } = await client.post('/auth/register', { name, email, password })
      login(data.token, data.user)
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed')
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
          <p className="text-slate-400 text-sm mt-2">Create your account</p>
        </div>
        <form onSubmit={handleRegister} className="flex flex-col gap-3">
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            type="text"
            placeholder="Full Name"
            required
            className="border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#00C47D] bg-white transition-colors"
          />
          <input
            value={email}
            onChange={e => setEmail(e.target.value)}
            type="email"
            placeholder="Email"
            required
            className="border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#00C47D] bg-white transition-colors"
          />
          <input
            value={password}
            onChange={e => setPassword(e.target.value)}
            type="password"
            placeholder="Password"
            required
            className="border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#00C47D] bg-white transition-colors"
          />
          <input
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            type="password"
            placeholder="Confirm Password"
            required
            className="border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#00C47D] bg-white transition-colors"
          />
          {error && (
            <p className="text-red-500 text-xs text-center bg-red-50 rounded-lg py-2">{error}</p>
          )}
          <button type="submit" disabled={loading}
            className="bg-[#0d1b2a] text-white rounded-xl py-3 font-semibold text-sm mt-1 disabled:opacity-50 transition-opacity">
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
          <p className="text-center text-xs text-slate-400 mt-1">
            Already have an account?{' '}
            <span onClick={() => navigate('/login')}
              className="text-[#00C47D] cursor-pointer font-medium">
              Log in
            </span>
          </p>
        </form>
      </div>
    </div>
  )
}