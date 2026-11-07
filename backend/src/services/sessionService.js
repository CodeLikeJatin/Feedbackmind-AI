import crypto from 'crypto';
import { getDatabase } from '../config/db.js';

// Session lifetime: 2 hours of inactivity
export const SESSION_TTL_MS = 2 * 60 * 60 * 1000;

export const sessionService = {
  /**
   * Generates a new, cryptographically secure demonstration session.
   */
  createSession({
    customSessionId = null,
    customWorkspaceId = null,
    ttlMs = SESSION_TTL_MS,
    customDb = null
  } = {}) {
    const db = customDb || getDatabase();

    const sessionId = customSessionId || `sess_${crypto.randomBytes(16).toString('hex')}`;
    const sessionToken = `s_sec_${crypto.randomBytes(32).toString('hex')}`;
    const workspaceId = customWorkspaceId || `demo-session-${crypto.randomBytes(8).toString('hex')}`;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ttlMs).toISOString();
    const createdAt = now.toISOString();

    db.prepare(`
      INSERT INTO demo_sessions (session_id, session_token, workspace_id, created_at, last_active_at, expires_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(sessionId, sessionToken, workspaceId, createdAt, createdAt, expiresAt);

    return {
      sessionId,
      sessionToken,
      workspaceId,
      createdAt,
      expiresAt
    };
  },

  /**
   * Retrieves an active session by its secret bearer token.
   * Returns null if invalid or expired.
   */
  getSessionByToken(sessionToken, customDb = null) {
    if (!sessionToken || typeof sessionToken !== 'string') return null;
    const db = customDb || getDatabase();

    const row = db.prepare(`
      SELECT session_id, session_token, workspace_id, created_at, last_active_at, expires_at
      FROM demo_sessions
      WHERE session_token = ?
    `).get(sessionToken.trim());

    if (!row) return null;

    // Check expiration
    if (new Date(row.expires_at).getTime() < Date.now()) {
      return { expired: true, sessionId: row.session_id, workspaceId: row.workspace_id };
    }

    // Touch last_active_at
    try {
      db.prepare(`
        UPDATE demo_sessions
        SET last_active_at = CURRENT_TIMESTAMP
        WHERE session_token = ?
      `).run(sessionToken.trim());
    } catch {
      // ignore
    }

    return {
      sessionId: row.session_id,
      sessionToken: row.session_token,
      workspaceId: row.workspace_id,
      createdAt: row.created_at,
      lastActiveAt: row.last_active_at,
      expiresAt: row.expires_at,
      expired: false
    };
  },

  /**
   * Retrieves session metadata by public sessionId.
   */
  getSessionById(sessionId, customDb = null) {
    if (!sessionId || typeof sessionId !== 'string') return null;
    const db = customDb || getDatabase();

    const row = db.prepare(`
      SELECT session_id, session_token, workspace_id, created_at, last_active_at, expires_at
      FROM demo_sessions
      WHERE session_id = ?
    `).get(sessionId.trim());

    if (!row) return null;

    const isExpired = new Date(row.expires_at).getTime() < Date.now();
    return {
      sessionId: row.session_id,
      sessionToken: row.session_token,
      workspaceId: row.workspace_id,
      createdAt: row.created_at,
      lastActiveAt: row.last_active_at,
      expiresAt: row.expires_at,
      expired: isExpired
    };
  },

  /**
   * Validates whether a given sessionToken owns the requested sessionId.
   */
  verifySessionOwnership(sessionToken, sessionId, customDb = null) {
    if (!sessionToken || !sessionId) return false;
    const session = this.getSessionByToken(sessionToken, customDb);
    if (!session || session.expired) return false;
    return session.sessionId === String(sessionId).trim();
  },

  /**
   * Validates whether a given sessionToken has access to a specific workspaceId.
   */
  verifyWorkspaceOwnership(sessionToken, workspaceId, customDb = null) {
    if (!workspaceId) return false;
    const trimmed = String(workspaceId).trim();

    // Standard public demo workspaces are globally readable
    const standardPublicWorkspaces = [
      'demo-company',
      'learning-curve-demo',
      'learning-curve-cp1',
      'learning-curve-cp5',
      'learning-curve-cp20'
    ];
    if (standardPublicWorkspaces.includes(trimmed)) {
      return true;
    }

    // Isolated demo session workspaces strictly require matching session token
    if (trimmed.startsWith('demo-session-')) {
      if (!sessionToken) return false;
      const session = this.getSessionByToken(sessionToken, customDb);
      if (!session || session.expired) return false;
      return session.workspaceId === trimmed;
    }

    return false;
  },

  /**
   * Cleans up expired demo sessions and their associated isolated feedback and chat data.
   */
  cleanupExpiredSessions(customDb = null) {
    const db = customDb || getDatabase();
    const nowIso = new Date().toISOString();

    const expiredRows = db.prepare(`
      SELECT session_id, workspace_id
      FROM demo_sessions
      WHERE expires_at < ?
    `).all(nowIso);

    if (!expiredRows || expiredRows.length === 0) {
      return { cleanedSessions: 0, cleanedFeedback: 0, cleanedChat: 0 };
    }

    let cleanedFeedback = 0;
    let cleanedChat = 0;

    db.exec('BEGIN TRANSACTION');
    try {
      const deleteFeedbackStmt = db.prepare('DELETE FROM feedback WHERE company_id = ?');
      const deleteChatStmt = db.prepare('DELETE FROM chat_history WHERE session_id = ?');

      for (const row of expiredRows) {
        const fbRes = deleteFeedbackStmt.run(row.workspace_id);
        cleanedFeedback += fbRes.changes || 0;

        const chatRes = deleteChatStmt.run(row.session_id);
        cleanedChat += chatRes.changes || 0;
      }

      const delSessionsRes = db.prepare('DELETE FROM demo_sessions WHERE expires_at < ?').run(nowIso);

      db.exec('COMMIT');
      return {
        cleanedSessions: delSessionsRes.changes || expiredRows.length,
        cleanedFeedback,
        cleanedChat
      };
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }
  }
};

