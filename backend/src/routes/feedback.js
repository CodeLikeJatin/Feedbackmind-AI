import { Router } from 'express';
import multer from 'multer';
import { feedbackDbService } from '../services/feedbackDbService.js';
import { csvService } from '../services/csvService.js';
import { sessionService } from '../services/sessionService.js';
import { enforceDemoWorkspace, checkDestructiveGuard } from '../middleware/security.js';
import { uploadRateLimiter } from '../middleware/rateLimiter.js';
import { config } from '../config/env.js';

const router = Router();

// Configure multer memory storage with strict 10MB limit and CSV filter
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const isCsvName = file.originalname.toLowerCase().endsWith('.csv');
    const isCsvMime = file.mimetype.includes('csv') || file.mimetype.includes('text') || file.mimetype.includes('excel');
    if (isCsvName || isCsvMime) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only CSV files (.csv) are allowed.'));
    }
  }
});

// GET /api/feedback - List with query filters and workspace validation
router.get('/', enforceDemoWorkspace, (req, res, next) => {
  try {
    const { search, topic, sentiment, urgency, source, limit, offset } = req.query;
    const companyId = req.sanitizedCompanyId || 'demo-company';
    const result = feedbackDbService.getFeedbackList({
      search,
      topic,
      sentiment,
      urgency,
      source,
      limit,
      offset,
      companyId
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// POST /api/feedback/upload - Real CSV upload with upload rate limiting and workspace validation
router.post('/upload', uploadRateLimiter, (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'File size exceeds 10MB limit.' });
      }
      return res.status(400).json({ error: err.message });
    }

    enforceDemoWorkspace(req, res, () => {
      try {
        const requestedCompanyId = req.sanitizedCompanyId || 'demo-company';
        let targetCompanyId = requestedCompanyId;
        let sessionCreated = null;

        const isAdmin = req.headers['x-admin-key'] && req.headers['x-admin-key'] === process.env.ADMIN_API_KEY;
        const isTestCompany = process.env.NODE_ENV === 'test' && (
          requestedCompanyId.startsWith('csv-test-') ||
          requestedCompanyId.startsWith('test-') ||
          requestedCompanyId.includes('-test-')
        );

        // In public demonstration mode: public uploads must NEVER modify the shared 27-record demo-company dataset.
        // Instead, route public uploads into the caller's isolated session workspace.
        if (!isAdmin && !isTestCompany) {
          if (requestedCompanyId === 'demo-company' || !requestedCompanyId) {
            if (req.demoSession) {
              targetCompanyId = req.demoSession.workspaceId;
            } else {
              sessionCreated = sessionService.createSession();
              targetCompanyId = sessionCreated.workspaceId;
              req.demoSession = sessionCreated;
              res.setHeader('X-Session-Token', sessionCreated.sessionToken);
              res.setHeader('X-Session-ID', sessionCreated.sessionId);
              res.setHeader('X-Workspace-ID', sessionCreated.workspaceId);
            }
          }
        }

        let csvContent = '';

        if (req.file) {
          csvContent = req.file.buffer.toString('utf-8');
        } else if (req.body?.csvContent) {
          csvContent = req.body.csvContent;
        } else {
          return res.status(400).json({
            error: 'No CSV file or csvContent provided in request.'
          });
        }

        const result = csvService.processCsv({ csvContent, companyId: targetCompanyId });

        if (!result.success && result.totalRows === 0) {
          return res.status(400).json(result);
        }

        const responsePayload = {
          ...result,
          workspaceId: targetCompanyId,
          isIsolatedSession: targetCompanyId.startsWith('demo-session-')
        };
        if (sessionCreated) {
          responsePayload.session = {
            sessionId: sessionCreated.sessionId,
            sessionToken: sessionCreated.sessionToken,
            workspaceId: sessionCreated.workspaceId,
            expiresAt: sessionCreated.expiresAt
          };
        }

        return res.status(200).json(responsePayload);
      } catch (processErr) {
        next(processErr);
      }
    });
  });
});

// POST /api/feedback/seed - Seed realistic demo data (protected)
router.post('/seed', enforceDemoWorkspace, checkDestructiveGuard, (req, res, next) => {
  try {
    const companyId = req.sanitizedCompanyId || 'demo-company';
    const result = feedbackDbService.seedDemoData(companyId);
    res.json({ message: 'Demo feedback data seeded successfully', ...result });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/feedback/clear - Clear data (protected from accidental invocation)
router.delete('/clear', enforceDemoWorkspace, checkDestructiveGuard, (req, res, next) => {
  try {
    const companyId = req.sanitizedCompanyId || 'demo-company';
    const result = feedbackDbService.clearData(companyId);
    res.json({ message: 'Feedback data cleared successfully', ...result });
  } catch (err) {
    next(err);
  }
});

export default router;
