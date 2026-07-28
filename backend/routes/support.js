// routes/support.js
const express = require('express');
const router = express.Router();
const EmailService = require('../services/emailService');
const { optionalAuth } = require('../middleware/auth');

router.post('/contact', optionalAuth, async (req, res, next) => {
  try {
    const { name, email, subject, message } = req.body;
    if (!name || !email || !subject || !message) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    await EmailService.sendSupportEmail({ name, email, subject, message });
    res.json({ message: 'Your message has been sent. We\'ll respond within 24 hours.' });
  } catch (err) {
    next(err);
  }
});

router.post('/feedback', optionalAuth, async (req, res, next) => {
  try {
    const { rating, feedback, suggestions } = req.body;
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    console.log('[FEEDBACK]', { rating, feedback, suggestions, userId: req.userId });
    res.json({ message: 'Thank you for your feedback!' });
  } catch (err) { next(err); }
});

router.post('/bug-report', optionalAuth, async (req, res, next) => {
  try {
    const { title, description, steps, browser } = req.body;
    if (!title || !description) {
      return res.status(400).json({ error: 'Title and description are required' });
    }

    await EmailService.sendBugReport({ title, description, steps, browser, userId: req.userId });
    res.json({ message: 'Bug report submitted. Our team will investigate it.' });
  } catch (err) { next(err); }
});

module.exports = router;
