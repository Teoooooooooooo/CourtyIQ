import { useState, useEffect } from 'react'
import { mockPartnerMatches } from '../mocks/index'
import { getInitials, getAvatarColor, formatDateTime } from '../utils/format'
import client from '../api/client'

const USE_MOCKS = import.meta.env.VITE_USE_MOCKS === 'true'

const mockChallenges = [
  { id: 'c1', challenger: { name: 'Mihai Ionescu' }, proposedTime: '2026-03-22T18:00:00', message: 'Up for a match tomorrow evening?' },
  { id: 'c2', challenger: { name: 'Radu Constantin' }, proposedTime: '2026-03-23T10:00:00', message: 'Weekend morning game?' },
]

const mockH2H = {
  opponent: 'Mihai Ionescu',
  wins: 4, losses: 2,
  winPredictor: { winProbability: 67, basis: 'Elo + recent form' },
}

export default function SocialPage() {
  const [partnerMatches, setPartnerMatches] = useState([])
  const [challenges, setChallenges] = useState([])
  const [h2h, setH2h] = useState(null)
  const [winPredictor, setWinPredictor] = useState(null)
  const [selectedPlayer, setSelectedPlayer] = useState(null)
  const [showInbox, setShowInbox] = useState(false)
  const [toast, setToast] = useState(null)

  useEffect(() => {
    if (USE_MOCKS) {
      setPartnerMatches(mockPartnerMatches)
      setChallenges(mockChallenges)
      return
    }
    client.get('/ai/partner-matches').then(r => setPartnerMatches(r.data.matches || [])).catch(() => {})
    client.get('/social/challenges/incoming').then(r => setChallenges(r.data.challenges || r.data || [])).catch(() => {})
  }, [])

  const handlePlayerClick = (match) => {
    if (selectedPlayer?.userId === match.userId) {
      setSelectedPlayer(null)
      setH2h(null)
      setWinPredictor(null)
    } else {
      setSelectedPlayer(match)
      if (USE_MOCKS) {
        setH2h(mockH2H)
        setWinPredictor(mockH2H.winPredictor)
      } else {
        client.get(`/matches/h2h/${match.userId}`).then(r => setH2h(r.data)).catch(() => setH2h(null))
        client.get(`/ai/win-predictor/${match.userId}`).then(r => setWinPredictor(r.data)).catch(() => setWinPredictor(null))
      }
    }
  }

  const handleChallenge = async (userId) => {
    if (USE_MOCKS) {
      showToast('Challenge sent!')
      return
    }
    try {
      // Default proposed time to tomorrow at the same time
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      
      await client.post('/social/challenge', { 
        targetUserId: userId, 
        proposedTime: tomorrow.toISOString() 
      })
      showToast('Challenge sent!')
    } catch {
      showToast('Failed to send challenge')
    }
  }

  const respondToChallenge = async (id, action) => {
    if (!USE_MOCKS) {
      try {
        await client.put(`/social/challenges/${id}`, { action })
      } catch {
        showToast(`Failed to ${action} challenge`)
        return
      }
    }
    setChallenges(prev => prev.filter(c => c.id !== id))
    showToast(`Challenge ${action}ed!`)
  }

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }

  return (
    <div className="flex flex-col pb-6">

      {/* Header */}
      <div className="px-4 pt-4 pb-2 flex justify-between items-start">
        <div>
          <h2 className="font-condensed text-2xl font-extrabold text-[#0d1b2a]">Find a Partner</h2>
          <p className="text-xs text-slate-400 mt-0.5">AI-matched players based on your style</p>
        </div>
        <button onClick={() => setShowInbox(true)} className="relative p-2.5 text-slate-400 hover:text-[#0d1b2a] transition-colors rounded-full hover:bg-slate-100">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          {challenges.length > 0 && (
            <span className="absolute top-2 right-2 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500 border-2 border-white box-content"></span>
            </span>
          )}
        </button>
      </div>

      {/* Partner match cards */}
      <div className="flex flex-col gap-2 px-4">
        {partnerMatches.length === 0 && (
          <div className="py-8 text-center">
            <div className="w-12 h-12 bg-slate-100 rounded-full mx-auto mb-3 animate-pulse" />
            <p className="text-sm text-slate-400">Finding matches...</p>
          </div>
        )}
        {partnerMatches.map(match => {
          const profile = match.profile || {}
          const colors = getAvatarColor(profile.name || 'Unknown User')
          const isSelected = selectedPlayer?.userId === match.userId
          return (
            <div key={match.userId}
              className={`bg-white border rounded-xl overflow-hidden transition-all cursor-pointer
                ${isSelected ? 'border-[#00C47D]' : 'border-slate-200'}`}
              onClick={() => handlePlayerClick(match)}>
              <div className="p-4 flex items-center gap-3">
                {/* Avatar */}
                <div className={`w-12 h-12 rounded-full flex items-center justify-center font-condensed font-extrabold text-base flex-shrink-0 ${colors.bg} ${colors.text}`}>
                  {getInitials(profile.name || 'Unknown User')}
                </div>
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-[#0d1b2a] text-sm">{profile.name || 'Unknown User'}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Level {profile.skillLevel ? Number(profile.skillLevel).toFixed(2) : '?'} · {profile.playStyle || '?'} · {profile.location || '?'}
                  </p>
                  <p className="text-xs text-slate-400 italic mt-1 truncate">"{match.reason}"</p>
                </div>
                {/* Match % */}
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <span className="font-condensed text-2xl font-extrabold text-[#00C47D]">{Math.round(match.score || 0)}%</span>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wide">match</span>
                  <button
                    onClick={e => { e.stopPropagation(); handleChallenge(match.userId) }}
                    className="text-xs bg-[#0d1b2a] text-white px-3 py-1 rounded-lg font-semibold mt-1 transition-transform active:scale-95">
                    Challenge
                  </button>
                </div>
              </div>

              {/* H2H panel — expands when selected */}
              {isSelected && (h2h || winPredictor) && (
                <div className="border-t border-slate-100 px-4 pb-4 pt-3 flex flex-col gap-3">
                  {/* H2H bar */}
                  {h2h && (
                    <div>
                      <p className="text-[11px] uppercase tracking-widest text-slate-400 font-semibold mb-2">
                        Head to head
                      </p>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-[#0d1b2a] w-6 text-right">{h2h.wins}</span>
                        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden flex">
                          <div
                            className="h-full bg-[#00C47D] rounded-full transition-all"
                            style={{ width: `${(h2h.wins / (h2h.wins + h2h.losses)) * 100}%` }}
                          />
                        </div>
                        <span className="text-xs font-semibold text-slate-400 w-6">{h2h.losses}</span>
                      </div>
                      <div className="flex justify-between mt-1">
                        <span className="text-[10px] text-[#00C47D] font-medium">You</span>
                        <span className="text-[10px] text-slate-400">{h2h.opponent}</span>
                      </div>
                    </div>
                  )}

                  {/* AI Win predictor */}
                  {(winPredictor || h2h?.winPredictor) && (
                    <div className="bg-slate-50 rounded-xl p-3">
                      <p className="text-[11px] uppercase tracking-widest text-slate-400 font-semibold mb-2">
                        AI Win Predictor
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="font-condensed text-2xl font-extrabold text-[#00C47D]">
                          {(winPredictor || h2h?.winPredictor)?.winProbability}%
                        </span>
                        <span className="text-xs text-slate-500">your win probability</span>
                        <span className="text-xs font-semibold text-slate-600">
                          {(winPredictor || h2h?.winPredictor)?.basis}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Inbox Modal */}
      {showInbox && (
        <div className="fixed inset-0 bg-black/50 flex flex-col justify-end sm:justify-center sm:items-center z-50 sm:p-4" onClick={() => setShowInbox(false)}>
          <div className="bg-white rounded-t-3xl sm:rounded-2xl p-5 w-full sm:max-w-[400px] shadow-2xl max-h-[85vh] overflow-y-auto animate-slide-up sm:animate-fade-in" onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-5 sm:hidden" />
            
            <div className="flex justify-between items-center mb-5">
              <h3 className="font-condensed text-2xl font-extrabold text-[#0d1b2a]">Inbox</h3>
              <button onClick={() => setShowInbox(false)} className="text-slate-400 p-1.5 hover:text-[#0d1b2a] hover:bg-slate-100 rounded-full transition-colors hidden sm:block">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            {challenges.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-sm font-medium text-slate-400">You have no new challenges.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {Array.isArray(challenges) && challenges.map(c => {
                  const p = c.fromUserProfile || c.challenger || {}
                  const challengerName = p.name || c.fromUserName || 'Unknown Player'
                  const colors = getAvatarColor(challengerName)
                  const d = new Date(c.proposedTime)
                  return (
                    <div key={c.id} className="bg-slate-50 border border-slate-100 rounded-xl p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <div className={`w-11 h-11 rounded-full flex items-center justify-center font-condensed font-extrabold text-sm flex-shrink-0 ${colors.bg} ${colors.text}`}>
                          {getInitials(challengerName)}
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-[#0d1b2a] text-[15px]">{challengerName}</p>
                          <p className="text-[11px] font-medium text-slate-400 mt-0.5">
                            Level {p.skillLevel ? Number(p.skillLevel).toFixed(2) : '?'} · Elo {p.eloRating || '?'} · {p.playStyle || '?'}
                          </p>
                          <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-wider font-semibold">
                            {d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })} · {d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                      <p className="text-xs text-slate-500 italic mb-3">"{c.message || 'Challenge received!'}"</p>
                      <div className="flex gap-2">
                        <button onClick={() => respondToChallenge(c.id, 'accept')} className="flex-1 bg-[#00C47D] text-[#0d1b2a] text-xs font-bold py-2.5 rounded-xl shadow-sm transition-transform active:scale-95">
                          Accept
                        </button>
                        <button onClick={() => respondToChallenge(c.id, 'decline')} className="flex-1 bg-white border border-slate-200 text-slate-600 text-xs font-bold py-2.5 rounded-xl transition-colors hover:bg-slate-100">
                          Decline
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 bg-[#0d1b2a] text-white text-sm font-semibold px-5 py-3 rounded-xl shadow-lg z-50">
          {toast}
        </div>
      )}

    </div>
  )
}