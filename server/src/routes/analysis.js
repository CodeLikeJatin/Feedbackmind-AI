import { Router } from 'express';
import { groqService } from '../services/groqService.js';
import { getDatabase } from '../config/db.js';

const router = Router();

// GET /api/analysis/status - Analysis counts
router.get('/status', (req, res, next) => {
  try {
    const companyId = req.query?.companyId || 'demo-company';
    const db = getDatabase();

    const counts = db.prepare(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN analysis_status = 'analyzed' THEN 1 ELSE 0 END) as analyzed,
        SUM(CASE WHEN analysis_status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN analysis_status = 'failed' THEN 1 ELSE 0 END) as failed
      FROM feedback
      WHERE company_id = ?
    `).get(companyId);

    res.json({
      configured: groqService.isConfigured(),
      total: counts?.total || 0,
      analyzed: counts?.analyzed || 0,
      pending: counts?.pending || 0,
      failed: counts?.failed || 0
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/analysis/batch - Trigger batch analysis of pending feedback
router.post('/batch', async (req, res, next) => {
  try {
    const companyId = req.body?.companyId || 'demo-company';
    const limit = Number(req.body?.limit) || 10;
    const model = req.body?.model || undefined;

    if (!groqService.isConfigured()) {
      return res.status(503).json({
        error: 'GROQ_API_KEY is not configured in backend .env',
        message: 'Please add a valid GROQ_API_KEY to server/.env to enable live AI feedback analysis.'
      });
    }

    const result = await groqService.analyzePendingBatch({ companyId, limit, model });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// POST /api/analysis/preview - Live analysis preview for arbitrary feedback text
router.post('/preview', async (req, res, next) => {
  try {
    const { feedback, rating, source, customer_id, model } = req.body || {};
    if (!feedback || !String(feedback).trim()) {
      return res.status(400).json({ error: 'Feedback text is required.' });
    }

    if (!groqService.isConfigured()) {
      return res.status(503).json({
        error: 'GROQ_API_KEY is not configured in backend .env',
        message: 'Please add a valid GROQ_API_KEY to server/.env to enable live AI analysis.'
      });
    }

    const analysis = await groqService.analyzeFeedback({ feedback, rating, source, customer_id, model });
    res.json(analysis);
  } catch (err) {
    next(err);
  }
});

// POST /api/analysis/analyze-record/:id - Analyze a single record by ID
router.post('/analyze-record/:id', async (req, res, next) => {
  try {
    const recordId = req.params.id;
    const model = req.body?.model || undefined;
    const db = getDatabase();
    const record = db.prepare('SELECT * FROM feedback WHERE id = ? OR feedback_id = ?').get(recordId, recordId);

    if (!record) {
      return res.status(404).json({ error: `Feedback record ${recordId} not found.` });
    }

    if (!groqService.isConfigured()) {
      return res.status(503).json({
        error: 'GROQ_API_KEY is not configured in backend .env',
        message: 'Please add a valid GROQ_API_KEY to server/.env to enable live AI analysis.'
      });
    }

    const analysis = await groqService.analyzeFeedback({
      feedback: record.feedback,
      rating: record.rating,
      source: record.source,
      customer_id: record.customer_id,
      model
    });

    db.prepare(`
      UPDATE feedback SET
        sentiment = ?,
        topic = ?,
        urgency = ?,
        customer_problem = ?,
        feature_request = ?,
        summary = ?,
        suggested_action = ?,
        analysis_status = 'analyzed'
      WHERE id = ?
    `).run(
      analysis.sentiment,
      analysis.topic,
      analysis.urgency,
      analysis.customer_problem,
      analysis.feature_request,
      analysis.summary,
      analysis.suggested_action,
      record.id
    );

    res.json({
      id: record.id,
      feedback_id: record.feedback_id,
      status: 'analyzed',
      ...analysis
    });
  } catch (err) {
    next(err);
  }
});

export default router;

