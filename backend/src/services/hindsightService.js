import { HindsightClient } from '@vectorize-io/hindsight-client';
import { config } from '../config/env.js';
import { getDatabase } from '../config/db.js';
import { isAllowedWorkspace } from '../middleware/security.js';

let hindsightClientInstance = null;

export function getHindsightClient() {
  if (!config.hindsight.apiKey) {
    return null;
  }
  if (!hindsightClientInstance) {
    hindsightClientInstance = new HindsightClient({
      baseUrl: config.hindsight.baseUrl || 'https://api.hindsight.vectorize.io',
      apiKey: config.hindsight.apiKey
    });
  }
  return hindsightClientInstance;
}

export const hindsightService = {
  isConfigured() {
    return Boolean(config.hindsight.apiKey && config.hindsight.apiKey.trim());
  },

  getClient() {
    return getHindsightClient();
  },

  /**
   * Resolves the dedicated, isolated bank ID for a specific SaaS company.
   */
  resolveBankId(companyId = 'demo-company') {
    if (companyId === 'demo-company') {
      return config.hindsight.bankId || 'feedbackmind-demo';
    }
    if (companyId === 'learning-curve-cp1' || companyId === 'lc-cp1') {
      return 'feedbackmind-lc-cp1';
    }
    if (companyId === 'learning-curve-cp5' || companyId === 'lc-cp5') {
      return 'feedbackmind-lc-cp5';
    }
    if (companyId === 'learning-curve-cp20' || companyId === 'lc-cp20') {
      return 'feedbackmind-lc-cp20';
    }
    if (companyId === 'learning-curve-demo' || companyId === 'learning-curve') {
      return 'feedbackmind-learning-curve';
    }
    // Clean companyId to alphanumeric + hyphens
    const sanitized = String(companyId).toLowerCase().replace(/[^a-z0-9-]/g, '-');
    return `fbm-${sanitized}`;
  },

  /**
   * Ensures the isolated memory bank exists in Hindsight Cloud.
   */
  async ensureBank(companyId = 'demo-company') {
    const client = this.getClient();
    if (!client) {
      throw new Error('HINDSIGHT_API_KEY is not configured in backend .env');
    }

    if (companyId.startsWith('demo-session-')) {
      throw new Error(`Personal uploaded session data (${companyId}) cannot be retained in Hindsight Cloud.`);
    }

    if (!isAllowedWorkspace(companyId)) {
      throw new Error(`Unauthorized workspace "${companyId}": Hindsight bank creation is prohibited in public demo mode.`);
    }

    const bankId = this.resolveBankId(companyId);
    const db = getDatabase();

    // Check if recorded in local DB
    const bankRow = db.prepare('SELECT * FROM company_memory_banks WHERE company_id = ?').get(companyId);

    try {
      // Create or update bank in Hindsight Cloud
      const profile = await client.createBank(bankId, {
        name: `FeedbackMind - ${companyId}`,
        background: `FeedbackMind AI customer feedback memory bank for company ${companyId}. Retains multi-month customer issues, feature requests, and product sentiment.`,
        disposition: {
          skepticism: 2,
          empathy: 4,
          literalism: 4
        }
      });

      if (!bankRow) {
        db.prepare('INSERT OR REPLACE INTO company_memory_banks (company_id, bank_id) VALUES (?, ?)').run(companyId, bankId);
      }

      return profile;
    } catch (err) {
      // If bank already exists, retrieve from listBanks
      try {
        const { sdk } = await import('@vectorize-io/hindsight-client');
        const banksRes = await sdk.listBanks({ client: client.client });
        const existing = banksRes?.data?.banks?.find(b => b.bank_id === bankId);
        if (existing) {
          if (!bankRow) {
            db.prepare('INSERT OR REPLACE INTO company_memory_banks (company_id, bank_id) VALUES (?, ?)').run(companyId, bankId);
          }
          return existing;
        }
        throw err;
      } catch (getErr) {
        throw new Error(`Failed to initialize Hindsight memory bank "${bankId}": ${err.message}`);
      }
    }
  },

  /**
   * Format structured feedback record into an episodic memory item.
   */
  formatMemoryContent(record) {
    const parts = [
      `[${record.date}] Customer ${record.customer_id} via ${record.source} (Rating: ${record.rating}/5):`,
      `"${record.feedback}"`,
      `Sentiment: ${record.sentiment || 'neutral'}, Topic: ${record.topic || 'general'}, Urgency: ${record.urgency || 'low'}.`
    ];

    if (record.customer_problem) {
      parts.push(`Customer Problem: ${record.customer_problem}.`);
    }
    if (record.feature_request) {
      parts.push(`Feature Request: ${record.feature_request}.`);
    }
    if (record.summary) {
      parts.push(`Summary: ${record.summary}`);
    }
    if (record.suggested_action) {
      parts.push(`Suggested Action: ${record.suggested_action}`);
    }

    return parts.join(' ');
  },

  /**
   * RETAIN — Retain an individual feedback record in Hindsight.
   */
  async retainFeedback(record, companyId = 'demo-company') {
    const client = this.getClient();
    if (!client) {
      throw new Error('HINDSIGHT_API_KEY is not configured in backend .env');
    }

    if (companyId.startsWith('demo-session-')) {
      throw new Error(`Personal uploaded session data (${companyId}) cannot be retained in Hindsight Cloud.`);
    }

    // Prevent duplicate retention if already marked retained
    if (record.retained_in_hindsight) {
      return {
        alreadyRetained: true,
        feedback_id: record.feedback_id,
        memoryId: record.hindsight_memory_id
      };
    }

    const bankId = this.resolveBankId(companyId);
    const content = this.formatMemoryContent(record);

    const response = await client.retain(bankId, content, {
      timestamp: record.date ? new Date(record.date).toISOString() : new Date().toISOString(),
      context: record.topic || 'feedback',
      metadata: {
        feedback_id: String(record.feedback_id),
        company_id: String(companyId),
        topic: String(record.topic || 'general'),
        sentiment: String(record.sentiment || 'neutral'),
        urgency: String(record.urgency || 'low')
      }
    });

    // Update SQLite record with retained status and memory ID
    const memoryId = `mem_${record.feedback_id}_${Date.now()}`;
    const db = getDatabase();
    db.prepare(`
      UPDATE feedback SET
        retained_in_hindsight = 1,
        hindsight_memory_id = ?
      WHERE id = ? OR feedback_id = ?
    `).run(memoryId, record.id || 0, record.feedback_id);

    return {
      success: true,
      feedback_id: record.feedback_id,
      bankId,
      memoryId,
      hindsightResponse: response
    };
  },

  /**
   * RETAIN BATCH — Retain all analyzed records for a company that have not yet been retained.
   */
  async retainBatchFeedback({ companyId = 'demo-company', limit = 50 } = {}) {
    const client = this.getClient();
    if (!client) {
      throw new Error('HINDSIGHT_API_KEY is not configured in backend .env');
    }

    if (companyId.startsWith('demo-session-')) {
      throw new Error(`Personal uploaded session data (${companyId}) cannot be retained in Hindsight Cloud.`);
    }

    const db = getDatabase();
    // Query analyzed records not yet retained in Hindsight
    const unRetainedRecords = db.prepare(`
      SELECT * FROM feedback
      WHERE company_id = ? AND retained_in_hindsight = 0 AND (analysis_status = 'analyzed' OR sentiment IS NOT NULL)
      ORDER BY date ASC, id ASC
      LIMIT ?
    `).all(companyId, limit);

    if (unRetainedRecords.length === 0) {
      return { total: 0, retained: 0, skipped: 0, items: [] };
    }

    const bankId = this.resolveBankId(companyId);
    const memoryItems = unRetainedRecords.map(record => ({
      content: this.formatMemoryContent(record),
      timestamp: record.date ? new Date(record.date).toISOString() : new Date().toISOString(),
      context: record.topic || 'feedback',
      metadata: {
        feedback_id: String(record.feedback_id),
        company_id: String(companyId),
        topic: String(record.topic || 'general'),
        sentiment: String(record.sentiment || 'neutral')
      }
    }));

    // Call official SDK retainBatch
    const response = await client.retainBatch(bankId, memoryItems);

    // Update SQLite records
    const updateStmt = db.prepare(`
      UPDATE feedback SET
        retained_in_hindsight = 1,
        hindsight_memory_id = ?
      WHERE feedback_id = ? AND company_id = ?
    `);

    db.exec('BEGIN TRANSACTION');
    try {
      for (const rec of unRetainedRecords) {
        updateStmt.run(`mem_${rec.feedback_id}`, rec.feedback_id, companyId);
      }
      db.exec('COMMIT');
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }

    return {
      total: unRetainedRecords.length,
      retained: unRetainedRecords.length,
      bankId,
      response
    };
  },

  /**
   * RECALL — Contextual semantic search of historical memories.
   */
  async recallMemories({ query, companyId = 'demo-company', maxTokens = 1200, budget = 'low' } = {}) {
    if (!query || !String(query).trim()) {
      return { query: '', results: [], total: 0 };
    }

    const client = this.getClient();
    if (!client) {
      throw new Error('HINDSIGHT_API_KEY is not configured in backend .env');
    }

    if (companyId.startsWith('demo-session-')) {
      throw new Error(`Personal uploaded session data (${companyId}) cannot be retained in Hindsight Cloud.`);
    }

    const bankId = this.resolveBankId(companyId);
    const recallResponse = await client.recall(bankId, query, {
      maxTokens,
      budget: budget || 'low'
    });

    const memories = (recallResponse.results || []).map(r => ({
      id: r.id,
      text: r.text,
      context: r.context,
      type: r.type,
      entities: r.entities || [],
      occurred_start: r.occurred_start
    }));

    return {
      bankId,
      query,
      results: memories,
      total: memories.length,
      trace: recallResponse.trace || null
    };
  },

  /**
   * REFLECT — Multi-month synthesis and pattern discovery across memories.
   */
  async reflectOnMemories({ query, context, companyId = 'demo-company', budget = 'low' } = {}) {
    if (!query || !String(query).trim()) {
      return { query: '', text: 'No query provided for reflection.', based_on: [] };
    }

    const client = this.getClient();
    if (!client) {
      throw new Error('HINDSIGHT_API_KEY is not configured in backend .env');
    }

    if (companyId.startsWith('demo-session-')) {
      throw new Error(`Personal uploaded session data (${companyId}) cannot be retained in Hindsight Cloud.`);
    }

    const bankId = this.resolveBankId(companyId);
    const reflectResponse = await client.reflect(bankId, query, {
      context: context || 'Customer feedback pattern discovery',
      budget: budget || 'low'
    });

    return {
      bankId,
      query,
      text: reflectResponse.text,
      based_on: reflectResponse.based_on || []
    };
  },

  /**
   * Status and profile of active memory bank.
   */
  async getBankOverview(companyId = 'demo-company') {
    const bankId = this.resolveBankId(companyId);
    const db = getDatabase();

    const statsRow = db.prepare(`
      SELECT 
        COUNT(*) as totalFeedback,
        SUM(CASE WHEN retained_in_hindsight = 1 THEN 1 ELSE 0 END) as retainedFeedback
      FROM feedback
      WHERE company_id = ?
    `).get(companyId);

    let profile = null;
    let serviceOnline = false;

    if (this.isConfigured()) {
      try {
        const client = this.getClient();
        let bankProfile = null;
        try {
          bankProfile = await client.getBankProfile(bankId);
        } catch {
          // getBankProfile endpoint was deprecated by Hindsight Cloud in favor of listBanks/config
        }

        if (!bankProfile) {
          const { sdk } = await import('@vectorize-io/hindsight-client');
          const banksRes = await sdk.listBanks({ client: client.client });
          bankProfile = banksRes?.data?.banks?.find(b => b.bank_id === bankId) || null;
        }

        profile = bankProfile;
        serviceOnline = Boolean(bankProfile);
      } catch (err) {
        // Service or bank profile error
        profile = { error: err.message };
      }
    }

    return {
      configured: this.isConfigured(),
      serviceOnline,
      companyId,
      bankId,
      profile,
      totalFeedback: statsRow?.totalFeedback || 0,
      retainedFeedback: statsRow?.retainedFeedback || 0
    };
  }
};
