const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Translation = require('../models/Translation');
const ChatSession = require('../models/ChatSession');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const archiver = require('archiver');

// ─── GET /api/settings/profile ────────────────────────────────────────────────
router.get('/profile', async (req, res, next) => {
  try {
    const user = await User.findById(req.userId);
    res.json({ user: user.toPublicJSON() });
  } catch (err) { next(err); }
});

// ─── PATCH /api/settings/profile ─────────────────────────────────────────────
router.patch('/profile', async (req, res, next) => {
  try {
    const { fullName, phone } = req.body;
    const updates = {};
    if (fullName) updates.fullName = fullName;
    if (phone !== undefined) updates.phone = phone;

    const user = await User.findByIdAndUpdate(req.userId, updates, { new: true, runValidators: true });
    res.json({ message: 'Profile updated successfully', user: user.toPublicJSON() });
  } catch (err) { next(err); }
});

// ─── PATCH /api/settings/password ────────────────────────────────────────────
router.patch('/password', async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Both current and new password are required' });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters' });
    }

    const user = await User.findById(req.userId).select('+password');
    if (!(await user.comparePassword(currentPassword))) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    user.password = newPassword;
    user.activeSessions = [];
    await user.save();

    res.json({ message: 'Password changed successfully. Please log in again.' });
  } catch (err) { next(err); }
});

// ─── GET /api/settings/2fa/setup ─────────────────────────────────────────────
router.get('/2fa/setup', async (req, res, next) => {
  try {
    const user = await User.findById(req.userId);
    const secret = speakeasy.generateSecret({ name: `AKALETA (${user.email})`, length: 20 });
    const qrCode = await QRCode.toDataURL(secret.otpauth_url);

    // Temporarily store secret (not saved until verified)
    req.session = req.session || {};
    // We'll store in user object temporarily
    user.twoFactorSecret = secret.base32;
    await user.save({ validateBeforeSave: false });

    res.json({ qrCode, secret: secret.base32 });
  } catch (err) { next(err); }
});

// ─── POST /api/settings/2fa/verify ───────────────────────────────────────────
router.post('/2fa/verify', async (req, res, next) => {
  try {
    const { token } = req.body;
    const user = await User.findById(req.userId).select('+twoFactorSecret');

    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token,
      window: 2
    });

    if (!verified) return res.status(400).json({ error: 'Invalid 2FA token' });

    user.twoFactorEnabled = true;
    await user.save();

    res.json({ message: '2FA enabled successfully' });
  } catch (err) { next(err); }
});

// ─── DELETE /api/settings/2fa ─────────────────────────────────────────────────
router.delete('/2fa', async (req, res, next) => {
  try {
    await User.findByIdAndUpdate(req.userId, {
      twoFactorEnabled: false,
      $unset: { twoFactorSecret: 1 }
    });
    res.json({ message: '2FA disabled successfully' });
  } catch (err) { next(err); }
});

// ─── PATCH /api/settings/preferences ─────────────────────────────────────────
router.patch('/preferences', async (req, res, next) => {
  try {
    const { theme, fontSize, highContrast, reducedMotion, screenReader, tts, notifications, webcam } = req.body;

    const updates = {};
    if (theme) updates['preferences.theme'] = theme;
    if (fontSize) updates['preferences.fontSize'] = fontSize;
    if (highContrast !== undefined) updates['preferences.highContrast'] = highContrast;
    if (reducedMotion !== undefined) updates['preferences.reducedMotion'] = reducedMotion;
    if (screenReader !== undefined) updates['preferences.screenReader'] = screenReader;
    if (tts) {
      if (tts.voice) updates['preferences.tts.voice'] = tts.voice;
      if (tts.speed !== undefined) updates['preferences.tts.speed'] = tts.speed;
      if (tts.pitch !== undefined) updates['preferences.tts.pitch'] = tts.pitch;
    }
    if (notifications) {
      if (notifications.email !== undefined) updates['preferences.notifications.email'] = notifications.email;
      if (notifications.push !== undefined) updates['preferences.notifications.push'] = notifications.push;
    }
    if (webcam) {
      if (webcam.deviceId) updates['preferences.webcam.deviceId'] = webcam.deviceId;
    }

    const user = await User.findByIdAndUpdate(req.userId, { $set: updates }, { new: true });
    res.json({ message: 'Preferences saved', preferences: user.preferences });
  } catch (err) { next(err); }
});

// ─── GET /api/settings/sessions ──────────────────────────────────────────────
router.get('/sessions', async (req, res, next) => {
  try {
    const user = await User.findById(req.userId);
    res.json({ sessions: user.activeSessions });
  } catch (err) { next(err); }
});

// ─── DELETE /api/settings/sessions/:sessionToken ─────────────────────────────
router.delete('/sessions/:sessionToken', async (req, res, next) => {
  try {
    await User.findByIdAndUpdate(req.userId, {
      $pull: { activeSessions: { token: req.params.sessionToken } }
    });
    res.json({ message: 'Session terminated' });
  } catch (err) { next(err); }
});

// ─── GET /api/settings/export-data ───────────────────────────────────────────
router.get('/export-data', async (req, res, next) => {
  try {
    const [user, translations, chatSessions] = await Promise.all([
      User.findById(req.userId),
      Translation.find({ userId: req.userId }).lean(),
      ChatSession.find({ userId: req.userId }).lean()
    ]);

    const exportData = {
      exportedAt: new Date().toISOString(),
      user: user.toPublicJSON(),
      translations,
      chatSessions
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="akaleta-data-export.json"');
    res.json(exportData);
  } catch (err) { next(err); }
});

// ─── DELETE /api/settings/account ────────────────────────────────────────────
router.delete('/account', async (req, res, next) => {
  try {
    const { confirmText } = req.body;
    if (confirmText !== 'DELETE MY ACCOUNT') {
      return res.status(400).json({ error: 'Please type "DELETE MY ACCOUNT" to confirm' });
    }

    await Promise.all([
      User.findByIdAndDelete(req.userId),
      Translation.deleteMany({ userId: req.userId }),
      ChatSession.deleteMany({ userId: req.userId })
    ]);

    res.json({ message: 'Account and all associated data deleted successfully' });
  } catch (err) { next(err); }
});

module.exports = router;
