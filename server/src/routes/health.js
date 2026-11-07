import { Router } from 'express';
import { config } from '../config/env.js';
import { getDatabase } from '../config/db.js';

const router = Router();

router.get('/', (req, res) => {
  let dbStatus = 'connected';
  try {
    const db = getDatabase();
    db.prepare('SELECT 1').get();
  } catch (err) {
    dbStatus = `error: ${err.message}`;
  }

  // Base production response: clean, non-leaking status
  const healthResponse = {
    status: dbStatus === 'connected' ? 'ok' : 'degraded',
    service: 'FeedbackMind AI Backend',
    version: '1.0.0',
    database: dbStatus,
    timestamp: new Date().toISOString()
  };

  // Include detailed configuration telemetry in development or test environments only
  if (config.nodeEnv !== 'production') {
    healthResponse.aiEngine = `Groq (${config.groq.model})`;
    healthResponse.memoryProvider = `Hindsight Cloud (${config.hindsight.bankId})`;
    healthResponse.groqConfigured = Boolean(config.groq.apiKey);
    healthResponse.hindsightConfigured = Boolean(config.hindsight.apiKey);
  }

  res.json(healthResponse);
});

export default router;
