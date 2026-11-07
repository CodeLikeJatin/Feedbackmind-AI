import { Router } from 'express';
import { chatService } from '../services/chatService.js';
import { groqService } from '../services/groqService.js';

const router = Router();

// POST /api/chat/ask - Ask FeedbackMind AI
router.post('/ask', async (req, res, next) => {
  try {
    const { question, companyId, memoryEnabled, sessionId, history, model } = req.body || {};

    if (!question || !String(question).trim()) {
      return res.status(400).json({ error: 'Question is required.' });
    }

    if (!groqService.isConfigured()) {
      return res.status(503).json({
        error: 'GROQ_API_KEY is not configured in backend .env',
        message: 'Please add your GROQ_API_KEY to server/.env to enable Ask FeedbackMind AI.'
      });
    }

    const result = await chatService.ask({
      question,
      companyId: companyId || 'demo-company',
      memoryEnabled: memoryEnabled !== false, // defaults to true
      sessionId: sessionId || 'default-session',
      history: Array.isArray(history) ? history : [],
      model
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
});

// GET /api/chat/history - Retrieve stored chat history
router.get('/history', (req, res, next) => {
  try {
    const companyId = req.query?.companyId || 'demo-company';
    const sessionId = req.query?.sessionId || 'default-session';
    const history = chatService.getHistory(companyId, sessionId);
    res.json({ history });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/chat/history - Clear chat history
router.delete('/history', (req, res, next) => {
  try {
    const companyId = req.query?.companyId || req.body?.companyId || 'demo-company';
    const sessionId = req.query?.sessionId || req.body?.sessionId || null;
    const result = chatService.clearHistory(companyId, sessionId);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;

