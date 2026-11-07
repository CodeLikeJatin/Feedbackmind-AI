import { Router } from 'express';
import { hindsightService } from '../services/hindsightService.js';
import { getDatabase } from '../config/db.js';

const router = Router();

// GET /api/memory/overview - Memory bank status and statistics
router.get('/overview', async (req, res, next) => {
  try {
    const companyId = req.sanitizedCompanyId || 'demo-company';
    const overview = await hindsightService.getBankOverview(companyId);
    res.json(overview);
  } catch (err) {
    next(err);
  }
});

// POST /api/memory/init-bank - Initialize/ensure bank exists in Hindsight
router.post('/init-bank', async (req, res, next) => {
  try {
    const companyId = req.sanitizedCompanyId || 'demo-company';
    if (!hindsightService.isConfigured()) {
      return res.status(503).json({
        error: 'HINDSIGHT_API_KEY is not configured in backend .env',
        message: 'Please add your HINDSIGHT_API_KEY to backend/.env to initialize cloud memory banks.'
      });
    }

    const profile = await hindsightService.ensureBank(companyId);
    res.json({ success: true, profile });
  } catch (err) {
    next(err);
  }
});

// POST /api/memory/retain-batch - Retain un-retained records in batch
router.post('/retain-batch', async (req, res, next) => {
  try {
    const companyId = req.sanitizedCompanyId || 'demo-company';
    const limit = Number(req.body?.limit) || 50;

    if (!hindsightService.isConfigured()) {
      return res.status(503).json({
        error: 'HINDSIGHT_API_KEY is not configured in backend .env',
        message: 'Please configure HINDSIGHT_API_KEY to retain memories in Hindsight Cloud.'
      });
    }

    const result = await hindsightService.retainBatchFeedback({ companyId, limit });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// POST /api/memory/retain-record/:id - Retain individual record
router.post('/retain-record/:id', async (req, res, next) => {
  try {
    const recordId = req.params.id;
    const companyId = req.sanitizedCompanyId || 'demo-company';
    const db = getDatabase();

    const record = db.prepare('SELECT * FROM feedback WHERE (id = ? OR feedback_id = ?) AND company_id = ?').get(recordId, recordId, companyId);
    if (!record) {
      return res.status(404).json({ error: `Feedback record ${recordId} not found.` });
    }

    if (!hindsightService.isConfigured()) {
      return res.status(503).json({
        error: 'HINDSIGHT_API_KEY is not configured in backend .env',
        message: 'Please configure HINDSIGHT_API_KEY to retain memories in Hindsight Cloud.'
      });
    }

    const result = await hindsightService.retainFeedback(record, companyId);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// POST /api/memory/recall - Recall memories via natural language query
router.post('/recall', async (req, res, next) => {
  try {
    const { query, maxTokens, budget } = req.body || {};
    const companyId = req.sanitizedCompanyId || 'demo-company';
    if (!query || !String(query).trim()) {
      return res.status(400).json({ error: 'Search query is required for recall.' });
    }

    if (!hindsightService.isConfigured()) {
      return res.status(503).json({
        error: 'HINDSIGHT_API_KEY is not configured in backend .env',
        message: 'Please configure HINDSIGHT_API_KEY to perform memory recall.'
      });
    }

    const result = await hindsightService.recallMemories({
      query,
      companyId,
      maxTokens,
      budget
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// POST /api/memory/reflect - Longitudinal reflection across memories
router.post('/reflect', async (req, res, next) => {
  try {
    const { query, context, budget } = req.body || {};
    const companyId = req.sanitizedCompanyId || 'demo-company';
    if (!query || !String(query).trim()) {
      return res.status(400).json({ error: 'Query is required for memory reflection.' });
    }

    if (!hindsightService.isConfigured()) {
      return res.status(503).json({
        error: 'HINDSIGHT_API_KEY is not configured in backend .env',
        message: 'Please configure HINDSIGHT_API_KEY to perform memory reflection.'
      });
    }

    const result = await hindsightService.reflectOnMemories({
      query,
      context,
      companyId,
      budget
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// GET /api/memory/list - List memories from database & Hindsight
router.get('/list', async (req, res, next) => {
  try {
    const companyId = req.sanitizedCompanyId || 'demo-company';
    const limit = Number(req.query?.limit) || 50;
    const db = getDatabase();

    const rows = db.prepare(`
      SELECT id, feedback_id, customer_id, date, source, feedback, rating, sentiment, topic, urgency,
             retained_in_hindsight, hindsight_memory_id, summary, suggested_action
      FROM feedback
      WHERE company_id = ? AND retained_in_hindsight = 1
      ORDER BY date DESC, id DESC
      LIMIT ?
    `).all(companyId, limit);

    res.json({
      bankId: hindsightService.resolveBankId(companyId),
      total: rows.length,
      items: rows
    });
  } catch (err) {
    next(err);
  }
});

export default router;

