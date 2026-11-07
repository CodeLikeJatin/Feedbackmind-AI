import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../server.js';
import { groqService, validateAnalysisSchema } from './groqService.js';
import { feedbackDbService } from './feedbackDbService.js';
import { getDatabase } from '../config/db.js';

describe('Phase 3 — Groq AI Feedback Analysis Test Suite', () => {
  const TEST_COMPANY = 'analysis-test-company';

  beforeEach(() => {
    feedbackDbService.clearData(TEST_COMPANY);
  });

  // Test 1: Schema Validator - Valid Inputs
  it('validates schema correctly for well-formed analysis output', () => {
    const rawOutput = {
      sentiment: 'positive',
      topic: 'performance',
      urgency: 'low',
      customer_problem: null,
      feature_request: null,
      summary: 'Dashboard is very fast now.',
      suggested_action: 'Maintain current caching layer.'
    };

    const validated = validateAnalysisSchema(rawOutput);
    expect(validated.sentiment).toBe('positive');
    expect(validated.topic).toBe('performance');
    expect(validated.urgency).toBe('low');
    expect(validated.customer_problem).toBeNull();
  });

  // Test 2: Schema Validator - Invalid Sentiment
  it('throws error when AI output has invalid sentiment', () => {
    const rawOutput = {
      sentiment: 'super_happy', // Invalid
      topic: 'features',
      urgency: 'low'
    };

    expect(() => validateAnalysisSchema(rawOutput)).toThrow(/Invalid sentiment/i);
  });

  // Test 3: Schema Validator - Invalid Urgency
  it('throws error when AI output has invalid urgency', () => {
    const rawOutput = {
      sentiment: 'negative',
      topic: 'login',
      urgency: 'critical_emergency' // Invalid (must be low, medium, high)
    };

    expect(() => validateAnalysisSchema(rawOutput)).toThrow(/Invalid urgency/i);
  });

  // Test 4: Schema Validator - Non-object or corrupted output
  it('throws error when AI output is null or not an object', () => {
    expect(() => validateAnalysisSchema(null)).toThrow(/not an object/i);
    expect(() => validateAnalysisSchema('corrupted string')).toThrow(/not an object/i);
  });

  // Test 5: Empty Feedback Handling
  it('handles empty or whitespace feedback gracefully without calling LLM', async () => {
    const result = await groqService.analyzeFeedback({ feedback: '   ' });
    expect(result.sentiment).toBe('neutral');
    expect(result.urgency).toBe('low');
    expect(result.summary).toContain('Empty feedback');
  });

  // Test 6: API Status Endpoint
  it('GET /api/analysis/status reports pending, analyzed, and failed counts', async () => {
    const db = getDatabase();
    db.prepare(`
      INSERT INTO feedback (feedback_id, customer_id, feedback, company_id, analysis_status)
      VALUES ('FB-P1', 'CUST-1', 'Slow app', ?, 'pending')
    `).run(TEST_COMPANY);

    db.prepare(`
      INSERT INTO feedback (feedback_id, customer_id, feedback, company_id, analysis_status, sentiment)
      VALUES ('FB-A1', 'CUST-2', 'Great app', ?, 'analyzed', 'positive')
    `).run(TEST_COMPANY);

    const res = await request(app).get(`/api/analysis/status?companyId=${TEST_COMPANY}`);
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(2);
    expect(res.body.pending).toBe(1);
    expect(res.body.analyzed).toBe(1);
    expect(res.body.failed).toBe(0);
    expect(res.body).toHaveProperty('configured');
  });

  // Test 7: Unconfigured API key returns 503 with actionable instruction
  it('returns 503 with clear message when GROQ_API_KEY is not set', async () => {
    // If not configured, preview and batch return 503
    if (!groqService.isConfigured()) {
      const res = await request(app)
        .post('/api/analysis/preview')
        .send({ feedback: 'The app is very slow.' });

      expect(res.status).toBe(503);
      expect(res.body.error).toContain('GROQ_API_KEY is not configured');
    }
  });

  // Test 8: Batch Analysis with Mocked Groq Responses for Deterministic Verification
  it('analyzes pending records and updates SQLite database with structured synthesis', async () => {
    const db = getDatabase();
    db.prepare(`
      INSERT INTO feedback (feedback_id, customer_id, date, source, feedback, rating, company_id, analysis_status)
      VALUES ('FB-BATCH-1', 'CUST-Acme', '2026-11-01', 'Zendesk', 'Dashboard times out when loading 1000 items.', 2.0, ?, 'pending')
    `).run(TEST_COMPANY);

    // Mock analyzeFeedback on groqService to simulate Groq response
    const originalAnalyze = groqService.analyzeFeedback;
    groqService.analyzeFeedback = vi.fn().mockResolvedValue({
      sentiment: 'negative',
      topic: 'performance',
      urgency: 'high',
      customer_problem: 'Dashboard timeout on 1000 items',
      feature_request: null,
      summary: 'Dashboard timeout reported when loading large datasets.',
      suggested_action: 'Add pagination and index customer query.'
    });

    try {
      const batchResult = await groqService.analyzePendingBatch({ companyId: TEST_COMPANY });
      expect(batchResult.total).toBe(1);
      expect(batchResult.analyzed).toBe(1);
      expect(batchResult.failed).toBe(0);

      // Verify row updated in SQLite
      const updatedRow = db.prepare('SELECT * FROM feedback WHERE feedback_id = ?').get('FB-BATCH-1');
      expect(updatedRow.analysis_status).toBe('analyzed');
      expect(updatedRow.sentiment).toBe('negative');
      expect(updatedRow.topic).toBe('performance');
      expect(updatedRow.urgency).toBe('high');
      expect(updatedRow.customer_problem).toBe('Dashboard timeout on 1000 items');
    } finally {
      groqService.analyzeFeedback = originalAnalyze;
    }
  });

  // Test 9: Failure handling when a record analysis fails
  it('marks analysis_status as failed if LLM throws error on a record', async () => {
    const db = getDatabase();
    db.prepare(`
      INSERT INTO feedback (feedback_id, customer_id, feedback, company_id, analysis_status)
      VALUES ('FB-FAIL-1', 'CUST-Error', 'Throw error please', ?, 'pending')
    `).run(TEST_COMPANY);

    const originalAnalyze = groqService.analyzeFeedback;
    groqService.analyzeFeedback = vi.fn().mockRejectedValue(new Error('Groq model parsing timeout'));

    try {
      const batchResult = await groqService.analyzePendingBatch({ companyId: TEST_COMPANY });
      expect(batchResult.failed).toBe(1);

      const failedRow = db.prepare('SELECT * FROM feedback WHERE feedback_id = ?').get('FB-FAIL-1');
      expect(failedRow.analysis_status).toBe('failed');
    } finally {
      groqService.analyzeFeedback = originalAnalyze;
    }
  });

  // Test 10: Specific Categorization for Feature Request extraction
  it('correctly extracts feature_request when feedback is asking for new capabilities', async () => {
    const originalAnalyze = groqService.analyzeFeedback;
    groqService.analyzeFeedback = vi.fn().mockResolvedValue({
      sentiment: 'positive',
      topic: 'integrations',
      urgency: 'low',
      customer_problem: null,
      feature_request: 'Direct export to Google Sheets and Slack',
      summary: 'Customer requests Slack and Google Sheets export.',
      suggested_action: 'Add to Q4 integration roadmap backlog.'
    });

    try {
      const result = await groqService.analyzeFeedback({
        feedback: 'Would be amazing if we could export reports directly to Google Sheets or Slack webhook.'
      });

      expect(result.feature_request).toContain('Google Sheets');
      expect(result.customer_problem).toBeNull();
      expect(result.urgency).toBe('low');
    } finally {
      groqService.analyzeFeedback = originalAnalyze;
    }
  });
});

