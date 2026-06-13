import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Header from './components/Header';
import { ToastProvider } from './components/Toast';
import AuthPage from './pages/AuthPage';
import HomePage from './pages/HomePage';
import CreateRidePage from './pages/CreateRidePage';
import RideDetailPage from './pages/RideDetailPage';
import MyRidesPage from './pages/MyRidesPage';
import RideManagePage from './pages/RideManagePage';
import ProfilePage from './pages/ProfilePage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="main-content"><div className="loading">加载中...</div></div>;
  if (!user) return <Navigate to="/auth" replace />;
  return <>{children}</>;
}

export default function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="main-content"><div className="loading">加载中...</div></div>;
  }

  return (
    <ToastProvider>
      {user && <Header />}
      <Routes>
        <Route path="/auth" element={user ? <Navigate to="/" replace /> : <AuthPage />} />
        <Route path="/" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
        <Route path="/create-ride" element={<ProtectedRoute><CreateRidePage /></ProtectedRoute>} />
        <Route path="/ride/:id" element={<ProtectedRoute><RideDetailPage /></ProtectedRoute>} />
        <Route path="/my-rides" element={<ProtectedRoute><MyRidesPage /></ProtectedRoute>} />
        <Route path="/ride-manage" element={<ProtectedRoute><RideManagePage /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ToastProvider>
  );
}
