import { Router } from 'express';
import { trendService } from '../services/trendService.js';

const router = Router();

/**
 * GET /api/trends/overview
 * Returns longitudinal trend analytics, sentiment shifts, problem frequency,
 * emerging issues, and categorical breakdowns.
 */
router.get('/overview', async (req, res, next) => {
  try {
    const companyId = req.query?.companyId || 'demo-company';
    const memoryEnabled = req.query?.memoryEnabled !== 'false';

    const result = await trendService.detectTrends({ companyId, memoryEnabled });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/trends/recommendations
 * Returns prioritized product recommendations based on verifiable customer feedback evidence.
 */
router.get('/recommendations', async (req, res, next) => {
  try {
    const companyId = req.query?.companyId || 'demo-company';
    const memoryEnabled = req.query?.memoryEnabled !== 'false';

    const result = await trendService.getRecommendations({ companyId, memoryEnabled });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;

