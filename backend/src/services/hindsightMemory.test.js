import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../server.js';
import { hindsightService } from './hindsightService.js';
import { feedbackDbService } from './feedbackDbService.js';
import { getDatabase } from '../config/db.js';

describe('Phase 4 — Hindsight Long-Term Memory Integration Test Suite', () => {
  const TEST_COMPANY_A = 'test-co-alpha';
  const TEST_COMPANY_B = 'test-co-beta';

  beforeEach(() => {
    feedbackDbService.clearData(TEST_COMPANY_A);
    feedbackDbService.clearData(TEST_COMPANY_B);
  });

  // Test 1: Bank ID Resolution & Multi-Tenant Company Isolation
  it('resolves dedicated, isolated bank IDs per company tenant', () => {
    const demoBank = hindsightService.resolveBankId('demo-company');
    expect(demoBank).toBe('feedbackmind-demo');

    const alphaBank = hindsightService.resolveBankId(TEST_COMPANY_A);
    const betaBank = hindsightService.resolveBankId(TEST_COMPANY_B);

    expect(alphaBank).toBe(`fbm-${TEST_COMPANY_A}`);
    expect(betaBank).toBe(`fbm-${TEST_COMPANY_B}`);
    expect(alphaBank).not.toBe(betaBank); // Strict isolation
  });

  // Test 2: Memory Content Formatting
  it('formats feedback records into rich episodic memory text with customer voice and metadata', () => {
    const record = {
      feedback_id: 'FB-MEM-1',
      customer_id: 'CUST-Stripe',
      date: '2026-07-15',
      source: 'Zendesk',
      feedback: 'Dashboard takes 20s to load during peak morning traffic.',
      rating: 2.0,
      sentiment: 'negative',
      topic: 'performance',
      urgency: 'high',
      customer_problem: 'Slow dashboard loading (>20s)',
      feature_request: null,
      summary: 'Sluggish performance on dashboard.',
      suggested_action: 'Add redis caching.'
    };

    const formatted = hindsightService.formatMemoryContent(record);
    expect(formatted).toContain('[2026-07-15]');
    expect(formatted).toContain('CUST-Stripe');
    expect(formatted).toContain('Rating: 2/5');
    expect(formatted).toContain('Customer Problem: Slow dashboard loading (>20s)');
    expect(formatted).toContain('Sentiment: negative');
  });

  // Test 3: Unconfigured Hindsight Key Handling
  it('returns 503 when HINDSIGHT_API_KEY is not configured without faking success', async () => {
    if (!hindsightService.isConfigured()) {
      const recallRes = await request(app)
        .post('/api/memory/recall')
        .send({ query: 'What are customer complaints?', companyId: TEST_COMPANY_A });

      expect(recallRes.status).toBe(503);
      expect(recallRes.body.error).toContain('HINDSIGHT_API_KEY is not configured');

      const reflectRes = await request(app)
        .post('/api/memory/reflect')
        .send({ query: 'Did performance improve?', companyId: TEST_COMPANY_A });

      expect(reflectRes.status).toBe(503);
      expect(reflectRes.body.error).toContain('HINDSIGHT_API_KEY is not configured');
    }
  });

  // Test 4: RETAIN Operation with Mocked Hindsight SDK Client
  it('retains feedback in Hindsight bank and updates SQLite persistence flags', async () => {
    const db = getDatabase();
    db.prepare(`
      INSERT INTO feedback (feedback_id, customer_id, date, source, feedback, rating, sentiment, topic, urgency, customer_problem, company_id, analysis_status)
      VALUES ('FB-RETAIN-1', 'CUST-Acme', '2026-08-01', 'Zendesk', 'Export to CSV fails.', 1.0, 'negative', 'performance', 'high', 'CSV export crashes', ?, 'analyzed')
    `).run(TEST_COMPANY_A);

    const record = db.prepare('SELECT * FROM feedback WHERE feedback_id = ?').get('FB-RETAIN-1');

    // Mock HindsightClient retain
    const mockRetain = vi.fn().mockResolvedValue({
      status: 'success',
      memory_unit_id: 'mu_12345'
    });

    const mockClient = {
      retain: mockRetain
    };

    const clientSpy = vi.spyOn(hindsightService, 'getClient').mockReturnValue(mockClient);

    try {
      const result = await hindsightService.retainFeedback(record, TEST_COMPANY_A);
      expect(result.success).toBe(true);
      expect(result.feedback_id).toBe('FB-RETAIN-1');
      expect(mockRetain).toHaveBeenCalled();

      // Check SQLite update
      const updatedRow = db.prepare('SELECT * FROM feedback WHERE feedback_id = ?').get('FB-RETAIN-1');
      expect(updatedRow.retained_in_hindsight).toBe(1);
      expect(updatedRow.hindsight_memory_id).toContain('mem_FB-RETAIN-1');

      // Prevent duplicate retention test:
      const secondRetain = await hindsightService.retainFeedback(updatedRow, TEST_COMPANY_A);
      expect(secondRetain.alreadyRetained).toBe(true);
      expect(mockRetain).toHaveBeenCalledTimes(1); // Not called again!
    } finally {
      clientSpy.mockRestore();
    }
  });

  // Test 5: RECALL Operation
  it('recalls contextual historical memories using Hindsight semantic search', async () => {
    const mockRecall = vi.fn().mockResolvedValue({
      results: [
        {
          id: 'mem_1',
          text: 'Customer Acme complained dashboard was slow (>15s)',
          context: 'performance',
          type: 'episodic',
          entities: ['AcmeCorp', 'dashboard'],
          occurred_start: '2026-07-04'
        }
      ],
      trace: { query_tokens: 15 }
    });

    const mockClient = { recall: mockRecall };
    const clientSpy = vi.spyOn(hindsightService, 'getClient').mockReturnValue(mockClient);

    try {
      const recallResult = await hindsightService.recallMemories({
        query: 'What are our performance issues?',
        companyId: TEST_COMPANY_A
      });

      expect(recallResult.total).toBe(1);
      expect(recallResult.results[0].text).toContain('dashboard was slow');
      expect(recallResult.results[0].entities).toContain('AcmeCorp');
      expect(mockRecall).toHaveBeenCalledWith(`fbm-${TEST_COMPANY_A}`, 'What are our performance issues?', expect.anything());
    } finally {
      clientSpy.mockRestore();
    }
  });

  // Test 6: REFLECT Operation
  it('reflects across memories to discover patterns and synthesis', async () => {
    const mockReflect = vi.fn().mockResolvedValue({
      text: 'Performance complaints were high in July and August, but resolved in September after update v2.4.',
      based_on: [
        { id: 'fact_1', text: 'July: 15s load times' },
        { id: 'fact_2', text: 'September: Under 2s load times' }
      ]
    });

    const mockClient = { reflect: mockReflect };
    const clientSpy = vi.spyOn(hindsightService, 'getClient').mockReturnValue(mockClient);

    try {
      const reflectResult = await hindsightService.reflectOnMemories({
        query: 'Did our performance improvements appear to help?',
        companyId: TEST_COMPANY_A
      });

      expect(reflectResult.text).toContain('resolved in September after update v2.4');
      expect(reflectResult.based_on.length).toBe(2);
      expect(mockReflect).toHaveBeenCalledWith(`fbm-${TEST_COMPANY_A}`, expect.anything(), expect.anything());
    } finally {
      clientSpy.mockRestore();
    }
  });

  // Test 7: Memories persist after backend reboot simulation
  it('verifies retained memory flags and memory IDs persist across database reconnection', async () => {
    const db = getDatabase();
    db.prepare(`
      INSERT INTO feedback (feedback_id, customer_id, feedback, retained_in_hindsight, hindsight_memory_id, company_id)
      VALUES ('FB-REBOOT-1', 'CUST-Reboot', 'Memory test across reboots', 1, 'mem_FB-REBOOT-1_xyz', ?)
    `).run(TEST_COMPANY_A);

    // Simulate backend reboot: open fresh connection
    const { DatabaseSync } = await import('node:sqlite');
    const { config } = await import('../config/env.js');
    const rebootDb = new DatabaseSync(config.database.path);

    const persistedRow = rebootDb.prepare('SELECT * FROM feedback WHERE feedback_id = ?').get('FB-REBOOT-1');
    expect(persistedRow).toBeDefined();
    expect(persistedRow.retained_in_hindsight).toBe(1);
    expect(persistedRow.hindsight_memory_id).toBe('mem_FB-REBOOT-1_xyz');
    rebootDb.close();
  });

  // Test 8: Bank Overview API
  it('GET /api/memory/overview returns bank status, tenant ID, and retained counts', async () => {
    const db = getDatabase();
    db.prepare(`
      INSERT INTO feedback (feedback_id, customer_id, feedback, retained_in_hindsight, company_id)
      VALUES ('FB-OV-1', 'CUST-Overview', 'Overview test', 1, ?)
    `).run(TEST_COMPANY_A);

    const res = await request(app).get(`/api/memory/overview?companyId=${TEST_COMPANY_A}`);
    expect(res.status).toBe(200);
    expect(res.body.bankId).toBe(`fbm-${TEST_COMPANY_A}`);
    expect(res.body.retainedFeedback).toBe(1);
  });
});
