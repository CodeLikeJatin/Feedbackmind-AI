import { demoService } from './src/services/demoService.js';
import { getDatabase } from './src/config/db.js';

async function runLivePhase7Verification() {
  console.log('=== PHASE 7: MEMORY ON/OFF JUDGING DEMO LIVE VERIFICATION ===\n');

  const liveResults = {};
  const db = getDatabase();

  const initialCountRow = db.prepare('SELECT COUNT(*) as count FROM feedback WHERE company_id = ?').get('demo-company');
  const initialCount = initialCountRow?.count || 0;
  console.log(`Initial SQLite records for 'demo-company': ${initialCount}`);

  // -------------------------------------------------------------------------
  // SCENARIO A: Dashboard performance with Memory OFF
  // -------------------------------------------------------------------------
  console.log('\n--- [Scenario A] Dashboard performance with Memory OFF (SQLite Only) ---');
  const qA = "Has dashboard performance improved over time?";
  const tAStart = Date.now();
  const resA = await demoService.executeMode({
    question: qA,
    companyId: 'demo-company',
    memoryEnabled: false
  });
  const tADuration = Date.now() - tAStart;

  console.log(`Execution time: ${tADuration} ms`);
  console.log(`Mode: ${resA.mode} (Memory Enabled: ${resA.memoryEnabled})`);
  console.log(`Hindsight Accessed: ${resA.hindsightAccessed} (Recall count: ${resA.memoryRecallCount})`);
  console.log(`Memory Used: ${resA.memoryUsed}`);
  console.log(`Evidence items count: ${resA.evidence.length}`);
  console.log(`Source Feedback IDs: ${resA.sourceFeedbackIds.join(', ')}`);
  console.log(`Answer excerpt:\n${resA.answer.substring(0, 250)}...\n`);

  const scenarioAPass = 
    resA.mode === 'memory_off' &&
    resA.memoryEnabled === false &&
    resA.hindsightAccessed === false &&
    resA.memoryRecallCount === 0 &&
    resA.memoryUsed === false &&
    resA.recalledMemories.length === 0 &&
    resA.reflectionText === null &&
    resA.sqliteRecordCount === initialCount &&
    resA.answer.length > 50;

  liveResults.scenarioA_memoryOff = {
    status: scenarioAPass ? 'PASS' : 'FAIL',
    latencyMs: tADuration,
    mode: resA.mode,
    hindsightAccessed: resA.hindsightAccessed,
    memoryRecallCount: resA.memoryRecallCount,
    evidenceCount: resA.evidence.length,
    citedIds: resA.sourceFeedbackIds
  };

  // -------------------------------------------------------------------------
  // SCENARIO B: Dashboard performance with Memory ON
  // -------------------------------------------------------------------------
  console.log('\n--- [Scenario B] Dashboard performance with Memory ON (SQLite + Hindsight) ---');
  const qB = "Has dashboard performance improved over time?";
  const tBStart = Date.now();
  const resB = await demoService.executeMode({
    question: qB,
    companyId: 'demo-company',
    memoryEnabled: true
  });
  const tBDuration = Date.now() - tBStart;

  console.log(`Execution time: ${tBDuration} ms`);
  console.log(`Mode: ${resB.mode} (Memory Enabled: ${resB.memoryEnabled})`);
  console.log(`Hindsight Accessed: ${resB.hindsightAccessed} (Recall count: ${resB.memoryRecallCount})`);
  console.log(`Memory Used: ${resB.memoryUsed}`);
  console.log(`Reflection Used: ${resB.reflectionUsed}`);
  console.log(`Evidence items count: ${resB.evidence.length}`);
  console.log(`Source Feedback IDs: ${resB.sourceFeedbackIds.join(', ')}`);
  console.log(`Answer excerpt:\n${resB.answer.substring(0, 250)}...\n`);

  const scenarioBPass = 
    resB.mode === 'memory_on' &&
    resB.memoryEnabled === true &&
    resB.hindsightAccessed === true &&
    resB.memoryRecallCount > 0 &&
    resB.memoryUsed === true &&
    resB.sqliteRecordCount === initialCount &&
    resB.answer.length > 50;

  liveResults.scenarioB_memoryOn = {
    status: scenarioBPass ? 'PASS' : 'FAIL',
    latencyMs: tBDuration,
    mode: resB.mode,
    hindsightAccessed: resB.hindsightAccessed,
    memoryRecallCount: resB.memoryRecallCount,
    reflectionUsed: resB.reflectionUsed,
    evidenceCount: resB.evidence.length,
    citedIds: resB.sourceFeedbackIds
  };

  // -------------------------------------------------------------------------
  // SCENARIO C: Non-existent product / feature (Kubernetes Cluster Support)
  // -------------------------------------------------------------------------
  console.log('\n--- [Scenario C] Insufficient Evidence Question (Kubernetes Cluster Support) ---');
  const qC = "What are customers saying about Kubernetes cluster support?";
  const tCStart = Date.now();
  const resC = await demoService.executeMode({
    question: qC,
    companyId: 'demo-company',
    memoryEnabled: true
  });
  const tCDuration = Date.now() - tCStart;

  const statesInsufficient = 
    resC.answer.toLowerCase().includes('insufficient') || 
    resC.answer.toLowerCase().includes('no customer feedback') ||
    resC.answer.toLowerCase().includes('no records mention') ||
    resC.answer.toLowerCase().includes('do not mention');

  console.log(`Execution time: ${tCDuration} ms`);
  console.log(`States Insufficient Evidence: ${statesInsufficient}`);
  console.log(`Evidence count: ${resC.evidence.length} (Expected 0)`);
  console.log(`Answer excerpt:\n${resC.answer.substring(0, 250)}...\n`);

  const scenarioCPass = statesInsufficient && resC.evidence.length === 0;

  liveResults.scenarioC_insufficientEvidence = {
    status: scenarioCPass ? 'PASS' : 'FAIL',
    latencyMs: tCDuration,
    statesInsufficient,
    evidenceCount: resC.evidence.length
  };

  // -------------------------------------------------------------------------
  // SCENARIO D: Full Side-by-Side Comparison with Evaluation
  // -------------------------------------------------------------------------
  console.log('\n--- [Scenario D] Side-by-Side Comparison: "What are our customers\' biggest recurring complaints?" ---');
  const qD = "What are our customers' biggest recurring complaints?";
  const tDStart = Date.now();
  const comparison = await demoService.compare({
    question: qD,
    companyId: 'demo-company'
  });
  const tDDuration = Date.now() - tDStart;

  console.log(`Comparison total execution time: ${tDDuration} ms`);
  console.log(`SQLite Record Count parity: ${comparison.sqliteRecordCount}`);
  console.log(`Memory OFF Hindsight Accessed: ${comparison.memoryOff.hindsightAccessed} (Recall count: ${comparison.memoryOff.memoryRecallCount})`);
  console.log(`Memory ON Hindsight Accessed: ${comparison.memoryOn.hindsightAccessed} (Recall count: ${comparison.memoryOn.memoryRecallCount})`);
  console.log(`\nComparative Analysis Verdict: "${comparison.analysis.verdict}"`);
  console.log(`Stronger Mode: "${comparison.analysis.strongerMode}"`);
  console.log(`Rationale: ${comparison.analysis.rationale}`);
  console.log(`Additional Context Provided: ${comparison.analysis.additionalContextProvided}`);
  console.log(`Recurring Issues Identified: ${comparison.analysis.recurringIssuesIdentified}`);
  console.log(`Time Evolution Identified: ${comparison.analysis.timeEvolutionIdentified}`);
  console.log(`Missed Patterns in Memory OFF: ${comparison.analysis.missedPatternsInOff}`);

  const scenarioDPass = 
    comparison.question === qD &&
    comparison.sqliteRecordCount === initialCount &&
    comparison.memoryOff.hindsightAccessed === false &&
    comparison.memoryOff.memoryRecallCount === 0 &&
    comparison.memoryOn.hindsightAccessed === true &&
    comparison.memoryOn.memoryRecallCount > 0 &&
    Boolean(comparison.analysis?.verdict) &&
    Boolean(comparison.analysis?.rationale) &&
    comparison.analysis.evidenceParity.hindsightBypassedInOff === true;

  liveResults.scenarioD_sideBySideComparison = {
    status: scenarioDPass ? 'PASS' : 'FAIL',
    latencyMs: tDDuration,
    sqliteParity: comparison.sqliteRecordCount === initialCount,
    memoryOffBypassed: comparison.memoryOff.hindsightAccessed === false,
    memoryOnRecalled: comparison.memoryOn.memoryRecallCount,
    analysisVerdict: comparison.analysis.verdict,
    strongerMode: comparison.analysis.strongerMode
  };

  // -------------------------------------------------------------------------
  // NON-DESTRUCTIVE DATABASE INTEGRITY CHECK
  // -------------------------------------------------------------------------
  console.log('\n--- [Integrity Check] Verifying Zero SQLite Data Mutations ---');
  const finalCountRow = db.prepare('SELECT COUNT(*) as count FROM feedback WHERE company_id = ?').get('demo-company');
  const finalCount = finalCountRow?.count || 0;
  console.log(`Final SQLite record count: ${finalCount} (Initial: ${initialCount})`);

  const integrityPass = initialCount === finalCount && initialCount >= 20;
  liveResults.databaseIntegrity = {
    status: integrityPass ? 'PASS' : 'FAIL',
    initialCount,
    finalCount,
    recordsAlteredOrDeleted: initialCount !== finalCount
  };

  // -------------------------------------------------------------------------
  // SUMMARY
  // -------------------------------------------------------------------------
  console.log('\n=== PHASE 7 LIVE VERIFICATION SUMMARY ===');
  let overallPass = true;
  for (const [k, v] of Object.entries(liveResults)) {
    console.log(`- ${k}: ${v.status}`);
    if (v.status !== 'PASS') overallPass = false;
  }
  console.log(`\nOVERALL STATUS: ${overallPass ? 'ALL LIVE SCENARIOS PASSED (PASS)' : 'FAILURES DETECTED (FAIL)'}`);

  return { overallPass, liveResults };
}

runLivePhase7Verification().catch(err => {
  console.error('Fatal Phase 7 live verification error:', err);
  process.exit(1);
});

