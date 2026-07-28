const jwt = require('jsonwebtoken');
const WebSocket = require('ws');

class WebSocketService {
  constructor(wss) {
    this.wss = wss;
    this.clients = new Map(); // userId -> Set of WebSocket connections
    this._setupHandlers();
  }

  _setupHandlers() {
    this.wss.on('connection', (ws, req) => {
      console.log('[WS] New connection');

      ws.isAlive = true;
      ws.userId = null;

      ws.on('pong', () => { ws.isAlive = true; });

      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          this._handleMessage(ws, message);
        } catch (err) {
          ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
        }
      });

      ws.on('close', () => {
        if (ws.userId) {
          const userConnections = this.clients.get(ws.userId);
          if (userConnections) {
            userConnections.delete(ws);
            if (userConnections.size === 0) {
              this.clients.delete(ws.userId);
            }
          }
        }
        console.log('[WS] Connection closed');
      });

      ws.on('error', (err) => {
        console.error('[WS] Error:', err.message);
      });
    });

    // Heartbeat: ping all clients every 30s
    const interval = setInterval(() => {
      this.wss.clients.forEach((ws) => {
        if (!ws.isAlive) return ws.terminate();
        ws.isAlive = false;
        ws.ping();
      });
    }, 30000);

    this.wss.on('close', () => clearInterval(interval));
  }

  _handleMessage(ws, message) {
    const { type, payload } = message;

    switch (type) {
      case 'auth':
        this._handleAuth(ws, payload);
        break;

      case 'typing':
        this._broadcast(ws.userId, { type: 'typing', userId: ws.userId }, ws);
        break;

      case 'ping':
        ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
        break;

      case 'subscribe_translation':
        ws.subscribedToTranslations = true;
        ws.send(JSON.stringify({ type: 'subscribed', channel: 'translation' }));
        break;

      default:
        ws.send(JSON.stringify({ type: 'error', message: `Unknown message type: ${type}` }));
    }
  }

  _handleAuth(ws, { token }) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
      ws.userId = decoded.userId.toString();

      if (!this.clients.has(ws.userId)) {
        this.clients.set(ws.userId, new Set());
      }
      this.clients.get(ws.userId).add(ws);

      ws.send(JSON.stringify({
        type: 'auth_success',
        userId: ws.userId,
        connectedAt: new Date().toISOString()
      }));

      console.log(`[WS] User authenticated: ${ws.userId}`);
    } catch {
      ws.send(JSON.stringify({ type: 'auth_error', message: 'Invalid token' }));
    }
  }

  /**
   * Send message to all connections of a specific user
   */
  sendToUser(userId, data) {
    const connections = this.clients.get(userId.toString());
    if (!connections) return;

    const message = JSON.stringify(data);
    connections.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(message);
      }
    });
  }

  /**
   * Broadcast to all connected clients (except sender)
   */
  _broadcast(userId, data, exclude = null) {
    const message = JSON.stringify(data);
    this.wss.clients.forEach((ws) => {
      if (ws !== exclude && ws.readyState === WebSocket.OPEN) {
        ws.send(message);
      }
    });
  }

  /**
   * Notify user of new translation result (real-time update)
   */
  notifyTranslation(userId, translationData) {
    this.sendToUser(userId, {
      type: 'translation_result',
      data: translationData,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Notify user of chat bot response
   */
  notifyChatResponse(userId, messageData) {
    this.sendToUser(userId, {
      type: 'chat_response',
      data: messageData,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Get connection stats
   */
  getStats() {
    return {
      totalConnections: this.wss.clients.size,
      authenticatedUsers: this.clients.size
    };
  }
}

module.exports = WebSocketService;
