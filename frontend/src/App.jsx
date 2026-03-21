import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';

import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import HomePage from './pages/HomePage';
import CourtsPage from './pages/CourtsPage';
import SocialPage from './pages/SocialPage';
import PassPage from './pages/PassPage';
import SuccessPage from './pages/SuccessPage';
import CancelPage from './pages/CancelPage';

function ProtectedRoute({ children }) {
  const token = useAuthStore((s) => s.token);
  if (!token) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <HomePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/courts"
        element={
          <ProtectedRoute>
            <CourtsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/social"
        element={
          <ProtectedRoute>
            <SocialPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/pass"
        element={
          <ProtectedRoute>
            <PassPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/success"
        element={
          <ProtectedRoute>
            <SuccessPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/cancel"
        element={
          <ProtectedRoute>
            <CancelPage />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
