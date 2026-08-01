require('dotenv').config();
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const path = require('path');
const mongoose = require('mongoose');

// Route imports
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const translatorRoutes = require('./routes/translator');
const chatbotRoutes = require('./routes/chatbot');
const dashboardRoutes = require('./routes/dashboard');
const supportRoutes = require('./routes/support');
const settingsRoutes = require('./routes/settings');
const adminRoutes = require('./routes/admin');

// Middleware imports
const { authenticateToken } = require('./middleware/auth');
const { generalLimiter, authLimiter, uploadLimiter } = require('./middleware/rateLimiter');
const errorHandler = require('./middleware/errorHandler');

// Service imports
const WebSocketService = require('./services/websocketService');
const DeepStackService = require('./services/deepstackService');

const app = express();
const server = http.createServer(app);

// ─── WebSocket Server ────────────────────────────────────────────────────────
const wss = new WebSocket.Server({ server, path: '/ws' });
const wsService = new WebSocketService(wss);

// ─── Security & Middleware ───────────────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5000',
  'https://akaleta.vercel.app',
  'https://www.akaleta.vercel.app',
  'https://akaleta.nx.kg',
  'https://www.akaleta.nx.kg',
  process.env.FRONTEND_URL,
  process.env.CLIENT_URL
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow same-origin (non-browser requests like curl) when origin is falsy
    if (!origin) return callback(null, true);

    // Allow exact matches from configured list
    if (allowedOrigins.includes(origin)) return callback(null, true);

    // Allow Vercel preview deploys (e.g. <project>-abc123.vercel.app)
    try {
      const vercelPreview = /(^https?:\/\/[^.]+\.vercel\.app$)/i;
      if (vercelPreview.test(origin)) return callback(null, true);
    } catch (err) {
      // ignore and fallthrough to rejection
    }

    // Log for easier debugging and return error
    console.warn(`CORS blocked origin: ${origin}`);
    return callback(new Error('Origin not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(compression());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static files (uploads)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Apply general rate limiter
app.use('/api/', generalLimiter);

// ─── Health Check ────────────────────────────────────────────────────────────
app.get('/health', async (req, res) => {
  const deepstackStatus = await DeepStackService.checkStatus();
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    services: {
      database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
      deepstack: deepstackStatus ? 'running' : 'offline',
      websocket: `${wss.clients.size} active connections`
    }
  });
});

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/user', authenticateToken, userRoutes);
app.use('/api/translator', authenticateToken, translatorRoutes);
app.use('/api/chatbot', authenticateToken, chatbotRoutes);
app.use('/api/dashboard', authenticateToken, dashboardRoutes);
app.use('/api/support', supportRoutes);
app.use('/api/settings', authenticateToken, settingsRoutes);
app.use('/api/admin', authenticateToken, adminRoutes);

// DeepStack proxy routes
app.use('/api/deepstack', authenticateToken, async (req, res) => {
  const status = await DeepStackService.checkStatus();
  res.json({ running: status, url: process.env.DEEPSTACK_URL });
});

// ─── 404 Handler ─────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found', path: req.path });
});

// ─── Error Handler ────────────────────────────────────────────────────────────
app.use(errorHandler);

// ─── MongoDB Connection ───────────────────────────────────────────────────────
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/akaleta', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => {
  console.log('✅ MongoDB connected successfully');
  startServer();
})
.catch(err => {
  console.error('❌ MongoDB connection failed:', err.message);
  console.log('⚠️  Starting server without database (limited functionality)');
  startServer();
});

// ─── Start Server ─────────────────────────────────────────────────────────────
function startServer() {
  const PORT = process.env.PORT || 5000;
  server.listen(PORT, () => {
    console.log(`
╔══════════════════════════════════════════════════╗
║           AKALETA API SERVER RUNNING             ║
╠══════════════════════════════════════════════════╣
║  HTTP:      http://localhost:${PORT}                ║
║  WebSocket: ws://localhost:${PORT}/ws               ║
║  Health:    http://localhost:${PORT}/health          ║
╚══════════════════════════════════════════════════╝
    `);
  });
}

// ─── Graceful Shutdown ────────────────────────────────────────────────────────
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    mongoose.connection.close(false, () => {
      console.log('Server closed.');
      process.exit(0);
    });
  });
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

module.exports = { app, server, wss };
