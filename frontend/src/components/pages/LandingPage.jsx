import React from 'react';
import { Link } from 'react-router-dom';

export default function LandingPage() {
  return (
    <div className="landing-page">
      <section className="hero-card">
        <div className="hero-copy">
          <p className="eyebrow">AKALETA • Nigerian Sign Language Translator</p>
          <h1>Bring sign language translation to every conversation.</h1>
          <p className="hero-text">
            AKALETA helps schools, communities, and everyday users translate sign language into spoken and written communication with confidence.
          </p>
          <div className="hero-actions">
            <Link to="/register" className="btn btn-primary">Create account</Link>
            <Link to="/login" className="btn btn-ghost">Sign in</Link>
          </div>
        </div>

        <div className="hero-panel">
          <div className="feature-pill">Real-time translation</div>
          <div className="feature-pill">Secure sign-in</div>
          <div className="feature-pill">Privacy-first experience</div>
        </div>
      </section>

      <section className="info-grid">
        <div className="info-card">
          <h3>Accessible for web and mobile</h3>
          <p>The same experience is available on desktop, mobile web, and the Capacitor app shell.</p>
        </div>
        <div className="info-card">
          <h3>Secure account access</h3>
          <p>Use email and password or Google sign-in with verified identity tokens.</p>
        </div>
        <div className="info-card">
          <h3>Privacy and trust</h3>
          <p>Read the privacy policy and manage your account preferences from one place.</p>
        </div>
      </section>

      <footer className="landing-footer">
        <Link to="/privacy-policy">Privacy Policy</Link>
        <span>•</span>
        <a href="mailto:support@akaleta.app">support@akaleta.app</a>
      </footer>

      <style>{`
        .landing-page {
          min-height: 100vh;
          padding: 32px 20px 48px;
          display: flex;
          flex-direction: column;
          gap: 24px;
          background: linear-gradient(135deg, rgba(0,255,157,0.08), transparent 70%);
        }
        .hero-card {
          max-width: 1100px;
          margin: 0 auto;
          width: 100%;
          display: grid;
          grid-template-columns: 1.3fr 0.7fr;
          gap: 24px;
          padding: 32px;
          border-radius: 24px;
          border: 1px solid var(--border);
          background: var(--bg-card);
          backdrop-filter: blur(12px);
        }
        .eyebrow {
          font-size: 0.78rem;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: var(--accent);
          margin-bottom: 10px;
        }
        .hero-copy h1 {
          font-family: var(--font-display);
          font-size: clamp(2rem, 4vw, 3rem);
          line-height: 1.1;
          margin-bottom: 12px;
        }
        .hero-text {
          color: var(--text-secondary);
          font-size: 1rem;
          line-height: 1.7;
          max-width: 660px;
        }
        .hero-actions {
          display: flex;
          gap: 12px;
          margin-top: 20px;
          flex-wrap: wrap;
        }
        .hero-panel {
          display: flex;
          flex-direction: column;
          gap: 12px;
          justify-content: center;
        }
        .feature-pill {
          padding: 14px 16px;
          border-radius: 999px;
          border: 1px solid var(--border);
          background: rgba(255,255,255,0.04);
          color: var(--text-primary);
          font-weight: 600;
          text-align: center;
        }
        .info-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 16px;
          max-width: 1100px;
          width: 100%;
          margin: 0 auto;
        }
        .info-card {
          padding: 20px;
          border-radius: 18px;
          border: 1px solid var(--border);
          background: var(--bg-card);
        }
        .info-card h3 { margin-bottom: 8px; }
        .info-card p { color: var(--text-secondary); line-height: 1.6; }
        .landing-footer {
          display: flex;
          gap: 10px;
          justify-content: center;
          align-items: center;
          color: var(--text-secondary);
          margin-top: auto;
        }
        .landing-footer a { color: var(--accent); }
        @media (max-width: 860px) {
          .hero-card { grid-template-columns: 1fr; }
          .info-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}
