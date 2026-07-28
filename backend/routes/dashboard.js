const express = require('express');
const router = express.Router();
const Translation = require('../models/Translation');
const ChatSession = require('../models/ChatSession');
const User = require('../models/User');

// ─── GET /api/dashboard/stats ─────────────────────────────────────────────────
router.get('/stats', async (req, res, next) => {
  try {
    const userId = req.userId;

    const [user, totalTranslations, savedTranslations, chatSessions] = await Promise.all([
      User.findById(userId),
      Translation.countDocuments({ userId }),
      Translation.countDocuments({ userId, isSaved: true }),
      ChatSession.countDocuments({ userId })
    ]);

    // Average confidence
    const confAgg = await Translation.aggregate([
      { $match: { userId: userId } },
      { $group: { _id: null, avgConf: { $avg: '$confidence' }, total: { $sum: 1 } } }
    ]);
    const avgConfidence = confAgg[0] ? Math.round(confAgg[0].avgConf) : 0;

    // Top 5 most detected signs
    const topSigns = await Translation.aggregate([
      { $match: { userId: userId } },
      { $group: { _id: '$detectedSign', count: { $sum: 1 }, avgConf: { $avg: '$confidence' } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
      { $project: { sign: '$_id', count: 1, avgConf: { $round: ['$avgConf', 1] }, _id: 0 } }
    ]);

    // Daily activity (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const dailyActivity = await Translation.aggregate([
      { $match: { userId: userId, createdAt: { $gte: thirtyDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
          avgConf: { $avg: '$confidence' }
        }
      },
      { $sort: { _id: 1 } },
      { $project: { date: '$_id', count: 1, avgConf: { $round: ['$avgConf', 1] }, _id: 0 } }
    ]);

    // Recent activity (last 5 translations)
    const recentActivity = await Translation.find({ userId })
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    // Signs practiced (unique signs)
    const uniqueSigns = await Translation.distinct('detectedSign', { userId });

    res.json({
      user: {
        fullName: user.fullName,
        streak: user.stats?.streak || 0,
        joinDate: user.stats?.joinDate || user.createdAt
      },
      stats: {
        totalTranslations,
        savedTranslations,
        chatSessions,
        avgConfidence,
        uniqueSignsPracticed: uniqueSigns.length,
        totalSignsAvailable: 137
      },
      topSigns,
      dailyActivity,
      recentActivity
    });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/dashboard/progress ─────────────────────────────────────────────
router.get('/progress', async (req, res, next) => {
  try {
    const userId = req.userId;

    // Signs by category (based on known NSL categories)
    const alphabetSigns = 'A,B,C,D,E,F,G,H,I,J,K,L,M,N,O,P,Q,R,S,T,U,V,W,X,Y,Z'.split(',');
    
    const practicedSigns = await Translation.distinct('detectedSign', { userId });
    const practicedSet = new Set(practicedSigns.map(s => s.toUpperCase()));

    const alphabetProgress = alphabetSigns.filter(s => practicedSet.has(s)).length;

    // Weekly stats (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const weeklyStats = await Translation.aggregate([
      { $match: { userId, createdAt: { $gte: sevenDaysAgo } } },
      {
        $group: {
          _id: { $dayOfWeek: '$createdAt' },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.json({
      progress: {
        alphabet: { practiced: alphabetProgress, total: 26, percentage: Math.round((alphabetProgress / 26) * 100) },
        overall: { practiced: practicedSigns.length, total: 137, percentage: Math.round((practicedSigns.length / 137) * 100) }
      },
      weeklyStats,
      practicedSigns: practicedSigns.slice(0, 50)
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
