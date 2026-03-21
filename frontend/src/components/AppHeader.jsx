import { Link } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { getInitials } from '../utils/format'

export default function AppHeader() {
  const user = useAuthStore(s => s.user)

  return (
    <div className="bg-[#0d1b2a] px-5 pt-5 pb-4 text-white">
      <div className="flex items-center justify-between mb-1">
        <Link to={user?.role === 'club' ? "/dashboard" : "/"} className="font-condensed text-2xl font-extrabold tracking-tight hover:opacity-80 transition-opacity">
          <span className="text-[#00C47D]">Court</span>IQ
        </Link>
        {user && (
          <Link to="/profile" className="w-9 h-9 rounded-full bg-[#00C47D] flex items-center justify-center text-[#0d1b2a] font-bold text-sm cursor-pointer hover:scale-105 active:scale-95 transition-transform">
            {getInitials(user.name)}
          </Link>
        )}
      </div>
      <p className="text-xs text-white/50">Bucharest, Romania</p>
    </div>
  )
}