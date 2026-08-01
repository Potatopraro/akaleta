import React, { useState } from 'react';
import api from '../../utils/api';
import toast from 'react-hot-toast';

export default function SupportPage() {
  const [tab, setTab] = useState('contact');
  const [contact, setContact] = useState({ name: '', email: '', subject: '', message: '' });
  const [bug, setBug] = useState({ title: '', description: '', steps: '', browser: navigator.userAgent.substring(0, 100) });
  const [feedback, setFeedback] = useState({ rating: 0, feedback: '', suggestions: '' });
  const [sending, setSending] = useState(false);

  const submitContact = async () => {
    if (!contact.name || !contact.email || !contact.subject || !contact.message) {
      toast.error('Please fill in all fields'); return;
    }
    setSending(true);
    try {
      await api.post('/support/contact', contact);
      toast.success("Message sent! We'll reply within 24 hours.");
      setContact({ name: '', email: '', subject: '', message: '' });
    } catch (err) { toast.error(err.response?.data?.error || 'Send failed'); }
    finally { setSending(false); }
  };

  const submitBug = async () => {
    if (!bug.title || !bug.description) { toast.error('Title and description required'); return; }
    setSending(true);
    try {
      await api.post('/support/bug-report', bug);
      toast.success('Bug report submitted. Thank you!');
      setBug({ title: '', description: '', steps: '', browser: navigator.userAgent.substring(0, 100) });
    } catch { toast.error('Submission failed'); }
    finally { setSending(false); }
  };

  const submitFeedback = async () => {
    if (!feedback.rating) { toast.error('Please select a rating'); return; }
    setSending(true);
    try {
      await api.post('/support/feedback', feedback);
      toast.success('Thank you for your feedback! 🌟');
      setFeedback({ rating: 0, feedback: '', suggestions: '' });
    } catch { toast.error('Submission failed'); }
    finally { setSending(false); }
  };

  return (
    <div className="support-page">
      <div className="page-header">
        <h1 className="page-title">🛟 Support Centre</h1>
        <p className="page-subtitle">Get help, report issues, or share feedback with the AKALETA team</p>
      </div>

      <div className="support-grid">
        {/* ── Tabs ── */}
        <div className="support-main">
          <div className="tabs mb-4">
            <button className={`tab-btn ${tab === 'contact' ? 'active' : ''}`} onClick={() => setTab('contact')}>📬 Contact</button>
            <button className={`tab-btn ${tab === 'bug' ? 'active' : ''}`} onClick={() => setTab('bug')}>🐛 Bug Report</button>
            <button className={`tab-btn ${tab === 'feedback' ? 'active' : ''}`} onClick={() => setTab('feedback')}>⭐ Feedback</button>
          </div>

          {/* ── Contact Form ── */}
          {tab === 'contact' && (
            <div className="card animate-fade-in">
              <h3 className="form-section-title">📬 Contact Us</h3>
              <p className="text-secondary" style={{ fontSize: '0.85rem', marginBottom: 20 }}>
                Have a question or need help? Send us a message and we'll get back to you within 24 hours.
              </p>
              <div className="support-form">
                <div className="form-row">
                  <div className="form-group flex-1">
                    <label className="form-label">Your Name</label>
                    <input className="form-input" placeholder="Adaeze Okonkwo" value={contact.name}
                      onChange={e => setContact(p => ({ ...p, name: e.target.value }))} />
                  </div>
                  <div className="form-group flex-1">
                    <label className="form-label">Email Address</label>
                    <input className="form-input" type="email" placeholder="you@example.com" value={contact.email}
                      onChange={e => setContact(p => ({ ...p, email: e.target.value }))} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Subject</label>
                  <select className="form-input form-select" value={contact.subject}
                    onChange={e => setContact(p => ({ ...p, subject: e.target.value }))}>
                    <option value="">Select a topic…</option>
                    <option value="Technical Issue">Technical Issue</option>
                    <option value="Account Problem">Account Problem</option>
                    <option value="Feature Request">Feature Request</option>
                    <option value="Partnership">Partnership / Business</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Message</label>
                  <textarea className="form-input form-textarea" placeholder="Describe your issue or question in detail..."
                    rows={5} value={contact.message}
                    onChange={e => setContact(p => ({ ...p, message: e.target.value }))} />
                </div>
                <button className="btn btn-primary" onClick={submitContact} disabled={sending}>
                  {sending ? <span className="spinner" /> : '📨 Send Message'}
                </button>
              </div>
            </div>
          )}

          {/* ── Bug Report ── */}
          {tab === 'bug' && (
            <div className="card animate-fade-in">
              <h3 className="form-section-title">🐛 Report a Bug</h3>
              <p className="text-secondary" style={{ fontSize: '0.85rem', marginBottom: 20 }}>
                Found something broken? Please describe it clearly so our team can investigate.
              </p>
              <div className="support-form">
                <div className="form-group">
                  <label className="form-label">Bug Title</label>
                  <input className="form-input" placeholder="Brief description of the issue" value={bug.title}
                    onChange={e => setBug(p => ({ ...p, title: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea className="form-input form-textarea" placeholder="What happened? What did you expect to happen?" rows={4}
                    value={bug.description} onChange={e => setBug(p => ({ ...p, description: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Steps to Reproduce <span className="text-muted">(optional)</span></label>
                  <textarea className="form-input form-textarea" placeholder="1. Go to Translator&#10;2. Click Start Detection&#10;3. ..." rows={4}
                    value={bug.steps} onChange={e => setBug(p => ({ ...p, steps: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Browser / Device Info</label>
                  <input className="form-input" value={bug.browser} onChange={e => setBug(p => ({ ...p, browser: e.target.value }))} />
                </div>
                <button className="btn btn-primary" onClick={submitBug} disabled={sending}>
                  {sending ? <span className="spinner" /> : '🐛 Submit Bug Report'}
                </button>
              </div>
            </div>
          )}

          {/* ── Feedback ── */}
          {tab === 'feedback' && (
            <div className="card animate-fade-in">
              <h3 className="form-section-title">⭐ Share Your Feedback</h3>
              <p className="text-secondary" style={{ fontSize: '0.85rem', marginBottom: 20 }}>
                How is your experience with AKALETA? Your feedback helps us improve.
              </p>
              <div className="support-form">
                <div className="form-group">
                  <label className="form-label">Overall Rating</label>
                  <div className="star-rating">
                    {[1, 2, 3, 4, 5].map(n => (
                      <button key={n} className={`star-btn ${feedback.rating >= n ? 'active' : ''}`}
                        onClick={() => setFeedback(p => ({ ...p, rating: n }))}>★</button>
                    ))}
                    {feedback.rating > 0 && (
                      <span className="rating-label">
                        {['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'][feedback.rating]}
                      </span>
                    )}
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Your Feedback</label>
                  <textarea className="form-input form-textarea" placeholder="What do you like or dislike about AKALETA?" rows={4}
                    value={feedback.feedback} onChange={e => setFeedback(p => ({ ...p, feedback: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Suggestions for New Signs / Features <span className="text-muted">(optional)</span></label>
                  <textarea className="form-input form-textarea" placeholder="E.g. 'Add support for Hausa greetings', 'Improve low-light detection'..." rows={3}
                    value={feedback.suggestions} onChange={e => setFeedback(p => ({ ...p, suggestions: e.target.value }))} />
                </div>
                <button className="btn btn-primary" onClick={submitFeedback} disabled={sending}>
                  {sending ? <span className="spinner" /> : '⭐ Submit Feedback'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Sidebar Info ── */}
        <div className="support-sidebar">
          <div className="card">
            <h3 style={{ fontWeight: 700, marginBottom: 14, fontSize: '0.95rem' }}>📞 Contact Info</h3>
            <div className="contact-info-list">
              <div className="contact-info-item">
                <span>📧</span>
                <div>
                  <p style={{ fontWeight: 600, fontSize: '0.85rem' }}>Email Support</p>
                  <a href="mailto:support@akaleta.ng" className="auth-link" style={{ fontSize: '0.8rem' }}>support@akaleta.ng</a>
                </div>
              </div>
              <div className="contact-info-item">
                <span>⏰</span>
                <div>
                  <p style={{ fontWeight: 600, fontSize: '0.85rem' }}>Response Time</p>
                  <p className="text-secondary" style={{ fontSize: '0.8rem' }}>Within 24 hours</p>
                </div>
              </div>
              <div className="contact-info-item">
                <span>🇳🇬</span>
                <div>
                  <p style={{ fontWeight: 600, fontSize: '0.85rem' }}>Based in Nigeria</p>
                  <p className="text-secondary" style={{ fontSize: '0.8rem' }}>WAT (UTC+1)</p>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <h3 style={{ fontWeight: 700, marginBottom: 14, fontSize: '0.95rem' }}>🔗 Help Resources</h3>
            <div className="help-links">
              {[
                { icon: '📖', label: 'Documentation', href: '#' },
                { icon: '🖐️', label: 'NSL Learning Guide', href: '#' },
                { icon: '💬', label: 'Community Forum', href: '#' },
                { icon: '🐙', label: 'GitHub Repository', href: 'https://github.com/ML-Collective/Sign-to-Speech-for-Sign-Language-Understanding' },
              ].map(link => (
                <a key={link.label} href={link.href} target="_blank" rel="noopener noreferrer" className="help-link">
                  <span>{link.icon}</span>
                  <span>{link.label}</span>
                  <span style={{ marginLeft: 'auto', color: 'var(--text-muted)', fontSize: '0.8rem' }}>→</span>
                </a>
              ))}
            </div>
          </div>

          <div className="card" style={{ background: 'var(--accent-subtle)', borderColor: 'var(--border-accent)' }}>
            <h3 style={{ fontWeight: 700, marginBottom: 8, fontSize: '0.9rem', color: 'var(--accent)' }}>🌍 About AKALETA</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              AKALETA is built on the ML-Collective Nigerian Sign Language dataset — 5,000+ images covering 137 signs used across Nigeria's deaf communities. Our mission is to bridge communication gaps.
            </p>
          </div>
        </div>
      </div>

      <style>{`
        .support-page { display: flex; flex-direction: column; gap: 24px; }
        .support-grid { display: grid; grid-template-columns: 1fr 280px; gap: 24px; align-items: start; }
        .support-main { display: flex; flex-direction: column; gap: 16px; }
        .support-sidebar { display: flex; flex-direction: column; gap: 16px; }

        .form-section-title { font-family: var(--font-display); font-size: 1.1rem; font-weight: 800; margin-bottom: 4px; }

        .support-form { display: flex; flex-direction: column; gap: 16px; }
        .form-row { display: flex; gap: 14px; }
        .form-textarea { resize: vertical; min-height: 100px; }

        .star-rating { display: flex; align-items: center; gap: 8px; }
        .star-btn {
          background: none;
          border: none;
          font-size: 2rem;
          cursor: pointer;
          color: var(--border);
          transition: color var(--transition), transform var(--transition);
          line-height: 1;
        }
        .star-btn.active { color: #ffa502; }
        .star-btn:hover { transform: scale(1.2); }
        .rating-label { font-size: 0.875rem; font-weight: 600; color: var(--text-secondary); margin-left: 4px; }

        .contact-info-list { display: flex; flex-direction: column; gap: 12px; }
        .contact-info-item { display: flex; gap: 10px; align-items: flex-start; font-size: 1.2rem; }

        .help-links { display: flex; flex-direction: column; gap: 4px; }
        .help-link {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 9px 10px;
          border-radius: var(--radius-sm);
          font-size: 0.85rem;
          color: var(--text-secondary);
          text-decoration: none;
          transition: all var(--transition);
        }
        .help-link:hover { background: var(--bg-elevated); color: var(--text-primary); }

        @media (max-width: 900px) {
          .support-grid { grid-template-columns: 1fr; }
          .support-sidebar { order: -1; }
          .form-row { flex-direction: column; }
        }
      `}</style>
    </div>
  );
}
