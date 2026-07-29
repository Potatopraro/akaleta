import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import AuthPage from './components/Auth/AuthPage';
import AppLayout from './components/Layout/AppLayout';
import './index.css';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="loading-screen">
      <div className="loading-logo">AKALETA</div>
      <div className="loading-bar"><div className="loading-fill" /></div>
    </div>
  );
  return user ? children : <Navigate to="/login" replace />;
};

const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user ? <Navigate to="/app/dashboard" replace /> : children;
};

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            style: { background: '#1a1a2e', color: '#e2e8f0', border: '1px solid #00ff9d33' },
            success: { iconTheme: { primary: '#00ff9d', secondary: '#000' } },
            error: { iconTheme: { primary: '#ff4757', secondary: '#fff' } }
          }}
        />
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<PublicRoute><AuthPage mode="login" /></PublicRoute>} />
          <Route path="/register" element={<PublicRoute><AuthPage mode="register" /></PublicRoute>} />
          <Route path="/forgot-password" element={<PublicRoute><AuthPage mode="forgot" /></PublicRoute>} />
          <Route path="/reset-password/:token" element={<PublicRoute><AuthPage mode="reset" /></PublicRoute>} />
          <Route path="/verify-email/:token" element={<AuthPage mode="verify" />} />
          <Route path="/app/*" element={<ProtectedRoute><AppLayout /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
