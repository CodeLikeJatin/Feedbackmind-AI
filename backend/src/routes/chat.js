import { Router } from 'express';
import { chatService } from '../services/chatService.js';
import { groqService } from '../services/groqService.js';
import { requireChatOwnership } from '../middleware/sessionMiddleware.js';

const router = Router();

// POST /api/chat/ask - Ask FeedbackMind AI
router.post('/ask', async (req, res, next) => {
  try {
    const { question, companyId, memoryEnabled, sessionId, history, model } = req.body || {};

    if (!question || !String(question).trim()) {
      return res.status(400).json({ error: 'Question is required.' });
    }

    if (req.sessionExpired) {
      return res.status(401).json({
        error: 'Session Expired',
        message: 'Your demonstration session has expired. Please refresh to start a new session.'
      });
    }

    let activeSessionId = sessionId || 'default-session';
    if (req.demoSession) {
      if (sessionId && req.demoSession.sessionId !== sessionId) {
        return res.status(403).json({
          error: 'Access Denied',
          message: 'You cannot submit queries into a session conversation you do not own.'
        });
      }
      activeSessionId = req.demoSession.sessionId;
    }

    if (!groqService.isConfigured()) {
      return res.status(503).json({
        error: 'GROQ_API_KEY is not configured in backend .env',
        message: 'Please add your GROQ_API_KEY to backend/.env to enable Ask FeedbackMind AI.'
      });
    }

    const result = await chatService.ask({
      question,
      companyId: req.sanitizedCompanyId || 'demo-company',
      memoryEnabled: memoryEnabled !== false, // defaults to true
      sessionId: activeSessionId,
      history: Array.isArray(history) ? history : [],
      model
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
});

// GET /api/chat/history - Retrieve stored chat history (requires ownership)
router.get('/history', requireChatOwnership, (req, res, next) => {
  try {
    const companyId = req.sanitizedCompanyId || 'demo-company';
    const sessionId = req.query?.sessionId || 'default-session';
    const history = chatService.getHistory(companyId, sessionId);
    res.json({ history });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/chat/history - Clear chat history (requires specific sessionId & ownership)
router.delete('/history', requireChatOwnership, (req, res, next) => {
  try {
    const companyId = req.sanitizedCompanyId || 'demo-company';
    const sessionId = req.query?.sessionId || req.body?.sessionId || null;
    if (!sessionId || !String(sessionId).trim()) {
      return res.status(400).json({ error: 'sessionId is required to clear chat history' });
    }
    const result = chatService.clearHistory(companyId, sessionId);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;

