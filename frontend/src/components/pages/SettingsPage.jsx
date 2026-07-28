import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const SECTIONS = [
  { id: 'profile', label: 'Profile', icon: '👤' },
  { id: 'security', label: 'Security', icon: '🔐' },
  { id: 'appearance', label: 'Appearance', icon: '🎨' },
  { id: 'tts', label: 'Text-to-Speech', icon: '🔊' },
  { id: 'webcam', label: 'Webcam', icon: '📷' },
  { id: 'notifications', label: 'Notifications', icon: '🔔' },
  { id: 'accessibility', label: 'Accessibility', icon: '♿' },
  { id: 'privacy', label: 'Privacy & Data', icon: '🛡' },
];

export default function SettingsPage() {
  const { user, updateUser } = useAuth();
  const [activeSection, setActiveSection] = useState('profile');
  const [prefs, setPrefs] = useState(user?.preferences || {});
  const [saving, setSaving] = useState(false);

  // Profile state
  const [profile, setProfile] = useState({ fullName: user?.fullName || '', phone: user?.phone || '' });
  // Password state
  const [passwords, setPasswords] = useState({ current: '', newPw: '', confirm: '' });
  // Delete account
  const [deleteText, setDeleteText] = useState('');
  const [deleteModal, setDeleteModal] = useState(false);
  // Webcam test
  const [cameras, setCameras] = useState([]);
  const [testStream, setTestStream] = useState(null);

  useEffect(() => {
    if (activeSection === 'webcam') loadCameras();
    return () => { if (testStream) testStream.getTracks().forEach(t => t.stop()); };
  }, [activeSection]);

  const loadCameras = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      setCameras(devices.filter(d => d.kind === 'videoinput'));
    } catch {}
  };

  const savePrefs = async (updates) => {
    setSaving(true);
    try {
      const newPrefs = { ...prefs, ...updates };
      setPrefs(newPrefs);
      await api.patch('/settings/preferences', newPrefs);
      updateUser({ preferences: newPrefs });
      toast.success('Preferences saved');
    } catch { toast.error('Could not save preferences'); }
    finally { setSaving(false); }
  };

  const saveProfile = async () => {
    setSaving(true);
    try {
      const res = await api.patch('/settings/profile', profile);
      updateUser({ fullName: res.data.user.fullName, phone: res.data.user.phone });
      toast.success('Profile updated');
    } catch (err) { toast.error(err.response?.data?.error || 'Update failed'); }
    finally { setSaving(false); }
  };

  const changePassword = async () => {
    if (passwords.newPw !== passwords.confirm) { toast.error('Passwords do not match'); return; }
    setSaving(true);
    try {
      await api.patch('/settings/password', { currentPassword: passwords.current, newPassword: passwords.newPw });
      toast.success('Password changed! Please log in again.');
      setPasswords({ current: '', newPw: '', confirm: '' });
    } catch (err) { toast.error(err.response?.data?.error || 'Password change failed'); }
    finally { setSaving(false); }
  };

  const exportData = async () => {
    const res = await api.get('/settings/export-data', { responseType: 'blob' });
    const url = URL.createObjectURL(res.data);
    const a = document.createElement('a'); a.href = url; a.download = 'akaleta-data.json'; a.click();
    toast.success('Data exported!');
  };

  const deleteAccount = async () => {
    try {
      await api.delete('/settings/account', { data: { confirmText: deleteText } });
      toast.success('Account deleted');
      window.location.href = '/login';
    } catch (err) { toast.error(err.response?.data?.error || 'Deletion failed'); }
  };

  const testTTS = () => {
    const utt = new SpeechSynthesisUtterance('Hello, this is AKALETA text-to-speech test');
    utt.rate = prefs.tts?.speed || 1.0;
    utt.pitch = prefs.tts?.pitch || 1.0;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utt);
  };

  const renderSection = () => {
    switch (activeSection) {

      case 'profile':
        return (
          <SettingsSection title="Profile Management" icon="👤">
            <div className="settings-form">
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input className="form-input" value={profile.fullName} onChange={e => setProfile(p => ({ ...p, fullName: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input className="form-input" value={user?.email} disabled style={{ opacity: 0.5, cursor: 'not-allowed' }} />
                <p className="form-hint">Email cannot be changed. Contact support if needed.</p>
              </div>
              <div className="form-group">
                <label className="form-label">Phone Number <span className="text-muted">(Nigerian format)</span></label>
                <input className="form-input" type="tel" placeholder="+2348012345678" value={profile.phone} onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Account Type</label>
                <div className="badge badge-accent" style={{ width: 'fit-content' }}>{user?.role}</div>
              </div>
              <button className="btn btn-primary" onClick={saveProfile} disabled={saving}>
                {saving ? <span className="spinner" /> : '💾 Save Profile'}
              </button>
            </div>
          </SettingsSection>
        );

      case 'security':
        return (
          <SettingsSection title="Security" icon="🔐">
            <div className="settings-form">
              <h4 className="sub-heading">Change Password</h4>
              <div className="form-group">
                <label className="form-label">Current Password</label>
                <input className="form-input" type="password" value={passwords.current} onChange={e => setPasswords(p => ({ ...p, current: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">New Password</label>
                <input className="form-input" type="password" value={passwords.newPw} onChange={e => setPasswords(p => ({ ...p, newPw: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Confirm New Password</label>
                <input className="form-input" type="password" value={passwords.confirm} onChange={e => setPasswords(p => ({ ...p, confirm: e.target.value }))} />
              </div>
              <button className="btn btn-primary" onClick={changePassword} disabled={saving || !passwords.current}>
                🔑 Change Password
              </button>

              <div className="settings-divider" />

              <h4 className="sub-heading">Two-Factor Authentication</h4>
              <div className="settings-row">
                <div>
                  <p style={{ fontWeight: 500, fontSize: '0.9rem' }}>Authenticator App 2FA</p>
                  <p className="text-secondary" style={{ fontSize: '0.8rem' }}>Use Google Authenticator or Authy</p>
                </div>
                <span className={`badge ${user?.twoFactorEnabled ? 'badge-accent' : 'badge-warning'}`}>
                  {user?.twoFactorEnabled ? 'Enabled' : 'Disabled'}
                </span>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={async () => {
                const res = await api.get('/settings/2fa/setup');
                if (res.data.qrCode) {
                  window.open(res.data.qrCode);
                  toast('Scan QR code with your authenticator app, then verify with the code', { duration: 5000 });
                }
              }}>
                {user?.twoFactorEnabled ? '⚙ Manage 2FA' : '➕ Setup 2FA'}
              </button>

              <div className="settings-divider" />

              <h4 className="sub-heading">Active Sessions</h4>
              <button className="btn btn-secondary btn-sm" onClick={async () => {
                const res = await api.get('/settings/sessions');
                toast(`${res.data.sessions.length} active session(s)`, { duration: 3000 });
              }}>View Sessions</button>
            </div>
          </SettingsSection>
        );

      case 'appearance':
        return (
          <SettingsSection title="Appearance" icon="🎨">
            <div className="settings-form">
              <div className="form-group">
                <label className="form-label">Theme</label>
                <div className="theme-options">
                  {['dark', 'light', 'system'].map(t => (
                    <button key={t} className={`theme-btn ${(prefs.theme || 'dark') === t ? 'active' : ''}`}
                      onClick={() => savePrefs({ theme: t })}>
                      {t === 'dark' ? '🌙' : t === 'light' ? '☀' : '🖥'} {t.charAt(0).toUpperCase() + t.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Font Size: {prefs.fontSize || 16}px</label>
                <input type="range" min="12" max="24" step="1" value={prefs.fontSize || 16}
                  onChange={e => setPrefs(p => ({ ...p, fontSize: parseInt(e.target.value) }))}
                  onMouseUp={() => savePrefs({ fontSize: prefs.fontSize })}
                  className="range-input" />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  <span>12px (Small)</span><span>24px (Large)</span>
                </div>
              </div>

              <ToggleRow label="High Contrast Mode" desc="Increases color contrast for better readability"
                checked={prefs.highContrast || false}
                onChange={v => savePrefs({ highContrast: v })} />
            </div>
          </SettingsSection>
        );

      case 'tts':
        return (
          <SettingsSection title="Text-to-Speech Settings" icon="🔊">
            <div className="settings-form">
              <div className="form-group">
                <label className="form-label">Voice Gender</label>
                <div className="theme-options">
                  {['female', 'male'].map(v => (
                    <button key={v} className={`theme-btn ${(prefs.tts?.voice || 'female') === v ? 'active' : ''}`}
                      onClick={() => savePrefs({ tts: { ...prefs.tts, voice: v } })}>
                      {v === 'female' ? '👩' : '👨'} {v.charAt(0).toUpperCase() + v.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Speech Speed: {prefs.tts?.speed || 1.0}×</label>
                <input type="range" min="0.5" max="2.0" step="0.1" value={prefs.tts?.speed || 1.0}
                  onChange={e => setPrefs(p => ({ ...p, tts: { ...p.tts, speed: parseFloat(e.target.value) } }))}
                  onMouseUp={() => savePrefs({ tts: prefs.tts })}
                  className="range-input" />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  <span>0.5× (Slow)</span><span>2.0× (Fast)</span>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Pitch: {prefs.tts?.pitch || 1.0}</label>
                <input type="range" min="0.5" max="2.0" step="0.1" value={prefs.tts?.pitch || 1.0}
                  onChange={e => setPrefs(p => ({ ...p, tts: { ...p.tts, pitch: parseFloat(e.target.value) } }))}
                  onMouseUp={() => savePrefs({ tts: prefs.tts })}
                  className="range-input" />
              </div>

              <button className="btn btn-secondary" onClick={testTTS}>🔊 Test Voice</button>
            </div>
          </SettingsSection>
        );

      case 'webcam':
        return (
          <SettingsSection title="Webcam Settings" icon="📷">
            <div className="settings-form">
              <div className="form-group">
                <label className="form-label">Select Camera</label>
                <select className="form-input form-select" value={prefs.webcam?.deviceId || ''}
                  onChange={e => savePrefs({ webcam: { ...prefs.webcam, deviceId: e.target.value } })}>
                  <option value="">Default Camera</option>
                  {cameras.map(cam => (
                    <option key={cam.deviceId} value={cam.deviceId}>{cam.label || `Camera ${cameras.indexOf(cam) + 1}`}</option>
                  ))}
                </select>
              </div>
              {cameras.length === 0 && (
                <p className="text-secondary" style={{ fontSize: '0.85rem' }}>No cameras detected. Grant camera permission first.</p>
              )}
              <button className="btn btn-secondary" onClick={async () => {
                try {
                  const s = await navigator.mediaDevices.getUserMedia({ video: true });
                  setTestStream(s);
                  toast.success('Camera working!');
                  setTimeout(() => { s.getTracks().forEach(t => t.stop()); setTestStream(null); }, 3000);
                } catch { toast.error('Cannot access camera. Check browser permissions.'); }
              }}>📷 Test Camera</button>

              {testStream && (
                <div className="card" style={{ padding: 0, overflow: 'hidden', borderColor: 'var(--accent)' }}>
                  <video autoPlay muted playsInline style={{ width: '100%', display: 'block' }}
                    ref={el => { if (el) el.srcObject = testStream; }} />
                  <p className="text-accent" style={{ textAlign: 'center', padding: '8px', fontSize: '0.8rem' }}>📷 Camera Test Active</p>
                </div>
              )}
            </div>
          </SettingsSection>
        );

      case 'notifications':
        return (
          <SettingsSection title="Notifications" icon="🔔">
            <div className="settings-form">
              <ToggleRow label="Email Notifications" desc="Receive tips and updates via email"
                checked={prefs.notifications?.email ?? true}
                onChange={v => savePrefs({ notifications: { ...prefs.notifications, email: v } })} />
              <ToggleRow label="Browser Push Notifications" desc="Get in-browser alerts for new features"
                checked={prefs.notifications?.push ?? false}
                onChange={async v => {
                  if (v && Notification.permission !== 'granted') {
                    const p = await Notification.requestPermission();
                    if (p !== 'granted') { toast.error('Please allow notifications in browser settings'); return; }
                  }
                  savePrefs({ notifications: { ...prefs.notifications, push: v } });
                }} />
            </div>
          </SettingsSection>
        );

      case 'accessibility':
        return (
          <SettingsSection title="Accessibility" icon="♿">
            <div className="settings-form">
              <ToggleRow label="Screen Reader Optimisation" desc="Improves compatibility with screen readers"
                checked={prefs.screenReader || false}
                onChange={v => savePrefs({ screenReader: v })} />
              <ToggleRow label="Reduced Motion" desc="Minimises animations and transitions"
                checked={prefs.reducedMotion || false}
                onChange={v => savePrefs({ reducedMotion: v })} />
              <ToggleRow label="High Contrast Mode" desc="Increases colour contrast across the app"
                checked={prefs.highContrast || false}
                onChange={v => savePrefs({ highContrast: v })} />
            </div>
          </SettingsSection>
        );

      case 'privacy':
        return (
          <SettingsSection title="Privacy & Data" icon="🛡">
            <div className="settings-form">
              <div className="privacy-info card" style={{ borderColor: 'var(--info)', background: 'rgba(59,130,246,0.05)' }}>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  🔒 AKALETA stores your translation history, chat logs, and preferences to personalise your experience. We never share your data with third parties.
                </p>
              </div>

              <div className="settings-row">
                <div>
                  <p style={{ fontWeight: 600, fontSize: '0.9rem' }}>Export My Data</p>
                  <p className="text-secondary" style={{ fontSize: '0.8rem' }}>Download everything: profile, translations, chats</p>
                </div>
                <button className="btn btn-secondary btn-sm" onClick={exportData}>⬇ Export JSON</button>
              </div>

              <div className="settings-divider" />

              <div className="danger-zone">
                <h4 style={{ color: 'var(--danger)', fontWeight: 700, marginBottom: 8 }}>⚠ Danger Zone</h4>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 14 }}>
                  Permanently deletes your account and all associated data. This cannot be undone.
                </p>
                <button className="btn btn-danger" onClick={() => setDeleteModal(true)}>🗑 Delete My Account</button>
              </div>
            </div>

            {deleteModal && (
              <div className="modal-overlay" onClick={() => setDeleteModal(false)}>
                <div className="modal" onClick={e => e.stopPropagation()}>
                  <h3 style={{ color: 'var(--danger)', marginBottom: 12 }}>⚠ Delete Account</h3>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: 20 }}>
                    This will permanently delete your account, all translations, chat history, and settings. Type <strong>DELETE MY ACCOUNT</strong> to confirm.
                  </p>
                  <input className="form-input" placeholder="DELETE MY ACCOUNT" value={deleteText}
                    onChange={e => setDeleteText(e.target.value)} style={{ marginBottom: 16 }} />
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button className="btn btn-secondary flex-1" onClick={() => setDeleteModal(false)}>Cancel</button>
                    <button className="btn btn-danger flex-1" disabled={deleteText !== 'DELETE MY ACCOUNT'} onClick={deleteAccount}>
                      Delete Account
                    </button>
                  </div>
                </div>
              </div>
            )}
          </SettingsSection>
        );

      default: return null;
    }
  };

  return (
    <div className="settings-page">
      <div className="page-header">
        <h1 className="page-title">⚙ Settings</h1>
        <p className="page-subtitle">Manage your account, preferences, and privacy</p>
      </div>

      <div className="settings-layout">
        <nav className="settings-nav">
          {SECTIONS.map(s => (
            <button key={s.id}
              className={`settings-nav-item ${activeSection === s.id ? 'active' : ''}`}
              onClick={() => setActiveSection(s.id)}>
              <span>{s.icon}</span>
              <span>{s.label}</span>
            </button>
          ))}
        </nav>
        <div className="settings-content">{renderSection()}</div>
      </div>

      <style>{`
        .settings-page { display: flex; flex-direction: column; gap: 24px; }
        .settings-layout { display: grid; grid-template-columns: 200px 1fr; gap: 24px; }

        .settings-nav { display: flex; flex-direction: column; gap: 4px; }
        .settings-nav-item {
          display: flex; align-items: center; gap: 10px;
          padding: 10px 14px;
          background: none;
          border: 1px solid transparent;
          border-radius: var(--radius-sm);
          color: var(--text-secondary);
          font-family: var(--font-body);
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          text-align: left;
          transition: all var(--transition);
        }
        .settings-nav-item:hover { background: var(--bg-elevated); color: var(--text-primary); }
        .settings-nav-item.active { background: var(--accent-subtle); color: var(--accent); border-color: var(--border-accent); }

        .settings-content { min-height: 500px; }

        .settings-form { display: flex; flex-direction: column; gap: 18px; }

        .sub-heading { font-weight: 700; font-size: 0.9rem; color: var(--text-secondary); }
        .form-hint { font-size: 0.75rem; color: var(--text-muted); margin-top: 4px; }

        .settings-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
        .settings-divider { height: 1px; background: var(--border); margin: 4px 0; }

        .theme-options { display: flex; gap: 8px; flex-wrap: wrap; }
        .theme-btn {
          padding: 8px 16px;
          background: var(--bg-elevated);
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          color: var(--text-secondary);
          font-family: var(--font-body);
          font-size: 0.85rem;
          cursor: pointer;
          transition: all var(--transition);
          display: flex; align-items: center; gap: 6px;
        }
        .theme-btn:hover { color: var(--text-primary); border-color: var(--border-hover); }
        .theme-btn.active { background: var(--accent-subtle); color: var(--accent); border-color: var(--border-accent); }

        .range-input {
          width: 100%;
          accent-color: var(--accent);
          cursor: pointer;
        }

        .danger-zone {
          background: rgba(255,71,87,0.05);
          border: 1px solid rgba(255,71,87,0.2);
          border-radius: var(--radius);
          padding: 20px;
        }

        @media (max-width: 768px) {
          .settings-layout { grid-template-columns: 1fr; }
          .settings-nav { flex-direction: row; flex-wrap: wrap; }
          .settings-nav-item { flex-direction: column; gap: 4px; padding: 8px 12px; font-size: 0.75rem; }
        }
      `}</style>
    </div>
  );
}

function SettingsSection({ title, icon, children }) {
  return (
    <div className="card">
      <div style={{ marginBottom: 20, paddingBottom: 16, borderBottom: '1px solid var(--border)' }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 800 }}>
          {icon} {title}
        </h2>
      </div>
      {children}
    </div>
  );
}

function ToggleRow({ label, desc, checked, onChange }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '8px 0' }}>
      <div>
        <p style={{ fontWeight: 500, fontSize: '0.9rem' }}>{label}</p>
        {desc && <p className="text-secondary" style={{ fontSize: '0.8rem', marginTop: 2 }}>{desc}</p>}
      </div>
      <label className="toggle">
        <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} />
        <span className="toggle-slider" />
      </label>
    </div>
  );
}
