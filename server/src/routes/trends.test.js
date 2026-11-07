import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../server.js';
import { trendService } from '../services/trendService.js';
import { hindsightService } from '../services/hindsightService.js';
import { getDatabase } from '../config/db.js';
import { ensureDemoCompanyFixture } from '../utils/demoCompanyFixture.js';

describe('Phase 6 — Trend Detection and Product Recommendations Test Suite', () => {
  const TEST_COMPANY = 'trends-test-org';

  beforeAll(() => {
    ensureDemoCompanyFixture();
  });

  function insertTestRecords(records) {
    const db = getDatabase();
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO feedback (
        feedback_id, customer_id, date, source, feedback, rating, 
        topic, sentiment, urgency, customer_problem, feature_request, company_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const r of records) {
      stmt.run(
        r.feedback_id,
        r.customer_id || 'CUST-001',
        r.date || '2026-10-01',
        r.source || 'Zendesk',
        r.feedback || 'Test feedback',
        r.rating !== undefined ? r.rating : 3,
        r.topic || 'general',
        r.sentiment || 'neutral',
        r.urgency || 'low',
        r.customer_problem || null,
        r.feature_request || null,
        r.company_id || TEST_COMPANY
      );
    }
  }

  beforeEach(() => {
    const db = getDatabase();
    db.prepare(`
      DELETE FROM feedback 
      WHERE company_id = ? 
         OR feedback_id LIKE 'T-%' 
         OR feedback_id LIKE 'F-%' 
         OR feedback_id LIKE 'HIST-%' 
         OR feedback_id LIKE 'NEW-%' 
         OR feedback_id LIKE 'C-%' 
         OR feedback_id LIKE 'M-%' 
         OR feedback_id LIKE 'REC-TEST-%'
    `).run(TEST_COMPANY);
  });

  // Test 1: Insufficient data handling (< 3 records)
  it('handles insufficient feedback data by returning hasSufficientData: false and an informative message', async () => {
    insertTestRecords([
      { feedback_id: 'T-1', customer_id: 'C-1', date: '2026-10-01', feedback: 'Great app!', rating: 5, sentiment: 'positive' }
    ]);

    const res = await request(app)
      .get(`/api/trends/overview?companyId=${TEST_COMPANY}&memoryEnabled=false`);

    expect(res.status).toBe(200);
    expect(res.body.hasSufficientData).toBe(false);
    expect(res.body.totalFeedback).toBe(1);
    expect(res.body.message).toContain('Insufficient customer feedback data');
    expect(res.body.sentimentTrends).toEqual([]);
    expect(res.body.emergingIssues).toEqual([]);

    const recRes = await request(app)
      .get(`/api/trends/recommendations?companyId=${TEST_COMPANY}&memoryEnabled=false`);

    expect(recRes.status).toBe(200);
    expect(recRes.body.hasSufficientData).toBe(false);
    expect(recRes.body.recommendations).toEqual([]);
  });

  // Test 2: Trend detection against multi-month feedback
  it('detects monthly sentiment shifts, average star ratings, and trajectory across time periods', async () => {
    // Month 1: 2026-08 (Negative baseline, 1.5 avg rating)
    // Month 2: 2026-09 (Rebounding positive, 5.0 avg rating)
    insertTestRecords([
      { feedback_id: 'T-AUG-1', customer_id: 'CUST-1', date: '2026-08-10', feedback: 'System is crashing', rating: 1, topic: 'performance', sentiment: 'negative', urgency: 'high' },
      { feedback_id: 'T-AUG-2', customer_id: 'CUST-2', date: '2026-08-15', feedback: 'Slow loading export', rating: 2, topic: 'export', sentiment: 'negative', urgency: 'high' },
      { feedback_id: 'T-SEP-1', customer_id: 'CUST-3', date: '2026-09-12', feedback: 'Huge speedup in v2.4!', rating: 5, topic: 'performance', sentiment: 'positive', urgency: 'low' },
      { feedback_id: 'T-SEP-2', customer_id: 'CUST-4', date: '2026-09-20', feedback: 'Love the fast charts', rating: 5, topic: 'performance', sentiment: 'positive', urgency: 'low' }
    ]);

    const res = await request(app)
      .get(`/api/trends/overview?companyId=${TEST_COMPANY}&memoryEnabled=false`);

    expect(res.status).toBe(200);
    expect(res.body.hasSufficientData).toBe(true);
    expect(res.body.totalFeedback).toBe(4);
    expect(res.body.timePeriodCount).toBe(2);
    expect(res.body.reportingPeriods).toEqual(['2026-08', '2026-09']);
    expect(res.body.sentimentTrajectory).toBe('improving');

    const aug = res.body.sentimentTrends.find(t => t.period === '2026-08');
    const sep = res.body.sentimentTrends.find(t => t.period === '2026-09');

    expect(aug.negative).toBe(2);
    expect(aug.positive).toBe(0);
    expect(aug.avgRating).toBe(1.5);

    expect(sep.positive).toBe(2);
    expect(sep.negative).toBe(0);
    expect(sep.avgRating).toBe(5.0);
  });

  // Test 3: Feature request frequency and ranking calculations
  it('aggregates repeated feature requests with accurate counts, percentages, and feedback IDs', async () => {
    insertTestRecords([
      { feedback_id: 'F-1', customer_id: 'C-1', date: '2026-10-01', feedback: 'Need dark mode', rating: 4, feature_request: 'Dark Mode UI Theme' },
      { feedback_id: 'F-2', customer_id: 'C-2', date: '2026-10-02', feedback: 'Please add dark mode', rating: 4, feature_request: 'Dark Mode UI Theme' },
      { feedback_id: 'F-3', customer_id: 'C-3', date: '2026-10-03', feedback: 'Dark mode would be great', rating: 5, feature_request: 'Dark Mode UI Theme' },
      { feedback_id: 'F-4', customer_id: 'C-4', date: '2026-10-04', feedback: 'Need team permissions', rating: 3, feature_request: 'Role-Based Team Permissions (RBAC)' }
    ]);

    const res = await request(app)
      .get(`/api/trends/overview?companyId=${TEST_COMPANY}&memoryEnabled=false`);

    expect(res.status).toBe(200);
    expect(res.body.hasSufficientData).toBe(true);
    expect(res.body.featureRequests.length).toBeGreaterThanOrEqual(2);

    const topFeature = res.body.featureRequests[0];
    expect(topFeature.feature).toContain('Dark Mode');
    expect(topFeature.count).toBe(3);
    expect(topFeature.feedbackIds).toEqual(['F-1', 'F-2', 'F-3']);
    expect(topFeature.customerIds).toEqual(['C-1', 'C-2', 'C-3']);
    expect(topFeature.percentageOfAll).toBe(75.0);
  });

  // Test 4: Emerging issues vs historical baseline detection
  it('distinguishes newly emerging complaints from historical problems based on time windows', async () => {
    insertTestRecords([
      // Historical baseline: 2026-08 (export 504 timeouts)
      { feedback_id: 'HIST-1', customer_id: 'CUST-A', date: '2026-08-01', feedback: 'Export 504 timeout', rating: 1, topic: 'export', sentiment: 'negative', urgency: 'high', customer_problem: 'CSV export 504 timeouts on large datasets' },
      { feedback_id: 'HIST-2', customer_id: 'CUST-B', date: '2026-08-15', feedback: 'Export 504 timeout', rating: 1, topic: 'export', sentiment: 'negative', urgency: 'high', customer_problem: 'CSV export 504 timeouts on large datasets' },
      // Recent month: 2026-10 (new OAuth 500 error appears)
      { feedback_id: 'NEW-1', customer_id: 'CUST-C', date: '2026-10-05', feedback: 'OAuth 500 error on login', rating: 1, topic: 'login', sentiment: 'negative', urgency: 'high', customer_problem: 'Google OAuth 500 Internal Server Error' },
      { feedback_id: 'NEW-2', customer_id: 'CUST-D', date: '2026-10-08', feedback: 'OAuth 500 error on login', rating: 1, topic: 'login', sentiment: 'negative', urgency: 'high', customer_problem: 'Google OAuth 500 Internal Server Error' }
    ]);

    const res = await request(app)
      .get(`/api/trends/overview?companyId=${TEST_COMPANY}&memoryEnabled=false`);

    expect(res.status).toBe(200);
    const emergingOAuth = res.body.emergingIssues.find(e => e.problem.includes('OAuth'));
    expect(emergingOAuth).toBeDefined();
    expect(emergingOAuth.trendStatus).toBe('newly_emerging');
    expect(emergingOAuth.recentCount).toBe(2);
    expect(emergingOAuth.historicalCount).toBe(0);
    expect(emergingOAuth.feedbackIds).toEqual(['NEW-1', 'NEW-2']);

    const resolvedExport = res.body.historicalResolved.find(h => h.problem.includes('CSV export'));
    expect(resolvedExport).toBeDefined();
    expect(resolvedExport.trendStatus).toBe('diminished_or_resolved');
    expect(resolvedExport.historicalCount).toBe(2);
    expect(resolvedExport.recentCount).toBe(0);
  });

  // Test 5: Categorical clusters detection
  it('correctly aggregates categorical clusters across authentication, performance, export, and integrations', async () => {
    insertTestRecords([
      { feedback_id: 'C-1', customer_id: 'U-1', date: '2026-10-01', feedback: 'Password reset loop', rating: 1, topic: 'login', sentiment: 'negative', urgency: 'high', customer_problem: 'Reset loop' },
      { feedback_id: 'C-2', customer_id: 'U-2', date: '2026-10-02', feedback: 'Morning dashboard slow', rating: 2, topic: 'performance', sentiment: 'negative', urgency: 'medium', customer_problem: 'Dashboard latency' },
      { feedback_id: 'C-3', customer_id: 'U-3', date: '2026-10-03', feedback: 'CSV export times out', rating: 2, topic: 'Export & Reporting', sentiment: 'negative', urgency: 'high', customer_problem: 'Export timeout' },
      { feedback_id: 'C-4', customer_id: 'U-4', date: '2026-10-04', feedback: 'Salesforce sync missing fields', rating: 1, topic: 'integrations', sentiment: 'negative', urgency: 'high', customer_problem: 'Sync drop' }
    ]);

    const res = await request(app)
      .get(`/api/trends/overview?companyId=${TEST_COMPANY}&memoryEnabled=false`);

    expect(res.status).toBe(200);
    const { categoryBreakdown } = res.body;

    expect(categoryBreakdown.login_auth.count).toBe(1);
    expect(categoryBreakdown.login_auth.highUrgencyCount).toBe(1);
    expect(categoryBreakdown.login_auth.feedbackIds).toContain('C-1');

    expect(categoryBreakdown.performance.count).toBe(1);
    expect(categoryBreakdown.performance.feedbackIds).toContain('C-2');

    expect(categoryBreakdown.export_reporting.count).toBe(1);
    expect(categoryBreakdown.export_reporting.feedbackIds).toContain('C-3');

    expect(categoryBreakdown.integrations.count).toBe(1);
    expect(categoryBreakdown.integrations.feedbackIds).toContain('C-4');
  });

  // Test 6: Memory ON vs Memory OFF behavior and duplicate prevention
  it('includes Hindsight synthesis when Memory is ON without inflating SQLite feedback counts', async () => {
    insertTestRecords([
      { feedback_id: 'M-1', customer_id: 'U-1', date: '2026-09-01', feedback: 'Slow export', rating: 2, topic: 'export', sentiment: 'negative', urgency: 'high' },
      { feedback_id: 'M-2', customer_id: 'U-2', date: '2026-09-02', feedback: 'Slow export', rating: 2, topic: 'export', sentiment: 'negative', urgency: 'high' },
      { feedback_id: 'M-3', customer_id: 'U-3', date: '2026-10-01', feedback: 'Faster export now', rating: 4, topic: 'export', sentiment: 'positive', urgency: 'low' }
    ]);

    // Mock hindsight recall & reflect
    const recallSpy = vi.spyOn(hindsightService, 'recallMemories').mockResolvedValue({
      results: [{ id: 'mem-1', text: 'Historical export timeout reported by customer.' }]
    });
    const reflectSpy = vi.spyOn(hindsightService, 'reflectOnMemories').mockResolvedValue({
      text: 'Longitudinal analysis reveals significant improvements in export speed post-update.'
    });

    try {
      // Memory OFF
      const offRes = await request(app)
        .get(`/api/trends/overview?companyId=${TEST_COMPANY}&memoryEnabled=false`);
      expect(offRes.body.memoryEnabled).toBe(false);
      expect(offRes.body.historicalContext).toBeNull();
      expect(offRes.body.totalFeedback).toBe(3); // strictly SQLite count

      // Memory ON
      const onRes = await request(app)
        .get(`/api/trends/overview?companyId=${TEST_COMPANY}&memoryEnabled=true`);
      expect(onRes.body.memoryEnabled).toBe(true);
      expect(onRes.body.historicalContext).toBeDefined();
      expect(onRes.body.historicalContext.reflectionText).toContain('Longitudinal analysis reveals');
      expect(onRes.body.totalFeedback).toBe(3); // Duplicate memories NEVER inflate SQLite count!
    } finally {
      recallSpy.mockRestore();
      reflectSpy.mockRestore();
    }
  });

  // Test 7: Product Recommendations Engine Output & Required Fields
  it('generates prioritized recommendations containing all 10 required fields and verifiable evidence IDs', async () => {
    insertTestRecords([
      { feedback_id: 'REC-TEST-1', customer_id: 'U-1', date: '2026-10-01', feedback: 'Our team cannot access the platform, completely blocking work', rating: 1, topic: 'login', sentiment: 'negative', urgency: 'high', customer_problem: 'Access blocked' },
      { feedback_id: 'REC-TEST-2', customer_id: 'U-2', date: '2026-10-02', feedback: 'Dashboard takes 15 seconds to load in the morning', rating: 2, topic: 'performance', sentiment: 'negative', urgency: 'medium', customer_problem: 'Slow dashboard' },
      { feedback_id: 'REC-TEST-3', customer_id: 'U-3', date: '2026-10-03', feedback: 'Export 504 gateway timeout on large dataset', rating: 1, topic: 'export', sentiment: 'negative', urgency: 'high', customer_problem: 'Export timeout' }
    ]);

    const res = await request(app)
      .get(`/api/trends/recommendations?companyId=${TEST_COMPANY}&memoryEnabled=false`);

    expect(res.status).toBe(200);
    expect(res.body.hasSufficientData).toBe(true);
    expect(res.body.recommendations.length).toBeGreaterThanOrEqual(2);

    // Check first recommendation (Critical Authentication Outage)
    const rec1 = res.body.recommendations[0];
    expect(rec1).toHaveProperty('id');
    expect(rec1).toHaveProperty('title');
    expect(rec1).toHaveProperty('problem');
    expect(rec1).toHaveProperty('whyItMatters');
    expect(rec1).toHaveProperty('supportingFeedbackIds');
    expect(rec1).toHaveProperty('affectedCount');
    expect(rec1).toHaveProperty('customerRatings');
    expect(rec1).toHaveProperty('urgency');
    expect(rec1).toHaveProperty('expectedImpact');
    expect(rec1).toHaveProperty('priority');
    expect(rec1).toHaveProperty('recommendedNextAction');
    expect(rec1).toHaveProperty('category');

    expect(rec1.priority).toBe('Critical');
    expect(rec1.supportingFeedbackIds).toContain('REC-TEST-1');
    expect(rec1.urgency).toBe('high');
    expect(rec1.category).toBe('Authentication');

    // Confirm prioritization order: Critical before High, High before Medium
    const priorities = res.body.recommendations.map(r => r.priority);
    expect(priorities[0]).toBe('Critical');
  });

  // Test 8: Live demo company records evaluation
  it('runs against actual demo-company dataset and returns valid trend indicators and prioritized recommendations', async () => {
    ensureDemoCompanyFixture();
    const res = await request(app)
      .get('/api/trends/overview?companyId=demo-company&memoryEnabled=false');

    expect(res.status).toBe(200);
    expect(res.body.hasSufficientData).toBe(true);
    expect(res.body.totalFeedback).toBeGreaterThanOrEqual(26);
    expect(res.body.reportingPeriods).toContain('2026-10');
    expect(res.body.frequentProblems.length).toBeGreaterThan(0);
    expect(res.body.featureRequests.length).toBeGreaterThan(0);
    expect(res.body.positiveTrends.length).toBeGreaterThan(0);

    const recRes = await request(app)
      .get('/api/trends/recommendations?companyId=demo-company&memoryEnabled=false');

    expect(recRes.status).toBe(200);
    expect(recRes.body.recommendations.length).toBe(5);
    const titles = recRes.body.recommendations.map(r => r.title);
    expect(titles.some(t => t.includes('Authentication') || t.includes('Login'))).toBe(true);
    expect(titles.some(t => t.includes('Dashboard') || t.includes('Performance'))).toBe(true);
    expect(titles.some(t => t.includes('Export'))).toBe(true);
  });
});
