import { Router } from 'express';
import { learningCurveService } from '../services/learningCurveService.js';
import { groqService } from '../services/groqService.js';
import { hindsightService } from '../services/hindsightService.js';
import { checkDestructiveGuard } from '../middleware/security.js';

const router = Router();

// GET /api/learning-curve/status
router.get('/status', async (req, res, next) => {
  try {
    const status = await learningCurveService.getStatus();
    res.json(status);
  } catch (err) {
    next(err);
  }
});

// GET /api/learning-curve/interactions
router.get('/interactions', (req, res, next) => {
  try {
    const interactions = learningCurveService.getInteractions();
    res.json({
      total: interactions.length,
      interactions
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/learning-curve/checkpoints
router.get('/checkpoints', (req, res, next) => {
  try {
    const result = learningCurveService.getCheckpoints();
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// POST /api/learning-curve/initialize
router.post('/initialize', async (req, res, next) => {
  try {
    const { force = false, model } = req.body || {};

    // In production or when force is requested, enforce destructive guard
    if (force || process.env.NODE_ENV === 'production') {
      const existing = learningCurveService.getCheckpoints();
      if (existing.isInitialized && !force) {
        return res.json({
          message: 'Learning curve scenario is already initialized with verified checkpoints.',
          alreadyInitialized: true,
          checkpoints: existing.checkpoints
        });
      }

      // If force re-initialization is attempted, require administrative authorization
      return checkDestructiveGuard(req, res, async () => {
        if (!groqService.isConfigured()) {
          return res.status(503).json({
            error: 'GROQ_API_KEY is not configured in backend .env',
            message: 'Please add GROQ_API_KEY to backend/.env'
          });
        }
        if (!hindsightService.isConfigured()) {
          return res.status(503).json({
            error: 'HINDSIGHT_API_KEY is not configured in backend .env',
            message: 'Please add HINDSIGHT_API_KEY to backend/.env'
          });
        }

        const result = await learningCurveService.initializeScenario({ force, model });
        res.json(result);
      });
    }

    if (!groqService.isConfigured()) {
      return res.status(503).json({
        error: 'GROQ_API_KEY is not configured in backend .env',
        message: 'Please add GROQ_API_KEY to backend/.env'
      });
    }
    if (!hindsightService.isConfigured()) {
      return res.status(503).json({
        error: 'HINDSIGHT_API_KEY is not configured in backend .env',
        message: 'Please add HINDSIGHT_API_KEY to backend/.env'
      });
    }

    const result = await learningCurveService.initializeScenario({ force, model });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// POST /api/learning-curve/benchmark
router.post('/benchmark', async (req, res, next) => {
  try {
    const { question, model } = req.body || {};

    if (!groqService.isConfigured()) {
      return res.status(503).json({
        error: 'GROQ_API_KEY is not configured in backend .env'
      });
    }

    const result = await learningCurveService.runBenchmarkComparison({ question, model });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// POST /api/learning-curve/reset (Protected by destructive guard)
router.post('/reset', checkDestructiveGuard, async (req, res, next) => {
  try {
    const result = await learningCurveService.resetEnvironment();
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;

