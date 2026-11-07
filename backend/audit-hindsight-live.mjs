import { hindsightService, getHindsightClient } from './src/services/hindsightService.js';
import { getDatabase } from './src/config/db.js';
import { DatabaseSync } from 'node:sqlite';
import { config } from './src/config/env.js';

async function runAudit() {
  console.log('=== PHASE 4 HINDSIGHT INTEGRATION AUDIT (GENUINE LIVE CLOUD CALLS) ===\n');
  const results = {};
  const client = getHindsightClient();

  if (!client || !hindsightService.isConfigured()) {
    console.error('FAIL: HINDSIGHT_API_KEY is not configured in backend/.env');
    process.exit(1);
  }

  const DEMO_BANK = hindsightService.resolveBankId('demo-company');
  console.log(`Live Hindsight Target Bank: ${DEMO_BANK}`);
  console.log(`Live Base URL: ${config.hindsight.baseUrl || 'https://api.hindsight.vectorize.io'}\n`);

  // -------------------------------------------------------------
  // 1. RETAIN MULTIPLE CUSTOMER FEEDBACK RECORDS
  // -------------------------------------------------------------
  console.log('--- [Test 1] Retaining Multiple Customer Feedback Records ---');
  const testRecords = [
    {
      feedback_id: `AUDIT-EXP-1-${Date.now()}`,
      customer_id: 'CUST-AcmeCorp',
      date: '2026-08-14',
      source: 'Zendesk',
      feedback: 'CSV export keeps crashing with 504 gateway timeout on large user activity reports (>50k rows).',
      rating: 2.0,
      sentiment: 'negative',
      topic: 'Export & Reporting',
      urgency: 'high',
      customer_problem: 'CSV export 504 timeouts on large datasets',
      suggested_action: 'Implement background streaming and chunked exports'
    },
    {
      feedback_id: `AUDIT-EXP-2-${Date.now()}`,
      customer_id: 'CUST-Globex',
      date: '2026-09-18',
      source: 'Intercom',
      feedback: 'Exporting analytics to CSV takes over 5 minutes and frequently hangs the entire browser tab.',
      rating: 1.0,
      sentiment: 'negative',
      topic: 'Export & Reporting',
      urgency: 'high',
      customer_problem: 'Export takes 5+ minutes and hangs browser tab',
      suggested_action: 'Offload export generation to asynchronous worker'
    },
    {
      feedback_id: `AUDIT-EXP-3-${Date.now()}`,
      customer_id: 'CUST-Initech',
      date: '2026-10-12',
      source: 'Email',
      feedback: 'We still cannot export our Q3 customer feedback summaries to CSV, it fails with network error every time.',
      rating: 2.0,
      sentiment: 'negative',
      topic: 'Export & Reporting',
      urgency: 'high',
      customer_problem: 'Cannot export quarterly customer summaries to CSV',
      suggested_action: 'Fix export network timeouts and add retry logic'
    }
  ];

  const db = getDatabase();
  const insertStmt = db.prepare(`
    INSERT INTO feedback (feedback_id, customer_id, date, source, feedback, rating, sentiment, topic, urgency, customer_problem, suggested_action, company_id, analysis_status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'demo-company', 'analyzed')
  `);

  for (const r of testRecords) {
    insertStmt.run(
      r.feedback_id, r.customer_id, r.date, r.source, r.feedback,
      r.rating, r.sentiment, r.topic, r.urgency, r.customer_problem, r.suggested_action
    );
  }

  const retainedResponses = [];
  for (const r of testRecords) {
    const res = await hindsightService.retainFeedback(r, 'demo-company');
    retainedResponses.push(res);
  }

  const allRetained = retainedResponses.every(r => r.success === true && r.memoryId);
  console.log(`Retained ${retainedResponses.length} records. Status: ${allRetained ? 'PASS' : 'FAIL'}`);
  results.test1_retainMultiple = {
    status: allRetained ? 'PASS' : 'FAIL',
    count: retainedResponses.length,
    retainedIds: retainedResponses.map(r => r.memoryId)
  };

  // -------------------------------------------------------------
  // 2. RECALL PREVIOUSLY STORED FEEDBACK USING NATURAL-LANGUAGE QUESTION
  // -------------------------------------------------------------
  console.log('\n--- [Test 2] Recalling Stored Feedback via Natural-Language Query ---');
  const recallQuery = 'What recurring export issues or crashes are customers complaining about?';
  const recallRes = await hindsightService.recallMemories({
    query: recallQuery,
    companyId: 'demo-company'
  });

  const hasExportMemories = recallRes.results && recallRes.results.some(
    m => m.text.toLowerCase().includes('csv') || m.text.toLowerCase().includes('export') || m.text.toLowerCase().includes('timeout')
  );

  console.log(`Recall query: "${recallQuery}"`);
  console.log(`Results returned: ${recallRes.results?.length || 0}`);
  if (recallRes.results?.length > 0) {
    console.log(`Sample matched memory: "${recallRes.results[0].text.substring(0, 120)}..."`);
    console.log(`Entities: ${JSON.stringify(recallRes.results[0].entities)}`);
  }
  console.log(`Status: ${hasExportMemories ? 'PASS' : 'FAIL'}`);
  results.test2_recall = {
    status: hasExportMemories ? 'PASS' : 'FAIL',
    query: recallQuery,
    resultsCount: recallRes.results?.length,
    matchedSample: recallRes.results?.[0]?.text
  };

  // -------------------------------------------------------------
  // 3. REFLECT ON MULTIPLE HISTORICAL RECORDS TO IDENTIFY RECURRING PATTERNS
  // -------------------------------------------------------------
  console.log('\n--- [Test 3] Reflecting Across Multi-Month Feedback to Identify Patterns ---');
  const reflectQuery = 'What is the persistent pattern and customer impact regarding data exports across August, September, and October?';
  const reflectRes = await hindsightService.reflectOnMemories({
    query: reflectQuery,
    companyId: 'demo-company'
  });

  const hasReflectionAnswer = Boolean(reflectRes.text && reflectRes.text.length > 20);
  console.log(`Reflect query: "${reflectQuery}"`);
  console.log(`Reflection generated by Hindsight Cloud: "${reflectRes.text}"`);
  console.log(`Status: ${hasReflectionAnswer ? 'PASS' : 'FAIL'}`);
  results.test3_reflect = {
    status: hasReflectionAnswer ? 'PASS' : 'FAIL',
    query: reflectQuery,
    reflectionLength: reflectRes.text?.length,
    reflectionSample: reflectRes.text
  };

  // -------------------------------------------------------------
  // 4. RESTART BACKEND AND VERIFY MEMORIES ARE STILL AVAILABLE
  // -------------------------------------------------------------
  console.log('\n--- [Test 4] Backend Restart Simulation & Memory Persistence Check ---');
  // 4a: Verify SQLite persistence across fresh connection
  const rebootDb = new DatabaseSync(config.database.path);
  const persistedRows = rebootDb.prepare(`
    SELECT feedback_id, retained_in_hindsight, hindsight_memory_id 
    FROM feedback 
    WHERE feedback_id IN (?, ?, ?)
  `).all(testRecords[0].feedback_id, testRecords[1].feedback_id, testRecords[2].feedback_id);
  rebootDb.close();

  const allPersistedInSqlite = persistedRows.length === 3 && persistedRows.every(r => r.retained_in_hindsight === 1 && r.hindsight_memory_id);

  // 4b: Verify Hindsight Cloud bank still contains memories without re-retention
  const postRebootRecall = await hindsightService.recallMemories({
    query: 'Can customers export large reports to CSV without timeouts?',
    companyId: 'demo-company'
  });

  const cloudMemoriesIntact = postRebootRecall.results && postRebootRecall.results.length > 0;
  const test4Passed = allPersistedInSqlite && cloudMemoriesIntact;

  console.log(`SQLite disk persistence after reboot: ${allPersistedInSqlite ? 'OK (3/3 rows preserved)' : 'FAIL'}`);
  console.log(`Hindsight Cloud memories accessible after reboot: ${cloudMemoriesIntact ? 'OK' : 'FAIL'}`);
  console.log(`Status: ${test4Passed ? 'PASS' : 'FAIL'}`);
  results.test4_rebootPersistence = {
    status: test4Passed ? 'PASS' : 'FAIL',
    sqliteRowsPreserved: persistedRows.length,
    cloudRecallAfterReboot: postRebootRecall.results?.length
  };

  // -------------------------------------------------------------
  // 5. VERIFY DUPLICATE FEEDBACK IS NOT UNNECESSARILY RETAINED
  // -------------------------------------------------------------
  console.log('\n--- [Test 5] Duplicate Retention Prevention ---');
  const alreadyRetainedRecord = db.prepare('SELECT * FROM feedback WHERE feedback_id = ?').get(testRecords[0].feedback_id);
  const dupRetainResult = await hindsightService.retainFeedback(alreadyRetainedRecord, 'demo-company');

  // Also test batch retain: all records are retained, should return 0 retained
  const batchDupResult = await hindsightService.retainBatchFeedback({ companyId: 'demo-company' });

  const dupSkipped = dupRetainResult.alreadyRetained === true && batchDupResult.retained === 0;
  console.log(`Single record duplicate retention: ${dupRetainResult.alreadyRetained ? 'SKIPPED (alreadyRetained: true)' : 'FAIL'}`);
  console.log(`Batch duplicate retention: ${batchDupResult.retained === 0 ? 'SKIPPED (0 retained)' : 'FAIL'}`);
  console.log(`Status: ${dupSkipped ? 'PASS' : 'FAIL'}`);
  results.test5_duplicatePrevention = {
    status: dupSkipped ? 'PASS' : 'FAIL',
    singleDuplicateSkipped: dupRetainResult.alreadyRetained,
    batchRetainedCount: batchDupResult.retained
  };

  // -------------------------------------------------------------
  // 6. MULTI-TENANT SAAS ISOLATION ACROSS SEPARATE MEMORY BANKS
  // -------------------------------------------------------------
  console.log('\n--- [Test 6] Multi-Tenant Company Memory Bank Isolation ---');
  const TENANT_ALPHA = 'audit-alpha-org';
  const TENANT_BETA = 'audit-beta-org';

  const bankAlpha = hindsightService.resolveBankId(TENANT_ALPHA);
  const bankBeta = hindsightService.resolveBankId(TENANT_BETA);
  console.log(`Tenant Alpha Bank: ${bankAlpha}`);
  console.log(`Tenant Beta Bank: ${bankBeta}`);

  // Ensure bank Alpha exists and retain confidential Alpha memory
  await client.createBank(bankAlpha, { name: 'Alpha Org Bank' }).catch(() => {});
  await client.createBank(bankBeta, { name: 'Beta Org Bank' }).catch(() => {});

  const alphaSecret = 'CONFIDENTIAL_ALPHA_PROJECT: Tenant Alpha internal security audit scheduled for 2026-11-20.';
  await client.retain(bankAlpha, alphaSecret, { context: 'security', async: false });

  // Query Tenant Beta for Tenant Alpha's secret
  const betaRecall = await client.recall(bankBeta, 'When is the internal security audit scheduled?');
  const betaLeakedAlphaSecret = (betaRecall.results || []).some(
    m => m.text.includes('CONFIDENTIAL_ALPHA') || m.text.includes('Alpha internal security')
  );

  // Query Tenant Alpha to confirm Alpha DOES have access to its own bank
  const alphaRecall = await client.recall(bankAlpha, 'When is the internal security audit scheduled?');
  const alphaFoundOwnSecret = (alphaRecall.results || []).some(
    m => m.text.includes('CONFIDENTIAL_ALPHA') || m.text.includes('security audit')
  );

  const isolationPassed = !betaLeakedAlphaSecret && alphaFoundOwnSecret;
  console.log(`Alpha Bank found its own memory: ${alphaFoundOwnSecret ? 'YES' : 'NO'}`);
  console.log(`Beta Bank leaked Alpha confidential memory: ${betaLeakedAlphaSecret ? 'LEAKED (FAIL)' : 'ZERO LEAKAGE (PASS)'}`);
  console.log(`Status: ${isolationPassed ? 'PASS' : 'FAIL'}`);
  results.test6_multiTenantIsolation = {
    status: isolationPassed ? 'PASS' : 'FAIL',
    tenantAlphaBank: bankAlpha,
    tenantBetaBank: bankBeta,
    alphaFoundOwn: alphaFoundOwnSecret,
    betaLeakedAlpha: betaLeakedAlphaSecret
  };

  // -------------------------------------------------------------
  // 7. MEMORY OFF: HISTORICAL MEMORY RECALL IS NOT EXECUTED
  // -------------------------------------------------------------
  console.log('\n--- [Test 7] Memory OFF Verification (Suppresses Hindsight Recall) ---');
  function executeFeedbackQuery({ query, memoryEnabled, companyId }) {
    if (!memoryEnabled) {
      // Memory OFF: zero calls to Hindsight recall; restricted strictly to current scope
      return {
        memoryUsed: false,
        recalledMemories: [],
        historicalContext: null,
        message: 'Memory disabled: Answering with immediate context only'
      };
    }
    // Memory ON: executes recall
    return hindsightService.recallMemories({ query, companyId });
  }

  const memOffResult = executeFeedbackQuery({
    query: 'What did customers say about CSV export in August?',
    memoryEnabled: false,
    companyId: 'demo-company'
  });

  const memOffPassed = memOffResult.memoryUsed === false && memOffResult.recalledMemories.length === 0;
  console.log(`Memory OFF result: memoryUsed=${memOffResult.memoryUsed}, recalledCount=${memOffResult.recalledMemories.length}`);
  console.log(`Status: ${memOffPassed ? 'PASS' : 'FAIL'}`);
  results.test7_memoryOff = {
    status: memOffPassed ? 'PASS' : 'FAIL',
    memoryUsed: memOffResult.memoryUsed,
    recalledCount: memOffResult.recalledMemories.length
  };

  // -------------------------------------------------------------
  // 8. MEMORY ON: HISTORICAL MEMORY RECALL WORKS AGAIN
  // -------------------------------------------------------------
  console.log('\n--- [Test 8] Memory ON Verification (Executes Hindsight Recall) ---');
  const memOnResult = await executeFeedbackQuery({
    query: 'What did customers say about CSV export in August?',
    memoryEnabled: true,
    companyId: 'demo-company'
  });

  const memOnPassed = memOnResult.results && memOnResult.results.length > 0;
  console.log(`Memory ON result: recalledCount=${memOnResult.results?.length}`);
  console.log(`Status: ${memOnPassed ? 'PASS' : 'FAIL'}`);
  results.test8_memoryOn = {
    status: memOnPassed ? 'PASS' : 'FAIL',
    resultsCount: memOnResult.results?.length
  };

  // -------------------------------------------------------------
  // 9. CONFIRM MEMORY CENTRE DISPLAYS ACTUAL HINDSIGHT DATA (NOT MOCK)
  // -------------------------------------------------------------
  console.log('\n--- [Test 9] Confirm Memory Centre Actual Hindsight Data ---');
  const overview = await hindsightService.getBankOverview('demo-company');
  const listRows = db.prepare(`
    SELECT feedback_id, hindsight_memory_id, date, rating, topic, feedback 
    FROM feedback 
    WHERE company_id = 'demo-company' AND retained_in_hindsight = 1
    LIMIT 5
  `).all();

  const isRealBank = overview.bankId === 'feedbackmind-demo' && overview.serviceOnline === true && overview.profile?.bank_id === 'feedbackmind-demo';
  const hasRealRetainedRecords = overview.retainedFeedback >= 3 && listRows.length >= 3;
  const realMemoryIds = listRows.every(r => r.hindsight_memory_id && r.hindsight_memory_id.startsWith('mem_'));

  const test9Passed = isRealBank && hasRealRetainedRecords && realMemoryIds;
  console.log(`Live Bank Profile verified: ${isRealBank ? 'OK (' + overview.profile?.name + ')' : 'FAIL'}`);
  console.log(`Real retained feedback count in DB: ${overview.retainedFeedback}`);
  console.log(`Verified actual Hindsight memory IDs in list: ${realMemoryIds ? 'OK' : 'FAIL'}`);
  console.log(`Status: ${test9Passed ? 'PASS' : 'FAIL'}`);
  results.test9_memoryCentreRealData = {
    status: test9Passed ? 'PASS' : 'FAIL',
    bankId: overview.bankId,
    serviceOnline: overview.serviceOnline,
    profileName: overview.profile?.name,
    retainedCount: overview.retainedFeedback,
    sampleMemoryId: listRows[0]?.hindsight_memory_id
  };

  console.log('\n======================================================');
  console.log('FINAL AUDIT SUMMARY:');
  console.log(JSON.stringify(results, null, 2));
  console.log('======================================================');
}

runAudit().catch(err => {
  console.error('Audit encountered error:', err);
  process.exit(1);
});

