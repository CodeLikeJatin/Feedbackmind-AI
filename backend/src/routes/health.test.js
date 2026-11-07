import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../server.js';
import { getDatabase } from '../config/db.js';

describe('Server & Health Check API', () => {
  it('GET /api/health should return 200 with service information and database status', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status', 'ok');
    expect(res.body).toHaveProperty('service', 'FeedbackMind AI Backend');
    expect(res.body.aiEngine).toContain('Groq');
    expect(res.body.memoryProvider).toContain('Hindsight');
    expect(res.body.database).toBe('connected');
    expect(res.body).toHaveProperty('timestamp');
  });

  it('GET /api/unknown-endpoint should return 404', async () => {
    const res = await request(app).get('/api/unknown-endpoint');
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error', 'Endpoint not found');
  });

  it('Database schema initializes all required tables', () => {
    const db = getDatabase();
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
    const tableNames = tables.map(t => t.name);
    
    expect(tableNames).toContain('feedback');
    expect(tableNames).toContain('company_memory_banks');
    expect(tableNames).toContain('chat_history');
  });
});

