import { Router } from 'express';
import { feedbackDbService } from '../services/feedbackDbService.js';

const router = Router();

// GET /api/dashboard/stats - Dashboard analytics summary
router.get('/stats', (req, res, next) => {
  try {
    const companyId = req.query?.companyId || 'demo-company';
    let stats = feedbackDbService.getStats({ companyId });

    // If completely empty initially, auto-seed demo data so the dashboard has rich data
    if (stats.total === 0 && req.query?.autoseed !== 'false') {
      feedbackDbService.seedDemoData(companyId);
      stats = feedbackDbService.getStats({ companyId });
    }

    res.json(stats);
  } catch (err) {
    next(err);
  }
});

export default router;

