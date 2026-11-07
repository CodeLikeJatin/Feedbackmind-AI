import { Router } from 'express';
import { demoService } from '../services/demoService.js';
import { groqService } from '../services/groqService.js';

const router = Router();

/**
 * GET /api/demo/status
 * Returns current demo dataset status, available SQLite records, Hindsight bank status,
 * and suggested demo questions.
 */
router.get('/status', (req, res, next) => {
  try {
    const companyId = req.query?.companyId || 'demo-company';
    const status = demoService.getDemoStatus(companyId);
    res.json(status);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/demo/query
 * Executes a single question in either Memory OFF or Memory ON mode.
 */
router.post('/query', async (req, res, next) => {
  try {
    const { question, companyId = 'demo-company', memoryEnabled = true, model } = req.body || {};

    if (!question || !String(question).trim()) {
      return res.status(400).json({ error: 'Question is required' });
    }

    if (!groqService.isConfigured()) {
      return res.status(503).json({
        error: 'GROQ_API_KEY is not configured in backend server/.env',
        service: 'groq'
      });
    }

    const result = await demoService.executeMode({
      question,
      companyId,
      memoryEnabled: Boolean(memoryEnabled),
      model
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/demo/compare
 * Executes the exact same question in both Memory OFF and Memory ON modes independently,
 * returning side-by-side answers, evidence, and objective comparative analysis.
 */
router.post('/compare', async (req, res, next) => {
  try {
    const { question, companyId = 'demo-company', model } = req.body || {};

    if (!question || !String(question).trim()) {
      return res.status(400).json({ error: 'Question is required for comparison' });
    }

    if (!groqService.isConfigured()) {
      return res.status(503).json({
        error: 'GROQ_API_KEY is not configured in backend server/.env',
        service: 'groq'
      });
    }

    const comparison = await demoService.compare({
      question,
      companyId,
      model
    });

    res.json(comparison);
  } catch (err) {
    next(err);
  }
});

export default router;

