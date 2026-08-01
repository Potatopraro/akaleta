import React, { useState, useRef, useEffect, useCallback } from 'react';
import Webcam from 'react-webcam';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

export default function ChatbotPage() {
  const [chatMode, setChatMode] = useState('text'); // 'text' | 'sign'
  const [sessions, setSessions] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const messagesEndRef = useRef(null);
  const webcamRef = useRef(null);
  const detectIntervalRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    loadSessions();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    return () => {
      if (detectIntervalRef.current) clearInterval(detectIntervalRef.current);
    };
  }, []);

  const loadSessions = async () => {
    try {
      const res = await api.get('/chatbot/sessions');
      setSessions(res.data.sessions || []);
      if (res.data.sessions?.length === 0) await createSession('text');
      else loadSession(res.data.sessions[0]._id);
    } catch {}
  };

  const createSession = async (mode = chatMode) => {
    try {
      const res = await api.post('/chatbot/sessions', { mode });
      const session = res.data.session;
      setSessions(prev => [session, ...prev]);
      loadSession(session._id);
      return session;
    } catch (err) {
      toast.error('Could not create conversation');
    }
  };

  const loadSession = async (id) => {
    try {
      const res = await api.get(`/chatbot/sessions/${id}`);
      setActiveSession(res.data.session);
      setMessages(res.data.session.messages || []);
    } catch {}
  };

  const sendTextMessage = async () => {
    if (!input.trim() || sending) return;
    if (!activeSession) { await createSession(); return; }

    const userText = input.trim();
    setInput('');
    setSending(true);

    // Optimistic update
    setMessages(prev => [...prev, {
      _id: Date.now(),
      role: 'user',
      content: userText,
      mode: 'text',
      timestamp: new Date()
    }]);

    try {
      const res = await api.post(`/chatbot/sessions/${activeSession._id}/message`, { content: userText, mode: 'text' });
      setMessages(prev => [...prev, res.data.botMessage]);
      // Update sessions list
      setSessions(prev => prev.map(s => s._id === activeSession._id ? { ...s, lastMessage: res.data.botMessage.content, lastMessageAt: new Date() } : s));
    } catch (err) {
      toast.error('Failed to send message');
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  // ── Sign Detection for Chat ──────────────────────────────────────────────────
  const startSignDetection = useCallback(() => {
    if (detectIntervalRef.current) return;
    setDetecting(true);

    detectIntervalRef.current = setInterval(async () => {
      if (!webcamRef.current || !activeSession) return;
      const frame = webcamRef.current.getScreenshot();
      if (!frame) return;

      try {
        const res = await api.post(`/chatbot/sessions/${activeSession._id}/sign-message`, { frame });
        if (res.data.detected) {
          setMessages(prev => [...prev, res.data.userMessage, res.data.botMessage]);
          stopSignDetection();
          toast.success(`Detected: ${res.data.detectedSign}`);
          speakText(res.data.botMessage.content);
        }
      } catch {}
    }, 1500);
  }, [activeSession]);

  const stopSignDetection = useCallback(() => {
    setDetecting(false);
    if (detectIntervalRef.current) {
      clearInterval(detectIntervalRef.current);
      detectIntervalRef.current = null;
    }
  }, []);

  const speakText = (text) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.lang = 'en-NG';
    window.speechSynthesis.speak(utt);
  };

  // ── Voice Input ──────────────────────────────────────────────────────────────
  const startVoiceInput = () => {
    if (!window.SpeechRecognition && !window.webkitSpeechRecognition) {
      toast.error('Voice input not supported in this browser');
      return;
    }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recog = new SR();
    recog.lang = 'en-NG';
    recog.onresult = (e) => { setInput(e.results[0][0].transcript); };
    recog.onerror = () => toast.error('Could not recognize speech');
    recog.start();
    toast('🎤 Listening...', { duration: 2000 });
  };

  const clearConversation = async () => {
    if (!activeSession) return;
    if (!window.confirm('Clear this conversation?')) return;
    await api.delete(`/chatbot/sessions/${activeSession._id}/messages`);
    setMessages([]);
    toast.success('Conversation cleared');
  };

  const exportChat = async (fmt) => {
    if (!activeSession) return;
    const res = await api.get(`/chatbot/sessions/${activeSession._id}/export?format=${fmt}`, { responseType: 'blob' });
    const url = URL.createObjectURL(res.data);
    const a = document.createElement('a');
    a.href = url;
    a.download = `akaleta-chat.${fmt}`;
    a.click();
  };

  const deleteSession = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('Delete this conversation?')) return;
    await api.delete(`/chatbot/sessions/${id}`);
    setSessions(prev => prev.filter(s => s._id !== id));
    if (activeSession?._id === id) {
      setActiveSession(null);
      setMessages([]);
    }
  };

  const filteredSessions = sessions.filter(s =>
    !searchQuery || s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const EMOJIS = ['😊', '👍', '🤝', '🙏', '❤️', '🔥', '✨', '🎉', '💪', '👏', '🇳🇬'];

  return (
    <div className="chatbot-page">
      {/* ── Sidebar: Session List ── */}
      <div className="chat-sidebar">
        <div className="chat-sidebar-header">
          <span style={{ fontWeight: 700, fontFamily: 'var(--font-display)' }}>Conversations</span>
          <button className="btn btn-primary btn-sm" onClick={() => createSession()}>+ New</button>
        </div>

        <div className="chat-search">
          <input className="form-input" placeholder="Search chats..." value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)} />
        </div>

        <div className="session-list">
          {filteredSessions.map(session => (
            <div key={session._id}
              className={`session-item ${activeSession?._id === session._id ? 'active' : ''}`}
              onClick={() => loadSession(session._id)}
            >
              <div className="session-item-content">
                <div className="session-mode-icon">{session.mode === 'sign' ? '🖐️' : '💬'}</div>
                <div className="session-info">
                  <p className="session-title">{session.title}</p>
                  <p className="session-preview">{session.lastMessage || 'No messages yet'}</p>
                </div>
              </div>
              <button className="session-delete" onClick={(e) => deleteSession(session._id, e)}>×</button>
            </div>
          ))}
          {filteredSessions.length === 0 && (
            <p className="text-muted" style={{ textAlign: 'center', padding: '20px', fontSize: '0.85rem' }}>
              No conversations found
            </p>
          )}
        </div>
      </div>

      {/* ── Main Chat ── */}
      <div className="chat-main">
        {activeSession ? (
          <>
            {/* Chat Header */}
            <div className="chat-header">
              <div className="flex items-center gap-3">
                <div className="tabs" style={{ padding: '3px' }}>
                  <button className={`tab-btn ${chatMode === 'text' ? 'active' : ''}`}
                    onClick={() => { setChatMode('text'); stopSignDetection(); }}>
                    💬 Text Mode
                  </button>
                  <button className={`tab-btn ${chatMode === 'sign' ? 'active' : ''}`}
                    onClick={() => { setChatMode('sign'); }}>
                    🖐️ Sign Mode
                  </button>
                </div>
                {detecting && <div className="dot-indicator" />}
              </div>
              <div className="flex items-center gap-2">
                <button className="btn btn-ghost btn-sm" onClick={clearConversation}>🗑 Clear</button>
                <div className="dropdown-wrap">
                  <button className="btn btn-ghost btn-sm" onClick={() => exportChat('json')}>⬇ JSON</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => exportChat('txt')}>⬇ TXT</button>
                </div>
              </div>
            </div>

            {/* Sign Mode Webcam */}
            {chatMode === 'sign' && (
              <div className="sign-webcam-bar">
                <div className={`webcam-container ${detecting ? 'active' : ''}`} style={{ width: '280px', aspectRatio: '4/3' }}>
                  <Webcam 
                    ref={webcamRef} 
                    audio={false} 
                    mirrored={true}
                    screenshotFormat="image/jpeg"
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} 
                  />
                  {detecting && <div className="webcam-scanline" />}
                </div>
                <div className="sign-controls">
                  <p className="text-secondary" style={{ fontSize: '0.85rem' }}>
                    {detecting ? 'Interpreting your sign...' : 'Position hands in frame, then press detect'}
                  </p>
                  <button className={`btn btn-lg ${detecting ? 'btn-danger' : 'btn-primary'}`}
                    onClick={detecting ? stopSignDetection : startSignDetection}>
                    {detecting ? '⏹ Stop' : '🖐️ Detect Sign'}
                  </button>
                </div>
              </div>
            )}

            {/* Messages */}
            <div className="messages-area">
              {messages.map((msg, i) => (
                <div key={msg._id || i} className={`message-row ${msg.role === 'user' ? 'user' : 'assistant'}`}>
                  {msg.role === 'assistant' && (
                    <div className="bot-avatar">A</div>
                  )}
                  <div>
                    <div className={`message-bubble ${msg.role} ${msg.mode === 'sign' ? 'sign' : ''}`}>
                      {msg.mode === 'sign' && <span className="sign-badge">🖐️ Signed: </span>}
                      {msg.content}
                    </div>
                    <p className="message-time">
                      {format(new Date(msg.timestamp), 'HH:mm')}
                      {msg.mode === 'sign' && msg.confidence && ` · ${msg.confidence}% confidence`}
                      {msg.role === 'assistant' && (
                        <button className="tts-btn" onClick={() => speakText(msg.content)}>🔊</button>
                      )}
                    </p>
                  </div>
                </div>
              ))}
              {sending && (
                <div className="message-row assistant">
                  <div className="bot-avatar">A</div>
                  <div className="message-bubble assistant typing">
                    <span className="typing-dot" /><span className="typing-dot" /><span className="typing-dot" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Text Input (only in text mode) */}
            {chatMode === 'text' && (
              <div className="chat-input-area">
                {showEmojiPicker && (
                  <div className="emoji-picker">
                    {EMOJIS.map(em => (
                      <button key={em} className="emoji-btn" onClick={() => { setInput(i => i + em); setShowEmojiPicker(false); }}>{em}</button>
                    ))}
                  </div>
                )}
                <div className="chat-input-row">
                  <button className="btn btn-ghost btn-icon" onClick={() => setShowEmojiPicker(s => !s)}>😊</button>
                  <input
                    ref={inputRef}
                    className="form-input chat-input"
                    placeholder="Type a message..."
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendTextMessage()}
                  />
                  <button className="btn btn-ghost btn-icon" onClick={startVoiceInput} title="Voice input">🎤</button>
                  <button className="btn btn-primary btn-icon" onClick={sendTextMessage} disabled={!input.trim() || sending}>
                    {sending ? <span className="spinner" style={{ width: 16, height: 16 }} /> : '↑'}
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="chat-empty">
            <span style={{ fontSize: '3rem' }}>💬</span>
            <h3>Select or create a conversation</h3>
            <button className="btn btn-primary" onClick={() => createSession()}>Start New Chat</button>
          </div>
        )}
      </div>

      <style>{`
        .chatbot-page {
          display: grid;
          grid-template-columns: 280px 1fr;
          gap: 0;
          height: calc(100vh - var(--navbar-height) - 56px);
          border-radius: var(--radius-lg);
          overflow: hidden;
          border: 1px solid var(--border);
          background: var(--bg-card);
        }

        /* ── Sidebar ── */
        .chat-sidebar {
          background: var(--bg-secondary);
          border-right: 1px solid var(--border);
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .chat-sidebar-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px;
          border-bottom: 1px solid var(--border);
          flex-shrink: 0;
        }

        .chat-search { padding: 12px 12px 8px; flex-shrink: 0; }
        .chat-search .form-input { font-size: 0.85rem; padding: 8px 12px; }

        .session-list { flex: 1; overflow-y: auto; padding: 4px 8px 8px; }

        .session-item {
          display: flex;
          align-items: center;
          padding: 10px;
          border-radius: var(--radius-sm);
          cursor: pointer;
          transition: background var(--transition);
          gap: 6px;
          position: relative;
        }
        .session-item:hover { background: var(--bg-elevated); }
        .session-item.active { background: var(--accent-subtle); border: 1px solid var(--border-accent); }

        .session-item-content { display: flex; gap: 8px; align-items: flex-start; flex: 1; min-width: 0; }
        .session-mode-icon { font-size: 1rem; flex-shrink: 0; margin-top: 2px; }

        .session-info { flex: 1; min-width: 0; }
        .session-title { font-size: 0.82rem; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .session-preview { font-size: 0.72rem; color: var(--text-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin-top: 2px; }

        .session-delete {
          background: none;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          font-size: 1rem;
          padding: 2px 4px;
          border-radius: 4px;
          flex-shrink: 0;
          opacity: 0;
          transition: opacity var(--transition);
        }
        .session-item:hover .session-delete { opacity: 1; }
        .session-delete:hover { color: var(--danger); background: rgba(255,71,87,0.1); }

        /* ── Chat Main ── */
        .chat-main {
          display: flex;
          flex-direction: column;
          overflow: hidden;
          background: var(--bg-primary);
        }

        .chat-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 16px;
          background: var(--bg-card);
          border-bottom: 1px solid var(--border);
          flex-shrink: 0;
          gap: 12px;
          flex-wrap: wrap;
        }

        .dropdown-wrap { display: flex; gap: 4px; }

        .sign-webcam-bar {
          display: flex;
          align-items: center;
          gap: 20px;
          padding: 16px;
          background: var(--bg-secondary);
          border-bottom: 1px solid var(--border);
          flex-shrink: 0;
        }

        .sign-controls { display: flex; flex-direction: column; gap: 12px; }

        .messages-area {
          flex: 1;
          overflow-y: auto;
          padding: 20px 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .message-row {
          display: flex;
          gap: 10px;
          align-items: flex-end;
        }
        .message-row.user { flex-direction: row-reverse; }

        .bot-avatar {
          width: 32px; height: 32px;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.75rem;
          font-weight: 700;
          flex-shrink: 0;
          color: #fff;
          font-family: var(--font-display);
        }

        .sign-badge { font-size: 0.75rem; font-weight: 600; margin-right: 4px; }

        .message-time {
          font-size: 0.7rem;
          color: var(--text-muted);
          margin-top: 4px;
          padding: 0 4px;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .tts-btn {
          background: none;
          border: none;
          cursor: pointer;
          font-size: 0.75rem;
          opacity: 0.6;
          padding: 0 2px;
        }
        .tts-btn:hover { opacity: 1; }

        .typing { display: flex; gap: 4px; align-items: center; padding: 12px 16px; }
        .typing-dot {
          width: 6px; height: 6px;
          background: var(--text-muted);
          border-radius: 50%;
          animation: typing-bounce 1.2s ease-in-out infinite;
        }
        .typing-dot:nth-child(2) { animation-delay: 0.2s; }
        .typing-dot:nth-child(3) { animation-delay: 0.4s; }

        @keyframes typing-bounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.5; }
          40% { transform: translateY(-6px); opacity: 1; }
        }

        /* Chat Input */
        .chat-input-area {
          padding: 12px 16px;
          background: var(--bg-card);
          border-top: 1px solid var(--border);
          flex-shrink: 0;
          position: relative;
        }

        .emoji-picker {
          position: absolute;
          bottom: 100%;
          left: 16px;
          background: var(--bg-elevated);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          padding: 10px;
          display: flex;
          flex-wrap: wrap;
          gap: 4px;
          width: 220px;
          box-shadow: var(--shadow-md);
        }

        .emoji-btn {
          background: none;
          border: none;
          font-size: 1.2rem;
          cursor: pointer;
          padding: 4px;
          border-radius: 4px;
          transition: background var(--transition);
        }
        .emoji-btn:hover { background: var(--bg-card-hover); }

        .chat-input-row { display: flex; align-items: center; gap: 8px; }
        .chat-input { flex: 1; margin: 0; }

        /* Empty State */
        .chat-empty {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 16px;
          color: var(--text-secondary);
        }

        @media (max-width: 768px) {
          .chatbot-page { grid-template-columns: 1fr; height: auto; }
          .chat-sidebar { display: none; }
          .sign-webcam-bar { flex-direction: column; }
        }
      `}</style>
    </div>
  );
}