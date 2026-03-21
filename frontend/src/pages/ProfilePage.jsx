import { useState, useEffect } from 'react'
import { useAuthStore } from '../store/authStore'
import { getInitials } from '../utils/format'
import { useNavigate } from 'react-router-dom'
import client from '../api/client'

export default function ProfilePage() {
  const user = useAuthStore(s => s.user)
  const token = useAuthStore(s => s.token)
  const logout = useAuthStore(s => s.logout)
  const navigate = useNavigate()

  const [fullData, setFullData] = useState(null)
  const [matches, setMatches] = useState([])
  const [loading, setLoading] = useState(true)
  const refreshTrigger = useAuthStore(s => s.refreshTrigger)

  useEffect(() => {
    async function fetchData() {
      if (!token) return
      setLoading(true)
      try {
        const [profileRes, matchesRes] = await Promise.all([
          client.get('/users/me'),
          client.get('/matches/me')
        ])
        setFullData(profileRes.data)
        setMatches(matchesRes.data || [])
      } catch (err) {
        console.error("Failed to fetch profile data", err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [token, refreshTrigger])

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    const options = { year: 'numeric', month: 'long', day: 'numeric' }
    return new Date(dateString).toLocaleDateString(undefined, options)
  }

  if (!user) return null

  // Use fetched data if available, otherwise fallback to local user and defaults
  const profile = fullData?.profile || {}
  const stats = profile.stats || { wins: 0, losses: 0, lastFive: [] }
  const subscription = fullData?.subscription || { tier: 'Basic', creditsRemaining: 0 }
  const loyaltyPoints = fullData?.loyaltyTotal ?? 0
  const createdAt = fullData?.createdAt || user.createdAt

  if (loading && !fullData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#00C47D]"></div>
      </div>
    )
  }

  // Derive stats from matches array for accuracy
  const derivedWins = matches.filter(m => {
    const isTeam1 = m.team1Ids.includes(user.id);
    return (isTeam1 && m.winnerTeam === 1) || (!isTeam1 && m.winnerTeam === 2);
  }).length;

  const derivedLosses = matches.filter(m => {
    const isTeam1 = m.team1Ids.includes(user.id);
    const hasWinner = m.winnerTeam === 1 || m.winnerTeam === 2;
    return hasWinner && ((isTeam1 && m.winnerTeam === 2) || (!isTeam1 && m.winnerTeam === 1));
  }).length;

  return (
    <div className="p-5 pb-10 space-y-6 bg-gray-50 min-h-screen font-sans">
      <div className="flex flex-col items-center">
        <div className="w-24 h-24 rounded-full bg-[#00C47D] flex items-center justify-center text-[#0d1b2a] font-bold text-4xl mb-4 shadow-lg border-4 border-white transition-transform hover:scale-105">
          {getInitials(user.name)}
        </div>
        <h1 className="text-2xl font-bold text-[#0d1b2a]">{user.name}</h1>
        <p className="text-sm text-gray-500 font-medium">{user.email}</p>
        <p className="text-xs text-gray-400 mt-2 bg-white px-4 py-1.5 rounded-full shadow-sm border border-gray-100 uppercase tracking-tighter">
          Member since {formatDate(createdAt)}
        </p>
      </div>

      {user.role === 'club' ? (
        <div className="bg-white rounded-3xl p-6 shadow-xl shadow-gray-200/50 border border-gray-100 flex flex-col items-center">
          <h2 className="font-condensed font-bold text-xl text-[#0d1b2a] uppercase tracking-wide mb-3 text-center">
            Club Management
          </h2>
          <p className="text-sm text-gray-500 text-center mb-6 max-w-sm">
            You are logged in as a Club Administrator. Access the Dashboard to manage your courts, pricing, and bookings.
          </p>
          <button 
            onClick={() => navigate('/dashboard')} 
            className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-[#00C47D] text-[#0d1b2a] font-bold text-sm hover:bg-[#00a066] hover:text-white transition-all shadow-md shadow-[#00C47D]/20 active:scale-95 flex items-center justify-center gap-2"
          >
            Go to Dashboard
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-3xl p-6 shadow-xl shadow-gray-200/50 border border-gray-100 space-y-8">
          <div>
            <div className="flex justify-between items-center mb-5">
              <h2 className="font-condensed font-bold text-xl text-[#0d1b2a] uppercase tracking-wide">
                Player Performance
              </h2>
              <span className="bg-blue-50 text-blue-600 text-[10px] font-bold px-2 py-1 rounded-lg uppercase">Live Data</span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-[#f8fafc] rounded-2xl p-4 text-center border border-blue-50/50 hover:border-blue-100 transition-colors">
                <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-1">Skill Level</p>
                <p className="text-2xl font-black text-[#0d1b2a]">{profile.skillLevel || '3.0'}</p>
              </div>
              <div className="bg-[#f8fafc] rounded-2xl p-4 text-center border border-green-50/50 hover:border-green-100 transition-colors">
                <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-1">ELO Rating</p>
                <p className="text-2xl font-black text-[#00C47D]">{profile.eloRating || '1000'}</p>
              </div>
              <div className="bg-[#f8fafc] rounded-2xl p-4 text-center border border-purple-50/50 hover:border-purple-100 transition-colors">
                <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-1">Match Record</p>
                <p className="text-lg font-black text-[#0d1b2a]">
                  <span className="text-green-600">{derivedWins}W</span>
                  <span className="text-gray-300 mx-1">-</span>
                  <span className="text-red-500">{derivedLosses}L</span>
                </p>
              </div>
              <div className="bg-[#f8fafc] rounded-2xl p-4 text-center border border-orange-50/50 hover:border-orange-100 transition-colors">
                <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-1">Play Style</p>
                <p className="text-sm font-bold text-[#0d1b2a] capitalize">{profile.playStyle || 'All-Court'}</p>
              </div>
            </div>
          </div>

          {/* Matches History Section */}
          <div className="pt-6 border-t border-gray-50">
            <div className="flex justify-between items-end mb-4">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Matches History</h3>
              <span className="text-xl font-black text-[#0d1b2a]">{matches.length} <span className="text-[10px] text-gray-400 uppercase tracking-normal">Played</span></span>
            </div>

            <div className="space-y-3 max-h-[320px] overflow-y-auto pr-2 custom-scrollbar">
              {matches.length > 0 ? (
                matches.map((match) => {
                  const isTeam1 = match.team1Ids.includes(user.id);
                  const isWinner = (isTeam1 && match.winnerTeam === 1) || (!isTeam1 && match.winnerTeam === 2);
                  return (
                    <div key={match.id} className="p-4 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition-all group">
                      <div className="flex justify-between items-center mb-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${isWinner ? 'bg-[#e6faf3] text-[#00a066]' : 'bg-red-50 text-red-500'}`}>
                            {isWinner ? 'W' : 'L'}
                          </div>
                          <div>
                            <p className="font-bold text-sm text-[#0d1b2a] group-hover:text-[#00C47D] transition-colors line-clamp-1">{match.clubName}</p>
                            <p className="text-[10px] text-gray-400 font-medium">
                              {new Date(match.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} • {match.courtName}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`text-xs font-black ${isWinner ? 'text-[#00a066]' : 'text-red-400'}`}>
                            {isWinner ? '+20' : '-15'} <span className="text-[9px] opacity-60">ELO</span>
                          </p>
                        </div>
                      </div>
                      
                      {/* Teams Detail */}
                      <div className="flex items-center justify-between text-[11px] font-medium text-gray-500 bg-gray-50 rounded-xl px-3 py-2 border border-gray-100">
                        <div className={`flex-1 truncate ${isWinner && isTeam1 ? 'text-[#00a066] font-bold' : (!isWinner && isTeam1 ? 'text-gray-400' : '')}`}>
                          {match.team1Names?.join(' & ')}
                        </div>
                        <div className="px-2 text-[9px] text-gray-300 font-black italic">VS</div>
                        <div className={`flex-1 text-right truncate ${isWinner && !isTeam1 ? 'text-[#00a066] font-bold' : (!isWinner && !isTeam1 ? 'text-gray-400' : '')}`}>
                          {match.team2Names?.join(' & ')}
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-12 text-center border-2 border-dashed border-gray-100 rounded-3xl">
                  <p className="text-xs text-gray-400 italic">No matches played yet. Your match history will appear here.</p>
                </div>
              )}
            </div>
          </div>

          <div className="pt-6 border-t border-gray-50">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-5">Membership & Benefits</h3>
            <div className="space-y-4">
              <div className="group relative overflow-hidden p-4 bg-gradient-to-br from-[#0d1b2a] to-[#1a2e44] rounded-2xl text-white shadow-lg shadow-blue-900/10">
                <div className="relative z-10 flex justify-between items-center">
                  <div>
                    <p className="text-[10px] opacity-70 uppercase font-bold mb-0.5">Subscription Tier</p>
                    <p className="font-black text-lg tracking-tight capitalize">{subscription.tier || 'Basic'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] opacity-70 uppercase font-bold mb-0.5">Available Credits</p>
                    <p className="font-black text-lg text-[#00C47D]">{subscription.creditsRemaining || 0}</p>
                  </div>
                </div>
                <div className="absolute top-0 right-0 -mr-4 -mt-4 w-24 h-24 bg-white/5 rounded-full blur-2xl"></div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-4 bg-white border border-gray-100 rounded-2xl flex flex-col justify-center shadow-sm">
                  <p className="text-[10px] text-gray-400 uppercase font-bold mb-1">Home Club</p>
                  <p className="font-bold text-xs text-gray-700 truncate">{profile.location || 'Not Set'}</p>
                </div>
                <div className="p-4 bg-white border border-gray-100 rounded-2xl flex flex-col justify-center shadow-sm">
                  <p className="text-[10px] text-gray-400 uppercase font-bold mb-1">Loyalty Points</p>
                  <p className="font-black text-sm text-[#00C47D]">{loyaltyPoints} pts</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4 pt-4">
        <button
          onClick={handleLogout}
          className="w-full py-4 rounded-2xl bg-white border-2 border-red-50 text-red-600 font-bold hover:bg-red-50 hover:border-red-100 transition-all flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Sign Out
        </button>
      </div>
    </div>
  )
}
