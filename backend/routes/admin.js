const express = require('express');
const router = express.Router();
const { requireAdmin } = require('../middleware/auth');
const User = require('../models/User');
const Translation = require('../models/Translation');

router.use(requireAdmin);

router.get('/stats', async (req, res, next) => {
  try {
    const [totalUsers, totalTranslations, activeToday] = await Promise.all([
      User.countDocuments(),
      Translation.countDocuments(),
      User.countDocuments({ lastLogin: { $gte: new Date(Date.now() - 86400000) } })
    ]);
    res.json({ totalUsers, totalTranslations, activeToday });
  } catch (err) { next(err); }
});

router.get('/users', async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    const query = search ? { $or: [{ fullName: new RegExp(search, 'i') }, { email: new RegExp(search, 'i') }] } : {};
    const users = await User.find(query).select('-password').sort({ createdAt: -1 })
      .skip((page - 1) * limit).limit(parseInt(limit));
    const total = await User.countDocuments(query);
    res.json({ users, total });
  } catch (err) { next(err); }
});

router.patch('/users/:id/toggle-active', async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    user.isActive = !user.isActive;
    await user.save();
    res.json({ message: `User ${user.isActive ? 'activated' : 'deactivated'}`, isActive: user.isActive });
  } catch (err) { next(err); }
});

module.exports = router;
