import { Router } from 'express';
import multer from 'multer';
import { feedbackDbService } from '../services/feedbackDbService.js';
import { csvService } from '../services/csvService.js';
import { validateWorkspaceId } from '../middleware/security.js';
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
router.get('/', validateWorkspaceId, (req, res, next) => {
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

    validateWorkspaceId(req, res, () => {
      try {
        const companyId = req.sanitizedCompanyId || 'demo-company';
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

        const result = csvService.processCsv({ csvContent, companyId });

        if (!result.success && result.totalRows === 0) {
          return res.status(400).json(result);
        }

        return res.status(200).json(result);
      } catch (processErr) {
        next(processErr);
      }
    });
  });
});

/**
 * Server-side protection guard for destructive operations
 */
function checkDestructiveGuard(req, res, next) {
  const isConfirmed = 
    req.headers['x-confirm-destructive'] === 'true' || 
    req.body?.confirm === true || 
    req.query?.confirm === 'true';

  const enforceGuard = 
    config.nodeEnv === 'production' || 
    req.headers['x-enforce-destructive-guard'] === 'true';

  if (enforceGuard && !isConfirmed) {
    return res.status(403).json({
      error: 'Destructive operation denied',
      message: 'This operation modifies or deletes workspace records. Header "X-Confirm-Destructive: true" is required.'
    });
  }

  // In production, prevent clearing the primary demo workspace without admin authorization
  const companyId = req.body?.companyId || req.query?.companyId || 'demo-company';
  if (config.nodeEnv === 'production' && companyId === 'demo-company') {
    const adminKey = req.headers['x-admin-key'];
    const configuredAdminKey = process.env.ADMIN_API_KEY;
    if (!configuredAdminKey || adminKey !== configuredAdminKey) {
      return res.status(403).json({
        error: 'Protected demonstration workspace',
        message: 'The demo-company workspace is protected from modification in production mode.'
      });
    }
  }

  next();
}

// POST /api/feedback/seed - Seed realistic demo data (protected)
router.post('/seed', validateWorkspaceId, checkDestructiveGuard, (req, res, next) => {
  try {
    const companyId = req.sanitizedCompanyId || 'demo-company';
    const result = feedbackDbService.seedDemoData(companyId);
    res.json({ message: 'Demo feedback data seeded successfully', ...result });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/feedback/clear - Clear data (protected from accidental invocation)
router.delete('/clear', validateWorkspaceId, checkDestructiveGuard, (req, res, next) => {
  try {
    const companyId = req.sanitizedCompanyId || 'demo-company';
    const result = feedbackDbService.clearData(companyId);
    res.json({ message: 'Feedback data cleared successfully', ...result });
  } catch (err) {
    next(err);
  }
});

export default router;
