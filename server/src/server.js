import express from 'express';
import cors from 'cors';
import { config } from './config/env.js';
import healthRouter from './routes/health.js';
import dashboardRouter from './routes/dashboard.js';
import feedbackRouter from './routes/feedback.js';
import analysisRouter from './routes/analysis.js';
import memoryRouter from './routes/memory.js';
import chatRouter from './routes/chat.js';
import trendsRouter from './routes/trends.js';
import demoRouter from './routes/demo.js';
import learningCurveRouter from './routes/learningCurve.js';
import { getDatabase, closeDatabase } from './config/db.js';
import { securityHeaders } from './middleware/security.js';
import { 
  generalRateLimiter, 
  aiRateLimiter, 
  memoryRateLimiter 
} from './middleware/rateLimiter.js';

const app = express();

// Security headers
app.use(securityHeaders);

// CORS configuration
const corsOptions = {
  origin: (origin, callback) => {
    // Allow non-browser requests or matching origins; in dev/test allow any origin
    if (!origin || config.allowedOrigins.includes(origin) || config.nodeEnv === 'development' || config.nodeEnv === 'test') {
      callback(null, true);
    } else {
      callback(new Error(`Not allowed by CORS: ${origin}`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'X-Confirm-Destructive',
    'X-Admin-Key',
    'X-Test-Rate-Limit',
    'X-Workspace-Id'
  ]
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Global rate limiting
app.use(generalRateLimiter);

// Initialize DB on startup
try {
  getDatabase();
  console.log('📦 Database initialized successfully.');
} catch (err) {
  console.error('❌ Failed to initialize database:', err);
}

// Routes
app.use('/api/health', healthRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/feedback', feedbackRouter);
app.use('/api/analysis', aiRateLimiter, analysisRouter);
app.use('/api/memory', memoryRateLimiter, memoryRouter);
app.use('/api/chat', aiRateLimiter, chatRouter);
app.use('/api/trends', aiRateLimiter, trendsRouter);
app.use('/api/demo', demoRouter);
app.use('/api/learning-curve', learningCurveRouter);

// 404 handler
app.use((req, res, next) => {
  res.status(404).json({ error: 'Endpoint not found', path: req.originalUrl });
});

// Central error handler
app.use((err, req, res, next) => {
  if (err.message && err.message.startsWith('Not allowed by CORS')) {
    return res.status(403).json({ error: 'CORS Forbidden', message: err.message });
  }
  console.error('Unhandled server error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: config.nodeEnv === 'development' ? err.message : 'An unexpected error occurred'
  });
});

let server;
if (process.env.NODE_ENV !== 'test') {
  server = app.listen(config.port, () => {
    console.log(`🚀 FeedbackMind AI Server running on http://localhost:${config.port}`);
    console.log(`🤖 AI Engine: Groq (${config.groq.model})`);
    console.log(`🧠 Memory Bank: Hindsight (${config.hindsight.bankId})`);
  });

  const gracefulShutdown = (signal) => {
    console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);
    if (server) {
      server.close(() => {
        console.log('HTTP server closed.');
        closeDatabase();
        process.exit(0);
      });
      setTimeout(() => {
        console.error('Forced shutdown due to timeout.');
        process.exit(1);
      }, 5000).unref();
    } else {
      closeDatabase();
      process.exit(0);
    }
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
}

export default app;
