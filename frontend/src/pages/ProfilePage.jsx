import { useState } from 'react'
import { useAuthStore } from '../store/authStore'
import { getInitials } from '../utils/format'
import { useNavigate } from 'react-router-dom'

export default function ProfilePage() {
  const user = useAuthStore(s => s.user)
  const logout = useAuthStore(s => s.logout)
  const navigate = useNavigate()

  // Mock static data for the profile stats
  const mockStats = {
    matchesPlayed: 45,
    wins: 31,
    losses: 14,
    rating: 4.2,
    friends: 12,
    registeredDate: '2023-11-15'
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'long', day: 'numeric' }
    return new Date(dateString).toLocaleDateString(undefined, options)
  }

  if (!user) return null

  return (
    <div className="p-5 space-y-6">
      <div className="flex flex-col items-center">
        <div className="w-24 h-24 rounded-full bg-[#00C47D] flex items-center justify-center text-[#0d1b2a] font-bold text-4xl mb-4 shadow-lg">
          {getInitials(user.name)}
        </div>
        <h1 className="text-2xl font-bold text-[#0d1b2a]">{user.name}</h1>
        <p className="text-sm text-gray-500">{user.email}</p>
        <p className="text-xs text-gray-400 mt-1">
          Member since {formatDate(mockStats.registeredDate)}
        </p>
      </div>

      <div className="bg-white rounded-2xl p-5 shadow-sm space-y-4">
        <h2 className="font-condensed font-bold text-lg text-[#0d1b2a] uppercase tracking-wide">
          Player Stats
        </h2>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-[#eef1f5] rounded-xl p-3 text-center">
            <p className="text-xs text-gray-500 uppercase font-semibold">Matches</p>
            <p className="text-2xl font-bold text-[#0d1b2a]">{mockStats.matchesPlayed}</p>
          </div>
          <div className="bg-[#eef1f5] rounded-xl p-3 text-center">
            <p className="text-xs text-gray-500 uppercase font-semibold">Rating</p>
            <p className="text-2xl font-bold text-[#0C6A5A]">{mockStats.rating}</p>
          </div>
          <div className="bg-[#eef1f5] rounded-xl p-3 text-center">
            <p className="text-xs text-gray-500 uppercase font-semibold">W / L</p>
            <p className="text-lg font-bold text-[#0C6A5A]">
              {mockStats.wins} <span className="text-gray-400">/</span> <span className="text-red-500">{mockStats.losses}</span>
            </p>
          </div>
          <div className="bg-[#eef1f5] rounded-xl p-3 text-center">
            <p className="text-xs text-gray-500 uppercase font-semibold">Friends</p>
            <p className="text-2xl font-bold text-[#0d1b2a]">{mockStats.friends}</p>
          </div>
        </div>
      </div>

      <button 
        onClick={handleLogout}
        className="w-full py-3 rounded-full border border-red-500 text-red-500 font-bold hover:bg-red-50 transition-colors"
      >
        Log Out
      </button>
    </div>
  )
}
