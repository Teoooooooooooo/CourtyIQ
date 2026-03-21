import { useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

const playerTabs = [
  { path: '/', label: 'Home', icon: <svg viewBox="0 0 20 20" fill="none" className="w-5 h-5"><path d="M3 9.5L10 3l7 6.5V17a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" stroke="currentColor" strokeWidth="1.5"/><path d="M7 18v-6h6v6" stroke="currentColor" strokeWidth="1.5"/></svg> },
  { path: '/courts', label: 'Courts', icon: <svg viewBox="0 0 20 20" fill="none" className="w-5 h-5"><rect x="2" y="4" width="16" height="12" rx="2" stroke="currentColor" strokeWidth="1.5"/><line x1="10" y1="4" x2="10" y2="16" stroke="currentColor" strokeWidth="1.2"/><circle cx="10" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.1"/></svg> },
  { path: '/social', label: 'Social', icon: <svg viewBox="0 0 20 20" fill="none" className="w-5 h-5"><circle cx="7.5" cy="7" r="2.5" stroke="currentColor" strokeWidth="1.5"/><circle cx="13.5" cy="7" r="2.5" stroke="currentColor" strokeWidth="1.5"/><path d="M2 17c0-2.8 2.5-5 5.5-5M10 17c0-2.8 2.5-5 5.5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg> },
  { path: '/pass', label: 'My Pass', icon: <svg viewBox="0 0 20 20" fill="none" className="w-5 h-5"><rect x="2" y="5" width="16" height="10" rx="2.5" stroke="currentColor" strokeWidth="1.5"/><path d="M6 9h4M6 12h2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/><circle cx="15" cy="10" r="2" stroke="currentColor" strokeWidth="1.2"/></svg> },
]

const clubTabs = [
  { path: '/dashboard', label: 'Dashboard', icon: <svg viewBox="0 0 20 20" fill="none" className="w-5 h-5"><rect x="2" y="10" width="3" height="7" rx="0.5" stroke="currentColor" strokeWidth="1.3"/><rect x="7" y="6" width="3" height="11" rx="0.5" stroke="currentColor" strokeWidth="1.3"/><rect x="12" y="3" width="3" height="14" rx="0.5" stroke="currentColor" strokeWidth="1.3"/></svg> },
]

export default function BottomNav() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const user = useAuthStore(s => s.user)

  const tabs = user?.role === 'club' ? clubTabs : playerTabs

  return (
    <nav className="bg-white border-t border-slate-200 flex">
      {tabs.map(tab => (
        <button key={tab.path} onClick={() => navigate(tab.path)}
          className={`flex-1 flex flex-col items-center py-2.5 gap-1 text-[10px] font-medium transition-colors ${pathname === tab.path ? 'text-[#00C47D]' : 'text-slate-400'}`}>
          {tab.icon}
          {tab.label}
        </button>
      ))}
    </nav>
  )
}