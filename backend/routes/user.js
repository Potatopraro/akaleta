const express = require('express');
const router = express.Router();
const User = require('../models/User');

router.get('/profile', async (req, res) => {
  res.json({ user: req.user.toPublicJSON() });
});

router.patch('/profile', async (req, res, next) => {
  try {
    const { fullName, phone } = req.body;
    const user = await User.findByIdAndUpdate(
      req.userId,
      { ...(fullName && { fullName }), ...(phone !== undefined && { phone }) },
      { new: true, runValidators: true }
    );
    res.json({ user: user.toPublicJSON() });
  } catch (err) { next(err); }
});

module.exports = router;
