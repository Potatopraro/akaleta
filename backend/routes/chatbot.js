const express = require('express');
const router = express.Router();
const ChatSession = require('../models/ChatSession');
const Translation = require('../models/Translation');
const AIService = require('../services/aiService');
const DeepStackService = require('../services/deepstackService');
const PythonBridgeService = require('../services/pythonBridgeService');
const { chatLimiter } = require('../middleware/rateLimiter');
const path = require('path');
const fs = require('fs');

// ─── GET /api/chatbot/sessions ────────────────────────────────────────────────
router.get('/sessions', async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const query = { userId: req.userId };
    if (search) {
      query.$or = [
        { title: new RegExp(search, 'i') },
        { lastMessage: new RegExp(search, 'i') }
      ];
    }

    const [sessions, total] = await Promise.all([
      ChatSession.find(query)
        .select('-messages')
        .sort({ lastMessageAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      ChatSession.countDocuments(query)
    ]);

    res.json({ sessions, total, page: parseInt(page) });
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/chatbot/sessions ───────────────────────────────────────────────
router.post('/sessions', async (req, res, next) => {
  try {
    const { mode = 'text' } = req.body;
    const session = await ChatSession.create({
      userId: req.userId,
      mode,
      messages: [{
        role: 'assistant',
        content: mode === 'sign'
          ? 'Welcome to Sign Chat mode! Position your hands clearly in front of the camera and I will detect your signs.'
          : 'Hello! I am AKALETA, your Nigerian Sign Language assistant. How can I help you today?',
        mode
      }]
    });
    res.status(201).json({ session });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/chatbot/sessions/:id ───────────────────────────────────────────
router.get('/sessions/:id', async (req, res, next) => {
  try {
    const session = await ChatSession.findOne({ _id: req.params.id, userId: req.userId });
    if (!session) return res.status(404).json({ error: 'Session not found' });
    res.json({ session });
  } catch (err) {
    next(err);
  }
});

// ─── DELETE /api/chatbot/sessions/:id ────────────────────────────────────────
router.delete('/sessions/:id', async (req, res, next) => {
  try {
    await ChatSession.findOneAndDelete({ _id: req.params.id, userId: req.userId });
    res.json({ message: 'Conversation deleted' });
  } catch (err) {
    next(err);
  }
});

// ─── DELETE /api/chatbot/sessions/:id/messages ───────────────────────────────
router.delete('/sessions/:id/messages', async (req, res, next) => {
  try {
    const session = await ChatSession.findOne({ _id: req.params.id, userId: req.userId });
    if (!session) return res.status(404).json({ error: 'Session not found' });
    session.messages = [];
    session.messageCount = 0;
    session.lastMessage = '';
    await session.save();
    res.json({ message: 'Conversation cleared' });
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/chatbot/sessions/:id/message ──────────────────────────────────
// Send a TEXT message and get bot response
router.post('/sessions/:id/message', chatLimiter, async (req, res, next) => {
  try {
    const { content, mode = 'text' } = req.body;
    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Message content is required' });
    }

    const session = await ChatSession.findOne({ _id: req.params.id, userId: req.userId });
    if (!session) return res.status(404).json({ error: 'Session not found' });

    // Add user message
    const userMessage = {
      role: 'user',
      content: content.trim(),
      mode,
      timestamp: new Date()
    };
    session.messages.push(userMessage);

    // Get AI response using the last 5 messages as memory
    const botResponse = await AIService.chat(session.messages.slice(-5));

    // Add bot response
    const botMessage = {
      role: 'assistant',
      content: botResponse.text,
      mode: 'text',
      audioUrl: botResponse.audioUrl || null,
      timestamp: new Date()
    };
    session.messages.push(botMessage);

    await session.save();

    res.json({
      userMessage,
      botMessage,
      sessionId: session._id
    });
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/chatbot/sessions/:id/sign-message ─────────────────────────────
// Process sign language frame and get bot response
router.post('/sessions/:id/sign-message', chatLimiter, async (req, res, next) => {
  try {
    const { frame } = req.body;
    if (!frame) return res.status(400).json({ error: 'Frame data required' });

    const session = await ChatSession.findOne({ _id: req.params.id, userId: req.userId });
    if (!session) return res.status(404).json({ error: 'Session not found' });

    // Detect sign from frame
    const frameDir = path.join(__dirname, '../uploads/frames');
    fs.mkdirSync(frameDir, { recursive: true });
    const tempPath = path.join(frameDir, `chat_${req.userId}_${Date.now()}.jpg`);
    const base64Data = frame.replace(/^data:image\/\w+;base64,/, '');
    fs.writeFileSync(tempPath, Buffer.from(base64Data, 'base64'));

    let detectionResult;
    try {
      detectionResult = await DeepStackService.detectSigns(tempPath);
    } catch {
      detectionResult = await PythonBridgeService.detectFromImage(tempPath);
    }
    fs.unlink(tempPath, () => {});

    if (!detectionResult.detections || detectionResult.detections.length === 0) {
      return res.json({ detected: false, message: 'No sign detected. Please try again.' });
    }

    const topDetection = detectionResult.detections[0];
    const detectedSign = topDetection.label;
    const confidence = Math.round(topDetection.confidence * 100);

    // Add user sign message
    const userMessage = {
      role: 'user',
      content: detectedSign,
      mode: 'sign',
      detectedSign,
      confidence,
      timestamp: new Date()
    };
    session.messages.push(userMessage);

    // Get AI response using the last 5 messages as memory
    const botResponse = await AIService.chat(session.messages.slice(-5));

    const botMessage = {
      role: 'assistant',
      content: botResponse.text,
      mode: 'text',
      audioUrl: botResponse.audioUrl || null,
      timestamp: new Date()
    };
    session.messages.push(botMessage);
    await session.save();

    // Log translation
    await Translation.create({
      userId: req.userId,
      detectedSign,
      confidence,
      mode: 'chatbot'
    });

    res.json({
      detected: true,
      detectedSign,
      confidence,
      userMessage,
      botMessage
    });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/chatbot/sessions/:id/export ────────────────────────────────────
router.get('/sessions/:id/export', async (req, res, next) => {
  try {
    const { format = 'json' } = req.query;
    const session = await ChatSession.findOne({ _id: req.params.id, userId: req.userId });
    if (!session) return res.status(404).json({ error: 'Session not found' });

    if (format === 'txt') {
      const text = session.messages
        .map(m => `[${new Date(m.timestamp).toLocaleString()}] ${m.role.toUpperCase()}: ${m.content}`)
        .join('\n\n');

      res.setHeader('Content-Type', 'text/plain');
      res.setHeader('Content-Disposition', `attachment; filename="akaleta-chat-${session._id}.txt"`);
      return res.send(text);
    }

    // JSON export
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="akaleta-chat-${session._id}.json"`);
    res.json({
      sessionId: session._id,
      title: session.title,
      mode: session.mode,
      createdAt: session.createdAt,
      exportedAt: new Date().toISOString(),
      messages: session.messages
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
