import { DatabaseSync } from 'node:sqlite';
import { config } from './env.js';
import path from 'path';
import fs from 'fs';

let dbInstance = null;

export function getDatabase(customPath = null) {
  if (dbInstance && !customPath) {
    return dbInstance;
  }

  const dbPath = customPath || config.database.path;

  // Ensure directory exists if not in-memory
  if (dbPath !== ':memory:') {
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  const db = new DatabaseSync(dbPath);

  // Initialize schema
  initSchema(db);

  if (!customPath) {
    dbInstance = db;
  }
  return db;
}

export function closeDatabase() {
  if (dbInstance) {
    try {
      dbInstance.close();
      console.log('🔒 Database connection closed.');
    } catch (e) {
      // ignore
    }
    dbInstance = null;
  }
}

function initSchema(db) {
  // Enable WAL mode and busy timeout for concurrent access
  try {
    db.exec(`
      PRAGMA journal_mode = WAL;
      PRAGMA busy_timeout = 5000;
    `);
  } catch (e) {
    // ignore in-memory or environments where pragmas differ
  }

  // Feedback table
  db.exec(`
    CREATE TABLE IF NOT EXISTS feedback (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      feedback_id TEXT UNIQUE NOT NULL,
      customer_id TEXT,
      date TEXT,
      source TEXT,
      feedback TEXT NOT NULL,
      rating REAL,
      company_id TEXT DEFAULT 'demo-company',
      analysis_status TEXT DEFAULT 'pending',
      sentiment TEXT,
      topic TEXT,
      urgency TEXT,
      customer_problem TEXT,
      feature_request TEXT,
      summary TEXT,
      suggested_action TEXT,
      retained_in_hindsight INTEGER DEFAULT 0,
      hindsight_memory_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_feedback_company ON feedback(company_id);
    CREATE INDEX IF NOT EXISTS idx_feedback_date ON feedback(date);
    CREATE INDEX IF NOT EXISTS idx_feedback_sentiment ON feedback(sentiment);
    CREATE INDEX IF NOT EXISTS idx_feedback_topic ON feedback(topic);

    CREATE TABLE IF NOT EXISTS company_memory_banks (
      company_id TEXT PRIMARY KEY,
      bank_id TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS chat_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id TEXT DEFAULT 'demo-company',
      session_id TEXT,
      question TEXT NOT NULL,
      memory_enabled INTEGER NOT NULL,
      answer TEXT NOT NULL,
      evidence_json TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS learning_curve_checkpoints (
      checkpoint_id TEXT PRIMARY KEY,
      interaction_number INTEGER NOT NULL,
      question TEXT NOT NULL,
      answer TEXT NOT NULL,
      retained_count INTEGER NOT NULL,
      recalled_count INTEGER NOT NULL,
      recalled_memories_json TEXT,
      evidence_json TEXT,
      historical_context TEXT,
      remaining_uncertainty TEXT,
      model_used TEXT,
      latency_ms INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS demo_sessions (
      session_id TEXT PRIMARY KEY,
      session_token TEXT UNIQUE NOT NULL,
      workspace_id TEXT UNIQUE NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_active_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      expires_at DATETIME NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_demo_sessions_token ON demo_sessions(session_token);
    CREATE INDEX IF NOT EXISTS idx_demo_sessions_expires ON demo_sessions(expires_at);
  `);
}

