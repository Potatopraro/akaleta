const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Translation = require('../models/Translation');
const User = require('../models/User');
const DeepStackService = require('../services/deepstackService');
const PythonBridgeService = require('../services/pythonBridgeService');
const { authenticateToken } = require('../middleware/auth');
const { uploadLimiter } = require('../middleware/rateLimiter');

// ─── Multer Storage ───────────────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/frames');
    fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${req.userId}_${Date.now()}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG, PNG, and WebP images are allowed'), false);
    }
  }
});

// ─── POST /api/translator/detect/image ───────────────────────────────────────
// Detect signs from uploaded image
router.post('/detect/image', authenticateToken, uploadLimiter, upload.single('image'), async (req, res, next) => {
  const startTime = Date.now();
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    const imagePath = req.file.path;
    let detectionResult;

    // Try DeepStack first, fall back to Python script
    try {
      detectionResult = await DeepStackService.detectSigns(imagePath);
    } catch (dsErr) {
      console.warn('DeepStack unavailable, falling back to Python script:', dsErr.message);
      detectionResult = await PythonBridgeService.detectFromImage(imagePath);
    }

    const processingTime = Date.now() - startTime;

    // Save translation record
    if (detectionResult.detections && detectionResult.detections.length > 0) {
      const topDetection = detectionResult.detections[0];
      
      const translation = await Translation.create({
        userId: req.userId,
        detectedSign: topDetection.label,
        confidence: Math.round(topDetection.confidence * 100),
        mode: 'image_upload',
        imageSnapshot: req.file.filename,
        boundingBox: topDetection.boundingBox || {},
        modelUsed: detectionResult.model || 'yolo-nsl',
        processingTime
      });

      // Update user stats
      await User.findByIdAndUpdate(req.userId, {
        $inc: {
          'stats.totalTranslations': 1,
          'stats.totalConfidenceSum': Math.round(topDetection.confidence * 100)
        }
      });

      return res.json({
        success: true,
        translation: {
          id: translation._id,
          detectedSign: topDetection.label,
          confidence: Math.round(topDetection.confidence * 100),
          allDetections: detectionResult.detections,
          processingTime,
          imageUrl: `/uploads/frames/${req.file.filename}`
        }
      });
    }

    // No detection
    res.json({
      success: true,
      translation: null,
      message: 'No sign language detected in the image',
      processingTime
    });

    // Cleanup uploaded file after response
    setTimeout(() => {
      fs.unlink(imagePath, () => {});
    }, 30000); // Keep for 30 seconds

  } catch (err) {
    // Cleanup on error
    if (req.file) fs.unlink(req.file.path, () => {});
    next(err);
  }
});

// ─── POST /api/translator/detect/frame ───────────────────────────────────────
// Detect signs from base64 webcam frame
router.post('/detect/frame', async (req, res, next) => {
  const startTime = Date.now();
  try {
    const { frame, saveSnapshot } = req.body;
    
    if (!frame) {
      return res.status(400).json({ error: 'No frame data provided' });
    }

    // Convert base64 to temp file
    const frameDir = path.join(__dirname, '../uploads/frames');
    fs.mkdirSync(frameDir, { recursive: true });
    const tempPath = path.join(frameDir, `frame_${req.userId}_${Date.now()}.jpg`);
    
    const base64Data = frame.replace(/^data:image\/\w+;base64,/, '');
    fs.writeFileSync(tempPath, Buffer.from(base64Data, 'base64'));

    let detectionResult;
    try {
      detectionResult = await DeepStackService.detectSigns(tempPath);
    } catch (dsErr) {
      detectionResult = await PythonBridgeService.detectFromImage(tempPath);
    }

    const processingTime = Date.now() - startTime;

    // Cleanup temp file
    fs.unlink(tempPath, () => {});

    if (detectionResult.detections && detectionResult.detections.length > 0) {
      const topDetection = detectionResult.detections[0];

      // Only save to DB if confidence > 70% and saveSnapshot requested
      if (topDetection.confidence > 0.7) {
        await Translation.create({
          userId: req.userId,
          detectedSign: topDetection.label,
          confidence: Math.round(topDetection.confidence * 100),
          mode: 'live_webcam',
          processingTime
        });

        await User.findByIdAndUpdate(req.userId, {
          $inc: {
            'stats.totalTranslations': 1,
            'stats.totalConfidenceSum': Math.round(topDetection.confidence * 100)
          }
        });
      }

      return res.json({
        success: true,
        detectedSign: topDetection.label,
        confidence: Math.round(topDetection.confidence * 100),
        allDetections: detectionResult.detections.map(d => ({
          label: d.label,
          confidence: Math.round(d.confidence * 100),
          boundingBox: d.boundingBox
        })),
        processingTime
      });
    }

    res.json({ success: true, detectedSign: null, allDetections: [], processingTime });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/translator/history ─────────────────────────────────────────────
router.get('/history', async (req, res, next) => {
  try {
    const { page = 1, limit = 20, sign, mode } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const query = { userId: req.userId };
    if (sign) query.detectedSign = new RegExp(sign, 'i');
    if (mode) query.mode = mode;

    const [translations, total] = await Promise.all([
      Translation.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Translation.countDocuments(query)
    ]);

    res.json({
      translations,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (err) {
    next(err);
  }
});

// ─── DELETE /api/translator/history ──────────────────────────────────────────
router.delete('/history', async (req, res, next) => {
  try {
    const result = await Translation.deleteMany({ userId: req.userId });
    res.json({ message: `Cleared ${result.deletedCount} translation records` });
  } catch (err) {
    next(err);
  }
});

// ─── PATCH /api/translator/history/:id/save ───────────────────────────────────
router.patch('/history/:id/save', async (req, res, next) => {
  try {
    const translation = await Translation.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      { isSaved: true },
      { new: true }
    );
    if (!translation) return res.status(404).json({ error: 'Translation not found' });
    res.json({ translation });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/translator/deepstack/status ────────────────────────────────────
router.get('/deepstack/status', async (req, res, next) => {
  try {
    const isRunning = await DeepStackService.checkStatus();
    res.json({ running: isRunning, url: process.env.DEEPSTACK_URL });
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/translator/deepstack/start ────────────────────────────────────
router.post('/deepstack/start', async (req, res, next) => {
  try {
    const result = await DeepStackService.startContainer();
    res.json(result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
