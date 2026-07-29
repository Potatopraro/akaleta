# 🤟 AKALETA — Nigerian Sign Language Translator

A full-stack web application for real-time Nigerian Sign Language (NSL) detection and translation, built around the [ML-Collective NSL YOLO model](https://github.com/ML-Collective/Sign-to-Speech-for-Sign-Language-Understanding).

---

## 📐 Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    AKALETA Stack                        │
├──────────────────┬──────────────────┬───────────────────┤
│   Frontend       │   Backend        │   ML Engine        │
│   React 18       │   Node/Express   │   DeepStack        │
│   Tailwind-like  │   MongoDB        │   YOLO (NSL)       │
│   Recharts       │   WebSocket      │   Python Bridge    │
│   react-webcam   │   JWT Auth       │   Image Detection  │
└──────────────────┴──────────────────┴───────────────────┘
```

### Pages (Sidebar Navigation)

| Page | Description |
|------|-------------|
| **Dashboard** | Stats, activity charts, streak counter, top signs |
| **Translator** | Live webcam + image upload detection with TTS |
| **Chatbot** | Dual-mode: Sign Language Chat & Text/Voice Chat |
| **How to Use** | NSL chart (137 signs), getting started guide, FAQ |
| **Settings** | Profile, security (2FA), appearance, TTS, webcam, privacy |
| **Support** | Contact form, bug reports, star ratings/feedback |

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- MongoDB (local or Atlas)
- Docker (for DeepStack ML container)
- Git

### 1-Command Setup

```bash
git clone <your-fork>
cd akaleta
chmod +x setup.sh && ./setup.sh
```

### Manual Setup

```bash
# 1. Clone the NSL ML engine
git clone https://github.com/ML-Collective/Sign-to-Speech-for-Sign-Language-Understanding.git backend/ml_engine

# 2. Install dependencies
cd backend && npm install && cd ..
cd frontend && npm install && cd ..

# 3. Configure backend
cp backend/.env.example backend/.env
# Edit backend/.env with your credentials

# 4. Start DeepStack (ML container)
docker run -d \
  --name akaleta_deepstack \
  -p 80:5000 \
  -v $(pwd)/backend/ml_engine/deepstack_models:/modelstore \
  -e VISION-CUSTOM=True \
  deepquestai/deepstack:latest

# 5. Start backend
cd backend && npm run dev

# 6. Start frontend (new terminal)
cd frontend && npm start
```

### Docker Compose (All Services)

```bash
cp backend/.env.example backend/.env
# Edit .env

docker-compose up --build
```

App available at: http://localhost:3000

---

## 🤖 ML Engine Integration

AKALETA integrates the existing ML-Collective repository in two ways:

### Primary: DeepStack Custom Model
```
DeepStack Docker → loads YOLO .pt model → REST API → Backend
```
DeepStack exposes the YOLO model at:
```
POST http://localhost:80/v1/vision/custom/nigerian-sign-language
```

### Fallback: Python Subprocess Bridge
When DeepStack is offline, the backend calls the repo's Python scripts directly:
```javascript
// services/pythonBridgeService.js
spawn('python3', ['akaleta_wrapper.py', '--image', imagePath, '--output', 'json'])
```

The `akaleta_wrapper.py` script adapts the API to the repo's `image_detection.py`.

### Model Setup
```bash
# Copy trained YOLO model to DeepStack models directory
cp /path/to/your/best.pt backend/ml_engine/deepstack_models/nigerian-sign-language.pt

# Restart DeepStack
docker restart akaleta_deepstack
```

---

## 📁 Project Structure

```
akaleta/
├── backend/
│   ├── server.js              # Express + WebSocket server
│   ├── routes/
│   │   ├── auth.js            # JWT auth, register, login, password reset
│   │   ├── translator.js      # Image/frame detection endpoints
│   │   ├── chatbot.js         # Chat sessions, sign+text messages
│   │   ├── dashboard.js       # Stats, progress, activity
│   │   ├── settings.js        # Profile, 2FA, preferences, export
│   │   ├── support.js         # Contact, bug report, feedback
│   │   └── admin.js           # Admin-only endpoints
│   ├── models/
│   │   ├── User.js            # User schema (prefs, stats, sessions)
│   │   ├── Translation.js     # Detection records
│   │   └── ChatSession.js     # Chat history
│   ├── middleware/
│   │   ├── auth.js            # JWT verification, generateTokens
│   │   ├── rateLimiter.js     # Express rate limiting
│   │   └── errorHandler.js    # Global error handler
│   ├── services/
│   │   ├── deepstackService.js   # DeepStack REST API client
│   │   ├── pythonBridgeService.js # Subprocess bridge to repo scripts
│   │   ├── nlpService.js         # OpenAI + rule-based chatbot
│   │   ├── emailService.js       # Nodemailer (verify, reset, support)
│   │   └── websocketService.js   # WS server, per-user channels
│   ├── ml_engine/             # Cloned GitHub repo lives here
│   │   ├── image_detection.py # Original repo script
│   │   ├── akaleta_wrapper.py # Our adapter (auto-generated)
│   │   └── deepstack_models/  # .pt model files for DeepStack
│   └── uploads/frames/        # Temp frame storage
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx            # Router, protected routes
│   │   ├── index.css          # Design system (CSS variables)
│   │   ├── context/
│   │   │   └── AuthContext.jsx # Global auth state
│   │   ├── utils/
│   │   │   └── api.js         # Axios + token refresh interceptor
│   │   └── components/
│   │       ├── Auth/
│   │       │   └── AuthPage.jsx  # Login/Register/Forgot/Reset
│   │       ├── Layout/
│   │       │   └── AppLayout.jsx # Sidebar + Navbar + routing
│   │       └── pages/
│   │           ├── DashboardPage.jsx
│   │           ├── TranslatorPage.jsx
│   │           ├── ChatbotPage.jsx
│   │           ├── HowToUsePage.jsx
│   │           ├── SettingsPage.jsx
│   │           └── SupportPage.jsx
│   └── public/index.html
│
├── docker-compose.yml
├── setup.sh
└── README.md
```

---

## 🔑 Environment Variables

```env
# Required
MONGODB_URI=mongodb://localhost:27017/akaleta
JWT_SECRET=your_32+_char_secret
JWT_REFRESH_SECRET=another_32+_char_secret

# ML Engine
DEEPSTACK_URL=http://localhost:80

# Email (for password reset, verification)
SMTP_HOST=smtp.gmail.com
SMTP_USER=your@gmail.com
SMTP_PASS=your_app_password

# Optional: Chatbot NLP
OPENAI_API_KEY=sk-...
```

---

## 🔌 API Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login, get JWT |
| POST | `/api/auth/refresh` | Refresh access token |
| POST | `/api/auth/forgot-password` | Send reset email |
| POST | `/api/auth/reset-password/:token` | Reset password |
| GET | `/api/auth/me` | Get current user |

### Translator
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/translator/detect/image` | Detect sign from uploaded image |
| POST | `/api/translator/detect/frame` | Detect sign from base64 webcam frame |
| GET | `/api/translator/history` | Get translation history |
| DELETE | `/api/translator/history` | Clear history |
| GET | `/api/translator/deepstack/status` | Check ML engine status |

### Chatbot
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/chatbot/sessions` | List chat sessions |
| POST | `/api/chatbot/sessions` | Create new session |
| POST | `/api/chatbot/sessions/:id/message` | Send text message |
| POST | `/api/chatbot/sessions/:id/sign-message` | Send sign frame |
| GET | `/api/chatbot/sessions/:id/export` | Export chat (json/txt) |

### WebSocket
Connect to `wss://akaleta-backend.onrender.com/ws`

```javascript
// Authenticate
ws.send(JSON.stringify({ type: 'auth', payload: { token: 'your_jwt' } }))

// Subscribe to real-time translations
ws.send(JSON.stringify({ type: 'subscribe_translation' }))
```

---

## ✨ Features

- 🔐 **Authentication** — JWT + refresh tokens, email verification, 2FA, password reset
- 🤟 **Translator** — Live webcam + image upload, bounding box overlay, confidence scores, TTS
- 💬 **Dual Chatbot** — Sign Language mode (webcam → AI response) + Text/Voice mode
- 📊 **Dashboard** — Usage analytics, learning progress charts, streak counter
- ⚙ **Settings** — Full profile/security/appearance/accessibility/TTS/webcam management
- 🌙 **Dark UI** — Professional dark theme with green accent (#00ff9d)
- 📱 **Responsive** — Works on desktop and mobile
- 🇳🇬 **Nigerian-first** — +234 phone format, NSL cultural context, Nigerian English TTS

---

## 🤝 Credits

- **ML Model**: [ML-Collective/Sign-to-Speech-for-Sign-Language-Understanding](https://github.com/ML-Collective/Sign-to-Speech-for-Sign-Language-Understanding)
- **Dataset**: 5,000+ NSL images hosted on HuggingFace
- **ML Runtime**: [DeepStack AI](https://deepstack.cc)
