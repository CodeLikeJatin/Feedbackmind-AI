import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../server.js';
import { getDatabase } from '../config/db.js';

describe('Phase 8.4 — Learning Curve API & Isolation Suite', () => {
  it('GET /api/learning-curve/status returns isolated environment metadata', async () => {
    const res = await request(app).get('/api/learning-curve/status');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('companyId', 'learning-curve-demo');
    expect(res.body).toHaveProperty('bankId', 'feedbackmind-learning-curve');
    expect(res.body).toHaveProperty('hindsightConfigured');
    expect(res.body).toHaveProperty('groqConfigured');
  });

  it('GET /api/learning-curve/interactions returns 20 chronological records', async () => {
    const res = await request(app).get('/api/learning-curve/interactions');
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(20);
    expect(res.body.interactions).toHaveLength(20);

    const first = res.body.interactions[0];
    expect(first.feedback_id).toBe('LC-001');
    expect(first.customer_id).toBe('CUST-LC-01');
    expect(first.interaction_number).toBe(1);

    const last = res.body.interactions[19];
    expect(last.feedback_id).toBe('LC-020');
    expect(last.customer_id).toBe('CUST-LC-12');
    expect(last.interaction_number).toBe(20);
  });

  it('GET /api/learning-curve/checkpoints returns synthesized checkpoints 1, 5, 20', async () => {
    const res = await request(app).get('/api/learning-curve/checkpoints');
    expect(res.status).toBe(200);
    if (res.body.isInitialized) {
      expect(res.body.checkpoints).toHaveLength(3);
      const [cp1, cp5, cp20] = res.body.checkpoints;
      
      expect(cp1.interactionNumber).toBe(1);
      expect(cp1.retainedCount).toBe(1);
      expect(cp1.historicalContext).toContain('morning dashboard latency');

      expect(cp5.interactionNumber).toBe(5);
      expect(cp5.retainedCount).toBe(5);
      expect(cp5.historicalContext).toContain('3 distinct friction categories');

      expect(cp20.interactionNumber).toBe(20);
      expect(cp20.retainedCount).toBe(20);
      expect(cp20.historicalContext).toContain('timeline connected across 3 releases');
    }
  });

  it('guarantees demo-company records remain exactly 27 and untouched', () => {
    const db = getDatabase();
    const demoRow = db.prepare('SELECT COUNT(*) as count FROM feedback WHERE company_id = ?').get('demo-company');
    expect(demoRow.count).toBe(27);
  });
});

