import React, { useState } from 'react';

const NSL_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

const NSL_WORDS = [
  { category: 'Greetings', signs: ['Hello', 'Goodbye', 'Good Morning', 'Good Night', 'Welcome', 'Thank You', 'Please', 'Sorry'] },
  { category: 'Family', signs: ['Mother', 'Father', 'Brother', 'Sister', 'Child', 'Baby', 'Family', 'Friend'] },
  { category: 'Common Verbs', signs: ['Eat', 'Drink', 'Sleep', 'Walk', 'Run', 'Help', 'Learn', 'Understand'] },
  { category: 'Numbers', signs: ['One', 'Two', 'Three', 'Four', 'Five', 'Ten', 'Twenty', 'Hundred'] },
  { category: 'Colours', signs: ['Red', 'Blue', 'Green', 'Yellow', 'Black', 'White', 'Orange', 'Purple'] },
  { category: 'Emotions', signs: ['Happy', 'Sad', 'Angry', 'Scared', 'Surprised', 'Love', 'Pain', 'Tired'] },
];

const FAQ = [
  { q: 'What signs does AKALETA support?', a: 'AKALETA\'s YOLO model supports 137 Nigerian Sign Language signs including the full alphabet (A–Z), common words, and everyday phrases. The dataset was sourced from Nigerian deaf communities across multiple states.' },
  { q: 'How accurate is the detection?', a: 'Accuracy depends on lighting, hand positioning, and camera quality. Under good conditions, the model achieves 85–95% confidence. We display confidence scores so you know how certain the detection is.' },
  { q: 'Do I need a special camera?', a: 'No special equipment needed! Any standard webcam or phone camera works. For best results, use a camera with at least 720p resolution.' },
  { q: 'Can I use AKALETA offline?', a: 'The ML detection requires the DeepStack backend to be running. If you\'re running AKALETA locally with Docker, it works without internet after setup. The cloud version requires an internet connection.' },
  { q: 'How is NSL different from ASL or BSL?', a: 'Nigerian Sign Language evolved independently within Nigerian deaf schools and communities. While it shares some visual vocabulary with other sign languages, NSL has its own grammar, regional variations, and culturally specific signs.' },
  { q: 'How do I improve my sign recognition accuracy?', a: 'Place your hands against a plain, contrasting background. Ensure good lighting on your hands. Keep hands within the camera frame. Make signs slowly and deliberately. Face the camera directly.' },
];

const STEPS = [
  { icon: '🌐', title: 'Allow Camera Access', desc: 'When prompted by your browser, click "Allow" for camera access. AKALETA only uses your camera for sign detection — no footage is stored or transmitted.' },
  { icon: '🖐️', title: 'Open the Translator', desc: 'Click "Translator" in the sidebar. Choose between Live Webcam mode for real-time detection or Image Upload mode to analyze photos.' },
  { icon: '▶', title: 'Start Detection', desc: 'Click the "Start Detection" button. Position your hands clearly in the camera frame and make a sign. The system will detect it within 1–2 seconds.' },
  { icon: '📊', title: 'View Results', desc: 'The detected sign appears prominently with a confidence score. Use the 🔊 button to hear it spoken aloud. Save signs you want to track in your progress.' },
  { icon: '💬', title: 'Try the Chatbot', desc: 'Navigate to Chatbot to practice conversation. Use Text Mode for typing or Sign Mode to sign directly to the chatbot and get AI responses.' },
];

const TIPS = [
  { icon: '💡', title: 'Lighting', desc: 'Use natural light or a lamp facing you. Avoid backlighting (bright window behind you).' },
  { icon: '✋', title: 'Hand Position', desc: 'Keep hands between waist and shoulder height, clearly visible in frame.' },
  { icon: '🎨', title: 'Background', desc: 'A plain, solid-colored background contrasts well with your hands.' },
  { icon: '📏', title: 'Distance', desc: 'Sit 60–90 cm (2–3 feet) from the camera. Your hands should fill 30–40% of the frame.' },
  { icon: '🌡', title: 'Clothing', desc: 'Wear clothing that contrasts with your skin tone for better hand detection.' },
  { icon: '⏱', title: 'Sign Speed', desc: 'Hold each sign for 1–2 seconds. Moving too fast reduces detection accuracy.' },
];

export default function HowToUsePage() {
  const [openFaq, setOpenFaq] = useState(null);
  const [activeCategory, setActiveCategory] = useState(NSL_WORDS[0].category);

  return (
    <div className="how-to-page">
      <div className="page-header">
        <h1 className="page-title">📖 How to Use AKALETA</h1>
        <p className="page-subtitle">Everything you need to start learning and using Nigerian Sign Language</p>
      </div>

      {/* ── Getting Started ── */}
      <section className="section">
        <h2 className="section-title">🚀 Getting Started</h2>
        <div className="steps-grid">
          {STEPS.map((step, i) => (
            <div key={i} className="step-card">
              <div className="step-number">{i + 1}</div>
              <div className="step-icon">{step.icon}</div>
              <h3 className="step-title">{step.title}</h3>
              <p className="step-desc">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── NSL Sign Chart ── */}
      <section className="section">
        <h2 className="section-title">🖐️ Nigerian Sign Language Reference Chart</h2>
        <p className="section-desc">Browse the 137 signs supported by AKALETA. Use the Translator to practice each one.</p>

        {/* Alphabet */}
        <div className="chart-subsection">
          <h3 className="chart-subtitle">Alphabet (A–Z)</h3>
          <div className="alphabet-grid">
            {NSL_ALPHABET.map(letter => (
              <div key={letter} className="letter-card">
                <div className="letter-display">{letter}</div>
                <div className="letter-label">NSL</div>
              </div>
            ))}
          </div>
        </div>

        {/* Words by Category */}
        <div className="chart-subsection">
          <h3 className="chart-subtitle">Signs by Category</h3>
          <div className="category-tabs">
            {NSL_WORDS.map(cat => (
              <button
                key={cat.category}
                className={`category-tab ${activeCategory === cat.category ? 'active' : ''}`}
                onClick={() => setActiveCategory(cat.category)}
              >
                {cat.category}
              </button>
            ))}
          </div>
          <div className="signs-grid">
            {NSL_WORDS.find(c => c.category === activeCategory)?.signs.map(sign => (
              <div key={sign} className="sign-card">
                <div className="sign-visual">🖐️</div>
                <span className="sign-name">{sign}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Tips for Accuracy ── */}
      <section className="section">
        <h2 className="section-title">🎯 Tips for Better Accuracy</h2>
        <div className="tips-grid">
          {TIPS.map((tip, i) => (
            <div key={i} className="tip-card card">
              <span className="tip-icon">{tip.icon}</span>
              <div>
                <h4 className="tip-title">{tip.title}</h4>
                <p className="tip-desc">{tip.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Video Tutorial ── */}
      <section className="section">
        <h2 className="section-title">🎬 Video Tutorial</h2>
        <div className="video-placeholder card">
          <div className="video-inner">
            <span style={{ fontSize: '3rem' }}>▶</span>
            <h3>AKALETA Tutorial Video</h3>
            <p className="text-secondary" style={{ fontSize: '0.85rem' }}>Introduction to Nigerian Sign Language with AKALETA</p>
            <a
              href="https://www.youtube.com/results?search_query=Nigerian+Sign+Language+tutorial"
              target="_blank" rel="noopener noreferrer"
              className="btn btn-primary"
            >
              Watch on YouTube
            </a>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="section">
        <h2 className="section-title">❓ Frequently Asked Questions</h2>
        <div className="faq-list">
          {FAQ.map((item, i) => (
            <div key={i} className={`faq-item ${openFaq === i ? 'open' : ''}`}>
              <button className="faq-question" onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                <span>{item.q}</span>
                <span className="faq-arrow">{openFaq === i ? '▲' : '▼'}</span>
              </button>
              {openFaq === i && (
                <div className="faq-answer animate-fade-in">
                  <p>{item.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      <style>{`
        .how-to-page { display: flex; flex-direction: column; gap: 40px; }
        .section { display: flex; flex-direction: column; gap: 20px; }
        .section-title { font-family: var(--font-display); font-size: 1.2rem; font-weight: 800; }
        .section-desc { font-size: 0.875rem; color: var(--text-secondary); margin-top: -12px; }

        .steps-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px; }
        .step-card {
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          position: relative;
          overflow: hidden;
          transition: all var(--transition);
        }
        .step-card:hover { border-color: var(--border-accent); transform: translateY(-2px); }
        .step-number {
          position: absolute;
          top: 12px; right: 12px;
          font-family: var(--font-mono);
          font-size: 2rem;
          font-weight: 700;
          color: var(--border);
          line-height: 1;
        }
        .step-icon { font-size: 1.8rem; }
        .step-title { font-weight: 700; font-size: 0.95rem; }
        .step-desc { font-size: 0.82rem; color: var(--text-secondary); line-height: 1.5; }

        /* Chart */
        .chart-subsection { display: flex; flex-direction: column; gap: 14px; }
        .chart-subtitle { font-weight: 700; font-size: 0.95rem; color: var(--text-secondary); }

        .alphabet-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(62px, 1fr)); gap: 10px; }
        .letter-card {
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          padding: 12px 8px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          cursor: pointer;
          transition: all var(--transition);
        }
        .letter-card:hover { border-color: var(--accent); background: var(--accent-subtle); }
        .letter-display { font-family: var(--font-display); font-size: 1.4rem; font-weight: 800; color: var(--accent); }
        .letter-label { font-size: 0.65rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; }

        .category-tabs { display: flex; flex-wrap: wrap; gap: 8px; }
        .category-tab {
          padding: 6px 14px;
          background: var(--bg-elevated);
          border: 1px solid var(--border);
          border-radius: 100px;
          font-size: 0.8rem;
          font-family: var(--font-body);
          color: var(--text-secondary);
          cursor: pointer;
          transition: all var(--transition);
        }
        .category-tab:hover { color: var(--text-primary); border-color: var(--border-hover); }
        .category-tab.active { background: var(--accent-subtle); color: var(--accent); border-color: var(--border-accent); }

        .signs-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap: 12px; }
        .sign-card {
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          padding: 14px 10px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          transition: all var(--transition);
        }
        .sign-card:hover { border-color: var(--accent); background: var(--accent-subtle); }
        .sign-visual { font-size: 1.6rem; }
        .sign-name { font-size: 0.78rem; font-weight: 600; text-align: center; }

        /* Tips */
        .tips-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 14px; }
        .tip-card { display: flex; gap: 14px; align-items: flex-start; }
        .tip-icon { font-size: 1.5rem; flex-shrink: 0; }
        .tip-title { font-weight: 700; font-size: 0.9rem; margin-bottom: 4px; }
        .tip-desc { font-size: 0.82rem; color: var(--text-secondary); line-height: 1.5; }

        /* Video */
        .video-placeholder {
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          overflow: hidden;
        }
        .video-inner {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 14px;
          padding: 60px 24px;
          background: linear-gradient(135deg, var(--bg-elevated), var(--bg-card));
          text-align: center;
        }
        .video-inner h3 { font-family: var(--font-display); font-size: 1.2rem; font-weight: 700; }

        /* FAQ */
        .faq-list { display: flex; flex-direction: column; gap: 8px; }
        .faq-item {
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          overflow: hidden;
          transition: border-color var(--transition);
        }
        .faq-item.open { border-color: var(--border-accent); }
        .faq-question {
          width: 100%;
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 20px;
          background: none;
          border: none;
          color: var(--text-primary);
          font-family: var(--font-body);
          font-size: 0.9rem;
          font-weight: 600;
          cursor: pointer;
          text-align: left;
          gap: 12px;
        }
        .faq-question:hover { color: var(--accent); }
        .faq-arrow { color: var(--text-muted); font-size: 0.7rem; flex-shrink: 0; }
        .faq-item.open .faq-arrow { color: var(--accent); }
        .faq-answer { padding: 0 20px 16px; font-size: 0.875rem; color: var(--text-secondary); line-height: 1.6; border-top: 1px solid var(--border); padding-top: 14px; }
      `}</style>
    </div>
  );
}
