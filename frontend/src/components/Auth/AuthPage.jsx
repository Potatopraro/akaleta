import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import toast from 'react-hot-toast';

export default function AuthPage({ mode }) {
  const [form, setForm] = useState({ fullName: '', email: '', phone: '', password: '', confirmPassword: '', rememberMe: false });
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const { login, register } = useAuth();
  const { token } = useParams();

  const handleGoogleSignIn = () => {
    const apiUrl = process.env.REACT_APP_API_URL || (process.env.NODE_ENV === 'production' ? 'https://akaleta-backend.onrender.com/api' : '/api');
    const baseUrl = apiUrl.replace(/\/+$/, '');
    const frontendOrigin = window.location.origin;
    const googleAuthUrl = baseUrl.startsWith('http')
      ? `${baseUrl}/auth/google?returnUrl=${encodeURIComponent(frontendOrigin)}`
      : `${frontendOrigin}${baseUrl}/auth/google?returnUrl=${encodeURIComponent(frontendOrigin)}`;

    window.location.href = googleAuthUrl;
  };

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === 'login') {
        await login(form.email, form.password, form.rememberMe);
        toast.success('Welcome back!');
        window.location.href = '/app/dashboard';
      } else if (mode === 'register') {
        if (form.password !== form.confirmPassword) { toast.error('Passwords do not match'); return; }
        if (form.password.length < 8) { toast.error('Password must be at least 8 characters'); return; }
        await register(form.fullName, form.email, form.phone, form.password);
        toast.success('Account created! Welcome to AKALETA!');
        window.location.href = '/app/dashboard';
      } else if (mode === 'forgot') {
        await api.post('/auth/forgot-password', { email: form.email });
        toast.success('Reset link sent if email exists');
      } else if (mode === 'reset') {
        if (form.password !== form.confirmPassword) { toast.error('Passwords do not match'); return; }
        await api.post(`/auth/reset-password/${token}`, { password: form.password });
        toast.success('Password reset! Please log in.');
        window.location.href = '/login';
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-bg">
        <div className="auth-bg-grid" />
        <div className="auth-bg-glow" />
      </div>

      <div className="auth-container">
        {/* Branding */}
        <div className="auth-brand">
          <div className="auth-logo">
            <img src="/logo.png" alt="AKALETA" className="auth-logo-icon" style={{ width: '48px', height: '48px' }} />
            <span className="auth-logo-text">AKALETA</span>
          </div>
          <p className="auth-tagline">Nigerian Sign Language Translator</p>
        </div>

        {/* Card */}
        <div className="auth-card">
          <div className="auth-card-header">
            <h1 className="auth-title">
              {mode === 'login' && 'Welcome Back'}
              {mode === 'register' && 'Create Account'}
              {mode === 'forgot' && 'Reset Password'}
              {mode === 'reset' && 'New Password'}
              {mode === 'verify' && 'Verifying Email'}
            </h1>
            <p className="auth-subtitle">
              {mode === 'login' && 'Sign in to continue your NSL journey'}
              {mode === 'register' && 'Join the Nigerian Sign Language community'}
              {mode === 'forgot' && "Enter your email and we'll send a reset link"}
              {mode === 'reset' && 'Create a strong new password'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            {mode === 'register' && (
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input className="form-input" type="text" placeholder="Chukwuemeka Obi" value={form.fullName}
                  onChange={e => set('fullName', e.target.value)} required />
              </div>
            )}

            {(mode === 'login' || mode === 'register' || mode === 'forgot') && (
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input className="form-input" type="email" placeholder="you@example.com" value={form.email}
                  onChange={e => set('email', e.target.value)} required />
              </div>
            )}

            {mode === 'register' && (
              <div className="form-group">
                <label className="form-label">Phone Number <span className="text-muted">(optional)</span></label>
                <input className="form-input" type="tel" placeholder="+2348012345678" value={form.phone}
                  onChange={e => set('phone', e.target.value)} />
              </div>
            )}

            {(mode === 'login' || mode === 'register' || mode === 'reset') && (
              <div className="form-group">
                <label className="form-label">
                  {mode === 'reset' ? 'New Password' : 'Password'}
                </label>
                <div className="input-with-action">
                  <input className="form-input" type={showPw ? 'text' : 'password'}
                    placeholder="••••••••" value={form.password}
                    onChange={e => set('password', e.target.value)} required minLength={8} />
                  <button type="button" className="input-action-btn" onClick={() => setShowPw(s => !s)}>
                    {showPw ? '🙈' : '👁'}
                  </button>
                </div>
              </div>
            )}

            {(mode === 'register' || mode === 'reset') && (
              <div className="form-group">
                <label className="form-label">Confirm Password</label>
                <input className="form-input" type="password" placeholder="••••••••" value={form.confirmPassword}
                  onChange={e => set('confirmPassword', e.target.value)} required />
              </div>
            )}

            {mode === 'login' && (
              <div className="auth-extras">
                <label className="checkbox-label">
                  <input type="checkbox" checked={form.rememberMe} onChange={e => set('rememberMe', e.target.checked)} />
                  <span>Remember me</span>
                </label>
                <Link to="/forgot-password" className="auth-link">Forgot password?</Link>
              </div>
            )}

            <button type="submit" className="btn btn-primary btn-lg btn-full" disabled={loading}>
              {loading ? <span className="spinner" /> : null}
              {!loading && (
                <>
                  {mode === 'login' && 'Sign In'}
                  {mode === 'register' && 'Create Account'}
                  {mode === 'forgot' && 'Send Reset Link'}
                  {mode === 'reset' && 'Reset Password'}
                </>
              )}
            </button>
          </form>

          {mode === 'login' && (
            <>
              <div className="auth-divider">
                <span>or</span>
              </div>
              <button type="button" className="btn btn-ghost btn-full" onClick={handleGoogleSignIn}>
                Continue with Google
              </button>
            </>
          )}

          <div className="auth-footer">
            {mode === 'login' && (
              <p>Don't have an account? <Link to="/register" className="auth-link">Sign up</Link></p>
            )}
            {mode === 'register' && (
              <p>Already have an account? <Link to="/login" className="auth-link">Sign in</Link></p>
            )}
            {(mode === 'forgot' || mode === 'reset') && (
              <p><Link to="/login" className="auth-link">← Back to login</Link></p>
            )}
          </div>
        </div>

        {mode === 'register' && (
          <p className="auth-terms">
            By creating an account, you agree to our <Link to="/privacy-policy" className="auth-link">Privacy Policy</Link>.
          </p>
        )}
      </div>

      <style>{`
        .auth-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          position: relative;
        }

        .auth-bg {
          position: fixed;
          inset: 0;
          pointer-events: none;
          z-index: 0;
        }

        .auth-bg-grid {
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(var(--border) 1px, transparent 1px),
            linear-gradient(90deg, var(--border) 1px, transparent 1px);
          background-size: 40px 40px;
          opacity: 0.3;
        }

        .auth-bg-glow {
          position: absolute;
          top: -20%;
          right: -10%;
          width: 600px;
          height: 600px;
          background: radial-gradient(circle, rgba(0,255,157,0.08) 0%, transparent 70%);
        }

        .auth-container {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 440px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 24px;
          animation: fadeIn 0.4s ease;
        }

        .auth-brand {
          text-align: center;
        }

        .auth-logo {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          margin-bottom: 6px;
        }

        .auth-logo-icon { font-size: 2rem; }

        .auth-logo-text {
          font-family: var(--font-display);
          font-size: 2.2rem;
          font-weight: 800;
          letter-spacing: 0.12em;
          color: var(--accent);
          text-shadow: 0 0 30px rgba(0,255,157,0.4);
        }

        .auth-tagline {
          font-size: 0.85rem;
          color: var(--text-secondary);
          letter-spacing: 0.05em;
        }

        .auth-card {
          width: 100%;
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          padding: 32px;
          backdrop-filter: blur(12px);
        }

        .auth-card-header { margin-bottom: 24px; }

        .auth-title {
          font-family: var(--font-display);
          font-size: 1.5rem;
          font-weight: 800;
          letter-spacing: -0.02em;
          margin-bottom: 4px;
        }

        .auth-subtitle { font-size: 0.85rem; color: var(--text-secondary); }

        .auth-form { display: flex; flex-direction: column; gap: 16px; }

        .input-with-action { position: relative; }
        .input-with-action .form-input { padding-right: 44px; }
        .input-action-btn {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          cursor: pointer;
          font-size: 1rem;
          opacity: 0.6;
        }
        .input-action-btn:hover { opacity: 1; }

        .auth-extras {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .checkbox-label {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.875rem;
          color: var(--text-secondary);
          cursor: pointer;
        }

        .checkbox-label input[type="checkbox"] {
          width: 16px; height: 16px;
          accent-color: var(--accent);
          cursor: pointer;
        }

        .auth-link {
          color: var(--accent);
          text-decoration: none;
          font-size: 0.875rem;
          font-weight: 500;
          transition: opacity var(--transition);
        }
        .auth-link:hover { opacity: 0.8; text-decoration: underline; }

        .auth-divider {
          display: flex;
          align-items: center;
          gap: 12px;
          margin: 12px 0 8px;
          color: var(--text-secondary);
          font-size: 0.8rem;
          text-transform: uppercase;
          letter-spacing: 0.16em;
        }
        .auth-divider::before,
        .auth-divider::after {
          content: '';
          flex: 1;
          height: 1px;
          background: var(--border);
        }
        .auth-footer {
          margin-top: 20px;
          text-align: center;
          font-size: 0.875rem;
          color: var(--text-secondary);
        }

        .auth-terms {
          font-size: 0.75rem;
          color: var(--text-muted);
          text-align: center;
          max-width: 320px;
        }
      `}</style>
    </div>
  );
}
