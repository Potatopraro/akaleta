const mongoose = require('mongoose');

const translationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  detectedSign: {
    type: String,
    required: true,
    trim: true
  },
  confidence: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  mode: {
    type: String,
    enum: ['image_upload', 'live_webcam', 'chatbot'],
    default: 'live_webcam'
  },
  imageSnapshot: {
    type: String, // base64 or file path
    default: null
  },
  boundingBox: {
    x1: Number,
    y1: Number,
    x2: Number,
    y2: Number,
    width: Number,
    height: Number
  },
  modelUsed: {
    type: String,
    default: 'yolo-nsl'
  },
  processingTime: {
    type: Number, // milliseconds
    default: 0
  },
  isSaved: {
    type: Boolean,
    default: false
  },
  tags: [String],
  notes: String
}, {
  timestamps: true
});

// Index for efficient queries
translationSchema.index({ userId: 1, createdAt: -1 });
translationSchema.index({ userId: 1, detectedSign: 1 });
translationSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Translation', translationSchema);
