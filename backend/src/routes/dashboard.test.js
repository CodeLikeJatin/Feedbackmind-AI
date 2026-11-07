import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../server.js';
import { feedbackDbService } from '../services/feedbackDbService.js';

describe('Dashboard & Feedback APIs', () => {
  beforeEach(() => {
    // Reset and seed demo data for clean test state
    feedbackDbService.clearData('test-company');
    feedbackDbService.seedDemoData('test-company');
  });

  it('GET /api/dashboard/stats should return computed metrics', async () => {
    const res = await request(app).get('/api/dashboard/stats?companyId=test-company');
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(20);
    expect(res.body.sentiment).toHaveProperty('positive');
    expect(res.body.sentiment).toHaveProperty('negative');
    expect(res.body.sentiment).toHaveProperty('neutral');
    expect(res.body.sentiment.positive + res.body.sentiment.negative + res.body.sentiment.neutral).toBe(20);
    expect(res.body.monthlyTrends.length).toBeGreaterThanOrEqual(4);
    expect(res.body.topComplaints.length).toBeGreaterThan(0);
    expect(res.body.topFeatureRequests.length).toBeGreaterThan(0);
    expect(res.body.isDemoData).toBe(true);
  });

  it('GET /api/feedback should support filtering by sentiment and search', async () => {
    const resAll = await request(app).get('/api/feedback?companyId=test-company');
    expect(resAll.status).toBe(200);
    expect(resAll.body.items.length).toBe(20);
    expect(resAll.body.total).toBe(20);

    const resNegative = await request(app).get('/api/feedback?companyId=test-company&sentiment=negative');
    expect(resNegative.status).toBe(200);
    expect(resNegative.body.items.every(i => i.sentiment === 'negative')).toBe(true);

    const resSearch = await request(app).get('/api/feedback?companyId=test-company&search=Safari');
    expect(resSearch.status).toBe(200);
    expect(resSearch.body.items.length).toBeGreaterThan(0);
    expect(resSearch.body.items[0].feedback).toContain('Safari');
  });

  it('DELETE /api/feedback/clear should clear company data and return empty state', async () => {
    const deleteRes = await request(app).delete('/api/feedback/clear?companyId=test-company');
    expect(deleteRes.status).toBe(200);
    expect(deleteRes.body.success).toBe(true);

    const statsRes = await request(app).get('/api/dashboard/stats?companyId=test-company&autoseed=false');
    expect(statsRes.status).toBe(200);
    expect(statsRes.body.total).toBe(0);
  });
});

