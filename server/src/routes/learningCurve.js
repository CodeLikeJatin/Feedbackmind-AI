import { Router } from 'express';
import { learningCurveService } from '../services/learningCurveService.js';
import { groqService } from '../services/groqService.js';
import { hindsightService } from '../services/hindsightService.js';

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

    if (!groqService.isConfigured()) {
      return res.status(503).json({
        error: 'GROQ_API_KEY is not configured in backend .env',
        message: 'Please add GROQ_API_KEY to server/.env'
      });
    }
    if (!hindsightService.isConfigured()) {
      return res.status(503).json({
        error: 'HINDSIGHT_API_KEY is not configured in backend .env',
        message: 'Please add HINDSIGHT_API_KEY to server/.env'
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

// POST /api/learning-curve/reset
router.post('/reset', async (req, res, next) => {
  try {
    const result = await learningCurveService.resetEnvironment();
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;

