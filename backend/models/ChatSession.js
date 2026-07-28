const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  role: {
    type: String,
    enum: ['user', 'assistant', 'system'],
    required: true
  },
  content: {
    type: String,
    required: true
  },
  mode: {
    type: String,
    enum: ['sign', 'text', 'voice'],
    default: 'text'
  },
  detectedSign: String, // if mode is 'sign'
  confidence: Number,   // confidence of sign detection
  audioUrl: String,     // TTS audio URL
  timestamp: {
    type: Date,
    default: Date.now
  },
  isRead: {
    type: Boolean,
    default: false
  }
});

const chatSessionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  title: {
    type: String,
    default: 'New Conversation'
  },
  mode: {
    type: String,
    enum: ['sign', 'text'],
    default: 'text'
  },
  messages: [messageSchema],
  isActive: {
    type: Boolean,
    default: true
  },
  messageCount: {
    type: Number,
    default: 0
  },
  lastMessage: {
    type: String,
    default: ''
  },
  lastMessageAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

chatSessionSchema.index({ userId: 1, updatedAt: -1 });
chatSessionSchema.index({ userId: 1, isActive: 1 });

// Update derived fields before save
chatSessionSchema.pre('save', function(next) {
  if (this.messages.length > 0) {
    this.messageCount = this.messages.length;
    const lastMsg = this.messages[this.messages.length - 1];
    this.lastMessage = lastMsg.content.substring(0, 100);
    this.lastMessageAt = lastMsg.timestamp;

    // Auto-title from first user message
    if (this.title === 'New Conversation' && this.messages.length >= 1) {
      const firstUser = this.messages.find(m => m.role === 'user');
      if (firstUser) {
        this.title = firstUser.content.substring(0, 50) + (firstUser.content.length > 50 ? '...' : '');
      }
    }
  }
  next();
});

module.exports = mongoose.model('ChatSession', chatSessionSchema);
