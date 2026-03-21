import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { mockUser, mockBookings, mockAiSuggestion } from '../mocks/index'
import { formatDateTime } from '../utils/format'
import client from '../api/client'
import { useAuthStore } from '../store/authStore'

const USE_MOCKS = import.meta.env.VITE_USE_MOCKS === 'true'

export default function HomePage() {
  const navigate = useNavigate()
  const [stats, setStats] = useState(null)
  const [nextBooking, setNextBooking] = useState(null)
  const [upcomingBookings, setUpcomingBookings] = useState([])
  const [aiSuggestion, setAiSuggestion] = useState(null)
  const [toast, setToast] = useState(null)
  const refreshTrigger = useAuthStore(s => s.refreshTrigger)
  const triggerRefresh = useAuthStore(s => s.triggerRefresh)

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  const handleCancel = async (bookingId, isWaitlist = false) => {
    if (!window.confirm(`Are you sure you want to cancel this ${isWaitlist ? 'waitlist entry' : 'booking'}?`)) return
    
    if (USE_MOCKS) {
      setUpcomingBookings(prev => prev.filter(b => b.id !== bookingId))
      if (nextBooking?.id === bookingId) setNextBooking(null)
      triggerRefresh()
      showToast(`${isWaitlist ? 'Waitlist entry' : 'Booking'} cancelled (mock)`)
      return
    }

    try {
      if (isWaitlist) {
        await client.delete(`/waitlist/${bookingId}`)
      } else {
        await client.delete(`/bookings/${bookingId}`)
      }
      triggerRefresh()
      showToast(isWaitlist ? 'Removed from waitlist' : 'Booking cancelled successfully')
    } catch (err) {
      showToast(err.response?.data?.error || 'Cancellation failed')
    }
  }

  useEffect(() => {
    if (USE_MOCKS) {
      setStats(mockUser.stats)
      setNextBooking(mockBookings[0])
      setUpcomingBookings(mockBookings)
      setTimeout(() => setAiSuggestion(mockAiSuggestion), 800)
      return
    }

    Promise.all([
      client.get('/users/me').then(r => {
        const s = r.data.profile?.stats || r.data.stats || r.data
        setStats({ ...s, loyaltyTotal: r.data.loyaltyTotal })
      }),
      Promise.all([
        client.get('/users/me/bookings').catch(() => ({ data: [] })),
        client.get('/waitlist/me').catch(() => ({ data: [] }))
      ]).then(([bkRes, wlRes]) => {
        const upBk = (bkRes.data || []).filter(b => b.status === 'confirmed' && new Date(b.startTime) > new Date())
          .map(b => ({ ...b, type: 'booking', sortTime: new Date(b.startTime).getTime() }))
        
        const upWl = (wlRes.data || []).filter(w => new Date(w.slotStart) > new Date())
          .map(w => ({
            id: w.id,
            startTime: w.slotStart,
            court: w.court,
            type: 'waitlist',
            sortTime: new Date(w.slotStart).getTime()
          }))
        
        const combined = [...upBk, ...upWl].sort((a, b) => a.sortTime - b.sortTime)
        setNextBooking(combined.find(i => i.type === 'booking') || null)
        setUpcomingBookings(combined.slice(0, 5))
      }),
      client.get('/ai/slot-suggestion')
        .then(r => setAiSuggestion(r.data.slot))
        .catch(() => setAiSuggestion(null)),
    ])
  }, [refreshTrigger])

  const winRate = stats
    ? Math.round((stats.wins / (stats.wins + stats.losses)) * 100)
    : null

  return (
    <div className="flex flex-col gap-4 pb-6">

      {/* Hero card */}
      <div className="mx-4 mt-4 bg-[#0d1b2a] rounded-xl p-5 text-white relative overflow-hidden">
        <div className="absolute -right-5 -top-5 w-28 h-28 rounded-full bg-[#00C47D] opacity-15" />
        <div className="absolute right-5 -bottom-8 w-20 h-20 rounded-full bg-[#00C47D] opacity-10" />
        <p className="text-xs uppercase tracking-widest text-[#00C47D] font-semibold mb-2">
          {nextBooking ? 'Next booking' : 'Welcome back'}
        </p>
        <h2 className="font-condensed text-3xl font-extrabold leading-tight mb-3">
          {nextBooking ? nextBooking.court.club.name : 'No upcoming bookings'}
        </h2>
        {nextBooking && (
          <div className="flex gap-4 text-sm text-white/70 mb-4">
            <span>{formatDateTime(nextBooking.startTime)}</span>
            <span>{nextBooking.court.name}</span>
          </div>
        )}
        <div className="flex gap-2">
          {!nextBooking && (
            <button onClick={() => navigate('/courts')}
              className="bg-[#00C47D] text-[#0d1b2a] font-semibold text-sm px-4 py-2 rounded-lg">
              Book court
            </button>
          )}
          <button onClick={() => navigate('/pass')}
            className="bg-white/10 text-white border border-white/20 text-sm px-4 py-2 rounded-lg">
            My Pass
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3 px-4">
        {[
          { label: 'Win rate', value: winRate !== null ? `${winRate}%` : '—', green: true },
          { label: 'Games', value: stats ? stats.wins + stats.losses : '—' },
          { label: 'Loyalty pts', value: stats ? (stats.loyaltyTotal ?? 0).toLocaleString() : '—' },
        ].map(s => (
          <div key={s.label} className="bg-white border border-slate-200 rounded-xl p-3 text-center">
            <div className={`font-condensed text-3xl font-extrabold ${s.green ? 'text-[#00C47D]' : 'text-[#0d1b2a]'}`}>
              {s.value}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* AI suggestion */}
      {aiSuggestion ? (
        <div className="mx-4 bg-gradient-to-br from-[#0d1b2a] to-[#1a3344] rounded-xl p-4 border border-[rgba(0,196,125,0.3)]">
          <div className="inline-flex items-center gap-1 bg-[rgba(0,196,125,0.2)] border border-[rgba(0,196,125,0.4)] rounded-full px-3 py-1 text-[11px] font-semibold text-[#00C47D] mb-2">
            ✦ AI Smart Suggestion
          </div>
          <h4 className="font-condensed text-lg font-bold text-white mb-1">{aiSuggestion.headline}</h4>
          <p className="text-[13px] text-white/70 leading-relaxed">{aiSuggestion.reason}</p>
        </div>
      ) : (
        <div className="mx-4 h-24 bg-slate-100 rounded-xl animate-pulse" />
      )}

      {/* Quick actions */}
      <div className="grid grid-cols-3 gap-3 px-4">
        {[
          { label: 'Book court', bg: 'bg-[#e6faf3]', icon: '🏟️', onClick: () => navigate('/courts') },
          { label: 'Find partner', bg: 'bg-blue-50', icon: '🤝', onClick: () => navigate('/social') },
          { label: 'My Pass', bg: 'bg-amber-50', icon: '💳', onClick: () => navigate('/pass') },
        ].map(a => (
          <button key={a.label} onClick={a.onClick}
            className={`${a.bg} rounded-xl py-4 text-xs font-semibold text-slate-600 flex flex-col items-center gap-2 transition-transform active:scale-95`}>
            <span className="text-lg">{a.icon}</span>
            {a.label}
          </button>
        ))}
      </div>

      {/* Upcoming bookings */}
      <div className="px-4">
        <p className="text-[11px] uppercase tracking-widest text-slate-400 font-semibold mb-3">
          Upcoming bookings
        </p>
        {upcomingBookings.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-4">No upcoming bookings</p>
        ) : (
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            {upcomingBookings.map((b, i) => {
              const d = new Date(b.startTime)
              return (
                <div key={b.id}
                  className={`flex items-center gap-3 p-3 ${i < upcomingBookings.length - 1 ? 'border-b border-slate-100' : ''}`}>
                  <div className="bg-[#0d1b2a] text-white rounded-lg w-10 h-10 flex flex-col items-center justify-center flex-shrink-0">
                    <span className="font-condensed font-bold text-sm leading-none">{d.getDate()}</span>
                    <span className="text-[9px] text-white/60 uppercase">{d.toLocaleString('en', { month: 'short' })}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#0d1b2a] truncate">{b.court.club.name}</p>
                    <p className="text-xs text-slate-400">{b.court.name} · {d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                  {b.result ? (
                    <span className={`text-sm font-bold ${b.result === 'win' ? 'text-[#00C47D]' : 'text-red-400'}`}>
                      {b.result === 'win' ? 'W' : 'L'}
                    </span>
                  ) : b.type === 'waitlist' ? (
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-[10px] font-bold text-orange-600 uppercase tracking-tight bg-orange-100 px-2 py-0.5 rounded border border-orange-200">
                        Waitlist
                      </span>
                      <button 
                        onClick={() => handleCancel(b.id, true)}
                        className="text-[10px] font-bold text-slate-400 hover:text-red-600 uppercase tracking-tight"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button 
                      onClick={() => handleCancel(b.id, false)}
                      className="text-[10px] font-bold text-red-400 hover:text-red-600 uppercase tracking-tight bg-red-50 px-2 py-1 rounded"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-[#0d1b2a] text-white text-sm font-semibold px-5 py-3 rounded-xl shadow-lg z-50">
          {toast}
        </div>
      )}

    </div>
  )
}