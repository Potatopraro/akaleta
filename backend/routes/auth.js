const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const User = require('../models/User');
const { generateTokens, authenticateToken } = require('../middleware/auth');
const EmailService = require('../services/emailService');

router.post('/google', async (req, res, next) => {
  try {
    const { idToken, email, fullName } = req.body;

    if (!idToken && !email) {
      return res.status(400).json({ error: 'Google sign-in token is required' });
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'https://akaleta.nx.kg/api/auth/google/callback';

    if (!idToken) {
      return res.status(400).json({ error: 'Google ID token is required' });
    }

    const tokenResponse = await axios.post('https://oauth2.googleapis.com/token', {
      code: idToken,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code'
    }, { timeout: 10000 });

    const accessToken = tokenResponse.data.access_token;
    const userInfoResponse = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
      timeout: 10000
    });

    const googleUser = userInfoResponse.data;
    const normalizedEmail = (googleUser.email || email || '').toLowerCase();

    let user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      user = await User.create({
        fullName: fullName || googleUser.name || 'Google User',
        email: normalizedEmail,
        password: crypto.randomBytes(24).toString('hex'),
        isEmailVerified: true,
        stats: { lastActiveDate: new Date(), streak: 1 }
      });
    }

    const { accessToken: appAccessToken, refreshToken } = generateTokens(user._id);
    res.json({
      message: 'Google sign-in successful',
      user: user.toPublicJSON(),
      accessToken: appAccessToken,
      refreshToken
    });
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/auth/register ──────────────────────────────────────────────────
router.post('/register', async (req, res, next) => {
  try {
    const { fullName, email, phone, password } = req.body;

    if (!fullName || !email || !password) {
      return res.status(400).json({ error: 'Full name, email, and password are required' });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    // Email verification token
    const verifyToken = crypto.randomBytes(32).toString('hex');
    const verifyExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const user = await User.create({
      fullName,
      email,
      phone,
      password,
      emailVerificationToken: verifyToken,
      emailVerificationExpires: verifyExpires,
      stats: { lastActiveDate: new Date(), streak: 1 }
    });

    // Send verification email (non-blocking)
    EmailService.sendVerificationEmail(email, fullName, verifyToken).catch(console.error);

    const { accessToken, refreshToken } = generateTokens(user._id);

    res.status(201).json({
      message: 'Registration successful! Please check your email to verify your account.',
      user: user.toPublicJSON(),
      accessToken,
      refreshToken
    });
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/auth/login ─────────────────────────────────────────────────────
router.post('/login', async (req, res, next) => {
  try {
    const { email, password, rememberMe } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    if (!user.isActive) {
      return res.status(403).json({ error: 'Account has been disabled. Contact support.' });
    }

    // Update streak and last login
    user.updateStreak();
    user.lastLogin = new Date();
    user.rememberMe = rememberMe || false;

    // Track session
    const sessionInfo = {
      token: crypto.randomBytes(16).toString('hex'),
      device: req.headers['user-agent']?.substring(0, 200) || 'Unknown',
      ip: req.ip,
      lastActive: new Date()
    };

    // Keep max 5 active sessions
    if (user.activeSessions.length >= 5) {
      user.activeSessions.shift();
    }
    user.activeSessions.push(sessionInfo);
    await user.save();

    const tokenExpiry = rememberMe ? '30d' : '7d';
    const { accessToken, refreshToken } = generateTokens(user._id);

    res.json({
      message: 'Login successful',
      user: user.toPublicJSON(),
      accessToken,
      refreshToken
    });
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/auth/refresh ───────────────────────────────────────────────────
router.post('/refresh', async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token required' });
    }

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || 'refresh_fallback_secret');
    const user = await User.findById(decoded.userId);

    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }

    const { accessToken, refreshToken: newRefreshToken } = generateTokens(user._id);
    res.json({ accessToken, refreshToken: newRefreshToken });
  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }
    next(err);
  }
});

// ─── POST /api/auth/forgot-password ──────────────────────────────────────────
router.post('/forgot-password', async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const user = await User.findOne({ email: email.toLowerCase() });

    // Always return success to prevent email enumeration
    if (!user) {
      return res.json({ message: 'If that email exists, a reset link has been sent.' });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    user.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await user.save({ validateBeforeSave: false });

    EmailService.sendPasswordResetEmail(email, user.fullName, resetToken).catch(console.error);

    res.json({ message: 'If that email exists, a reset link has been sent.' });
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/auth/reset-password/:token ────────────────────────────────────
router.post('/reset-password/:token', async (req, res, next) => {
  try {
    const { password } = req.body;
    if (!password || password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');
    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    user.password = password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    user.activeSessions = []; // Invalidate all sessions
    await user.save();

    res.json({ message: 'Password reset successful. You can now log in.' });
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/auth/verify-email/:token ──────────────────────────────────────
router.get('/verify-email/:token', async (req, res, next) => {
  try {
    const user = await User.findOne({
      emailVerificationToken: req.params.token,
      emailVerificationExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired verification link' });
    }

    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

    res.json({ message: 'Email verified successfully!' });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/auth/me ─────────────────────────────────────────────────────────
router.get('/me', authenticateToken, async (req, res) => {
  res.json({ user: req.user.toPublicJSON() });
});

// ─── POST /api/auth/logout ────────────────────────────────────────────────────
router.post('/logout', authenticateToken, async (req, res, next) => {
  try {
    const user = await User.findById(req.userId);
    if (user) {
      user.activeSessions = [];
      await user.save();
    }
    res.json({ message: 'Logged out successfully' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
