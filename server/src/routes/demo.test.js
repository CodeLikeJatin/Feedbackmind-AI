import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../server.js';
import { demoService } from '../services/demoService.js';
import { chatService } from '../services/chatService.js';
import { groqService } from '../services/groqService.js';
import { hindsightService } from '../services/hindsightService.js';
import { getDatabase } from '../config/db.js';

describe('Phase 7 — Memory ON/OFF Judging Demo Backend Test Suite', () => {
  const TEST_COMPANY = 'demo-test-co';

  beforeEach(() => {
    const db = getDatabase();
    db.prepare('DELETE FROM chat_history WHERE company_id = ?').run(TEST_COMPANY);
    db.prepare('DELETE FROM feedback WHERE company_id = ?').run(TEST_COMPANY);

    // Insert controlled test feedback records
    const insertStmt = db.prepare(`
      INSERT OR REPLACE INTO feedback (
        feedback_id, customer_id, company_id, date, source,
        feedback, rating, sentiment, topic, urgency,
        customer_problem, feature_request, summary, suggested_action,
        retained_in_hindsight, hindsight_memory_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertStmt.run(
      'FB-DEMO-1', 'CUST-101', TEST_COMPANY, '2026-08-10', 'Zendesk',
      'The morning dashboard load takes over 15 seconds.', 2.0, 'negative', 'performance', 'high',
      'Dashboard latency in morning', null, 'Morning dashboard takes >15s', 'Add Redis caching',
      1, 'mem_demo_1'
    );

    insertStmt.run(
      'FB-DEMO-2', 'CUST-102', TEST_COMPANY, '2026-09-15', 'Intercom',
      'CSV export crashes with 504 gateway timeout.', 1.0, 'negative', 'export', 'high',
      'CSV 504 Gateway Timeout', null, 'Export fails with 504', 'Optimize chunk streaming',
      1, 'mem_demo_2'
    );

    insertStmt.run(
      'FB-DEMO-3', 'CUST-103', TEST_COMPANY, '2026-10-14', 'Slack',
      'The new dashboard caching update made reports load instantly!', 5.0, 'positive', 'performance', 'low',
      null, null, 'Dashboard caching update speedup', 'Maintain caching infra',
      1, 'mem_demo_3'
    );
  });

  // ---------------------------------------------------------------------------
  // 1. Status & Metadata Endpoint
  // ---------------------------------------------------------------------------
  it('GET /api/demo/status returns record count, bank ID, and 5 suggested judging questions', async () => {
    const res = await request(app)
      .get(`/api/demo/status?companyId=${TEST_COMPANY}`);

    expect(res.status).toBe(200);
    expect(res.body.companyId).toBe(TEST_COMPANY);
    expect(res.body.sqliteRecordCount).toBe(3);
    expect(res.body.hindsightBankId).toBeDefined();
    expect(Array.isArray(res.body.suggestedQuestions)).toBe(true);
    expect(res.body.suggestedQuestions.length).toBe(5);
    expect(res.body.modes.memory_off).toBeDefined();
    expect(res.body.modes.memory_on).toBeDefined();
  });

  // ---------------------------------------------------------------------------
  // 2. Validation & Error Handling
  // ---------------------------------------------------------------------------
  it('POST /api/demo/query rejects missing or empty question with 400', async () => {
    const res = await request(app)
      .post('/api/demo/query')
      .send({ question: '   ', companyId: TEST_COMPANY });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Question is required');
  });

  it('POST /api/demo/compare rejects missing question with 400', async () => {
    const res = await request(app)
      .post('/api/demo/compare')
      .send({ question: '', companyId: TEST_COMPANY });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Question is required for comparison');
  });

  it('POST /api/demo/query returns 503 when Groq is not configured', async () => {
    const spy = vi.spyOn(groqService, 'isConfigured').mockReturnValue(false);
    try {
      const res = await request(app)
        .post('/api/demo/query')
        .send({ question: 'How is performance?', companyId: TEST_COMPANY });

      expect(res.status).toBe(503);
      expect(res.body.error).toContain('GROQ_API_KEY is not configured');
    } finally {
      spy.mockRestore();
    }
  });

  // ---------------------------------------------------------------------------
  // 3. Memory OFF Execution: Strictly Zero Hindsight Retrieval
  // ---------------------------------------------------------------------------
  it('Memory OFF executes SQLite-only query with GUARANTEED zero Hindsight retrieval calls', async () => {
    const recallSpy = vi.spyOn(hindsightService, 'recallMemories');
    const reflectSpy = vi.spyOn(hindsightService, 'reflectOnMemories');

    const chatAskSpy = vi.spyOn(chatService, 'ask').mockResolvedValue({
      answer: 'Based on our SQLite records, customer [FB-DEMO-1] reported slow dashboard loading in the morning.',
      memoryEnabled: false,
      evidence: [
        { feedback_id: 'FB-DEMO-1', customer_id: 'CUST-101', rating: 2.0, topic: 'performance' }
      ],
      recalledMemoriesCount: 0,
      recalledMemories: [],
      reflectionUsed: false,
      reflectionText: null,
      sessionId: 'test-session-off'
    });

    try {
      const res = await request(app)
        .post('/api/demo/query')
        .send({
          question: 'What performance problems were reported?',
          companyId: TEST_COMPANY,
          memoryEnabled: false
        });

      expect(res.status).toBe(200);
      expect(res.body.mode).toBe('memory_off');
      expect(res.body.memoryEnabled).toBe(false);
      expect(res.body.memoryUsed).toBe(false);
      expect(res.body.memoryRecallCount).toBe(0);
      expect(res.body.hindsightAccessed).toBe(false);
      expect(res.body.sqliteRecordCount).toBe(3);
      expect(res.body.recalledMemories.length).toBe(0);
      expect(res.body.reflectionText).toBeNull();
      expect(res.body.sourceFeedbackIds).toContain('FB-DEMO-1');

      // Crucial: Verify Hindsight was NEVER accessed
      expect(recallSpy).not.toHaveBeenCalled();
      expect(reflectSpy).not.toHaveBeenCalled();
    } finally {
      recallSpy.mockRestore();
      reflectSpy.mockRestore();
      chatAskSpy.mockRestore();
    }
  });

  // ---------------------------------------------------------------------------
  // 4. Memory ON Execution: Retrieves Hindsight Long-Term Memory
  // ---------------------------------------------------------------------------
  it('Memory ON retrieves Hindsight memories, returns accurate recall count, and marks memoryUsed true', async () => {
    const chatAskSpy = vi.spyOn(chatService, 'ask').mockResolvedValue({
      answer: 'Synthesizing historical memory with current data, [FB-DEMO-1] had morning slowness in August, which was successfully resolved by the caching update in [FB-DEMO-3].',
      memoryEnabled: true,
      evidence: [
        { feedback_id: 'FB-DEMO-1', customer_id: 'CUST-101', rating: 2.0, topic: 'performance' },
        { feedback_id: 'FB-DEMO-3', customer_id: 'CUST-103', rating: 5.0, topic: 'performance' }
      ],
      recalledMemoriesCount: 2,
      recalledMemories: [
        { id: 'mem_demo_1', text: 'CUST-101 reported morning latency 2026-08-10', context: 'performance' }
      ],
      reflectionUsed: true,
      reflectionText: 'Longitudinal reflection: Morning dashboard latency resolved across August to October.',
      sessionId: 'test-session-on'
    });

    try {
      const res = await request(app)
        .post('/api/demo/query')
        .send({
          question: 'Has dashboard performance improved over time?',
          companyId: TEST_COMPANY,
          memoryEnabled: true
        });

      expect(res.status).toBe(200);
      expect(res.body.mode).toBe('memory_on');
      expect(res.body.memoryEnabled).toBe(true);
      expect(res.body.memoryUsed).toBe(true);
      expect(res.body.memoryRecallCount).toBe(2);
      expect(res.body.hindsightAccessed).toBe(true);
      expect(res.body.recalledMemories.length).toBe(1);
      expect(res.body.reflectionUsed).toBe(true);
      expect(res.body.reflectionText).toContain('Longitudinal reflection');
      expect(res.body.sourceFeedbackIds).toEqual(['FB-DEMO-1', 'FB-DEMO-3']);
    } finally {
      chatAskSpy.mockRestore();
    }
  });

  // ---------------------------------------------------------------------------
  // 5. Side-by-Side Comparison: Independent Execution & Objective Analysis
  // ---------------------------------------------------------------------------
  it('POST /api/demo/compare executes both modes independently without contamination and generates comparative analysis', async () => {
    // Spy executeMode to verify independent calls with memoryEnabled false and true
    const executeSpy = vi.spyOn(demoService, 'executeMode')
      .mockImplementation(async ({ question, companyId, memoryEnabled }) => {
        if (!memoryEnabled) {
          return {
            mode: 'memory_off',
            memoryEnabled: false,
            question,
            answer: 'Current records show morning loading issues in [FB-DEMO-1] and a caching update in [FB-DEMO-3].',
            evidence: [
              { feedback_id: 'FB-DEMO-1', customer_id: 'CUST-101', rating: 2.0, topic: 'performance', source: 'SQLite' }
            ],
            sourceFeedbackIds: ['FB-DEMO-1'],
            memoryUsed: false,
            memoryRecallCount: 0,
            hindsightAccessed: false,
            recalledMemories: [],
            reflectionUsed: false,
            reflectionText: null,
            sqliteRecordCount: 3,
            latencyMs: 120,
            sessionId: 'sess-off-123'
          };
        } else {
          return {
            mode: 'memory_on',
            memoryEnabled: true,
            question,
            answer: 'Historical Hindsight memories show that in August [FB-DEMO-1] suffered from 15s latency, but in October [FB-DEMO-3] confirmed speedup after the caching update, proving significant improvement over time.',
            evidence: [
              { feedback_id: 'FB-DEMO-1', customer_id: 'CUST-101', rating: 2.0, topic: 'performance', source: 'SQLite' },
              { feedback_id: 'FB-DEMO-3', customer_id: 'CUST-103', rating: 5.0, topic: 'performance', source: 'SQLite' }
            ],
            sourceFeedbackIds: ['FB-DEMO-1', 'FB-DEMO-3'],
            memoryUsed: true,
            memoryRecallCount: 3,
            hindsightAccessed: true,
            recalledMemories: [
              { id: 'mem_1', text: 'August 2026 performance baseline', context: 'performance' }
            ],
            reflectionUsed: true,
            reflectionText: 'Cross-month synthesis indicates performance transition from degraded to optimized.',
            sqliteRecordCount: 3,
            latencyMs: 250,
            sessionId: 'sess-on-456'
          };
        }
      });

    try {
      const res = await request(app)
        .post('/api/demo/compare')
        .send({
          question: 'Has dashboard performance improved over time?',
          companyId: TEST_COMPANY
        });

      expect(res.status).toBe(200);
      expect(res.body.question).toBe('Has dashboard performance improved over time?');
      expect(res.body.sqliteRecordCount).toBe(3);

      // Verify Left Panel (Memory OFF)
      expect(res.body.memoryOff.mode).toBe('memory_off');
      expect(res.body.memoryOff.memoryUsed).toBe(false);
      expect(res.body.memoryOff.memoryRecallCount).toBe(0);
      expect(res.body.memoryOff.hindsightAccessed).toBe(false);
      expect(res.body.memoryOff.sourceFeedbackIds).toEqual(['FB-DEMO-1']);

      // Verify Right Panel (Memory ON)
      expect(res.body.memoryOn.mode).toBe('memory_on');
      expect(res.body.memoryOn.memoryUsed).toBe(true);
      expect(res.body.memoryOn.memoryRecallCount).toBe(3);
      expect(res.body.memoryOn.hindsightAccessed).toBe(true);
      expect(res.body.memoryOn.sourceFeedbackIds).toEqual(['FB-DEMO-1', 'FB-DEMO-3']);

      // Verify Comparative Analysis Section
      const analysis = res.body.analysis;
      expect(analysis).toBeDefined();
      expect(analysis.strongerMode).toBe('Memory ON');
      expect(analysis.additionalContextProvided).toContain('retrieved 3 historical episodic memories');
      expect(analysis.timeEvolutionIdentified).toContain('chronological timeline');
      expect(analysis.evidenceParity.hindsightBypassedInOff).toBe(true);
      expect(analysis.evidenceParity.memoryRecallCount).toBe(3);

      // Ensure 2 independent calls were made
      expect(executeSpy).toHaveBeenCalledTimes(2);
    } finally {
      executeSpy.mockRestore();
    }
  });

  // ---------------------------------------------------------------------------
  // 6. Insufficient Evidence Question: Zero Hallucination & Zero Citations
  // ---------------------------------------------------------------------------
  it('handles insufficient-evidence question honestly without fabricating memories or citations', async () => {
    const executeSpy = vi.spyOn(demoService, 'executeMode')
      .mockImplementation(async ({ question, memoryEnabled }) => ({
        mode: memoryEnabled ? 'memory_on' : 'memory_off',
        memoryEnabled,
        question,
        answer: 'There is insufficient customer feedback in our records to answer this.',
        evidence: [],
        sourceFeedbackIds: [],
        memoryUsed: false,
        memoryRecallCount: 0,
        hindsightAccessed: false,
        recalledMemories: [],
        reflectionUsed: false,
        reflectionText: null,
        sqliteRecordCount: 3,
        latencyMs: 80,
        sessionId: `sess-${memoryEnabled ? 'on' : 'off'}`
      }));

    try {
      const res = await request(app)
        .post('/api/demo/compare')
        .send({
          question: 'What are customers saying about Kubernetes cluster support?',
          companyId: TEST_COMPANY
        });

      expect(res.status).toBe(200);
      expect(res.body.memoryOff.evidence).toHaveLength(0);
      expect(res.body.memoryOn.evidence).toHaveLength(0);
      expect(res.body.analysis.strongerMode).toContain('Tie');
      expect(res.body.analysis.verdict).toContain('Equal');
    } finally {
      executeSpy.mockRestore();
    }
  });
});

