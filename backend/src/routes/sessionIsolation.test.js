import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../server.js';
import { getDatabase } from '../config/db.js';
import { sessionService } from '../services/sessionService.js';
import { hindsightService } from '../services/hindsightService.js';

describe('Phase 10.2.2 — Public Demo Session Isolation & Data Protection Test Suite', () => {
  let db;

  beforeAll(() => {
    db = getDatabase();
  });

  // Test 1: Public CSV upload does not change demo-company's 27 records
  it('should route public CSV uploads to an isolated session workspace without altering demo-company records', async () => {
    const demoCountBefore = db.prepare("SELECT COUNT(*) as count FROM feedback WHERE company_id = 'demo-company'").get().count;
    expect(demoCountBefore).toBe(27);

    const validCsv = `feedback_id,customer_id,date,source,feedback,rating
FB-JUDGE-01,CUST-Judge1,2026-11-08,Web,"Evaluating the user interface speed.",4.0
FB-JUDGE-02,CUST-Judge2,2026-11-08,Survey,"Tested customer feedback export.",5.0`;

    // Public visitor uploads to demo-company without admin key
    const res = await request(app)
      .post('/api/feedback/upload')
      .field('companyId', 'demo-company')
      .attach('file', Buffer.from(validCsv), 'judge-eval.csv');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.imported).toBe(2);
    expect(res.body.isIsolatedSession).toBe(true);
    expect(res.body.workspaceId).toMatch(/^demo-session-/);

    // Verify demo-company baseline remains STRICTLY 27 records
    const demoCountAfter = db.prepare("SELECT COUNT(*) as count FROM feedback WHERE company_id = 'demo-company'").get().count;
    expect(demoCountAfter).toBe(27);

    // Verify uploaded records exist inside the isolated workspace
    const sessionWorkspaceCount = db.prepare('SELECT COUNT(*) as count FROM feedback WHERE company_id = ?').get(res.body.workspaceId).count;
    expect(sessionWorkspaceCount).toBe(2);

    // Clean up temporary session workspace records
    db.prepare('DELETE FROM feedback WHERE company_id = ?').run(res.body.workspaceId);
  });

  // Test 2: Two separate visitors cannot access each other's uploads
  it('should prevent visitor B from accessing visitor A’s uploaded session workspace', async () => {
    // Visitor A creates session
    const sessionA = sessionService.createSession();
    const validCsv = `feedback_id,customer_id,date,source,feedback,rating
FB-VISITOR-A,CUST-VA,2026-11-08,Web,"Visitor A confidential feedback.",3.0`;

    const uploadRes = await request(app)
      .post('/api/feedback/upload')
      .set('X-Session-Token', sessionA.sessionToken)
      .set('X-Session-ID', sessionA.sessionId)
      .field('companyId', 'demo-company')
      .attach('file', Buffer.from(validCsv), 'visitorA.csv');

    expect(uploadRes.status).toBe(200);
    expect(uploadRes.body.workspaceId).toBe(sessionA.workspaceId);

    // Visitor A queries own workspace -> Allowed (200)
    const readA = await request(app)
      .get(`/api/feedback?companyId=${sessionA.workspaceId}`)
      .set('X-Session-Token', sessionA.sessionToken);

    expect(readA.status).toBe(200);
    expect(readA.body.items.length).toBe(1);
    expect(readA.body.items[0].feedback_id).toBe('FB-VISITOR-A');

    // Visitor B creates separate session
    const sessionB = sessionService.createSession();

    // Visitor B attempts to query Visitor A's workspace -> Blocked (403)
    const readB = await request(app)
      .get(`/api/feedback?companyId=${sessionA.workspaceId}`)
      .set('X-Session-Token', sessionB.sessionToken);

    expect(readB.status).toBe(403);
    expect(readB.body.error).toBe('Workspace Access Denied');

    // Anonymous visitor with no token attempts to query Visitor A's workspace -> Blocked (403)
    const readAnon = await request(app)
      .get(`/api/feedback?companyId=${sessionA.workspaceId}`);

    expect(readAnon.status).toBe(403);
    expect(readAnon.body.error).toBe('Workspace Access Denied');

    // Clean up
    db.prepare('DELETE FROM feedback WHERE company_id = ?').run(sessionA.workspaceId);
    db.prepare('DELETE FROM demo_sessions WHERE session_token IN (?, ?)').run(sessionA.sessionToken, sessionB.sessionToken);
  });

  // Test 3: Two separate visitors cannot read or delete each other's chat history
  it('should prevent visitor B from reading or deleting visitor A’s chat conversation', async () => {
    const sessionA = sessionService.createSession();
    const sessionB = sessionService.createSession();

    // Persist a message for Visitor A
    db.prepare(`
      INSERT INTO chat_history (company_id, session_id, question, memory_enabled, answer)
      VALUES (?, ?, ?, ?, ?)
    `).run('demo-company', sessionA.sessionId, 'What are customer complaints?', 1, 'Sample answer about performance.');

    // Visitor A can read own chat history
    const historyA = await request(app)
      .get(`/api/chat/history?companyId=demo-company&sessionId=${sessionA.sessionId}`)
      .set('X-Session-Token', sessionA.sessionToken);

    expect(historyA.status).toBe(200);
    expect(historyA.body.history.length).toBe(1);
    expect(historyA.body.history[0].question).toBe('What are customer complaints?');

    // Visitor B attempts to read Visitor A's history -> Blocked (403)
    const historyB = await request(app)
      .get(`/api/chat/history?companyId=demo-company&sessionId=${sessionA.sessionId}`)
      .set('X-Session-Token', sessionB.sessionToken);

    expect(historyB.status).toBe(403);
    expect(historyB.body.error).toBe('Access Denied');

    // Anonymous caller without token attempts to read Visitor A's history -> Blocked (403)
    const historyAnon = await request(app)
      .get(`/api/chat/history?companyId=demo-company&sessionId=${sessionA.sessionId}`);

    expect(historyAnon.status).toBe(403);
    expect(historyAnon.body.error).toBe('Access Denied');

    // Visitor B attempts to delete Visitor A's history -> Blocked (403)
    const deleteB = await request(app)
      .delete('/api/chat/history')
      .set('X-Session-Token', sessionB.sessionToken)
      .send({ companyId: 'demo-company', sessionId: sessionA.sessionId });

    expect(deleteB.status).toBe(403);
    expect(deleteB.body.error).toBe('Access Denied');

    // Visitor A can delete own history
    const deleteA = await request(app)
      .delete('/api/chat/history')
      .set('X-Session-Token', sessionA.sessionToken)
      .send({ companyId: 'demo-company', sessionId: sessionA.sessionId });

    expect(deleteA.status).toBe(200);
    expect(deleteA.body.success).toBe(true);

    // Verify history was cleared for Visitor A
    const historyAAfter = await request(app)
      .get(`/api/chat/history?companyId=demo-company&sessionId=${sessionA.sessionId}`)
      .set('X-Session-Token', sessionA.sessionToken);
    expect(historyAAfter.body.history.length).toBe(0);

    // Clean up
    db.prepare('DELETE FROM demo_sessions WHERE session_token IN (?, ?)').run(sessionA.sessionToken, sessionB.sessionToken);
  });

  // Test 4: Expired sessions cannot access previous data and are cleaned up
  it('should reject expired session tokens and clean up expired session data', async () => {
    // Create an expired session (ttlMs = -1000)
    const expiredSession = sessionService.createSession({ ttlMs: -1000 });

    // Seed temporary feedback and chat for this expired session
    db.prepare(`
      INSERT INTO feedback (feedback_id, customer_id, date, feedback, rating, company_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run('FB-EXPIRED-TEMP', 'CUST-EXP', '2026-11-08', 'Expired data', 3.0, expiredSession.workspaceId);

    db.prepare(`
      INSERT INTO chat_history (company_id, session_id, question, memory_enabled, answer)
      VALUES (?, ?, ?, ?, ?)
    `).run('demo-company', expiredSession.sessionId, 'Expired question', 1, 'Expired answer');

    // Verify requesting chat history with expired token is rejected with 401
    const res = await request(app)
      .get(`/api/chat/history?companyId=demo-company&sessionId=${expiredSession.sessionId}`)
      .set('X-Session-Token', expiredSession.sessionToken);

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Session Expired');

    // Run cleanup
    const cleanupResult = sessionService.cleanupExpiredSessions();
    expect(cleanupResult.cleanedSessions).toBeGreaterThanOrEqual(1);

    // Confirm expired session records were purged
    const feedbackCheck = db.prepare('SELECT COUNT(*) as count FROM feedback WHERE company_id = ?').get(expiredSession.workspaceId).count;
    const chatCheck = db.prepare('SELECT COUNT(*) as count FROM chat_history WHERE session_id = ?').get(expiredSession.sessionId).count;
    const sessionCheck = db.prepare('SELECT COUNT(*) as count FROM demo_sessions WHERE session_token = ?').get(expiredSession.sessionToken).count;

    expect(feedbackCheck).toBe(0);
    expect(chatCheck).toBe(0);
    expect(sessionCheck).toBe(0);
  });

  // Test 5: Cost protection — session workspaces cannot retain into Hindsight Cloud
  it('should prohibit Hindsight bank creation and memory retention for session workspaces', async () => {
    const tempWorkspaceId = 'demo-session-cost-guard';

    // ensureBank must throw
    await expect(hindsightService.ensureBank(tempWorkspaceId))
      .rejects
      .toThrow(/Personal uploaded session data/);

    // retainFeedback must throw
    await expect(hindsightService.retainFeedback({ feedback_id: 'FB-999', feedback: 'test' }, tempWorkspaceId))
      .rejects
      .toThrow(/Personal uploaded session data/);

    // retainBatchFeedback must throw
    await expect(hindsightService.retainBatchFeedback({ companyId: tempWorkspaceId }))
      .rejects
      .toThrow(/Personal uploaded session data/);
  });

  // Test 6: Shared demo records remain unchanged
  it('should verify all baseline datasets remain 100% intact', () => {
    const countDemo = db.prepare("SELECT COUNT(*) as count FROM feedback WHERE company_id = 'demo-company'").get().count;
    const countLc = db.prepare("SELECT COUNT(*) as count FROM feedback WHERE company_id = 'learning-curve-demo'").get().count;
    const countCp = db.prepare('SELECT COUNT(*) as count FROM learning_curve_checkpoints').get().count;

    expect(countDemo).toBe(27);
    expect(countLc).toBe(20);
    expect(countCp).toBe(3);
  });
});
