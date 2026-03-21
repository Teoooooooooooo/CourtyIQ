import { useState, useEffect } from 'react'
import client from '../api/client'

export default function ClubDashboardPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('overview')
  const [toast, setToast] = useState(null)
  const [banModal, setBanModal] = useState(null) // { userId, name, clubId }
  const [banReason, setBanReason] = useState('')
  const [bannedIds, setBannedIds] = useState(new Set())

  useEffect(() => {
    client.get('/club-dashboard')
      .then(r => setData(r.data))
      .catch(err => setError(err.response?.data?.error || 'Failed to load dashboard'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <div className="w-10 h-10 border-4 border-[#00C47D] border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-slate-400 font-medium">Loading dashboard...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
        <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mb-3">
          <svg className="w-7 h-7 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
        </div>
        <p className="text-sm font-semibold text-[#0d1b2a] mb-1">Access Denied</p>
        <p className="text-xs text-slate-400">{error}</p>
      </div>
    )
  }

  const s = data?.summary || {}
  const maxDayRevenue = Math.max(...(s.revenueByDay || []).map(d => d.revenue), 1)

  const handleBan = async () => {
    if (!banModal) return
    try {
      await client.post('/club-dashboard/ban', {
        userId: banModal.userId,
        clubId: banModal.clubId,
        reason: banReason.trim() || undefined
      })
      setBannedIds(prev => new Set([...prev, banModal.userId]))
      setToast(`${banModal.name} has been banned`)
      setTimeout(() => setToast(null), 3000)
      client.get('/club-dashboard').then(r => setData(r.data))
    } catch (err) {
      setToast(err.response?.data?.error || 'Failed to ban user')
      setTimeout(() => setToast(null), 3000)
    }
    setBanModal(null)
    setBanReason('')
  }

  const handleUnban = async (userId, clubId) => {
    try {
      await client.post('/club-dashboard/unban', { userId, clubId })
      setBannedIds(prev => {
        const next = new Set(prev)
        next.delete(userId)
        return next
      })
      setToast('User unbanned successfully')
      setTimeout(() => setToast(null), 3000)
      client.get('/club-dashboard').then(r => setData(r.data))
    } catch (err) {
      setToast(err.response?.data?.error || 'Failed to unban user')
      setTimeout(() => setToast(null), 3000)
    }
  }

  return (
    <div className="flex flex-col pb-6">

      {/* Header */}
      <div className="px-4 pt-4 pb-3">
        <h2 className="font-condensed text-2xl font-extrabold text-[#0d1b2a]">Revenue Dashboard</h2>
        <p className="text-xs text-slate-400 mt-0.5">
          {data?.clubs?.map(c => c.name).join(', ') || 'Your clubs'}
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-2 px-4 mb-3">
        <KpiCard label="Total Revenue" value={`${s.totalRevenue} RON`} icon="💰" color="bg-emerald-50" accent="text-[#00C47D]" />
        <KpiCard label="Total Bookings" value={s.totalBookings} icon="📋" color="bg-blue-50" accent="text-blue-600" />
        <KpiCard label="Avg / Booking" value={`${s.averagePerBooking} RON`} icon="📊" color="bg-amber-50" accent="text-amber-600" />
        <KpiCard label="Today's Occupancy" value={`${s.occupancyRate}%`} icon="🏟️" color="bg-purple-50" accent="text-purple-600" />
      </div>

      {/* Quick Stats Row */}
      <div className="flex gap-2 px-4 mb-4">
        <div className="flex-1 bg-white border border-slate-200 rounded-xl p-3 text-center">
          <p className="font-condensed text-xl font-extrabold text-[#0d1b2a]">{s.peakHour}</p>
          <p className="text-[10px] text-slate-400 uppercase tracking-wide font-semibold mt-0.5">Peak Hour</p>
        </div>
        <div className="flex-1 bg-white border border-slate-200 rounded-xl p-3 text-center">
          <p className="font-condensed text-xl font-extrabold text-[#0d1b2a]">{s.todayBookings || 0}</p>
          <p className="text-[10px] text-slate-400 uppercase tracking-wide font-semibold mt-0.5">Today</p>
        </div>
        <div className="flex-1 bg-white border border-slate-200 rounded-xl p-3 text-center">
          <p className="font-condensed text-xl font-extrabold text-[#0d1b2a]">{s.totalCourts || 0}</p>
          <p className="text-[10px] text-slate-400 uppercase tracking-wide font-semibold mt-0.5">Courts</p>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-2 px-4 mb-3 overflow-x-auto pb-1">
        {['overview', 'courts', 'recent', 'banned'].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-medium border transition-colors
              ${activeTab === tab ? 'bg-[#0d1b2a] text-white border-[#0d1b2a]' : 'bg-white text-slate-500 border-slate-200'}`}>
            {tab === 'overview' ? '📈 Revenue' : tab === 'courts' ? '🏟 Courts' : tab === 'recent' ? '🕐 Recent' : '🚫 Banned'}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="px-4">
        {activeTab === 'overview' && (
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <p className="text-[11px] uppercase tracking-widest text-slate-400 font-semibold mb-3">
              Revenue · Last 30 Days
            </p>
            <div className="flex items-end gap-[3px] h-32">
              {(s.revenueByDay || []).map((d, i) => {
                const pct = maxDayRevenue > 0 ? (d.revenue / maxDayRevenue) * 100 : 0
                const isToday = i === (s.revenueByDay || []).length - 1
                return (
                  <div key={d.date} className="flex-1 flex flex-col items-center justify-end h-full group relative">
                    <div
                      className={`w-full rounded-t-sm transition-all duration-300 ${isToday ? 'bg-[#00C47D]' : d.revenue > 0 ? 'bg-[#0d1b2a]' : 'bg-slate-100'}`}
                      style={{ height: `${Math.max(pct, 2)}%` }}
                    />
                    {/* Tooltip on hover */}
                    <div className="absolute bottom-full mb-1 hidden group-hover:block bg-[#0d1b2a] text-white text-[9px] font-semibold px-2 py-1 rounded whitespace-nowrap z-10">
                      {d.date.slice(5)} · {d.revenue} RON
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="flex justify-between mt-2">
              <span className="text-[9px] text-slate-400">{(s.revenueByDay || [])[0]?.date?.slice(5)}</span>
              <span className="text-[9px] text-slate-400 font-semibold">Today</span>
            </div>
          </div>
        )}

        {activeTab === 'courts' && (
          <div className="flex flex-col gap-2">
            {(s.courtBreakdown || []).map(court => {
              const maxRev = Math.max(...(s.courtBreakdown || []).map(c => c.revenue), 1)
              const pct = (court.revenue / maxRev) * 100
              return (
                <div key={court.courtId} className="bg-white border border-slate-200 rounded-xl p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-semibold text-[#0d1b2a] text-sm">{court.courtName}</p>
                      <p className="text-[10px] text-slate-400">{court.clubName} · {court.type}</p>
                    </div>
                    <span className="font-condensed text-lg font-extrabold text-[#00C47D]">{court.revenue} RON</span>
                  </div>
                  {/* Revenue bar */}
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden mb-2">
                    <div className="h-full bg-[#00C47D] rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="flex gap-3 text-[10px] text-slate-500">
                    <span>{court.bookings} bookings</span>
                    <span>💳 {court.cardBookings} card</span>
                    <span>🎫 {court.creditBookings} credits</span>
                  </div>
                </div>
              )
            })}
            {(s.courtBreakdown || []).length === 0 && (
              <p className="text-sm text-slate-400 text-center py-6">No court data yet.</p>
            )}
          </div>
        )}

        {activeTab === 'recent' && (
          <div className="flex flex-col gap-2">
            {(s.recentBookings || []).map(b => (
              <div key={b.id} className="bg-white border border-slate-200 rounded-xl p-3 flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${b.creditsUsed > 0 ? 'bg-purple-50 text-purple-600' : 'bg-emerald-50 text-[#00C47D]'}`}>
                  {b.creditsUsed > 0 ? '🎫' : '💳'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[#0d1b2a] truncate">{b.organizer}</p>
                  <p className="text-[10px] text-slate-400">{b.courtName} · {new Date(b.startTime).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} {new Date(b.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
                <span className="font-condensed text-base font-extrabold text-[#0d1b2a] flex-shrink-0 mr-1">{b.totalPrice} RON</span>
                {bannedIds.has(b.organizerId) ? (
                  <span className="text-[9px] text-red-400 font-bold uppercase">Banned</span>
                ) : (
                  <button
                    onClick={(e) => { e.stopPropagation(); setBanModal({ userId: b.organizerId, name: b.organizer, clubId: b.clubId }) }}
                    className="text-[10px] bg-red-50 text-red-500 font-bold px-2 py-1 rounded-lg hover:bg-red-100 transition-colors flex-shrink-0">
                    Ban
                  </button>
                )}
              </div>
            ))}
            {(s.recentBookings || []).length === 0 && (
              <p className="text-sm text-slate-400 text-center py-6">No bookings yet.</p>
            )}
          </div>
        )}

        {activeTab === 'banned' && (
          <div className="flex flex-col gap-2">
            {(s.bannedUsers || []).map(b => (
              <div key={b.id} className="bg-white border border-slate-200 rounded-xl p-3 flex flex-col gap-2">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-semibold text-[#0d1b2a]">{b.userName}</p>
                    <p className="text-[10px] text-slate-400">{b.userEmail}</p>
                    <p className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded inline-block mt-1">Club: {b.clubName}</p>
                  </div>
                  <button
                    onClick={() => handleUnban(b.userId, b.clubId)}
                    className="text-[10px] bg-emerald-50 text-[#00C47D] font-bold px-2 py-1 rounded-lg hover:bg-emerald-100 transition-colors flex-shrink-0">
                    Unban
                  </button>
                </div>
                {b.reason && (
                  <p className="text-xs text-slate-500 bg-red-50 p-2 rounded border border-red-100 italic">
                    "{b.reason}"
                  </p>
                )}
                <p className="text-[9px] text-slate-400 mt-1">
                  Banned on {new Date(b.createdAt).toLocaleDateString()}
                </p>
              </div>
            ))}
            {(s.bannedUsers || []).length === 0 && (
              <p className="text-sm text-slate-400 text-center py-6">No banned users.</p>
            )}
          </div>
        )}
      </div>

      {/* Ban Confirmation Modal */}
      {banModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setBanModal(null)}>
          <div className="bg-white rounded-2xl p-5 w-full max-w-[350px] shadow-2xl animate-fade-in" onClick={e => e.stopPropagation()}>
            <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
            </div>
            <h3 className="font-condensed text-lg font-extrabold text-[#0d1b2a] text-center mb-1">Ban {banModal.name}?</h3>
            <p className="text-xs text-slate-400 text-center mb-4">This user will be notified and blocked from booking at your club.</p>
            <input
              type="text"
              value={banReason}
              onChange={e => setBanReason(e.target.value)}
              placeholder="Reason (optional)"
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none mb-3 focus:border-red-300 transition-colors"
            />
            <div className="flex gap-2">
              <button onClick={() => setBanModal(null)} className="flex-1 bg-slate-100 text-slate-600 text-sm font-bold py-2.5 rounded-xl hover:bg-slate-200 transition-colors">
                Cancel
              </button>
              <button onClick={handleBan} className="flex-1 bg-red-500 text-white text-sm font-bold py-2.5 rounded-xl hover:bg-red-600 transition-colors">
                Ban User
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 bg-[#0d1b2a] text-white text-sm font-semibold px-5 py-3 rounded-xl shadow-lg z-50 animate-fade-in">
          {toast}
        </div>
      )}

    </div>
  )
}

/* ── KPI Card Component ── */
function KpiCard({ label, value, icon, color, accent }) {
  return (
    <div className={`${color} border border-slate-100 rounded-xl p-3`}>
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-base">{icon}</span>
        <p className="text-[10px] text-slate-500 uppercase tracking-wide font-semibold">{label}</p>
      </div>
      <p className={`font-condensed text-xl font-extrabold ${accent}`}>{value}</p>
    </div>
  )
}
