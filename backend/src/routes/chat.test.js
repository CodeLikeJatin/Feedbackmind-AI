import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../server.js';
import { chatService } from '../services/chatService.js';
import { groqService } from '../services/groqService.js';
import { hindsightService } from '../services/hindsightService.js';
import { getDatabase } from '../config/db.js';

describe('Phase 5 — Ask FeedbackMind AI Chat Route & Service Tests', () => {
  const TEST_COMPANY = 'chat-test-co';

  beforeEach(() => {
    const db = getDatabase();
    db.prepare('DELETE FROM chat_history WHERE company_id = ?').run(TEST_COMPANY);
    db.prepare('DELETE FROM feedback WHERE company_id = ?').run(TEST_COMPANY);
  });

  // Test 1: Validation
  it('rejects empty question with 400 Bad Request', async () => {
    const res = await request(app)
      .post('/api/chat/ask')
      .send({ question: '', companyId: TEST_COMPANY });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Question is required');
  });

  // Test 2: Missing API Key
  it('returns 503 when Groq API key is not configured', async () => {
    const spy = vi.spyOn(groqService, 'isConfigured').mockReturnValue(false);
    try {
      const res = await request(app)
        .post('/api/chat/ask')
        .send({ question: 'What are the main complaints?', companyId: TEST_COMPANY });

      expect(res.status).toBe(503);
      expect(res.body.error).toContain('GROQ_API_KEY is not configured');
    } finally {
      spy.mockRestore();
    }
  });

  // Test 3: Grounded Answer with Memory ON
  it('recalls Hindsight memories, calls Groq, attaches evidence citations, and stores history', async () => {
    const db = getDatabase();
    db.prepare(`
      INSERT INTO feedback (feedback_id, customer_id, date, source, feedback, rating, topic, sentiment, urgency, company_id)
      VALUES ('FB-TEST-1', 'CUST-Alpha', '2026-10-01', 'Zendesk', 'Dashboard is sluggish in the morning.', 2.0, 'performance', 'negative', 'high', ?)
    `).run(TEST_COMPANY);

    // Mock Hindsight recall
    const recallSpy = vi.spyOn(hindsightService, 'recallMemories').mockResolvedValue({
      results: [
        {
          id: 'mem_1',
          text: 'Customer CUST-Alpha complained dashboard is sluggish in the morning. | When: 2026-10-01',
          entities: ['CUST-Alpha', 'dashboard'],
          context: 'performance',
          occurred_start: '2026-10-01'
        }
      ],
      total: 1
    });

    // Mock Groq chat completions
    const mockCreate = vi.fn().mockResolvedValue({
      choices: [
        {
          message: {
            content: 'Based on customer feedback [FB-TEST-1] from CUST-Alpha on 2026-10-01, the primary issue is dashboard sluggishness during morning peak hours (Rating: 2/5).'
          }
        }
      ]
    });

    const mockGroqClient = {
      chat: { completions: { create: mockCreate } }
    };

    const groqClientSpy = vi.spyOn(groqService, 'isConfigured').mockReturnValue(true);
    const getClientSpy = vi.spyOn(await import('../services/groqService.js'), 'getGroqClient').mockReturnValue(mockGroqClient);

    try {
      const res = await request(app)
        .post('/api/chat/ask')
        .send({
          question: 'What are customers saying about dashboard performance?',
          companyId: TEST_COMPANY,
          memoryEnabled: true,
          sessionId: 'test-sess-1'
        });

      expect(res.status).toBe(200);
      expect(res.body.answer).toContain('FB-TEST-1');
      expect(res.body.memoryEnabled).toBe(true);
      expect(res.body.evidence.length).toBeGreaterThanOrEqual(1);
      expect(res.body.evidence[0].feedback_id).toBe('FB-TEST-1');
      expect(recallSpy).toHaveBeenCalled();
      expect(mockCreate).toHaveBeenCalled();

      // Verify persistence in chat_history
      const historyRows = db.prepare('SELECT * FROM chat_history WHERE company_id = ?').all(TEST_COMPANY);
      expect(historyRows.length).toBe(1);
      expect(historyRows[0].question).toContain('dashboard performance');
      expect(historyRows[0].answer).toContain('FB-TEST-1');
    } finally {
      recallSpy.mockRestore();
      groqClientSpy.mockRestore();
      getClientSpy.mockRestore();
    }
  });

  // Test 4: Memory OFF mode suppresses Hindsight recall
  it('suppresses Hindsight recall when memoryEnabled is false', async () => {
    const recallSpy = vi.spyOn(hindsightService, 'recallMemories').mockResolvedValue({ results: [], total: 0 });

    const mockCreate = vi.fn().mockResolvedValue({
      choices: [{ message: { content: 'With memory OFF, I can only report on current immediate records.' } }]
    });
    const mockGroqClient = { chat: { completions: { create: mockCreate } } };

    const groqClientSpy = vi.spyOn(groqService, 'isConfigured').mockReturnValue(true);
    const getClientSpy = vi.spyOn(await import('../services/groqService.js'), 'getGroqClient').mockReturnValue(mockGroqClient);

    try {
      const res = await request(app)
        .post('/api/chat/ask')
        .send({
          question: 'What are the main issues?',
          companyId: TEST_COMPANY,
          memoryEnabled: false,
          sessionId: 'test-sess-2'
        });

      expect(res.status).toBe(200);
      expect(res.body.memoryEnabled).toBe(false);
      expect(recallSpy).not.toHaveBeenCalled();
    } finally {
      recallSpy.mockRestore();
      groqClientSpy.mockRestore();
      getClientSpy.mockRestore();
    }
  });

  // Test 5: Follow-up question context preservation
  it('passes conversation history to Groq for contextual follow-up questions', async () => {
    let passedMessages = [];
    const mockCreate = vi.fn().mockImplementation((args) => {
      passedMessages = args.messages;
      return Promise.resolve({
        choices: [{ message: { content: 'Following up on your previous question about latency...' } }]
      });
    });
    const mockGroqClient = { chat: { completions: { create: mockCreate } } };

    const groqClientSpy = vi.spyOn(groqService, 'isConfigured').mockReturnValue(true);
    const getClientSpy = vi.spyOn(await import('../services/groqService.js'), 'getGroqClient').mockReturnValue(mockGroqClient);

    try {
      const history = [
        { sender: 'user', text: 'Which feature do customers want most?' },
        { sender: 'ai', text: 'Customers want dark mode theme (FB-002).' }
      ];

      const res = await request(app)
        .post('/api/chat/ask')
        .send({
          question: 'Why do they want it?',
          companyId: TEST_COMPANY,
          memoryEnabled: false,
          history
        });

      expect(res.status).toBe(200);
      // Verify passed messages contains prior conversation
      const userQuestions = passedMessages.filter(m => m.role === 'user');
      expect(userQuestions.some(m => m.content === 'Which feature do customers want most?')).toBe(true);
      const assistantReplies = passedMessages.filter(m => m.role === 'assistant');
      expect(assistantReplies.some(m => m.content.includes('dark mode theme'))).toBe(true);
    } finally {
      groqClientSpy.mockRestore();
      getClientSpy.mockRestore();
    }
  });

  // Test 6: Chat History Retrieval
  it('GET /api/chat/history returns past stored messages', async () => {
    const db = getDatabase();
    db.prepare(`
      INSERT INTO chat_history (company_id, session_id, question, memory_enabled, answer, evidence_json)
      VALUES (?, 'sess-123', 'Previous question?', 1, 'Previous answer.', '[]')
    `).run(TEST_COMPANY);

    const res = await request(app)
      .get(`/api/chat/history?companyId=${TEST_COMPANY}&sessionId=sess-123`);

    expect(res.status).toBe(200);
    expect(res.body.history.length).toBe(1);
    expect(res.body.history[0].question).toBe('Previous question?');
  });

  // Test 7: Clear Chat History
  it('DELETE /api/chat/history clears stored chat records', async () => {
    const db = getDatabase();
    db.prepare(`
      INSERT INTO chat_history (company_id, session_id, question, memory_enabled, answer, evidence_json)
      VALUES (?, 'sess-clear', 'To be deleted', 1, 'Delete me', '[]')
    `).run(TEST_COMPANY);

    const res = await request(app)
      .delete('/api/chat/history')
      .send({ companyId: TEST_COMPANY, sessionId: 'sess-clear' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const check = db.prepare('SELECT * FROM chat_history WHERE company_id = ? AND session_id = ?').all(TEST_COMPANY, 'sess-clear');
    expect(check.length).toBe(0);
  });
});

