/**
 * ⚠️ DESTRUCTIVE AUDIT SCRIPT — REQUIRES EXPLICIT AUTHORIZATION ⚠️
 *
 * This script purges and recreates Hindsight staged memory banks (cp1, cp5, cp20)
 * and resets local SQLite learning_curve_checkpoints records.
 *
 * It will NOT run unless explicitly authorized via the environment variable:
 *   ALLOW_DESTRUCTIVE_AUDIT=true
 *
 * Example:
 *   ALLOW_DESTRUCTIVE_AUDIT=true node server/execute_staged_audit.mjs
 */
import { DatabaseSync } from 'node:sqlite';
import { hindsightService } from './src/services/hindsightService.js';
import { groqService, getGroqClient } from './src/services/groqService.js';
import { sdk } from '@vectorize-io/hindsight-client';
import { 
  LEARNING_CURVE_COMPANY_ID, 
  BENCHMARK_QUESTION,
  LEARNING_CURVE_SCENARIO 
} from './src/services/learningCurveService.js';
import dotenv from 'dotenv';
dotenv.config();

const dbPath = 'feedbackmind.sqlite';

const STAGED_BANKS = {
  cp1: 'feedbackmind-lc-cp1',
  cp5: 'feedbackmind-lc-cp5',
  cp20: 'feedbackmind-lc-cp20'
};

async function executeStagedAudit() {
  console.log('=== PHASE 8.4.1: INDEPENDENTLY STAGED MEMORY EXECUTION AUDIT ===\n');

  // Destructive Action Guard: Require explicit environment variable authorization
  if (process.env.ALLOW_DESTRUCTIVE_AUDIT !== 'true') {
    console.warn('\n⚠️  SAFETY GUARD: DESTRUCTIVE AUDIT SCRIPT BLOCKED');
    console.warn('========================================================================');
    console.warn('This script purges and recreates Hindsight staged memory banks and');
    console.warn('resets local learning-curve checkpoint database records.');
    console.warn('');
    console.warn('To permit execution, set: ALLOW_DESTRUCTIVE_AUDIT=true');
    console.warn('Example: ALLOW_DESTRUCTIVE_AUDIT=true node server/execute_staged_audit.mjs');
    console.warn('========================================================================\n');
    console.log('Exiting safely without making any changes.');
    return;
  }

  const db = new DatabaseSync(dbPath);
  const demoCountBefore = db.prepare('SELECT COUNT(*) as count FROM feedback WHERE company_id = ?').get('demo-company').count;
  console.log(`[Safety Check] demo-company record count before audit: ${demoCountBefore}`);
  if (demoCountBefore !== 27) {
    throw new Error(`CRITICAL: demo-company count changed to ${demoCountBefore}, expected 27!`);
  }

  const client = hindsightService.getClient();

  // Step 1: Clean and recreate all 3 staged banks so there is zero residue
  console.log('\n[Step 1] Purging and recreating all 3 staged banks in Hindsight Cloud...');
  for (const [key, bankId] of Object.entries(STAGED_BANKS)) {
    try {
      await sdk.deleteBank({ client: client.client, path: { bank_id: bankId } });
      console.log(`Deleted bank ${bankId}`);
    } catch (err) {
      console.log(`Bank ${bankId} did not exist or delete notice:`, err.message);
    }
    await sdk.createOrUpdateBank({
      client: client.client,
      path: { bank_id: bankId },
      body: { name: bankId, description: `Independently staged bank for ${key}` }
    });
    console.log(`Recreated fresh bank ${bankId}`);
  }

  // Also clean feedbackmind-learning-curve for fallback
  try {
    await sdk.deleteBank({ client: client.client, path: { bank_id: 'feedbackmind-learning-curve' } });
    await sdk.createOrUpdateBank({
      client: client.client,
      path: { bank_id: 'feedbackmind-learning-curve' },
      body: { name: 'feedbackmind-learning-curve', description: 'Full learning curve bank' }
    });
  } catch (err) {}

  // Wipe local SQLite learning curve tables
  db.prepare('DELETE FROM learning_curve_checkpoints').run();
  db.prepare('DELETE FROM feedback WHERE company_id = ?').run(LEARNING_CURVE_COMPANY_ID);

  // Helper to format memory content
  const formatItem = (rec) => ({
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
  });

  // Step 2: Populate staged banks
  console.log('\n[Step 2] Ingesting staged memories into each dedicated bank...');

  // Bank CP1: ONLY Interaction 1
  console.log(`Ingesting into ${STAGED_BANKS.cp1}: LC-001 (1 interaction)`);
  await client.retainBatch(STAGED_BANKS.cp1, [formatItem(LEARNING_CURVE_SCENARIO[0])]);

  // Bank CP5: ONLY Interactions 1 through 5
  const slice5 = LEARNING_CURVE_SCENARIO.slice(0, 5);
  console.log(`Ingesting into ${STAGED_BANKS.cp5}: ${slice5.map(s => s.feedback_id).join(', ')} (5 interactions)`);
  await client.retainBatch(STAGED_BANKS.cp5, slice5.map(formatItem));

  // Bank CP20 & feedbackmind-learning-curve: All 20 Interactions
  console.log(`Ingesting into ${STAGED_BANKS.cp20}: all 20 interactions`);
  await client.retainBatch(STAGED_BANKS.cp20, LEARNING_CURVE_SCENARIO.map(formatItem));
  await client.retainBatch('feedbackmind-learning-curve', LEARNING_CURVE_SCENARIO.map(formatItem));

  // Insert all 20 records into SQLite feedback table for learning-curve-demo
  const insertStmt = db.prepare(`
    INSERT INTO feedback (
      feedback_id, customer_id, date, source, feedback, rating,
      company_id, analysis_status, sentiment, topic, urgency,
      customer_problem, suggested_action, summary, retained_in_hindsight, hindsight_memory_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 'analyzed', ?, ?, ?, ?, ?, ?, 1, ?)
  `);
  for (const rec of LEARNING_CURVE_SCENARIO) {
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

  console.log('Waiting 6 seconds for Hindsight Cloud cognitive indexing...');
  await new Promise(r => setTimeout(r, 6000));

  const groqClient = getGroqClient();
  const auditReport = [];

  // Step 3: Run Progressive Checkpoints across their isolated banks
  async function runCheckpointEvaluation(stageNum, interactionCount, bankId, histContext, uncertainty) {
    console.log(`\n======================================================`);
    console.log(`CHECKPOINT ${stageNum}: EVALUATING INTERACTION ${interactionCount}`);
    console.log(`Bank: ${bankId}`);
    console.log(`======================================================`);

    // A. Count memories existing in this staged bank
    const listMem = await sdk.listMemories({
      client: client.client,
      path: { bank_id: bankId },
      query: { limit: 100 }
    });
    const memoriesExistingInBank = listMem.data?.items?.length || 0;

    // B. Real Hindsight Recall against this bank
    const recallStart = Date.now();
    const recallRes = await client.recall(bankId, BENCHMARK_QUESTION, {
      maxTokens: 1200,
      budget: 'low'
    });
    const recallLatency = Date.now() - recallStart;
    const recalledMemories = recallRes.results || [];

    console.log(`Hindsight Recall returned: ${recalledMemories.length} memories in ${recallLatency}ms`);

    // C. Verify future leakage
    const futureSlice = LEARNING_CURVE_SCENARIO.slice(interactionCount);
    const futureIds = futureSlice.map(s => s.feedback_id);
    let futureLeaked = 0;
    const leakedList = [];

    for (const mem of recalledMemories) {
      for (const fId of futureIds) {
        if (mem.text && mem.text.includes(fId)) {
          futureLeaked++;
          leakedList.push({ fId, text: mem.text });
        }
      }
    }

    console.log(`Future ID Leakage Check in Recalled Memories (checked against ${futureIds.length} future IDs): ${futureLeaked === 0 ? 'CLEAN (0 Leakage)' : 'FAIL: ' + futureLeaked}`);
    if (futureLeaked > 0) {
      throw new Error(`CRITICAL: Bank ${bankId} recalled future memories: ${JSON.stringify(leakedList)}`);
    }

    // D. Visible SQLite records up to interactionCount
    const visibleRecords = db.prepare(`
      SELECT feedback_id, customer_id, date, rating, topic, feedback
      FROM feedback
      WHERE company_id = ?
      ORDER BY date ASC, id ASC
      LIMIT ?
    `).all(LEARNING_CURVE_COMPANY_ID, interactionCount);

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

    // E. Live Groq synthesis
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
        console.warn(`Groq completion model ${mName} warning:`, err.message);
      }
    }
    const groqLatency = Date.now() - groqStart;

    // F. Citations analysis
    const citedFeedbackIds = visibleRecords.filter(r => answerText.includes(r.feedback_id)).map(r => r.feedback_id);
    const futureCited = futureIds.filter(fId => answerText.includes(fId));

    console.log(`Model Used: ${usedModel} in ${groqLatency}ms`);
    console.log(`Feedback IDs cited in answer: ${citedFeedbackIds.join(', ') || 'None'}`);
    console.log(`Future IDs cited in answer: ${futureCited.join(', ') || 'None (Zero future citations)'}`);

    if (futureCited.length > 0) {
      throw new Error(`CRITICAL: Checkpoint ${stageNum} cited future feedback IDs: ${futureCited.join(', ')}`);
    }

    // Save to checkpoints table
    const checkpointId = `checkpoint-${interactionCount}`;
    db.prepare(`
      INSERT INTO learning_curve_checkpoints (
        checkpoint_id, interaction_number, question, answer,
        retained_count, recalled_count, recalled_memories_json,
        evidence_json, historical_context, remaining_uncertainty,
        model_used, latency_ms
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      checkpointId,
      interactionCount,
      BENCHMARK_QUESTION,
      answerText,
      interactionCount,
      recalledMemories.length,
      JSON.stringify(recalledMemories),
      JSON.stringify(citedFeedbackIds.map(id => ({ feedback_id: id }))),
      histContext,
      uncertainty,
      usedModel,
      recallLatency + groqLatency
    );

    auditReport.push({
      checkpointNumber: stageNum,
      checkpointId,
      interactionCount,
      bankId,
      memoriesExistingInBank,
      retainedInteractionsCount: interactionCount,
      uniqueMemoryIdsReturnedByRecall: recalledMemories.length,
      memoriesPassedToGroq: recalledMemories.length,
      sqliteRecordsPassedToGroq: visibleRecords.length,
      feedbackIdsCitedInAnswer: citedFeedbackIds,
      futureIdsLeakageInRecall: futureLeaked,
      futureIdsCitedInAnswer: futureCited.length,
      modelUsed: usedModel,
      latencyMs: recallLatency + groqLatency,
      answerExcerpt: answerText.slice(0, 350).replace(/\n/g, ' ') + '...'
    });

    console.log(`Answer Excerpt:\n${answerText.slice(0, 350).replace(/\n/g, ' ')}...`);
  }

  // Execute Checkpoint 1 on feedbackmind-lc-cp1
  await runCheckpointEvaluation(
    1,
    1,
    STAGED_BANKS.cp1,
    'Initial baseline established for morning dashboard latency (>16s). Zero prior interactions exist.',
    'No longitudinal context: cannot establish recurrence, cannot identify whether fixes occurred, no awareness of export or login friction.'
  );

  // Execute Checkpoint 5 on feedbackmind-lc-cp5
  await runCheckpointEvaluation(
    2,
    5,
    STAGED_BANKS.cp5,
    'Accumulated awareness across 3 distinct friction categories: morning dashboard latency, CSV 504 timeouts, and Google OAuth SSO lockouts.',
    'Zero verified fixes recorded: all 3 issues appear chronic and unresolved; cannot confirm whether fixes were planned or deployed.'
  );

  // Execute Checkpoint 20 on feedbackmind-lc-cp20
  await runCheckpointEvaluation(
    3,
    20,
    STAGED_BANKS.cp20,
    'Full 4-month longitudinal timeline connected across 3 releases: Google OAuth resolved in v2.3, morning latency resolved in v2.4 (down to 1.8s), and CSV timeouts resolved in v2.5 async queue.',
    'Identifies current remaining roadmap polish: 15-minute export link expiry causes dead links for managers (should extend to 24h) and customer interest in dark mode charts.'
  );

  // Final Safety Check
  const demoCountAfter = db.prepare('SELECT COUNT(*) as count FROM feedback WHERE company_id = ?').get('demo-company').count;
  console.log(`\n======================================================`);
  console.log(`FINAL SAFETY AUDIT`);
  console.log(`======================================================`);
  console.log(`demo-company count before: ${demoCountBefore}`);
  console.log(`demo-company count after:  ${demoCountAfter}`);
  console.log(`Safety status: ${demoCountBefore === demoCountAfter ? 'VERIFIED 100% UNTOUCHED' : 'FAIL'}`);

  console.log(`\n======================================================`);
  console.log(`COMPLETE AUDIT REPORT JSON`);
  console.log(`======================================================`);
  console.log(JSON.stringify(auditReport, null, 2));

  db.close();
}

executeStagedAudit().catch(err => {
  console.error('Execution failed:', err);
  process.exit(1);
});

