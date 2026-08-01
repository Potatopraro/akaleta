import React from 'react';
import { Link } from 'react-router-dom';

export default function PrivacyPolicyPage() {
  return (
    <div className="privacy-page">
      <div className="privacy-card">
        <p className="eyebrow">Privacy Policy</p>
        <h1>How AKALETA protects your data</h1>
        <p>
          AKALETA uses secure authentication, encrypted transport, and minimal data collection to protect your account and personal information.
        </p>

        <h3>What we collect</h3>
        <ul>
          <li>Account information such as your name, email, and password hash.</li>
          <li>Usage data needed to improve translation and support features.</li>
          <li>Session metadata to keep your sign-in secure and prevent abuse.</li>
        </ul>

        <h3>How we use it</h3>
        <ul>
          <li>To authenticate you securely and maintain your account.</li>
          <li>To provide the translator, chatbot, and dashboard features.</li>
          <li>To improve reliability and protect against misuse.</li>
        </ul>

        <h3>Security</h3>
        <p>
          We use HTTPS, token-based authentication, rate limiting, and password hashing to reduce risk. We recommend using a strong, unique password and enabling two-factor authentication where available.
        </p>

        <Link to="/login" className="btn btn-primary">Back to sign in</Link>
      </div>

      <style>{`
        .privacy-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
        }
        .privacy-card {
          max-width: 760px;
          width: 100%;
          padding: 32px;
          border-radius: 24px;
          border: 1px solid var(--border);
          background: var(--bg-card);
          box-shadow: 0 20px 60px rgba(0,0,0,0.2);
        }
        .privacy-card h1 { font-family: var(--font-display); margin-bottom: 10px; }
        .privacy-card h3 { margin-top: 18px; margin-bottom: 8px; }
        .privacy-card ul { padding-left: 20px; color: var(--text-secondary); line-height: 1.7; }
        .privacy-card p { color: var(--text-secondary); line-height: 1.7; }
      `}</style>
    </div>
  );
}
