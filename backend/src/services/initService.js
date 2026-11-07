/**
 * Automated Database Self-Healing & Demonstration Initialization Service
 *
 * Ensures that on cold-start deployments (such as Render ephemeral instances or clean environments),
 * the required synthetic demonstration data is automatically and idempotently populated:
 * 1. 27 demo-company feedback records (multi-month trend baseline).
 * 2. 20 learning-curve-demo scenario records (chronological SaaS journey).
 * 3. 3 pre-synthesized learning curve checkpoints (Checkpoints 1, 5, 20).
 *
 * Guarantees:
 * - 100% idempotent: checks counts before inserting.
 * - Never overwrites or mutates existing customer or demo records.
 * - Dispatches ZERO external Hindsight or Groq API calls.
 */
import { getDatabase } from '../config/db.js';
import { DEMO_COMPANY_FIXTURE } from '../utils/demoCompanyFixture.js';
import { CHECKPOINT_FIXTURE } from '../utils/checkpointFixture.js';
import { LEARNING_CURVE_SCENARIO } from './learningCurveService.js';

export const initService = {
  /**
   * Initializes all required synthetic fixtures in the database if missing.
   * Safe to call on every server startup.
   */
  ensureAllFixtures(customDb = null) {
    const db = customDb || getDatabase();

    const demoResult = this.ensureDemoCompany(db);
    const lcResult = this.ensureLearningCurveScenario(db);
    const cpResult = this.ensureCheckpoints(db);

    return {
      success: true,
      demoCompany: demoResult,
      learningCurveScenario: lcResult,
      checkpoints: cpResult
    };
  },

  ensureDemoCompany(db) {
    const row = db.prepare('SELECT COUNT(*) as count FROM feedback WHERE company_id = ?').get('demo-company');
    if (row && row.count >= 27) {
      return { seeded: false, count: row.count };
    }

    const stmt = db.prepare(`
      INSERT OR REPLACE INTO feedback (
        feedback_id, customer_id, date, source, feedback, rating,
        company_id, analysis_status, sentiment, topic, urgency,
        customer_problem, feature_request, summary, suggested_action,
        retained_in_hindsight, hindsight_memory_id
      ) VALUES (
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?
      )
    `);

    db.exec('BEGIN TRANSACTION');
    try {
      let count = 0;
      for (const r of DEMO_COMPANY_FIXTURE) {
        stmt.run(
          r.feedback_id,
          r.customer_id,
          r.date,
          r.source,
          r.feedback,
          r.rating,
          'demo-company',
          r.analysis_status || 'analyzed',
          r.sentiment,
          r.topic,
          r.urgency,
          r.customer_problem,
          r.feature_request,
          r.summary,
          r.suggested_action,
          r.retained_in_hindsight || 0,
          r.hindsight_memory_id || null
        );
        count++;
      }
      db.exec('COMMIT');
      return { seeded: true, count };
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }
  },

  ensureLearningCurveScenario(db) {
    const row = db.prepare('SELECT COUNT(*) as count FROM feedback WHERE company_id = ?').get('learning-curve-demo');
    if (row && row.count >= 20) {
      return { seeded: false, count: row.count };
    }

    const stmt = db.prepare(`
      INSERT OR REPLACE INTO feedback (
        feedback_id, customer_id, date, source, feedback, rating,
        company_id, analysis_status, sentiment, topic, urgency,
        customer_problem, feature_request, summary, suggested_action,
        retained_in_hindsight, hindsight_memory_id
      ) VALUES (
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?
      )
    `);

    db.exec('BEGIN TRANSACTION');
    try {
      let count = 0;
      for (const item of LEARNING_CURVE_SCENARIO) {
        stmt.run(
          item.feedback_id,
          item.customer_id,
          item.date,
          item.source,
          item.feedback,
          item.rating,
          'learning-curve-demo',
          'analyzed',
          item.sentiment,
          item.topic,
          item.urgency,
          item.customer_problem,
          item.feature_request || null,
          item.summary,
          item.suggested_action,
          1,
          `mem_${item.feedback_id}`
        );
        count++;
      }
      db.exec('COMMIT');
      return { seeded: true, count };
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }
  },

  ensureCheckpoints(db) {
    const row = db.prepare('SELECT COUNT(*) as count FROM learning_curve_checkpoints').get();
    if (row && row.count >= 3) {
      return { seeded: false, count: row.count };
    }

    const stmt = db.prepare(`
      INSERT OR REPLACE INTO learning_curve_checkpoints (
        checkpoint_id, interaction_number, question, answer,
        retained_count, recalled_count, recalled_memories_json,
        evidence_json, historical_context, remaining_uncertainty,
        model_used, latency_ms, created_at
      ) VALUES (
        ?, ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?
      )
    `);

    db.exec('BEGIN TRANSACTION');
    try {
      let count = 0;
      for (const cp of CHECKPOINT_FIXTURE) {
        stmt.run(
          cp.checkpoint_id,
          cp.interaction_number,
          cp.question,
          cp.answer,
          cp.retained_count,
          cp.recalled_count,
          cp.recalled_memories_json,
          cp.evidence_json,
          cp.historical_context,
          cp.remaining_uncertainty,
          cp.model_used,
          cp.latency_ms,
          cp.created_at
        );
        count++;
      }
      db.exec('COMMIT');
      return { seeded: true, count };
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }
  }
};

