import { useAuthStore } from '../store/authStore'
import { getInitials } from '../utils/format'

export default function AppHeader() {
  const user = useAuthStore(s => s.user)

  return (
    <div className="bg-[#0d1b2a] px-5 pt-5 pb-4 text-white">
      <div className="flex items-center justify-between mb-1">
        <span className="font-condensed text-2xl font-extrabold tracking-tight">
          <span className="text-[#00C47D]">Court</span>IQ
        </span>
        {user && (
          <div className="w-9 h-9 rounded-full bg-[#00C47D] flex items-center justify-center text-[#0d1b2a] font-bold text-sm">
            {getInitials(user.name)}
          </div>
        )}
      </div>
      <p className="text-xs text-white/50">Bucharest, Romania</p>
    </div>
  )
}