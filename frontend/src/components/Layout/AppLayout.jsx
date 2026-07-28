import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import TranslatorPage from '../pages/TranslatorPage';
import ChatbotPage from '../pages/ChatbotPage';
import DashboardPage from '../pages/DashboardPage';
import HowToUsePage from '../pages/HowToUsePage';
import SettingsPage from '../pages/SettingsPage';
import SupportPage from '../pages/SupportPage';
import toast from 'react-hot-toast';

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: '⊞', path: '/app/dashboard' },
  { id: 'translator', label: 'Translator', icon: '🖐️', path: '/app/translator' },
  { id: 'chatbot', label: 'Chatbot', icon: '💬', path: '/app/chatbot' },
  { id: 'how-to-use', label: 'How to Use', icon: '📖', path: '/app/how-to-use' },
  { id: 'settings', label: 'Settings', icon: '⚙', path: '/app/settings' },
  { id: 'support', label: 'Support', icon: '🛟', path: '/app/support' },
];

const MOBILE_NAV = NAV_ITEMS.slice(0, 4);

export default function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  const preferredTheme = user?.preferences?.theme || 'dark';

  useEffect(() => {
    const root = document.documentElement;
    const effectiveTheme = preferredTheme === 'light'
      ? 'light'
      : preferredTheme === 'system'
        ? (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
        : 'dark';

    root.classList.toggle('theme-light', effectiveTheme === 'light');
    root.classList.toggle('theme-dark', effectiveTheme === 'dark');
  }, [preferredTheme]);

  const activeId = NAV_ITEMS.find(n => location.pathname.startsWith(n.path))?.id || 'dashboard';

  const handleLogout = () => {
    logout();
    toast.success('Signed out');
    navigate('/login');
  };

  const initials = user?.fullName?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || 'U';

  return (
    <div className={`app-shell ${sidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
      {/* ── Sidebar ── */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <img src="/logo.png" alt="AKALETA" className="sidebar-logo-img" />
            {sidebarOpen && <span className="sidebar-logo-text">AKALETA</span>}
          </div>
        </div>

        <nav className="sidebar-nav">
          {NAV_ITEMS.map(item => (
            <button
              key={item.id}
              className={`sidebar-nav-item ${activeId === item.id ? 'active' : ''}`}
              onClick={() => { navigate(item.path); setSidebarOpen(false); }}
            >
              <span className="nav-icon">{item.icon}</span>
              {sidebarOpen && <span className="nav-label">{item.label}</span>}
              {activeId === item.id && sidebarOpen && <span className="nav-dot" />}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          {sidebarOpen && (
            <div className="sidebar-user">
              <div className="user-avatar">{initials}</div>
              <div className="user-info">
                <p className="user-name">{user?.fullName?.split(' ')[0]}</p>
                <p className="user-role">{user?.role}</p>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* ── Main Area ── */}
      <div className="main-area">
        {/* ── Navbar ── */}
        <header className="navbar">
          <div className="navbar-left">
            <button className="btn btn-ghost btn-icon" onClick={() => setSidebarOpen(s => !s)}>
              <span style={{ fontSize: '1.2rem' }}>☰</span>
            </button>
            <div className="navbar-breadcrumb">
              <span className="breadcrumb-page">
                {NAV_ITEMS.find(n => n.id === activeId)?.icon}{' '}
                {NAV_ITEMS.find(n => n.id === activeId)?.label}
              </span>
            </div>
          </div>

          <div className="navbar-right">
            {/* Notifications */}
            <div className="navbar-btn-wrap">
              <button className="btn btn-ghost btn-icon" onClick={() => { setNotifOpen(o => !o); setProfileOpen(false); }}>
                <span style={{ fontSize: '1.1rem' }}>🔔</span>
                <span className="notif-badge">2</span>
              </button>
              {notifOpen && (
                <div className="dropdown notif-dropdown">
                  <div className="dropdown-header">Notifications</div>
                  <div className="dropdown-item">
                    <span>🎉</span>
                    <div><p>Welcome to AKALETA!</p><small>Just now</small></div>
                  </div>
                  <div className="dropdown-item">
                    <span>🖐️</span>
                    <div><p>Start practicing NSL signs</p><small>Today</small></div>
                  </div>
                </div>
              )}
            </div>

            {/* Profile Dropdown */}
            <div className="navbar-btn-wrap">
              <button className="user-avatar navbar-avatar" onClick={() => { setProfileOpen(o => !o); setNotifOpen(false); }}>
                {initials}
              </button>
              {profileOpen && (
                <div className="dropdown profile-dropdown">
                  <div className="dropdown-header">
                    <p className="dropdown-name">{user?.fullName}</p>
                    <p className="dropdown-email">{user?.email}</p>
                  </div>
                  <button className="dropdown-item" onClick={() => { navigate('/app/settings'); setProfileOpen(false); }}>
                    <span>⚙</span> Settings
                  </button>
                  <div className="dropdown-divider" />
                  <button className="dropdown-item danger" onClick={handleLogout}>
                    <span>→</span> Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* ── Page Content ── */}
        <main className="page-content" onClick={() => { setProfileOpen(false); setNotifOpen(false); }}>
          <Routes>
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="translator" element={<TranslatorPage />} />
            <Route path="chatbot" element={<ChatbotPage />} />
            <Route path="how-to-use" element={<HowToUsePage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="support" element={<SupportPage />} />
            <Route path="*" element={<Navigate to="dashboard" replace />} />
          </Routes>
        </main>
      </div>

      {/* ── Mobile Bottom Navigation ── */}
      <div className="mobile-bottom-nav">
        {MOBILE_NAV.map(item => (
          <button 
            key={item.id}
            className={activeId === item.id ? 'active' : ''}
            onClick={() => navigate(item.path)}
          >
            <span className="mobile-nav-icon">{item.icon}</span>
            <span className="mobile-nav-label">{item.label}</span>
          </button>
        ))}
      </div>

      <style>{`
        .app-shell {
          display: flex;
          min-height: 100vh;
          background: var(--bg-primary);
        }

        /* ── Sidebar ── */
        .sidebar {
          width: 280px;
          min-height: 100vh;
          background: var(--bg-secondary);
          border-right: 1px solid var(--border);
          display: flex;
          flex-direction: column;
          position: fixed;
          left: 0; top: 0; bottom: 0;
          z-index: 100;
          transition: transform 0.3s ease;
          overflow: hidden;
          transform: translateX(-100%);
        }

        .sidebar-open .sidebar {
          transform: translateX(0);
        }

        .sidebar-closed .sidebar {
          transform: translateX(-100%);
        }

        .sidebar-header {
          padding: 20px 16px 16px;
          border-bottom: 1px solid var(--border);
          flex-shrink: 0;
        }

        .sidebar-logo {
          display: flex;
          align-items: center;
          gap: 10px;
          overflow: hidden;
        }

        .sidebar-logo-img {
          width: 32px;
          height: 32px;
          object-fit: contain;
          flex-shrink: 0;
        }

        .sidebar-logo-text {
          font-family: var(--font-display);
          font-size: 1.1rem;
          font-weight: 800;
          letter-spacing: 0.1em;
          color: var(--accent);
          white-space: nowrap;
          text-shadow: 0 0 20px rgba(0,255,157,0.3);
        }

        .sidebar-nav {
          flex: 1;
          padding: 16px 10px;
          display: flex;
          flex-direction: column;
          gap: 4px;
          overflow-y: auto;
        }

        .sidebar-nav-item {
          justify-content: flex-start;
          background: none;
          font-family: var(--font-body);
          letter-spacing: 0;
          overflow: hidden;
          white-space: nowrap;
          position: relative;
          width: 100%;
          padding: 10px 12px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          gap: 12px;
          color: var(--text-secondary);
          transition: all 0.2s ease;
          cursor: pointer;
          border: none;
        }

        .sidebar-nav-item:hover {
          background: var(--bg-elevated);
          color: var(--text-primary);
        }

        .sidebar-nav-item.active {
          background: var(--accent-subtle);
          color: var(--accent);
        }

        .nav-icon {
          font-size: 1.2rem;
          flex-shrink: 0;
        }

        .nav-label {
          font-size: 0.9rem;
          font-weight: 500;
        }

        .nav-dot {
          width: 6px;
          height: 6px;
          background: var(--accent);
          border-radius: 50%;
          margin-left: auto;
          flex-shrink: 0;
        }

        .sidebar-footer {
          padding: 12px 10px;
          border-top: 1px solid var(--border);
          flex-shrink: 0;
        }

        .sidebar-user {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 6px;
          border-radius: var(--radius-sm);
          overflow: hidden;
        }

        .user-avatar {
          width: 36px;
          height: 36px;
          background: linear-gradient(135deg, var(--accent), var(--accent-dim));
          color: #000;
          font-weight: 700;
          font-size: 0.8rem;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          font-family: var(--font-display);
        }

        .user-info {
          overflow: hidden;
        }

        .user-name {
          font-size: 0.85rem;
          font-weight: 600;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .user-role {
          font-size: 0.7rem;
          color: var(--text-muted);
          text-transform: capitalize;
        }

        /* ── Main Area ── */
        .main-area {
          flex: 1;
          margin-left: 0;
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          width: 100%;
          padding-bottom: 70px;
        }

        /* ── Navbar ── */
        .navbar {
          height: var(--navbar-height);
          background: var(--bg-secondary);
          border-bottom: 1px solid var(--border);
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 16px;
          position: sticky;
          top: 0;
          z-index: 50;
          gap: 16px;
        }

        .navbar-left,
        .navbar-right {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .navbar-breadcrumb {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .breadcrumb-page {
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--text-primary);
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .navbar-btn-wrap {
          position: relative;
        }

        .notif-badge {
          position: absolute;
          top: 2px;
          right: 2px;
          width: 14px;
          height: 14px;
          background: var(--danger);
          color: #fff;
          font-size: 0.6rem;
          font-weight: 700;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          line-height: 1;
        }

        .navbar-avatar {
          cursor: pointer;
          border: 2px solid var(--border-accent);
        }
        .navbar-avatar:hover {
          border-color: var(--accent);
          box-shadow: var(--shadow-accent);
        }

        .dropdown {
          position: absolute;
          right: 0;
          top: calc(100% + 8px);
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          min-width: 220px;
          box-shadow: var(--shadow-md);
          z-index: 200;
          overflow: hidden;
          animation: fadeIn 0.15s ease;
        }

        .dropdown-header {
          padding: 14px 16px;
          border-bottom: 1px solid var(--border);
          font-size: 0.8rem;
          font-weight: 600;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .dropdown-name {
          font-size: 0.9rem;
          font-weight: 600;
          color: var(--text-primary);
        }
        .dropdown-email {
          font-size: 0.75rem;
          color: var(--text-muted);
          margin-top: 2px;
        }

        .dropdown-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 11px 16px;
          width: 100%;
          background: none;
          border: none;
          color: var(--text-secondary);
          font-family: var(--font-body);
          font-size: 0.875rem;
          cursor: pointer;
          text-align: left;
          transition: all var(--transition);
        }

        .dropdown-item:hover {
          background: var(--bg-elevated);
          color: var(--text-primary);
        }
        .dropdown-item.danger {
          color: var(--danger);
        }
        .dropdown-item.danger:hover {
          background: rgba(255, 71, 87, 0.1);
        }

        .dropdown-divider {
          height: 1px;
          background: var(--border);
          margin: 4px 0;
        }

        .notif-dropdown {
          min-width: 280px;
        }

        /* ── Page Content ── */
        .page-content {
          flex: 1;
          padding: 16px;
          overflow-y: auto;
          max-width: 1400px;
          width: 100%;
          margin: 0 auto;
        }

        /* ── Mobile Bottom Navigation ── */
        .mobile-bottom-nav {
          display: none;
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          background: var(--bg-card);
          border-top: 1px solid var(--border);
          padding: 6px 0 env(safe-area-inset-bottom);
          z-index: 1000;
          justify-content: space-around;
          backdrop-filter: blur(10px);
        }

        .mobile-bottom-nav button {
          background: none;
          border: none;
          display: flex;
          flex-direction: column;
          align-items: center;
          color: var(--text-secondary);
          font-size: 0.65rem;
          padding: 4px 12px;
          cursor: pointer;
          transition: color 0.2s ease;
          font-family: var(--font-body);
        }

        .mobile-bottom-nav .mobile-nav-icon {
          font-size: 1.5rem;
          margin-bottom: 2px;
        }

        .mobile-bottom-nav .mobile-nav-label {
          font-size: 0.6rem;
          font-weight: 500;
        }

        .mobile-bottom-nav .active {
          color: var(--accent);
        }

        /* ── Overlay for sidebar ── */
        .app-shell::before {
          content: '';
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          z-index: 99;
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.3s ease;
        }

        .sidebar-open::before {
          opacity: 1;
          pointer-events: auto;
        }

        /* ── Tablet and Mobile ── */
        @media (max-width: 768px) {
          .mobile-bottom-nav {
            display: flex;
          }

          .page-content {
            padding: 12px 16px 70px;
          }

          .navbar {
            padding: 0 12px;
          }

          .breadcrumb-page {
            font-size: 0.75rem;
          }

          .dropdown {
            min-width: 180px;
            right: -8px;
          }

          .notif-dropdown {
            min-width: 240px;
          }
        }

        @media (min-width: 769px) {
          .sidebar {
            transform: translateX(0) !important;
          }

          .main-area {
            margin-left: 280px;
            padding-bottom: 0;
          }

          .app-shell::before {
            display: none;
          }

          .mobile-bottom-nav {
            display: none !important;
          }

          .sidebar-closed .sidebar {
            transform: translateX(-280px) !important;
          }

          .sidebar-closed .main-area {
            margin-left: 0;
          }
        }
      `}</style>
    </div>
  );
}