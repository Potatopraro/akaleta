import React, { useState, useRef, useCallback, useEffect } from 'react';
import Webcam from 'react-webcam';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { Hands, HAND_CONNECTIONS } from '@mediapipe/hands';
import { Camera } from '@mediapipe/camera_utils';
import { drawConnectors, drawLandmarks } from '@mediapipe/drawing_utils';

const DETECTION_INTERVAL = 250; // ms between detections for more responsive capture
const VIDEO_WIDTH = 640;
const VIDEO_HEIGHT = 480;
const SCREENSHOT_QUALITY = 0.9;

export default function TranslatorPage() {
  const [mode, setMode] = useState('webcam'); // 'webcam' | 'upload'
  const [isDetecting, setIsDetecting] = useState(false);
  const [detectionResult, setDetectionResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [deepstackStatus, setDeepstackStatus] = useState(null);
  const [uploadedImage, setUploadedImage] = useState(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const webcamRef = useRef(null);
  const skeletonCanvasRef = useRef(null);
  const detectTimerRef = useRef(null);
  const cameraInstanceRef = useRef(null);
  const handsRef = useRef(null);
  const isDetectingRef = useRef(false);
  const requestPendingRef = useRef(false);
  const fileInputRef = useRef(null);

  // Check DeepStack status on mount
  useEffect(() => {
    api.get('/translator/deepstack/status')
      .then(r => setDeepstackStatus(r.data.running))
      .catch(() => setDeepstackStatus(false));
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const res = await api.get('/translator/history?limit=10');
      setHistory(res.data.translations || []);
    } catch {}
  };

  const disposeHandSkeleton = useCallback(() => {
    if (cameraInstanceRef.current) {
      cameraInstanceRef.current.stop();
      cameraInstanceRef.current = null;
    }
    if (handsRef.current) {
      if (typeof handsRef.current.close === 'function') handsRef.current.close();
      handsRef.current = null;
    }
    const canvas = skeletonCanvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }, []);

  const initHandSkeleton = useCallback(() => {
    if (handsRef.current || !webcamRef.current?.video) return;

    const video = webcamRef.current.video;
    const canvas = skeletonCanvasRef.current;
    if (!video || !canvas) return;

    const hands = new Hands({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
    });

    hands.setOptions({
      maxNumHands: 2,
      modelComplexity: 1,
      minDetectionConfidence: 0.6,
      minTrackingConfidence: 0.6,
      selfieMode: true
    });

    hands.onResults((results) => {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      canvas.width = VIDEO_WIDTH;
      canvas.height = VIDEO_HEIGHT;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (results.multiHandLandmarks) {
        for (const landmarks of results.multiHandLandmarks) {
          drawConnectors(ctx, landmarks, HAND_CONNECTIONS, { color: '#00ff9d', lineWidth: 2 });
          drawLandmarks(ctx, landmarks, { color: '#ffffff', lineWidth: 1 });
        }
      }
    });

    const camera = new Camera(video, {
      onFrame: async () => {
        await hands.send({ image: video });
      },
      width: VIDEO_WIDTH,
      height: VIDEO_HEIGHT
    });

    handsRef.current = hands;
    cameraInstanceRef.current = camera;
    camera.start();
  }, [VIDEO_WIDTH, VIDEO_HEIGHT]);

  // ── Live Detection Loop ──────────────────────────────────────────────────────
  const startDetection = useCallback(() => {
    if (detectTimerRef.current) return;
    setIsDetecting(true);
    isDetectingRef.current = true;
    requestPendingRef.current = false;
    initHandSkeleton();

    const captureFrame = async () => {
      if (!isDetectingRef.current || requestPendingRef.current || !webcamRef.current) {
        detectTimerRef.current = window.setTimeout(captureFrame, DETECTION_INTERVAL);
        return;
      }

      const frame = webcamRef.current.getScreenshot({
        width: VIDEO_WIDTH,
        height: VIDEO_HEIGHT,
        quality: SCREENSHOT_QUALITY
      });
      if (!frame) {
        detectTimerRef.current = window.setTimeout(captureFrame, DETECTION_INTERVAL);
        return;
      }

      requestPendingRef.current = true;
      try {
        const res = await api.post('/translator/detect/frame', { frame });
        if (res.data.detectedSign) {
          setDetectionResult(res.data);
        }
      } catch (err) {
        console.error('Detection error:', err.message || err);
      } finally {
        requestPendingRef.current = false;
        detectTimerRef.current = window.setTimeout(captureFrame, DETECTION_INTERVAL);
      }
    };

    captureFrame();
  }, [initHandSkeleton]);

  const stopDetection = useCallback(() => {
    setIsDetecting(false);
    isDetectingRef.current = false;
    requestPendingRef.current = false;
    if (detectTimerRef.current) {
      clearTimeout(detectTimerRef.current);
      detectTimerRef.current = null;
    }
    disposeHandSkeleton();
  }, [disposeHandSkeleton]);

  useEffect(() => () => stopDetection(), [stopDetection]);

  // ── Image Upload Detection ───────────────────────────────────────────────────
  const handleImageUpload = async (file) => {
    if (!file) return;
    setUploadLoading(true);
    setDetectionResult(null);
    const preview = URL.createObjectURL(file);
    setUploadedImage(preview);
    const formData = new FormData();
    formData.append('image', file);
    try {
      const res = await api.post('/translator/detect/image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (res.data.translation) {
        setDetectionResult({
          detectedSign: res.data.translation.detectedSign,
          confidence: res.data.translation.confidence,
          allDetections: res.data.translation.allDetections
        });
        toast.success(`Detected: ${res.data.translation.detectedSign}`);
        loadHistory();
      } else {
        toast('No sign detected in this image', { icon: '🤔' });
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Detection failed');
    } finally {
      setUploadLoading(false);
    }
  };

  // ── Text-to-Speech ───────────────────────────────────────────────────────────
  const speakSign = (text) => {
    if (!text || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.lang = 'en-NG';
    utt.rate = 0.9;
    window.speechSynthesis.speak(utt);
  };

  const saveTranslation = async (id) => {
    try {
      await api.patch(`/translator/history/${id}/save`);
      toast.success('Translation saved to your progress!');
      loadHistory();
    } catch { toast.error('Could not save'); }
  };

  const clearHistory = async () => {
    if (!window.confirm('Clear all translation history?')) return;
    await api.delete('/translator/history');
    setHistory([]);
    toast.success('History cleared');
  };

  const confColor = (c) => c >= 80 ? '#00ff9d' : c >= 60 ? '#ffa502' : '#ff4757';

  return (
    <div className="translator-page">
      <div className="page-header">
        <h1 className="page-title">🤟 Sign Language Translator</h1>
        <p className="page-subtitle">Real-time Nigerian Sign Language detection using YOLO model</p>
        <div className="status-row">
          <span className={`badge ${deepstackStatus ? 'badge-accent' : 'badge-danger'}`}>
            {deepstackStatus ? '● ML Engine Online' : '○ ML Engine Offline'}
          </span>
          {!deepstackStatus && (
            <button className="btn btn-sm btn-secondary" onClick={async () => {
              await api.post('/translator/deepstack/start');
              setTimeout(() => api.get('/translator/deepstack/status').then(r => setDeepstackStatus(r.data.running)), 3000);
            }}>Start Engine</button>
          )}
        </div>
      </div>

      <div className="translator-layout">
        {/* ── Left: Camera/Upload ── */}
        <div className="translator-left">
          {/* Mode Toggle */}
          <div className="tabs mb-4">
            <button className={`tab-btn ${mode === 'webcam' ? 'active' : ''}`} onClick={() => { setMode('webcam'); stopDetection(); setUploadedImage(null); setDetectionResult(null); }}>
              📷 Live Webcam
            </button>
            <button className={`tab-btn ${mode === 'upload' ? 'active' : ''}`} onClick={() => { setMode('upload'); stopDetection(); disposeHandSkeleton(); setDetectionResult(null); }}>
              📁 Image Upload
            </button>
          </div>

          {mode === 'webcam' ? (
            <div className={`webcam-container ${isDetecting ? 'active' : ''}`} style={{ aspectRatio: '4/3' }}>
              <Webcam
                ref={webcamRef}
                audio={false}
                mirrored={true}
                screenshotFormat="image/jpeg"
                screenshotQuality={SCREENSHOT_QUALITY}
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                videoConstraints={{ width: VIDEO_WIDTH, height: VIDEO_HEIGHT, facingMode: 'user' }}
                onUserMedia={() => {
                  if (mode === 'webcam' && isDetecting) initHandSkeleton();
                }}
              />
              <canvas ref={skeletonCanvasRef} className="skeleton-canvas" />
              {isDetecting && <div className="webcam-scanline" />}
              {detectionResult?.allDetections?.map((d, i) => (
                <div key={i} className="detection-overlay">
                  {d.boundingBox && (
                    <div className="detection-box" style={{
                      left: `${(d.boundingBox.x1 / 640) * 100}%`,
                      top: `${(d.boundingBox.y1 / 480) * 100}%`,
                      width: `${(d.boundingBox.width / 640) * 100}%`,
                      height: `${(d.boundingBox.height / 480) * 100}%`
                    }}>
                      <span className="detection-label">{d.label} {d.confidence}%</span>
                    </div>
                  )}
                </div>
              ))}
              {!isDetecting && (
                <div className="webcam-overlay-msg">
                  <p>Click <strong>Start Detection</strong> to begin</p>
                </div>
              )}
            </div>
          ) : (
            <div
              className="upload-zone"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleImageUpload(f); }}
            >
              {uploadedImage ? (
                <img src={uploadedImage} alt="Uploaded" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              ) : (
                <div className="upload-placeholder">
                  <span style={{ fontSize: '3rem' }}>📁</span>
                  <p>Drop image here or click to browse</p>
                  <p className="text-muted" style={{ fontSize: '0.8rem' }}>Supports JPG, PNG, WebP — max 10MB</p>
                </div>
              )}
              <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }}
                onChange={e => e.target.files[0] && handleImageUpload(e.target.files[0])} />
            </div>
          )}

          {/* Controls */}
          <div className="translator-controls">
            {mode === 'webcam' ? (
              <>
                <button
                  className={`btn btn-lg ${isDetecting ? 'btn-danger' : 'btn-primary'}`}
                  onClick={isDetecting ? stopDetection : startDetection}
                  style={{ flex: 1 }}
                >
                  {isDetecting ? '⏹ Stop Detection' : '▶ Start Detection'}
                </button>
                {isDetecting && <div className="dot-indicator" />}
              </>
            ) : (
              <button className="btn btn-primary btn-lg" style={{ flex: 1 }}
                onClick={() => fileInputRef.current?.click()} disabled={uploadLoading}>
                {uploadLoading ? <span className="spinner" /> : '📁 Choose Image'}
              </button>
            )}
          </div>
        </div>

        {/* ── Right: Result + History ── */}
        <div className="translator-right">
          {/* Detection Result */}
          <div className="card result-card">
            <div className="result-header">
              <span className="result-title">Detection Result</span>
              {detectionResult && (
                <button className="btn btn-ghost btn-sm" onClick={() => speakSign(detectionResult.detectedSign)}>
                  🔊 Speak
                </button>
              )}
            </div>

            {detectionResult ? (
              <div className="result-content">
                <div className="detected-sign">{detectionResult.detectedSign}</div>
                <div className="confidence-row">
                  <span className="text-secondary" style={{ fontSize: '0.8rem' }}>Confidence</span>
                  <span style={{ color: confColor(detectionResult.confidence), fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>
                    {detectionResult.confidence}%
                  </span>
                </div>
                <div className="confidence-bar">
                  <div className="confidence-fill" style={{ width: `${detectionResult.confidence}%` }} />
                </div>
                {detectionResult.allDetections?.length > 1 && (
                  <div className="other-detections">
                    <p className="text-muted" style={{ fontSize: '0.75rem', marginBottom: '6px' }}>Other detections</p>
                    {detectionResult.allDetections.slice(1, 4).map((d, i) => (
                      <div key={i} className="other-detection-item">
                        <span>{d.label}</span>
                        <span style={{ color: confColor(d.confidence), fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>{d.confidence}%</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="result-empty">
                <span style={{ fontSize: '2rem' }}>🤟</span>
                <p>No sign detected yet</p>
                <p className="text-muted" style={{ fontSize: '0.8rem' }}>
                  {mode === 'webcam' ? 'Start detection and show a sign' : 'Upload an image to analyze'}
                </p>
              </div>
            )}
          </div>

          {/* History */}
          <div className="card history-card">
            <div className="history-header">
              <span style={{ fontWeight: 600 }}>Recent Translations</span>
              {history.length > 0 && (
                <button className="btn btn-ghost btn-sm" onClick={clearHistory}>Clear</button>
              )}
            </div>
            <div className="history-list">
              {history.length === 0 ? (
                <p className="text-muted" style={{ textAlign: 'center', padding: '20px', fontSize: '0.85rem' }}>
                  No translations yet
                </p>
              ) : history.map(item => (
                <div key={item._id} className="history-item">
                  <div className="history-item-left">
                    <span className="history-sign">{item.detectedSign}</span>
                    <span className="text-muted" style={{ fontSize: '0.72rem' }}>
                      {new Date(item.createdAt).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="history-item-right">
                    <span style={{ color: confColor(item.confidence), fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}>
                      {item.confidence}%
                    </span>
                    <button className="btn btn-ghost btn-sm" onClick={() => saveTranslation(item._id)}
                      disabled={item.isSaved} title={item.isSaved ? 'Saved' : 'Save'}>
                      {item.isSaved ? '✓' : '🔖'}
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={() => speakSign(item.detectedSign)}>🔊</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .translator-page { display: flex; flex-direction: column; }
        .status-row { display: flex; align-items: center; gap: 10px; margin-top: 10px; }

        .translator-layout {
          display: grid;
          grid-template-columns: 1fr 360px;
          gap: 24px;
          align-items: start;
        }

        .translator-left { display: flex; flex-direction: column; gap: 14px; }
        .translator-right { display: flex; flex-direction: column; gap: 16px; }

        .webcam-container { position: relative; overflow: hidden; border-radius: var(--radius); background: var(--bg-card); }
        .skeleton-canvas {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          opacity: 0.85;
          mix-blend-mode: screen;
        }

        .upload-zone {
          aspect-ratio: 4/3;
          background: var(--bg-card);
          border: 2px dashed var(--border);
          border-radius: var(--radius);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          overflow: hidden;
          transition: border-color var(--transition);
        }
        .upload-zone:hover { border-color: var(--accent); }

        .upload-placeholder {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          color: var(--text-secondary);
          text-align: center;
        }

        .webcam-overlay-msg {
          position: absolute;
          bottom: 16px;
          left: 50%;
          transform: translateX(-50%);
          background: rgba(0,0,0,0.7);
          color: var(--text-secondary);
          padding: 8px 16px;
          border-radius: 100px;
          font-size: 0.8rem;
          white-space: nowrap;
        }

        .translator-controls {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        /* Result Card */
        .result-card { display: flex; flex-direction: column; gap: 12px; }
        .result-header { display: flex; align-items: center; justify-content: space-between; }
        .result-title { font-weight: 600; font-size: 0.9rem; }
        .result-content { display: flex; flex-direction: column; gap: 10px; }
        .result-empty { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 24px 0; color: var(--text-secondary); }

        .detected-sign {
          font-family: var(--font-display);
          font-size: 2.8rem;
          font-weight: 800;
          color: var(--accent);
          text-align: center;
          padding: 16px 0;
          text-shadow: 0 0 20px rgba(0,255,157,0.3);
          letter-spacing: 0.05em;
        }

        .confidence-row { display: flex; align-items: center; justify-content: space-between; }

        .other-detections { margin-top: 4px; }
        .other-detection-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 5px 0;
          border-bottom: 1px solid var(--border);
          font-size: 0.85rem;
        }
        .other-detection-item:last-child { border-bottom: none; }

        /* History Card */
        .history-card { display: flex; flex-direction: column; gap: 12px; }
        .history-header { display: flex; justify-content: space-between; align-items: center; }
        .history-list { display: flex; flex-direction: column; gap: 6px; max-height: 320px; overflow-y: auto; }

        .history-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 10px;
          background: var(--bg-elevated);
          border-radius: var(--radius-sm);
          transition: background var(--transition);
        }
        .history-item:hover { background: var(--bg-card-hover); }
        .history-item-left { display: flex; flex-direction: column; gap: 2px; }
        .history-item-right { display: flex; align-items: center; gap: 4px; }
        .history-sign { font-weight: 600; font-size: 0.9rem; }

        @media (max-width: 900px) {
          .translator-layout { grid-template-columns: 1fr; }
          .translator-right { order: -1; }
        }
      `}</style>
    </div>
  );
}
