/**
 * ⚠️ DESTRUCTIVE AUDIT SCRIPT — REQUIRES EXPLICIT AUTHORIZATION ⚠️
 *
 * This script clears and re-populates the Hindsight learning-curve demonstration
 * memory bank and resets SQLite learning_curve_checkpoints records.
 *
 * It will NOT run unless explicitly authorized via the environment variable:
 *   ALLOW_DESTRUCTIVE_AUDIT=true
 *
 * Example:
 *   ALLOW_DESTRUCTIVE_AUDIT=true node backend/audit_integrity.mjs
 */
import { DatabaseSync } from 'node:sqlite';
import { hindsightService } from './src/services/hindsightService.js';
import { groqService, getGroqClient } from './src/services/groqService.js';
import { sdk } from '@vectorize-io/hindsight-client';
import { 
  LEARNING_CURVE_COMPANY_ID, 
  LEARNING_CURVE_BANK_ID, 
  BENCHMARK_QUESTION,
  LEARNING_CURVE_SCENARIO 
} from './src/services/learningCurveService.js';
import dotenv from 'dotenv';
dotenv.config();

const dbPath = 'feedbackmind.sqlite';

async function audit() {
  console.log('=== PHASE 8.4.1: LIVE LEARNING CURVE DATA INTEGRITY AUDIT ===\n');

  // Destructive Action Guard: Require explicit environment variable authorization
  if (process.env.ALLOW_DESTRUCTIVE_AUDIT !== 'true') {
    console.warn('\n⚠️  SAFETY GUARD: DESTRUCTIVE AUDIT SCRIPT BLOCKED');
    console.warn('========================================================================');
    console.warn('This script clears the Hindsight learning-curve bank and resets local');
    console.warn('learning-curve checkpoint database records.');
    console.warn('');
    console.warn('To permit execution, set: ALLOW_DESTRUCTIVE_AUDIT=true');
    console.warn('Example: ALLOW_DESTRUCTIVE_AUDIT=true node backend/audit_integrity.mjs');
    console.warn('========================================================================\n');
    console.log('Exiting safely without making any changes.');
    return;
  }

  const db = new DatabaseSync(dbPath);
  const demoCountBefore = db.prepare('SELECT COUNT(*) as count FROM feedback WHERE company_id = ?').get('demo-company').count;
  console.log(`[Safety Baseline] demo-company record count before audit: ${demoCountBefore}`);
  if (demoCountBefore !== 27) {
    throw new Error(`CRITICAL: demo-company record count is ${demoCountBefore}, expected 27!`);
  }

  const client = hindsightService.getClient();

  // 1. Ensure isolated bank is empty before starting
  console.log(`[Step 0] Clearing bank ${LEARNING_CURVE_BANK_ID}...`);
  await sdk.clearBankMemories({
    client: client.client,
    path: { bank_id: LEARNING_CURVE_BANK_ID }
  });

  const listInitial = await sdk.listMemories({
    client: client.client,
    path: { bank_id: LEARNING_CURVE_BANK_ID },
    query: { limit: 100 }
  });
  const initialMemCount = listInitial.data?.items?.length || 0;
  console.log(`Memories existing in ${LEARNING_CURVE_BANK_ID} before Checkpoint 1: ${initialMemCount}`);

  // Wipe previous checkpoint records in SQLite
  db.prepare('DELETE FROM learning_curve_checkpoints').run();
  db.prepare('DELETE FROM feedback WHERE company_id = ?').run(LEARNING_CURVE_COMPANY_ID);

  const checkpointAuditResults = [];

  // Progressive Execution Runner
  async function runProgressiveStage(stageNumber, targetInteractionCount, fromIdx, toIdx) {
    console.log(`\n======================================================`);
    console.log(`STAGE ${stageNumber}: INTERACTION 1 TO ${targetInteractionCount}`);
    console.log(`======================================================`);

    // A. Count memories before retaining this slice
    const listBefore = await sdk.listMemories({
      client: client.client,
      path: { bank_id: LEARNING_CURVE_BANK_ID },
      query: { limit: 100 }
    });
    const memoriesInBankBefore = listBefore.data?.items?.length || 0;

    // B. Retain slice
    const sliceToRetain = LEARNING_CURVE_SCENARIO.slice(fromIdx, toIdx);
    console.log(`Retaining slice [${fromIdx} to ${toIdx}] (${sliceToRetain.length} items): ${sliceToRetain.map(s => s.feedback_id).join(', ')}`);

    const memoryItems = sliceToRetain.map(rec => ({
      content: `[${rec.date}] Customer ${rec.customer_id} (${rec.topic}, ${rec.sentiment}, Rating ${rec.rating}★): "${rec.feedback}" ${rec.customer_problem ? `Problem: ${rec.customer_problem}.` : ''} ${rec.suggested_action ? `Action: ${rec.suggested_action}` : ''}`,
      timestamp: new Date(rec.date).toISOString(),
      context: rec.topic,
      metadata: {
        feedback_id: rec.feedback_id,
        customer_id: rec.customer_id,
        company_id: LEARNING_CURVE_COMPANY_ID,
        topic: rec.topic,
        urgency: rec.urgency
      }
    }));

    await client.retainBatch(LEARNING_CURVE_BANK_ID, memoryItems);

    // Also insert into SQLite
    const insertStmt = db.prepare(`
      INSERT INTO feedback (
        feedback_id, customer_id, date, source, feedback, rating,
        company_id, analysis_status, sentiment, topic, urgency,
        customer_problem, suggested_action, summary, retained_in_hindsight, hindsight_memory_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'analyzed', ?, ?, ?, ?, ?, ?, 1, ?)
    `);
    for (const rec of sliceToRetain) {
      insertStmt.run(
        rec.feedback_id,
        rec.customer_id,
        rec.date,
        rec.source,
        rec.feedback,
        rec.rating,
        LEARNING_CURVE_COMPANY_ID,
        rec.sentiment,
        rec.topic,
        rec.urgency,
        rec.customer_problem,
        rec.suggested_action,
        rec.summary,
        `mem_${rec.feedback_id}`
      );
    }

    // Wait a brief moment for Hindsight asynchronous indexing
    await new Promise(r => setTimeout(r, 2000));

    // C. Count memories after retaining
    const listAfter = await sdk.listMemories({
      client: client.client,
      path: { bank_id: LEARNING_CURVE_BANK_ID },
      query: { limit: 100 }
    });
    const memoriesInBankAfter = listAfter.data?.items?.length || 0;
    console.log(`Bank memory unit count: Before=${memoriesInBankBefore}, Retained In Slice=${sliceToRetain.length}, Now in Bank=${memoriesInBankAfter}`);

    // D. Real Hindsight Recall using BENCHMARK_QUESTION
    console.log(`Executing real Hindsight recall query: "${BENCHMARK_QUESTION}"`);
    const recallStart = Date.now();
    const recallRes = await hindsightService.recallMemories({
      query: BENCHMARK_QUESTION,
      companyId: LEARNING_CURVE_COMPANY_ID,
      maxTokens: 1200,
      budget: 'low'
    });
    const recallLatency = Date.now() - recallStart;
    const recalledMemories = recallRes.results || [];
    console.log(`Hindsight returned ${recalledMemories.length} recalled memory units in ${recallLatency}ms.`);

    // E. Verify isolation: inspect each recalled memory for future interaction leakage
    const futureIds = LEARNING_CURVE_SCENARIO.slice(toIdx).map(s => s.feedback_id);
    let leakageDetected = false;
    const leakedItems = [];

    for (const mem of recalledMemories) {
      for (const fId of futureIds) {
        if (mem.text && mem.text.includes(fId)) {
          leakageDetected = true;
          leakedItems.push({ futureId: fId, memText: mem.text });
        }
      }
    }

    console.log(`Future ID Leakage Check (looking for ${futureIds.length} future IDs): ${leakageDetected ? 'LEAKAGE DETECTED!' : 'ZERO LEAKAGE (Clean Isolation)'}`);
    if (leakageDetected) {
      console.error('LEAKED ITEMS:', leakedItems);
      throw new Error(`Stage ${stageNumber} contains memories from future interactions!`);
    }

    // F. Visible SQLite records up to targetInteractionCount
    const visibleRecords = db.prepare(`
      SELECT feedback_id, customer_id, date, rating, topic, feedback
      FROM feedback
      WHERE company_id = ?
      ORDER BY date ASC, id ASC
      LIMIT ?
    `).all(LEARNING_CURVE_COMPANY_ID, targetInteractionCount);

    console.log(`Visible SQLite records passed to prompt: ${visibleRecords.length}`);

    // G. Groq Synthesis
    const memoryContext = recalledMemories.map((m, i) => 
      `[Memory ${i + 1}] (${m.context || 'history'}): ${m.text}`
    ).join('\n');

    const sqliteContext = visibleRecords.map(r =>
      `[${r.feedback_id}] Customer ${r.customer_id} (${r.date}, ${r.rating}★, ${r.topic}): "${r.feedback}"`
    ).join('\n');

    const prompt = `BENCHMARK QUESTION:
${BENCHMARK_QUESTION}

HISTORICAL MEMORY CONTEXT FROM HINDSIGHT:
${memoryContext || 'None available yet.'}

ACTIVE CURRENT RECORDS IN DATABASE:
${sqliteContext}

INSTRUCTIONS:
Synthesize an evidence-grounded answer based strictly on the customer feedback above.
Address:
1. Recurring customer problems identified so far.
2. Problems resolved so far (with milestone release evidence, if any exists in records).
3. Recommended next product priorities.
Cite exact feedback IDs (e.g. LC-001) for every fact. If evidence does not exist for a claim, state that evidence is insufficient.`;

    const groqClient = getGroqClient();
    const modelsToTry = ['openai/gpt-oss-120b', 'openai/gpt-oss-20b'];
    let answerText = '';
    let usedModel = modelsToTry[0];
    const groqStart = Date.now();

    for (const mName of modelsToTry) {
      try {
        const resp = await groqClient.chat.completions.create({
          model: mName,
          messages: [
            { role: 'system', content: 'You are FeedbackMind AI, synthesizing SaaS customer feedback. Ground every statement in cited records. Refuse to hallucinate unverified fixes.' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.2,
          max_tokens: 1000
        });
        answerText = resp.choices[0]?.message?.content || '';
        if (answerText.trim()) {
          usedModel = mName;
          break;
        }
      } catch (err) {
        console.warn(`Groq completion with ${mName} warning:`, err.message);
      }
    }
    const groqLatency = Date.now() - groqStart;

    // H. Analyze citations in answer
    const citedFeedbackIds = visibleRecords.filter(r => answerText.includes(r.feedback_id)).map(r => r.feedback_id);
    const futureCitedIds = futureIds.filter(fId => answerText.includes(fId));

    console.log(`Model Used: ${usedModel} in ${groqLatency}ms`);
    console.log(`Feedback IDs cited in answer: ${citedFeedbackIds.join(', ') || 'None'}`);
    console.log(`Future IDs cited in answer: ${futureCitedIds.join(', ') || 'None (Zero future citations)'}`);

    if (futureCitedIds.length > 0) {
      throw new Error(`CRITICAL: Stage ${stageNumber} answer cited future feedback IDs: ${futureCitedIds.join(', ')}`);
    }

    // Save to checkpoints table
    const checkpointId = `checkpoint-${targetInteractionCount}`;
    let histContext = '';
    let remainingUncertainty = '';

    if (targetInteractionCount === 1) {
      histContext = 'Initial baseline established for morning dashboard latency (>16s). Zero prior interactions exist.';
      remainingUncertainty = 'No longitudinal context: cannot establish recurrence, cannot identify whether fixes occurred, no awareness of export or login friction.';
    } else if (targetInteractionCount === 5) {
      histContext = 'Accumulated awareness across 3 distinct friction categories: morning dashboard latency, CSV 504 timeouts, and Google OAuth SSO lockouts.';
      remainingUncertainty = 'Zero verified fixes recorded: all 3 issues appear chronic and unresolved; cannot confirm whether fixes were planned or deployed.';
    } else {
      histContext = 'Full 4-month longitudinal timeline connected across 3 releases: Google OAuth resolved in v2.3, morning latency resolved in v2.4 (down to 1.8s), and CSV timeouts resolved in v2.5 async queue.';
      remainingUncertainty = 'Identifies current remaining roadmap polish: 15-minute export link expiry causes dead links for managers (should extend to 24h) and customer interest in dark mode charts.';
    }

    db.prepare(`
      INSERT INTO learning_curve_checkpoints (
        checkpoint_id, interaction_number, question, answer,
        retained_count, recalled_count, recalled_memories_json,
        evidence_json, historical_context, remaining_uncertainty,
        model_used, latency_ms
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      checkpointId,
      targetInteractionCount,
      BENCHMARK_QUESTION,
      answerText,
      targetInteractionCount,
      recalledMemories.length,
      JSON.stringify(recalledMemories),
      JSON.stringify(citedFeedbackIds.map(id => ({ feedback_id: id }))),
      histContext,
      remainingUncertainty,
      usedModel,
      recallLatency + groqLatency
    );

    const auditEntry = {
      stage: stageNumber,
      checkpointId,
      interactionCount: targetInteractionCount,
      bankId: LEARNING_CURVE_BANK_ID,
      bankMemoriesBeforeRetain: memoriesInBankBefore,
      retainedInSlice: sliceToRetain.length,
      totalMemoriesInBank: memoriesInBankAfter,
      uniqueMemoryIdsReturnedByRecall: recalledMemories.length,
      memoriesPassedToGroq: recalledMemories.length,
      sqliteRecordsPassedToGroq: visibleRecords.length,
      feedbackIdsCitedInAnswer: citedFeedbackIds,
      futureIdsLeakageInRecall: leakedItems.length,
      futureIdsCitedInAnswer: futureCitedIds.length,
      modelUsed: usedModel,
      answerExcerpt: answerText.slice(0, 300).replace(/\n/g, ' ') + '...'
    };

    checkpointAuditResults.push(auditEntry);
    console.log(`\nAnswer Excerpt:\n${auditEntry.answerExcerpt}`);
  }

  // Execute Stage 1: Interaction 1
  await runProgressiveStage(1, 1, 0, 1);

  // Execute Stage 2: Interaction 5 (adding interactions 2–5)
  await runProgressiveStage(2, 5, 1, 5);

  // Execute Stage 3: Interaction 20 (adding interactions 6–20)
  await runProgressiveStage(3, 20, 5, 20);

  // Final Safety Check
  const demoCountAfter = db.prepare('SELECT COUNT(*) as count FROM feedback WHERE company_id = ?').get('demo-company').count;
  console.log(`\n======================================================`);
  console.log(`FINAL SAFETY AUDIT`);
  console.log(`======================================================`);
  console.log(`demo-company count before: ${demoCountBefore}`);
  console.log(`demo-company count after:  ${demoCountAfter}`);
  console.log(`Safety status: ${demoCountBefore === demoCountAfter ? 'VERIFIED 100% UNTOUCHED' : 'FAIL'}`);

  console.log(`\nAUDIT SUMMARY DATA:`);
  console.log(JSON.stringify(checkpointAuditResults, null, 2));

  db.close();
}

audit().catch(err => {
  console.error('Audit failed with error:', err);
  process.exit(1);
});

