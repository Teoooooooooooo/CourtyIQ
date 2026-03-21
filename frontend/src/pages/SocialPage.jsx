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
  const [showChats, setShowChats] = useState(false)
  const [chatsList, setChatsList] = useState([])
  const [activeChat, setActiveChat] = useState(null)
  const [chatMessages, setChatMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [toast, setToast] = useState(null)
  const [notifications, setNotifications] = useState([])

  const unreadNotifsCount = notifications.filter(n => !n.read).length
  const hasUnread = challenges.length > 0 || unreadNotifsCount > 0

  const handleReadNotif = async (n) => {
    if (!n.read && !USE_MOCKS) {
      try {
        await client.put(`/notifications/${n.id}/read`)
        setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x))
      } catch {}
    }
  }

  useEffect(() => {
    if (USE_MOCKS) {
      setPartnerMatches(mockPartnerMatches)
      setChallenges(mockChallenges)
      setChatsList([{ id: 'mock1', name: 'Mihai Ionescu', profile: { skillLevel: 4.1 }, lastMessage: 'See you on the court!', lastMessageAt: new Date() }])
      return
    }
    client.get('/ai/partner-matches').then(r => setPartnerMatches(r.data.matches || [])).catch(() => {})
    client.get('/social/challenges/incoming').then(r => setChallenges(r.data.challenges || r.data || [])).catch(() => {})
    client.get('/chat').then(r => setChatsList(r.data || [])).catch(() => {})
    client.get('/notifications').then(r => setNotifications(r.data || [])).catch(() => {})
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
    if (action === 'accept' && !USE_MOCKS) {
      // Reload active chats
      client.get('/chat').then(r => setChatsList(r.data || [])).catch(() => {})
    }
  }

  const loadMessages = async (opponentId) => {
    if (USE_MOCKS) {
      setChatMessages([{ id: 1, senderId: opponentId, text: 'Hello!', createdAt: new Date() }])
      return
    }
    try {
      const { data } = await client.get(`/chat/${opponentId}`)
      setChatMessages(data)
    } catch {}
  }

  const handleOpenChat = (partner) => {
    setActiveChat(partner)
    loadMessages(partner.id)
  }

  const handleSendMessage = async (e) => {
    e.preventDefault()
    if (!newMessage.trim() || !activeChat) return
    const txt = newMessage.trim()
    setNewMessage('')
    
    if (USE_MOCKS) {
      setChatMessages(prev => [...prev, { id: Date.now(), senderId: 'me', text: txt, createdAt: new Date() }])
      return
    }
    
    try {
      const { data } = await client.post(`/chat/${activeChat.id}`, { text: txt })
      setChatMessages(prev => [...prev, data])
    } catch {
      showToast('Failed to send message')
    }
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
        <div className="flex gap-2">
          {/* Chat Icon */}
          <button onClick={() => setShowChats(true)} className="relative p-2.5 text-slate-400 hover:text-[#0d1b2a] transition-colors rounded-full hover:bg-slate-100">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
               <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </button>
          
          {/* Bell Icon */}
          <button onClick={() => setShowInbox(true)} className="relative p-2.5 text-slate-400 hover:text-[#0d1b2a] transition-colors rounded-full hover:bg-slate-100">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            {hasUnread && (
              <span className="absolute top-2 right-2 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500 border-2 border-white box-content"></span>
              </span>
            )}
          </button>
        </div>
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
            
            {challenges.length === 0 && notifications.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-sm font-medium text-slate-400">You have no new notifications.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {challenges.length > 0 && <p className="text-[11px] uppercase tracking-widest text-slate-400 font-semibold mb-1">Challenges</p>}
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

                {notifications.length > 0 && <p className="text-[11px] uppercase tracking-widest text-slate-400 font-semibold mb-1 mt-3">Notifications</p>}
                {notifications.map(n => (
                  <div key={n.id} onClick={() => handleReadNotif(n)} className={`bg-white border rounded-xl p-4 cursor-pointer transition-colors ${!n.read ? 'border-blue-200 bg-[#f4fdff]' : 'border-slate-100 hover:bg-slate-50'}`}>
                    <div className="flex justify-between items-start mb-1">
                      <p className={`text-sm font-semibold ${!n.read ? 'text-[#0d1b2a]' : 'text-slate-600'}`}>
                        {n.title}
                      </p>
                      {!n.read && <div className="w-2 h-2 bg-[#00C47D] rounded-full flex-shrink-0 mt-1.5"></div>}
                    </div>
                    <p className="text-xs text-slate-500 mb-2 leading-relaxed">{n.message}</p>
                    <p className="text-[10px] text-slate-400 uppercase font-semibold">
                      {new Date(n.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} · {new Date(n.createdAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Chats Modal */}
      {showChats && (
        <div className="fixed inset-0 bg-black/50 flex flex-col justify-end sm:justify-center sm:items-center z-50 sm:p-4" onClick={() => { setShowChats(false); setActiveChat(null); }}>
          <div className="bg-white rounded-t-3xl sm:rounded-2xl p-5 w-full sm:max-w-[400px] shadow-2xl h-[85vh] sm:h-[600px] max-h-[85vh] flex flex-col animate-slide-up sm:animate-fade-in" onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-3 sm:hidden flex-shrink-0" />
            
            {/* Header */}
            <div className="flex justify-between items-center mb-4 flex-shrink-0">
              <div className="flex items-center gap-3">
                {activeChat && (
                  <button onClick={() => setActiveChat(null)} className="p-1 -ml-2 text-slate-400 hover:bg-slate-100 rounded-full">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                  </button>
                )}
                <h3 className="font-condensed text-2xl font-extrabold text-[#0d1b2a]">
                  {activeChat ? activeChat.name : 'Chats'}
                </h3>
              </div>
              <button onClick={() => { setShowChats(false); setActiveChat(null); }} className="text-slate-400 p-1.5 hover:text-[#0d1b2a] hover:bg-slate-100 rounded-full transition-colors hidden sm:block">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto min-h-0 flex flex-col scrollbar-hide">
              {!activeChat ? (
                /* Chat List View */
                chatsList.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center py-10 opacity-70">
                    <svg className="w-12 h-12 text-slate-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                    <p className="text-sm font-medium text-slate-400">No active chats.</p>
                    <p className="text-xs text-slate-400 mt-1 max-w-[200px]">Accept challenges to start chatting with other players.</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {chatsList.map(chat => {
                      const colors = getAvatarColor(chat.name || 'User')
                      return (
                        <div key={chat.id} onClick={() => handleOpenChat(chat)} className="flex items-center gap-3 p-3 rounded-2xl hover:bg-slate-50 cursor-pointer active:bg-slate-100 transition-colors">
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center font-condensed font-extrabold text-sm flex-shrink-0 ${colors.bg} ${colors.text}`}>
                            {getInitials(chat.name || 'User')}
                          </div>
                          <div className="flex-1 min-w-0 border-b border-slate-100 pb-2">
                            <div className="flex justify-between items-baseline mb-0.5">
                              <p className="font-semibold text-[#0d1b2a] text-[15px] truncate">{chat.name}</p>
                              {chat.lastMessageAt && (
                                <p className="text-[10px] text-slate-400 flex-shrink-0 ml-2">
                                  {formatDateTime(chat.lastMessageAt).split('·')[1] || formatDateTime(chat.lastMessageAt)}
                                </p>
                              )}
                            </div>
                            <p className="text-xs text-slate-500 truncate">{chat.lastMessage || 'Say hello!'}</p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )
              ) : (
                /* Direct Message View */
                <div className="flex flex-col flex-1 pb-2">
                  <div className="flex-1 overflow-y-auto flex flex-col gap-3 p-1">
                    {chatMessages.map(msg => {
                      const isMe = msg.senderId === 'me' || msg.senderId !== activeChat.id;
                      return (
                        <div key={msg.id} className={`flex flex-col max-w-[80%] ${isMe ? 'self-end items-end' : 'self-start items-start'}`}>
                          <div className={`px-4 py-2.5 rounded-2xl text-[14px] ${isMe ? 'bg-[#00C47D] text-[#0d1b2a] rounded-br-sm font-medium shadow-sm' : 'bg-slate-100 text-[#0d1b2a] rounded-bl-sm'}`}>
                            {msg.text}
                          </div>
                          <p className="text-[9px] text-slate-400 mt-1 font-medium">{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                      )
                    })}
                    {chatMessages.length === 0 && (
                      <div className="h-full flex items-center justify-center text-center">
                        <p className="text-xs text-slate-400">Start the conversation with {activeChat.name}!</p>
                      </div>
                    )}
                  </div>
                  
                  {/* Chat Input Box */}
                  <form onSubmit={handleSendMessage} className="mt-3 flex items-center gap-2 flex-shrink-0 bg-slate-50 p-1.5 rounded-full border border-slate-200">
                    <input 
                      type="text" 
                      value={newMessage}
                      onChange={e => setNewMessage(e.target.value)}
                      placeholder="Type a message..." 
                      className="flex-1 bg-transparent text-sm pl-4 pr-2 outline-none py-2"
                    />
                    <button type="submit" disabled={!newMessage.trim()} className="bg-[#00C47D] text-[#0d1b2a] p-2 rounded-full disabled:opacity-50 transition-opacity">
                      <svg className="w-5 h-5 mx-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                    </button>
                  </form>
                </div>
              )}
            </div>
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