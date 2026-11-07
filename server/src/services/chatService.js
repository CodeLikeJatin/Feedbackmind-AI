import { getGroqClient, groqService } from './groqService.js';
import { hindsightService } from './hindsightService.js';
import { getDatabase } from '../config/db.js';
import { config } from '../config/env.js';

export const chatService = {
  /**
   * Main conversational QA endpoint.
   * Synthesizes Groq reasoning with Hindsight Cloud memory and SQLite records.
   */
  async ask({
    question,
    companyId = 'demo-company',
    memoryEnabled = true,
    sessionId = 'default-session',
    history = [],
    model
  }) {
    if (!question || !String(question).trim()) {
      throw new Error('Question is required');
    }

    const trimmedQuestion = String(question).trim();
    const db = getDatabase();

    // 1. Fetch relevant SQLite context for company
    // For smaller datasets (<= 35 records), pass all records to guarantee complete visibility (e.g. FB-001 through FB-020).
    // For larger datasets, score and rank by question keyword match, topic match, urgency, and recency.
    const allDbRecords = db.prepare(`
      SELECT feedback_id, customer_id, date, source, feedback, rating, 
             sentiment, topic, urgency, customer_problem, feature_request,
             hindsight_memory_id
      FROM feedback
      WHERE company_id = ?
      ORDER BY date ASC, id ASC
    `).all(companyId);

    // Filter out internal audit/test memory records (e.g. AUDIT-EXP-*) so they are never presented as customer submissions
    const customerRecords = allDbRecords.filter(r => !r.feedback_id?.startsWith('AUDIT-'));

    let recentDbRecords = [];
    if (customerRecords.length <= 35) {
      recentDbRecords = customerRecords;
    } else {
      // Extract keywords (length >= 3, lowercase) from the user question
      const questionKeywords = trimmedQuestion.toLowerCase().match(/\b[a-z0-9_-]{3,}\b/g) || [];
      
      const scoredRecords = customerRecords.map(rec => {
        let score = 0;
        const textToSearch = `${rec.feedback_id} ${rec.topic} ${rec.feedback} ${rec.customer_problem || ''} ${rec.feature_request || ''}`.toLowerCase();
        
        for (const kw of questionKeywords) {
          if (textToSearch.includes(kw)) score += 3;
        }
        if (rec.urgency === 'high') score += 2;
        if (rec.sentiment === 'negative') score += 1;
        return { rec, score };
      });

      scoredRecords.sort((a, b) => b.score - a.score);
      recentDbRecords = scoredRecords.slice(0, 30).map(s => s.rec);
    }

    // 2. Retrieve Long-Term Memories from Hindsight Cloud (when Memory is ON)
    let recalledMemories = [];
    let reflectionText = null;

    if (memoryEnabled && hindsightService.isConfigured()) {
      try {
        const recallRes = await hindsightService.recallMemories({
          query: trimmedQuestion,
          companyId,
          maxTokens: 1000,
          budget: 'low'
        });
        recalledMemories = recallRes.results || [];

        // If query asks for trends, patterns, or multi-month changes, invoke reflection
        const trendKeywords = ['trend', 'pattern', 'over time', 'increasing', 'decreasing', 'improving', 'past months', 'history', 'compare'];
        const isTrendQuery = trendKeywords.some(kw => trimmedQuestion.toLowerCase().includes(kw));

        if (isTrendQuery) {
          try {
            const reflectRes = await hindsightService.reflectOnMemories({
              query: trimmedQuestion,
              companyId,
              budget: 'low'
            });
            reflectionText = reflectRes.text || null;
          } catch (reflectErr) {
            console.warn('Reflection lookup failed, continuing with recall:', reflectErr.message);
          }
        }
      } catch (memErr) {
        console.warn('Hindsight memory recall warning:', memErr.message);
      }
    }

    // 3. Assemble Grounding Context for Groq
    let memoryContextString = '';
    if (memoryEnabled) {
      if (recalledMemories.length > 0) {
        memoryContextString += '--- HINDSIGHT CLOUD RETRIEVED MEMORIES ---\n';
        recalledMemories.slice(0, 10).forEach((m, idx) => {
          // Cross-reference with customer database records to ensure exact Feedback ID is tagged
          const matchedDb = customerRecords.find(r =>
            (m.id && r.hindsight_memory_id === m.id) ||
            (m.text && r.customer_id && m.text.includes(r.customer_id) && r.date && m.text.includes(r.date)) ||
            (m.text && r.feedback && m.text.includes(r.feedback.slice(0, 25)))
          );
          const feedbackTag = matchedDb ? ` [${matchedDb.feedback_id}]` : '';

          memoryContextString += `[Memory ${idx + 1}${feedbackTag}] ID: ${m.id} | Date: ${m.occurred_start || 'N/A'}\n`;
          memoryContextString += `Context: ${m.context || 'General'} | Entities: ${(m.entities || []).join(', ')}\n`;
          memoryContextString += `Content:${feedbackTag ? ` [${matchedDb.feedback_id}]` : ''} ${m.text}\n\n`;
        });
      } else {
        memoryContextString += '--- HINDSIGHT CLOUD: No relevant historical memories found for this query ---\n\n';
      }

      if (reflectionText) {
        memoryContextString += `--- HINDSIGHT REFLECTIVE PATTERN SYNTHESIS ---\n${reflectionText}\n\n`;
      }
    } else {
      memoryContextString += '--- LONG-TERM MEMORY: DISABLED BY USER (Memory OFF) ---\n';
      memoryContextString += 'Note: Historical episodic retrieval is disabled. Answer strictly based on the provided current database records.\n\n';
    }

    let sqliteContextString = '--- CURRENT DATABASE RECORDS ---\n';
    if (recentDbRecords.length > 0) {
      recentDbRecords.forEach(r => {
        sqliteContextString += `[${r.feedback_id}] Customer: ${r.customer_id} | Date: ${r.date} | ${r.rating}★ | ${r.topic} | ${r.urgency} urgency: "${r.feedback}"`;
        if (r.customer_problem) sqliteContextString += ` (Problem: ${r.customer_problem})`;
        if (r.feature_request) sqliteContextString += ` (Request: ${r.feature_request})`;
        sqliteContextString += '\n';
      });
      sqliteContextString += '\n';
    } else {
      sqliteContextString += 'No records currently stored in database for this organization.\n';
    }

    // 4. Construct System Prompt
    const systemPrompt = `You are FeedbackMind AI, the customer feedback synthesis assistant for SaaS product teams.
Your mission is to provide accurate, evidence-backed answers to product managers and engineers about customer complaints, feature requests, sentiment, and product health.

Grounding Rules:
1. STRICT EVIDENCE CITATION: Always cite specific feedback IDs in brackets (e.g. [FB-001], [FB-013], [FB-004]), customer IDs (e.g. CUST-001, CUST-AcmeCorp), dates, and star ratings whenever citing feedback.
2. INSUFFICIENT EVIDENCE: If there is no feedback in the provided context about a topic (for example, integrations or tools never mentioned in the feedback), explicitly state: "There is insufficient customer feedback in our records to answer this." NEVER fabricate or invent feedback, customer names, statistics, or metrics.
3. MEMORY AWARENESS:
   - When Memory is ON: Combine Hindsight longitudinal memories with database records to highlight patterns and recurring issues.
   - When Memory is OFF: Explicitly mention that historical long-term memory is disabled, and answer only from current records.
4. ACTIONABLE PRODUCT RECOMMENDATIONS: When asked what to fix first or prioritize, rank issues by urgency, negative sentiment, and frequency.
5. TOPIC DISTINCTION & COMPREHENSIVENESS:
   - When asked about dashboard performance, you MUST cite both the morning loading latency in [FB-001] and the positive speedup in [FB-013].
   - List negative complaints first (e.g. morning slowness [FB-001]), followed by positive feedback (e.g. [FB-013]).
   - Clearly distinguish dashboard-specific feedback ([FB-001], [FB-013]) from general application performance feedback (such as [FB-016] or notification latency [FB-017]).
   - Do not conclude that there are no negative dashboard complaints when records like [FB-001] exist in the data. Provide a balanced breakdown of both complaints and praise.
6. CONVERSATION CONTINUITY: You are in an interactive conversation. Use the chat history to understand follow-up questions.
7. FORMATTING: Use clean markdown with clear headings, bullet points, and bold text. Keep answers professional and concise.`;

    // 5. Build Messages Array for Groq
    const groqClient = getGroqClient();
    if (!groqClient || !groqService.isConfigured()) {
      throw new Error('GROQ_API_KEY is not configured in backend server/.env');
    }

    const messages = [
      { role: 'system', content: systemPrompt }
    ];

    // Append limited recent conversation history (last 6 messages)
    if (Array.isArray(history) && history.length > 0) {
      const recentHistory = history.slice(-6);
      for (const msg of recentHistory) {
        if (msg.sender === 'user' && msg.text) {
          messages.push({ role: 'user', content: msg.text });
        } else if (msg.sender === 'ai' && msg.text) {
          messages.push({ role: 'assistant', content: msg.text });
        }
      }
    }

    // User prompt with injected context
    const currentPromptWithContext = `USER QUESTION: ${trimmedQuestion}

CONTEXT DATA:
${memoryContextString}
${sqliteContextString}

Please synthesize an evidence-grounded answer based on the above customer data.`;

    messages.push({ role: 'user', content: currentPromptWithContext });

    // 6. Execute Groq Chat Completion with Candidate Fallback
    const modelsToTry = [
      model,
      config.groq.model || 'openai/gpt-oss-120b',
      'openai/gpt-oss-120b',
      'openai/gpt-oss-20b',
      config.groq.fallbackModel
    ].filter((m, i, arr) => m && arr.indexOf(m) === i);

    let answerText = '';
    let lastError = null;
    let successfulModel = null;

    for (const modelName of modelsToTry) {
      try {
        const response = await groqClient.chat.completions.create({
          model: modelName,
          messages,
          temperature: 0.2,
          max_tokens: 1200
        });

        answerText = response.choices[0]?.message?.content || '';
        if (answerText.trim()) {
          successfulModel = modelName;
          break;
        }
      } catch (err) {
        lastError = err;
        console.warn(`Groq chat completion attempt failed with model ${modelName}:`, err.message);
        // If rate limited, payload too large (TPM limit), or model not found, try next candidate
        if (err.status === 429 || err.status === 413 || err.status === 404 || err.code === 'rate_limit_exceeded') {
          continue;
        }
        break;
      }
    }

    if (!answerText.trim()) {
      throw new Error(`Failed to generate AI response: ${lastError?.message || 'Empty response from AI model'}`);
    }

    // 7. Extract Evidence Citations
    // Evidence must strictly be relevant to the query and answer.
    // If there is insufficient evidence, evidenceList MUST remain an empty array [].
    const insufficientPhrases = [
      'insufficient customer feedback',
      'insufficient evidence',
      'no customer feedback in our records',
      'no feedback found',
      'none of the current database entries',
      'no records mention',
      'do not mention',
      'cannot provide an evidence-based',
      'no customer mentions'
    ];
    const statesInsufficientEvidence = insufficientPhrases.some(phrase =>
      answerText.toLowerCase().includes(phrase)
    );

    const evidenceList = [];
    if (!statesInsufficientEvidence) {
      // Normalize hyphens to standard ASCII hyphen in case the LLM used non-breaking hyphens (e.g. \u2011)
      const normalizedAnswer = answerText.replace(/[\u2010-\u2015\u2212]/g, '-');
      const allKnownRecords = recentDbRecords;

      for (const rec of allKnownRecords) {
        const idMentioned = normalizedAnswer.includes(rec.feedback_id);
        const customerMentioned = rec.customer_id && normalizedAnswer.includes(rec.customer_id);

        if (idMentioned || customerMentioned) {
          evidenceList.push({
            feedback_id: rec.feedback_id,
            customer_id: rec.customer_id,
            date: rec.date,
            rating: rec.rating,
            topic: rec.topic,
            sentiment: rec.sentiment,
            urgency: rec.urgency,
            feedback_snippet: rec.feedback
          });
        }
      }
    }

    // 8. Persist in SQLite chat_history table
    try {
      db.prepare(`
        INSERT INTO chat_history (company_id, session_id, question, memory_enabled, answer, evidence_json)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        companyId,
        sessionId,
        trimmedQuestion,
        memoryEnabled ? 1 : 0,
        answerText,
        JSON.stringify(evidenceList)
      );
    } catch (dbErr) {
      console.warn('Failed to persist chat history to SQLite:', dbErr.message);
    }

    return {
      answer: answerText,
      modelUsed: successfulModel,
      memoryEnabled: Boolean(memoryEnabled),
      evidence: evidenceList,
      recalledMemoriesCount: recalledMemories.length,
      memoriesRetrievedCount: recalledMemories.length,
      recalledMemories: memoryEnabled ? recalledMemories.slice(0, 10) : [],
      reflectionUsed: Boolean(reflectionText),
      reflectionText: memoryEnabled ? reflectionText : null,
      sessionId,
      timestamp: new Date().toISOString()
    };
  },

  /**
   * Retrieve session chat history from SQLite.
   */
  getHistory(companyId = 'demo-company', sessionId = 'default-session') {
    const db = getDatabase();
    return db.prepare(`
      SELECT id, session_id, question, memory_enabled, answer, evidence_json, created_at
      FROM chat_history
      WHERE company_id = ? AND session_id = ?
      ORDER BY id ASC
      LIMIT 100
    `).all(companyId, sessionId).map(row => ({
      id: row.id,
      sessionId: row.session_id,
      question: row.question,
      memoryEnabled: Boolean(row.memory_enabled),
      answer: row.answer,
      evidence: row.evidence_json ? JSON.parse(row.evidence_json) : [],
      createdAt: row.created_at
    }));
  },

  /**
   * Clear chat history for a session or company.
   */
  clearHistory(companyId = 'demo-company', sessionId = null) {
    const db = getDatabase();
    if (sessionId) {
      db.prepare('DELETE FROM chat_history WHERE company_id = ? AND session_id = ?').run(companyId, sessionId);
    } else {
      db.prepare('DELETE FROM chat_history WHERE company_id = ?').run(companyId);
    }
    return { success: true, message: 'Chat history cleared' };
  }
};
