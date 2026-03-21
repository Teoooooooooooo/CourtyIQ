import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { getInitials } from '../utils/format'
import client from '../api/client'

export default function AppHeader() {
  const user = useAuthStore(s => s.user)
  const [notifications, setNotifications] = useState([])
  const [showDropdown, setShowDropdown] = useState(false)
  const dropdownRef = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    if (!user || user.id === 'mock-123') return
    const fetchNotifications = () => {
      client.get('/notifications').then(r => setNotifications(r.data)).catch(() => {})
    }
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 10000)
    return () => clearInterval(interval)
  }, [user])

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setShowDropdown(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleNotificationClick = async (notif) => {
    setShowDropdown(false)
    if (!notif.read) {
      try {
        await client.put(`/notifications/${notif.id}/read`)
        setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, read: true } : n))
      } catch (e) { /* ignore */ }
    }
    if (notif.type === 'waitlist_available') navigate('/courts')
  }

  const unreadCount = notifications.filter(n => !n.read).length

  return (
    <div className="bg-[#0d1b2a] px-5 pt-5 pb-4 text-white relative z-50">
      <div className="flex items-center justify-between mb-1">
        <Link to={user?.role === 'club' ? "/dashboard" : "/"} className="font-condensed text-2xl font-extrabold tracking-tight hover:opacity-80 transition-opacity">
          <span className="text-[#00C47D]">Court</span>IQ
        </Link>
        {user && (
          <div className="flex items-center gap-4">
            {/* Notification Bell */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="relative p-1 hover:text-[#00C47D] transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path>
                </svg>
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 rounded-full text-[9px] font-bold flex items-center justify-center border-2 border-[#0d1b2a]">
                    {unreadCount}
                  </span>
                )}
              </button>

              {showDropdown && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-2xl border border-slate-100 overflow-hidden" style={{zIndex: 100}}>
                  <div className="px-4 py-3 border-b border-slate-100 flex justify-between items-center">
                    <h4 className="font-bold text-[#0d1b2a] text-sm">Notifications</h4>
                    {unreadCount > 0 && (
                      <span className="text-[10px] text-[#00C47D] font-bold uppercase tracking-wider bg-[#e6faf3] px-2 py-0.5 rounded-full">{unreadCount} New</span>
                    )}
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <p className="text-slate-400 text-xs text-center py-8">No notifications yet</p>
                    ) : (
                      notifications.map(n => (
                        <div
                          key={n.id}
                          onClick={() => handleNotificationClick(n)}
                          className={`px-4 py-3 border-b border-slate-50 cursor-pointer hover:bg-slate-50 transition-colors ${!n.read ? 'bg-blue-50/60' : ''}`}
                        >
                          <div className="flex justify-between items-start gap-2 mb-0.5">
                            <p className="text-[13px] font-bold text-[#0d1b2a] font-condensed leading-tight">{n.title}</p>
                            {!n.read && <div className="w-2 h-2 bg-[#00C47D] rounded-full flex-shrink-0 mt-1"></div>}
                          </div>
                          <p className="text-xs text-slate-500 leading-snug">{n.message}</p>
                          <p className="text-[10px] text-slate-300 mt-1.5">{new Date(n.createdAt).toLocaleDateString()} · {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <Link to="/profile" className="w-9 h-9 rounded-full bg-[#00C47D] flex items-center justify-center text-[#0d1b2a] font-bold text-sm cursor-pointer hover:scale-105 active:scale-95 transition-transform shadow-lg">
              {getInitials(user.name)}
            </Link>
          </div>
        )}
      </div>
      <p className="text-xs text-white/50">Bucharest, Romania</p>
    </div>
  )
}