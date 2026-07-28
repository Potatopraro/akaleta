const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const sessionSchema = new mongoose.Schema({
  token: String,
  device: String,
  ip: String,
  lastActive: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now }
});

const userSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: [true, 'Full name is required'],
    trim: true,
    minlength: [2, 'Name must be at least 2 characters'],
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email']
  },
  phone: {
    type: String,
    trim: true,
    match: [/^(\+234|0)[789][01]\d{8}$/, 'Please provide a valid Nigerian phone number']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [8, 'Password must be at least 8 characters'],
    select: false
  },
  role: {
    type: String,
    enum: ['user', 'admin', 'moderator'],
    default: 'user'
  },
  avatar: {
    type: String,
    default: null
  },
  isEmailVerified: { type: Boolean, default: false },
  emailVerificationToken: String,
  emailVerificationExpires: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  twoFactorEnabled: { type: Boolean, default: false },
  twoFactorSecret: { type: String, select: false },
  activeSessions: [sessionSchema],
  rememberMe: { type: Boolean, default: false },

  // Preferences
  preferences: {
    theme: { type: String, enum: ['light', 'dark', 'system'], default: 'dark' },
    fontSize: { type: Number, default: 16, min: 12, max: 24 },
    highContrast: { type: Boolean, default: false },
    reducedMotion: { type: Boolean, default: false },
    screenReader: { type: Boolean, default: false },
    tts: {
      voice: { type: String, default: 'female' },
      speed: { type: Number, default: 1.0 },
      pitch: { type: Number, default: 1.0 }
    },
    notifications: {
      email: { type: Boolean, default: true },
      push: { type: Boolean, default: false }
    },
    webcam: {
      deviceId: String,
      resolution: { type: String, default: '720p' }
    }
  },

  // Stats
  stats: {
    totalTranslations: { type: Number, default: 0 },
    totalConfidenceSum: { type: Number, default: 0 },
    streak: { type: Number, default: 0 },
    lastActiveDate: Date,
    joinDate: { type: Date, default: Date.now }
  },

  isActive: { type: Boolean, default: true },
  lastLogin: Date
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// ─── Virtual Fields ───────────────────────────────────────────────────────────
userSchema.virtual('accuracyRate').get(function() {
  if (this.stats.totalTranslations === 0) return 0;
  return (this.stats.totalConfidenceSum / this.stats.totalTranslations).toFixed(1);
});

// ─── Middleware ───────────────────────────────────────────────────────────────
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// ─── Methods ──────────────────────────────────────────────────────────────────
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.updateStreak = function() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const lastActive = this.stats.lastActiveDate ? new Date(this.stats.lastActiveDate) : null;
  if (lastActive) {
    lastActive.setHours(0, 0, 0, 0);
    const diffDays = Math.floor((today - lastActive) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return; // Same day
    if (diffDays === 1) this.stats.streak += 1; // Consecutive day
    else this.stats.streak = 1; // Broken streak
  } else {
    this.stats.streak = 1;
  }
  this.stats.lastActiveDate = new Date();
};

userSchema.methods.toPublicJSON = function() {
  const obj = this.toObject();
  delete obj.password;
  delete obj.twoFactorSecret;
  delete obj.emailVerificationToken;
  delete obj.passwordResetToken;
  delete obj.activeSessions;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
