import { useState, useEffect } from 'react'
import { mockPass, mockLoyalty, mockBookings } from '../mocks/index'
import client from '../api/client'
import { useAuthStore } from '../store/authStore'

const USE_MOCKS = import.meta.env.VITE_USE_MOCKS === 'true'

const TIERS = {
  basic:  { credits: 10, price: 29 },
  pro:    { credits: 20, price: 49 },
  elite:  { credits: 40, price: 79 },
}

const PERKS = [
  { name: 'Free court upgrade', pts: '+50 pts per booking', tier: 'basic', icon: '★' },
  { name: '10% off all bookings', pts: 'Gold tier reward', tier: 'gold', icon: '🎁' },
  { name: 'Priority waitlist', pts: 'Platinum tier reward', tier: 'platinum', icon: '📍' },
]

const LOYALTY_TIERS = ['bronze', 'silver', 'gold', 'platinum']

export default function PassPage() {
  const [pass, setPass] = useState(null)
  const [loyalty, setLoyalty] = useState(null)
  const [history, setHistory] = useState([])
  const [toast, setToast] = useState(null)
  const refreshTrigger = useAuthStore(s => s.refreshTrigger)
  const triggerRefresh = useAuthStore(s => s.triggerRefresh)

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  useEffect(() => {
    if (USE_MOCKS) {
      setPass(mockPass)
      setLoyalty(mockLoyalty)
      setHistory(mockBookings)
      return
    }
    client.get('/pass/me').then(r => setPass(r.data)).catch(() => {})
    client.get('/loyalty/me').then(r => setLoyalty(r.data)).catch(() => {})
    client.get('/users/me/bookings').then(r => {
      const active = r.data.filter(b => b.status === 'confirmed')
      setHistory(active.slice(0, 5))
    }).catch(() => {})
  }, [refreshTrigger])

  const handleSubscribe = async (tier) => {
    if (USE_MOCKS) {
      showToast(`Subscribed to ${tier} plan! (mock)`)
      setPass(prev => ({ ...prev, tier, creditsTotal: TIERS[tier].credits, creditsRemaining: TIERS[tier].credits }))
      return
    }
    try {
      const res = await client.post('/pass/subscribe', { tier })
      showToast(res.data.message || `Plan change to ${tier} scheduled!`)
      // Reload pass data to reflect pendingTier
      const r = await client.get('/pass/me')
      setPass(r.data)
    } catch {
      showToast('Subscription failed')
    }
  }

  const handleCancel = async (bookingId) => {
    if (!window.confirm('Are you sure you want to cancel this booking?')) return
    
    if (USE_MOCKS) {
      triggerRefresh()
      showToast('Booking cancelled (mock)')
      return
    }

    try {
      await client.delete(`/bookings/${bookingId}`)
      triggerRefresh()
      showToast('Booking cancelled successfully')
    } catch (err) {
      showToast(err.response?.data?.error || 'Cancellation failed')
    }
  }

  const tierIndex = LOYALTY_TIERS.indexOf(loyalty?.tier || 'bronze')
  const nextTier = LOYALTY_TIERS[tierIndex + 1]
  const progressPct = loyalty
    ? Math.round((loyalty.points / (loyalty.points + loyalty.pointsToNext)) * 100)
    : 0

  return (
    <div className="flex flex-col pb-6">

      {/* PadelPass card */}
      {pass ? (
        <div className="mx-4 mt-4 bg-[#0d1b2a] rounded-xl p-5 text-white relative overflow-hidden">
          <div className="absolute -right-5 -top-5 w-28 h-28 rounded-full bg-[#00C47D] opacity-10" />
          <div className="absolute right-10 -bottom-6 w-16 h-16 rounded-full bg-[#00C47D] opacity-5" />
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-condensed text-2xl font-extrabold">
              PadelPass {(pass.tier || 'BASIC').toUpperCase()}
            </h2>
            <span className="bg-[#00C47D] text-[#0d1b2a] text-xs font-bold px-3 py-1 rounded-lg">
              Active
            </span>
          </div>
          <div className="flex items-baseline gap-2 mb-2">
            <span className="font-condensed text-5xl font-extrabold text-[#00C47D]">
              {pass.creditsRemaining}
            </span>
            <span className="text-sm text-white/60">credits remaining</span>
          </div>
          <div className="h-1.5 bg-white/15 rounded-full overflow-hidden mb-4">
            <div className="h-full bg-[#00C47D] rounded-full transition-all"
              style={{ width: `${pass.creditsTotal ? Math.round((pass.creditsRemaining / pass.creditsTotal) * 100) : 0}%` }} />
          </div>
          <div className="flex flex-wrap gap-2">
            {(pass.perks || []).map(perk => (
              <span key={perk}
                className="text-xs bg-white/10 border border-white/20 px-3 py-1 rounded-full text-white/80">
                {perk}
              </span>
            ))}
          </div>
        </div>
      ) : (
        <div className="mx-4 mt-4 h-44 bg-slate-100 rounded-xl animate-pulse" />
      )}

      {/* Tier selector */}
      <div className="px-4 mt-4">
        <p className="text-[11px] uppercase tracking-widest text-slate-400 font-semibold mb-3">
          Change plan
        </p>
        <div className="flex gap-2">
          {Object.entries(TIERS).map(([tier, info]) => {
            const isCurrent = pass?.tier === tier
            const isPending = pass?.pendingTier === tier
            return (
            <button key={tier} onClick={() => handleSubscribe(tier)}
              className={`flex-1 py-3 px-2 rounded-xl border text-xs font-semibold transition-all active:scale-95 relative
                ${isCurrent
                  ? 'bg-[#0d1b2a] text-white border-[#0d1b2a]'
                  : isPending
                    ? 'border-[#00C47D] text-[#00a066] bg-[#e6faf3]'
                    : 'border-slate-200 text-slate-600 bg-white hover:border-[#00C47D]'}`}>
              {isPending && (
                <span className="absolute -top-2 -right-2 bg-[#00C47D] text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                  Next
                </span>
              )}
              {tier.charAt(0).toUpperCase() + tier.slice(1)}
              <br />
              <span className="font-normal text-[11px] opacity-70">
                {info.credits} credits · €{info.price}/mo
              </span>
            </button>
          )})}
        </div>
      </div>

      {/* Loyalty section */}
      {loyalty && (
        <div className="px-4 mt-4">
          <p className="text-[11px] uppercase tracking-widest text-slate-400 font-semibold mb-3">
            Loyalty rewards
          </p>
          <div className="bg-white border border-slate-200 rounded-xl p-4 mb-3">
            <div className="flex items-center justify-between mb-3">
              <div>
                <span className="font-condensed text-2xl font-extrabold text-[#0d1b2a]">
                  {(loyalty.points || 0).toLocaleString()}
                </span>
                <span className="text-xs text-slate-400 ml-2">points</span>
                {nextTier && (
                  <p className="text-xs text-slate-400 mt-0.5">
                    {loyalty.pointsToNext} pts to {nextTier}
                  </p>
                )}
              </div>
              <div className="text-right">
                <span className="font-condensed text-xl font-extrabold text-[#0d1b2a] capitalize">
                  {loyalty.tier}
                </span>
                <p className="text-[11px] text-slate-400">Current tier</p>
              </div>
            </div>
            {/* Progress bar */}
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-[#00C47D] rounded-full transition-all"
                style={{ width: `${progressPct}%` }} />
            </div>
            <div className="flex justify-between mt-1">
              {LOYALTY_TIERS.map((t, i) => (
                <span key={t}
                  className={`text-[10px] capitalize font-medium
                    ${i <= tierIndex ? 'text-[#00C47D]' : 'text-slate-300'}`}>
                  {t}
                </span>
              ))}
            </div>
          </div>

          {/* Perks list */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            {PERKS.map((perk, i) => {
              const unlocked = LOYALTY_TIERS.indexOf(loyalty.tier) >= LOYALTY_TIERS.indexOf(perk.tier)
              return (
                <div key={perk.name}
                  className={`flex items-center gap-3 p-3 ${i < PERKS.length - 1 ? 'border-b border-slate-100' : ''}`}>
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-base flex-shrink-0
                    ${unlocked ? 'bg-[#e6faf3]' : 'bg-slate-100'}`}>
                    {perk.icon}
                  </div>
                  <div className="flex-1">
                    <p className={`text-sm font-medium ${unlocked ? 'text-[#0d1b2a]' : 'text-slate-400'}`}>
                      {perk.name}
                    </p>
                    <p className="text-xs text-slate-400">{perk.pts}</p>
                  </div>
                  <span className={`text-xs font-semibold px-2 py-1 rounded-lg
                    ${unlocked
                      ? 'bg-[#e6faf3] text-[#00a066]'
                      : 'bg-slate-100 text-slate-400'}`}>
                    {unlocked ? 'Unlocked' : 'Locked'}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Booking history */}
      <div className="px-4 mt-4">
        <p className="text-[11px] uppercase tracking-widest text-slate-400 font-semibold mb-3">
          Booking history
        </p>
        {history.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-6 text-center">
            <p className="text-sm text-slate-400">No booking history yet</p>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            {history.map((b, i) => {
              const d = new Date(b.startTime)
              return (
                <div key={b.id}
                  className={`flex items-center gap-3 p-3 ${i < history.length - 1 ? 'border-b border-slate-100' : ''}`}>
                  <div className="bg-[#0d1b2a] text-white rounded-lg w-10 h-10 flex flex-col items-center justify-center flex-shrink-0">
                    <span className="font-condensed font-bold text-sm leading-none">{d.getDate()}</span>
                    <span className="text-[9px] text-white/60 uppercase">
                      {d.toLocaleString('en', { month: 'short' })}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#0d1b2a] truncate">
                      {b.court.club.name} — {b.court.name}
                    </p>
                    <p className="text-xs text-slate-400">
                      {d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })} · {b.creditsUsed} credits used
                    </p>
                  </div>
                  {b.result ? (
                    <span className={`text-sm font-bold ${b.result === 'win' ? 'text-[#00C47D]' : 'text-red-400'}`}>
                      {b.result === 'win' ? 'W' : 'L'}
                    </span>
                  ) : (
                    <button 
                      onClick={() => handleCancel(b.id)}
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

      {/* Toast */}
      {toast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 bg-[#0d1b2a] text-white text-sm font-semibold px-5 py-3 rounded-xl shadow-lg z-50">
          {toast}
        </div>
      )}

    </div>
  )
}