import { getDatabase } from './src/config/db.js';
import { csvService } from './src/services/csvService.js';
import { groqService } from './src/services/groqService.js';
import { hindsightService } from './src/services/hindsightService.js';
import { chatService } from './src/services/chatService.js';
import { trendService } from './src/services/trendService.js';
import { demoService } from './src/services/demoService.js';
import { feedbackDbService } from './src/services/feedbackDbService.js';

async function runPhase8MasterAudit() {
  console.log('================================================================');
  console.log('FEEDBACKMIND AI — PHASE 8 MASTER QUALITY ASSURANCE & AUDIT');
  console.log('================================================================\n');

  const report = {
    timestamp: new Date().toISOString(),
    workflows: {},
    security: {},
    databaseIntegrity: {},
    liveApis: {},
    performance: {}
  };

  const db = getDatabase();

  // Baseline database snapshot
  const initialDemoCount = db.prepare('SELECT COUNT(*) as count FROM feedback WHERE company_id = ?').get('demo-company')?.count || 0;
  const initialTotalCount = db.prepare('SELECT COUNT(*) as count FROM feedback').get()?.count || 0;
  console.log(`[Baseline Snapshot] Total SQLite rows: ${initialTotalCount} ('demo-company': ${initialDemoCount})`);

  // ---------------------------------------------------------------------------
  // 1. DATABASE INTEGRITY CHECKS
  // ---------------------------------------------------------------------------
  console.log('\n--- 1. SQLite Database Integrity & Schema Audit ---');
  const integrityPragma = db.prepare('PRAGMA integrity_check').all();
  const foreignKeyPragma = db.prepare('PRAGMA foreign_key_check').all();
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all().map(t => t.name);

  console.log(`Integrity Check: ${JSON.stringify(integrityPragma)}`);
  console.log(`Foreign Key Check: ${JSON.stringify(foreignKeyPragma)}`);
  console.log(`Registered Tables: ${tables.join(', ')}`);

  const integrityPassed = integrityPragma.length === 1 && integrityPragma[0].integrity_check === 'ok';
  report.databaseIntegrity = {
    status: integrityPassed ? 'PASS' : 'FAIL',
    integrityCheck: integrityPragma[0]?.integrity_check || 'failed',
    foreignKeyViolations: foreignKeyPragma.length,
    tables
  };

  // ---------------------------------------------------------------------------
  // 2. WORKFLOW A: Full Ingestion -> DB -> Groq -> Hindsight -> Chat Lifecycle
  // ---------------------------------------------------------------------------
  console.log('\n--- 2. Workflow A: New Customer Feedback Lifecycle (Isolated Tenant) ---');
  const QA_COMPANY = `qa-audit-${Date.now()}`;
  try {
    // 2a. Ingest Valid CSV
    const csvData = `feedback_id,customer_id,date,source,feedback,rating
QA-001,CUST-QA-Alpha,2026-10-18,Zendesk,"The new batch export feature is fantastic and saves our finance team hours.",5.0
QA-002,CUST-QA-Beta,2026-10-19,Intercom,"Invoice generation page is returning 500 server error when taxes are enabled.",1.0`;

    const csvResult = csvService.processCsv({ csvContent: csvData, companyId: QA_COMPANY });
    console.log(`- CSV Processing: Imported ${csvResult.imported}/${csvResult.totalRows} records (Duplicates: ${csvResult.duplicates})`);

    // 2b. Confirm SQLite Persistence
    const savedRows = db.prepare('SELECT feedback_id, analysis_status, retained_in_hindsight FROM feedback WHERE company_id = ?').all(QA_COMPANY);
    const dbPersisted = savedRows.length === 2 && savedRows.every(r => r.analysis_status === 'pending');
    console.log(`- SQLite Persistence: Confirmed ${savedRows.length} rows stored with analysis_status='pending'`);

    // 2c. Analyze Feedback using Groq
    let analysisOk = false;
    if (groqService.isConfigured()) {
      const analyzedRecord = await groqService.analyzeFeedback({
        feedbackText: "The new batch export feature is fantastic and saves our finance team hours.",
        rating: 5.0,
        source: 'Zendesk'
      });
      analysisOk = ['positive', 'neutral', 'negative'].includes(analyzedRecord.sentiment) && Boolean(analyzedRecord.urgency);
      console.log(`- Groq Analysis: Sentiment="${analyzedRecord.sentiment}", Urgency="${analyzedRecord.urgency}", Action="${analyzedRecord.suggested_action}"`);
      
      // Update DB record
      db.prepare(`
        UPDATE feedback 
        SET sentiment = ?, urgency = ?, topic = ?, analysis_status = 'analyzed'
        WHERE feedback_id = 'QA-001' AND company_id = ?
      `).run(analyzedRecord.sentiment, analyzedRecord.urgency, analyzedRecord.topic, QA_COMPANY);
    }

    // 2d. Retain in Hindsight
    let retainOk = false;
    if (hindsightService.isConfigured()) {
      const retainResult = await hindsightService.retainBatchFeedback({
        companyId: QA_COMPANY,
        limit: 10
      });
      retainOk = retainResult.retained >= 1;
      console.log(`- Hindsight Retention: Retained ${retainResult.retained} memory into bank "${retainResult.bankId}"`);
    }

    report.workflows.workflowA = {
      status: (csvResult.imported === 2 && dbPersisted && analysisOk && retainOk) ? 'PASS' : 'FAIL',
      csvImported: csvResult.imported,
      dbPersisted,
      groqAnalysis: analysisOk,
      hindsightRetention: retainOk
    };
  } finally {
    // Clean up temporary isolated QA tenant
    db.prepare('DELETE FROM feedback WHERE company_id = ?').run(QA_COMPANY);
    db.prepare('DELETE FROM chat_history WHERE company_id = ?').run(QA_COMPANY);
  }

  // ---------------------------------------------------------------------------
  // 3. WORKFLOW B: Memory OFF Zero Hindsight Retrieval Guarantee
  // ---------------------------------------------------------------------------
  console.log('\n--- 3. Workflow B: Memory OFF Zero Retrieval Audit ---');
  const tOffStart = Date.now();
  const offResult = await demoService.executeMode({
    question: "Has dashboard performance improved over time?",
    companyId: 'demo-company',
    memoryEnabled: false
  });
  const tOffDuration = Date.now() - tOffStart;

  const offPassed = 
    offResult.mode === 'memory_off' &&
    offResult.memoryEnabled === false &&
    offResult.hindsightAccessed === false &&
    offResult.memoryRecallCount === 0 &&
    offResult.recalledMemories.length === 0 &&
    offResult.reflectionText === null &&
    offResult.evidence.every(e => !e.feedback_id.startsWith('AUDIT-'));

  console.log(`- Memory OFF Mode: ${offResult.mode}`);
  console.log(`- Hindsight Accessed: ${offResult.hindsightAccessed} (Recall count: ${offResult.memoryRecallCount})`);
  console.log(`- Evidence Count: ${offResult.evidence.length} (Citations: ${offResult.sourceFeedbackIds.join(', ')})`);
  console.log(`- System Audit IDs Excluded: ${offResult.evidence.every(e => !e.feedback_id.startsWith('AUDIT-'))}`);

  report.workflows.workflowB = {
    status: offPassed ? 'PASS' : 'FAIL',
    latencyMs: tOffDuration,
    hindsightAccessed: offResult.hindsightAccessed,
    memoryRecallCount: offResult.memoryRecallCount,
    evidenceCount: offResult.evidence.length,
    auditIdsExcluded: offResult.evidence.every(e => !e.feedback_id.startsWith('AUDIT-'))
  };

  // ---------------------------------------------------------------------------
  // 4. WORKFLOW C: Memory ON Historical Retrieval & Grounding
  // ---------------------------------------------------------------------------
  console.log('\n--- 4. Workflow C: Memory ON Grounded Retrieval Audit ---');
  const tOnStart = Date.now();
  const onResult = await demoService.executeMode({
    question: "Has dashboard performance improved over time?",
    companyId: 'demo-company',
    memoryEnabled: true
  });
  const tOnDuration = Date.now() - tOnStart;

  const onPassed = 
    onResult.mode === 'memory_on' &&
    onResult.memoryEnabled === true &&
    onResult.hindsightAccessed === true &&
    onResult.memoryRecallCount > 0 &&
    onResult.evidence.every(e => !e.feedback_id.startsWith('AUDIT-'));

  console.log(`- Memory ON Mode: ${onResult.mode}`);
  console.log(`- Hindsight Accessed: ${onResult.hindsightAccessed} (Memories retrieved: ${onResult.memoryRecallCount})`);
  console.log(`- Reflection Active: ${onResult.reflectionUsed}`);
  console.log(`- Evidence Count: ${onResult.evidence.length} (Citations: ${onResult.sourceFeedbackIds.join(', ')})`);
  console.log(`- System Audit IDs Excluded: ${onResult.evidence.every(e => !e.feedback_id.startsWith('AUDIT-'))}`);

  report.workflows.workflowC = {
    status: onPassed ? 'PASS' : 'FAIL',
    latencyMs: tOnDuration,
    hindsightAccessed: onResult.hindsightAccessed,
    memoryRecallCount: onResult.memoryRecallCount,
    reflectionUsed: onResult.reflectionUsed,
    evidenceCount: onResult.evidence.length,
    auditIdsExcluded: onResult.evidence.every(e => !e.feedback_id.startsWith('AUDIT-'))
  };

  // ---------------------------------------------------------------------------
  // 5. WORKFLOW D: Insufficient Evidence Handling
  // ---------------------------------------------------------------------------
  console.log('\n--- 5. Workflow D: Insufficient Evidence Guard Audit ---');
  const unmentionedQuestion = "What are customers saying about Kubernetes and Apache Kafka clusters?";
  const resInsufficientOn = await demoService.executeMode({
    question: unmentionedQuestion,
    companyId: 'demo-company',
    memoryEnabled: true
  });

  const resInsufficientOff = await demoService.executeMode({
    question: unmentionedQuestion,
    companyId: 'demo-company',
    memoryEnabled: false
  });

  const onTextLower = resInsufficientOn.answer.toLowerCase();
  const offTextLower = resInsufficientOff.answer.toLowerCase();
  const statesInsufficientOn = onTextLower.includes('insufficient') || onTextLower.includes('no customer feedback') || onTextLower.includes('no records');
  const statesInsufficientOff = offTextLower.includes('insufficient') || offTextLower.includes('no customer feedback') || offTextLower.includes('no records');

  console.log(`- Memory ON Insufficient Guard: ${statesInsufficientOn} (Citations: ${resInsufficientOn.evidence.length})`);
  console.log(`- Memory OFF Insufficient Guard: ${statesInsufficientOff} (Citations: ${resInsufficientOff.evidence.length})`);

  const workflowDPassed = statesInsufficientOn && statesInsufficientOff && resInsufficientOn.evidence.length === 0 && resInsufficientOff.evidence.length === 0;
  report.workflows.workflowD = {
    status: workflowDPassed ? 'PASS' : 'FAIL',
    memoryOnZeroCitations: resInsufficientOn.evidence.length === 0,
    memoryOffZeroCitations: resInsufficientOff.evidence.length === 0,
    statedInsufficientOn: statesInsufficientOn,
    statedInsufficientOff: statesInsufficientOff
  };

  // ---------------------------------------------------------------------------
  // 6. WORKFLOW E: Data Persistence Across Re-initialization
  // ---------------------------------------------------------------------------
  console.log('\n--- 6. Workflow E: Data Persistence Across Connection Re-initialization ---');
  // Re-read connection directly from SQLite
  const reloadedDb = getDatabase();
  const reloadedDemoCount = reloadedDb.prepare('SELECT COUNT(*) as count FROM feedback WHERE company_id = ?').get('demo-company')?.count || 0;
  const reloadedTotalCount = reloadedDb.prepare('SELECT COUNT(*) as count FROM feedback').get()?.count || 0;

  const persistencePassed = reloadedDemoCount === initialDemoCount && reloadedTotalCount === initialTotalCount;
  console.log(`- Persistence Check: Initial Demo Count=${initialDemoCount}, Reloaded Demo Count=${reloadedDemoCount}`);
  console.log(`- Total DB Row Count: Initial Total=${initialTotalCount}, Reloaded Total=${reloadedTotalCount}`);

  report.workflows.workflowE = {
    status: persistencePassed ? 'PASS' : 'FAIL',
    initialDemoCount,
    reloadedDemoCount,
    initialTotalCount,
    reloadedTotalCount
  };

  // ---------------------------------------------------------------------------
  // 7. PERFORMANCE BENCHMARKS
  // ---------------------------------------------------------------------------
  console.log('\n--- 7. Performance & Latency Benchmarks ---');
  
  // Benchmark 1: Dashboard Stats
  const tStatStart = Date.now();
  const stats = feedbackDbService.getStats({ companyId: 'demo-company' });
  const statDuration = Date.now() - tStatStart;

  // Benchmark 2: Feedback List with Filter
  const tListStart = Date.now();
  const list = feedbackDbService.getFeedbackList({ companyId: 'demo-company', limit: 50, topic: 'performance' });
  const listDuration = Date.now() - tListStart;

  // Benchmark 3: Trend Calculation
  const tTrendStart = Date.now();
  const trends = await trendService.detectTrends({ companyId: 'demo-company', memoryEnabled: false });
  const trendDuration = Date.now() - tTrendStart;

  // Benchmark 4: Product Recommendations
  const tRecStart = Date.now();
  const recs = await trendService.getRecommendations({ companyId: 'demo-company', memoryEnabled: false });
  const recDuration = Date.now() - tRecStart;

  console.log(`- Dashboard Stats Latency: ${statDuration} ms (${stats.total} total items)`);
  console.log(`- Filtered List Latency: ${listDuration} ms (${list.items.length} matched items)`);
  console.log(`- Trend Engine Latency (Memory OFF): ${trendDuration} ms (${trends.frequentProblems?.length} problems aggregated)`);
  console.log(`- Recommendation Engine Latency (Memory OFF): ${recDuration} ms (${recs.recommendations?.length} recommendations)`);

  report.performance = {
    dashboardStatsMs: statDuration,
    filteredListMs: listDuration,
    trendEngineMs: trendDuration,
    recommendationsEngineMs: recDuration
  };

  // ---------------------------------------------------------------------------
  // 8. FINAL DATA INTEGRITY CONFIRMATION
  // ---------------------------------------------------------------------------
  console.log('\n--- 8. Final SQLite Data Mutation & Non-Destructive Verification ---');
  const finalDemoCount = db.prepare('SELECT COUNT(*) as count FROM feedback WHERE company_id = ?').get('demo-company')?.count || 0;
  const finalTotalCount = db.prepare('SELECT COUNT(*) as count FROM feedback').get()?.count || 0;

  const dataPreserved = finalDemoCount === initialDemoCount && finalTotalCount === initialTotalCount;
  console.log(`Initial Demo records: ${initialDemoCount} | Final Demo records: ${finalDemoCount}`);
  console.log(`Initial Total records: ${initialTotalCount} | Final Total records: ${finalTotalCount}`);
  console.log(`Data Preservation Verified: ${dataPreserved}`);

  // ---------------------------------------------------------------------------
  // SUMMARY
  // ---------------------------------------------------------------------------
  console.log('\n================================================================');
  console.log('MASTER AUDIT SUMMARY RESULTS');
  console.log('================================================================');
  let allPass = true;
  for (const [wf, res] of Object.entries(report.workflows)) {
    console.log(`- ${wf}: ${res.status}`);
    if (res.status !== 'PASS') allPass = false;
  }
  console.log(`- databaseIntegrity: ${report.databaseIntegrity.status}`);
  if (report.databaseIntegrity.status !== 'PASS') allPass = false;
  console.log(`- dataPreservation: ${dataPreserved ? 'PASS' : 'FAIL'}`);
  if (!dataPreserved) allPass = false;

  console.log(`\nOVERALL AUDIT STATUS: ${allPass ? 'ALL AUDITS PASSED (PASS)' : 'FAILURES DETECTED (FAIL)'}`);
  return { allPass, report };
}

runPhase8MasterAudit().catch(err => {
  console.error('Fatal master audit error:', err);
  process.exit(1);
});
