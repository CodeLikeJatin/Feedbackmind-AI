import Groq from 'groq-sdk';
import { config } from '../config/env.js';
import { getDatabase } from '../config/db.js';

const SYSTEM_PROMPT = `You are FeedbackMind AI, an expert customer feedback synthesizer for SaaS products.
Analyze the provided customer feedback and output a strictly valid JSON object.

Output JSON format must match this exact schema:
{
  "sentiment": "positive" | "negative" | "neutral",
  "topic": "performance" | "login" | "pricing" | "ui" | "bugs" | "features" | "support" | "integrations" | "other",
  "urgency": "low" | "medium" | "high",
  "customer_problem": string or null (concise description of the specific friction or pain point, or null if feedback is purely praise/feature request),
  "feature_request": string or null (specific capability requested, or null if not a feature request),
  "summary": string (1-2 sentences summarizing the core message),
  "suggested_action": string (recommended engineering, design, or product action)
}

Rules:
1. "sentiment" must be strictly one of: "positive", "negative", "neutral".
2. "urgency" must be "high" if system is broken, data is lost, login fails, or user is blocked; "medium" if workflow is slowed down; "low" for praise, minor suggestions, or general comments.
3. Be objective, accurate, and evidence-grounded. Do not invent details not mentioned in the customer voice.
4. Output JSON only. No markdown fences, no conversational preamble.`;

export function validateAnalysisSchema(data) {
  if (!data || typeof data !== 'object') {
    throw new Error('Analysis output is not an object');
  }

  const validSentiments = ['positive', 'negative', 'neutral'];
  const validUrgencies = ['low', 'medium', 'high'];

  const sentiment = (data.sentiment || '').toLowerCase();
  if (!validSentiments.includes(sentiment)) {
    throw new Error(`Invalid sentiment: "${data.sentiment}". Expected positive, negative, or neutral.`);
  }

  const urgency = (data.urgency || '').toLowerCase();
  if (!validUrgencies.includes(urgency)) {
    throw new Error(`Invalid urgency: "${data.urgency}". Expected low, medium, or high.`);
  }

  const topic = (data.topic || 'other').toLowerCase();

  return {
    sentiment,
    topic,
    urgency,
    customer_problem: data.customer_problem ? String(data.customer_problem).trim() : null,
    feature_request: data.feature_request ? String(data.feature_request).trim() : null,
    summary: data.summary ? String(data.summary).trim() : 'Customer feedback recorded.',
    suggested_action: data.suggested_action ? String(data.suggested_action).trim() : 'Review feedback with engineering team.'
  };
}

let groqClientInstance = null;

export function getGroqClient() {
  if (!config.groq.apiKey) {
    return null;
  }
  if (!groqClientInstance) {
    groqClientInstance = new Groq({ apiKey: config.groq.apiKey });
  }
  return groqClientInstance;
}

export const groqService = {
  isConfigured() {
    return Boolean(config.groq.apiKey && config.groq.apiKey.trim());
  },

  /**
   * Analyze a single piece of feedback text using Groq
   */
  async analyzeFeedback({ feedback, rating, source, customer_id, model } = {}) {
    if (!feedback || !String(feedback).trim()) {
      return {
        sentiment: 'neutral',
        topic: 'other',
        urgency: 'low',
        customer_problem: null,
        feature_request: null,
        summary: 'Empty feedback received.',
        suggested_action: 'No action required.'
      };
    }

    const client = getGroqClient();
    if (!client) {
      throw new Error('GROQ_API_KEY is not configured in backend .env. Please add GROQ_API_KEY to server/.env.');
    }

    const userPrompt = `Customer Feedback:
"${feedback}"
${rating ? `Rating: ${rating} / 5` : ''}
${source ? `Source: ${source}` : ''}
${customer_id ? `Customer: ${customer_id}` : ''}`;

    let lastError = null;
    const modelsToTry = [
      model,
      config.groq.model || 'openai/gpt-oss-120b',
      'openai/gpt-oss-120b',
      'openai/gpt-oss-20b',
      config.groq.fallbackModel
    ].filter((m, i, arr) => m && arr.indexOf(m) === i);

    for (const modelName of modelsToTry) {
      try {
        const response = await client.chat.completions.create({
          model: modelName,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: userPrompt }
          ],
          response_format: { type: 'json_object' },
          temperature: 0.1,
          max_tokens: 500
        });

        const rawContent = response.choices[0]?.message?.content;
        if (!rawContent) {
          throw new Error('Groq returned empty response content');
        }

        const parsedJson = JSON.parse(rawContent);
        const validated = validateAnalysisSchema(parsedJson);
        return {
          ...validated,
          model_used: modelName
        };
      } catch (err) {
        lastError = err;
        // If rate limited (429) or model not found (404), retry with next model in catalogue
        if (err.status === 429 || err.code === 'rate_limit_exceeded' || err.status === 404 || err.code === 'model_not_found') {
          console.warn(`Groq model ${modelName} unavailable (${err.code || err.status}), trying next candidate...`);
          continue;
        }
        // If JSON parsing error or invalid schema, throw
        break;
      }
    }

    throw new Error(`Groq feedback analysis failed: ${lastError?.message || 'Unknown error'}`);
  },

  /**
   * Analyze batch of pending records in SQLite
   */
  async analyzePendingBatch({ companyId = 'demo-company', limit = 10, model } = {}) {
    const db = getDatabase();
    const pendingRecords = db.prepare(`
      SELECT * FROM feedback 
      WHERE company_id = ? AND analysis_status = 'pending'
      ORDER BY id ASC
      LIMIT ?
    `).all(companyId, limit);

    if (pendingRecords.length === 0) {
      return { total: 0, analyzed: 0, failed: 0, results: [] };
    }

    let analyzedCount = 0;
    let failedCount = 0;
    const results = [];

    const updateSuccessStmt = db.prepare(`
      UPDATE feedback SET
        sentiment = ?,
        topic = ?,
        urgency = ?,
        customer_problem = ?,
        feature_request = ?,
        summary = ?,
        suggested_action = ?,
        analysis_status = 'analyzed'
      WHERE id = ?
    `);

    const updateFailedStmt = db.prepare(`
      UPDATE feedback SET
        analysis_status = 'failed'
      WHERE id = ?
    `);

    for (const record of pendingRecords) {
      try {
        const analysis = await this.analyzeFeedback({
          feedback: record.feedback,
          rating: record.rating,
          source: record.source,
          customer_id: record.customer_id,
          model
        });

        updateSuccessStmt.run(
          analysis.sentiment,
          analysis.topic,
          analysis.urgency,
          analysis.customer_problem,
          analysis.feature_request,
          analysis.summary,
          analysis.suggested_action,
          record.id
        );

        analyzedCount++;
        results.push({
          id: record.id,
          feedback_id: record.feedback_id,
          status: 'analyzed',
          ...analysis
        });
      } catch (err) {
        updateFailedStmt.run(record.id);
        failedCount++;
        results.push({
          id: record.id,
          feedback_id: record.feedback_id,
          status: 'failed',
          error: err.message
        });
      }
    }

    return {
      total: pendingRecords.length,
      analyzed: analyzedCount,
      failed: failedCount,
      results
    };
  }
};

