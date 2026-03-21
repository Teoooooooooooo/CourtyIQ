import { Routes, Route } from 'react-router-dom'
import AppHeader from './components/AppHeader'
import BottomNav from './components/BottomNav'
import Protected from './components/Protected'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import HomePage from './pages/HomePage'
import CourtsPage from './pages/CourtsPage'
import SocialPage from './pages/SocialPage'
import PassPage from './pages/PassPage'
import SuccessPage from './pages/SuccessPage'
import CancelPage from './pages/CancelPage'
import ProfilePage from './pages/ProfilePage'

export default function App() {
  return (
    <div className="min-h-screen bg-[#eef1f5] flex justify-center items-start p-4 pb-20">
      <div className="w-full max-w-[430px] bg-[#f7f9fc] rounded-3xl overflow-hidden shadow-2xl min-h-[90vh] flex flex-col">
        <AppHeader />
        <div className="flex-1 overflow-y-auto">
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/" element={<Protected><HomePage /></Protected>} />
            <Route path="/courts" element={<Protected><CourtsPage /></Protected>} />
            <Route path="/social" element={<Protected><SocialPage /></Protected>} />
            <Route path="/pass" element={<Protected><PassPage /></Protected>} />
            <Route path="/success" element={<Protected><SuccessPage /></Protected>} />
            <Route path="/cancel" element={<Protected><CancelPage /></Protected>} />
            <Route path="/profile" element={<Protected><ProfilePage /></Protected>} />
          </Routes>
        </div>
        <BottomNav />
      </div>
    </div>
  )
}
