import { Router } from 'express';
import { sessionService } from '../services/sessionService.js';

const router = Router();

// POST /api/session/init - Initialize or refresh demo session
router.post('/init', (req, res, next) => {
  try {
    const session = sessionService.createSession();
    res.json({
      success: true,
      sessionId: session.sessionId,
      sessionToken: session.sessionToken,
      workspaceId: session.workspaceId,
      expiresAt: session.expiresAt
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/session/current - Get current session status
router.get('/current', (req, res, next) => {
  try {
    if (req.sessionExpired) {
      return res.status(401).json({ active: false, expired: true, message: 'Session expired' });
    }
    if (req.demoSession) {
      return res.json({
        active: true,
        sessionId: req.demoSession.sessionId,
        workspaceId: req.demoSession.workspaceId,
        expiresAt: req.demoSession.expiresAt
      });
    }
    res.json({ active: false });
  } catch (err) {
    next(err);
  }
});

export default router;

