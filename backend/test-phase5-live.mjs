import { chatService } from './src/services/chatService.js';
import { getDatabase } from './src/config/db.js';

async function runLivePhase5Test() {
  console.log('=== PHASE 5: ASK FEEDBACKMIND AI LIVE INTEGRATION TESTS ===\n');

  const liveResults = {};
  const testSessionId = `live-audit-sess-${Date.now()}`;

  // -------------------------------------------------------------------------
  // TEST 1: Question supported by FB-001 through FB-020 (Biggest Complaints)
  // -------------------------------------------------------------------------
  console.log('--- [Test 1] Question: "What are the biggest complaints from customers?" ---');
  const t1Start = Date.now();
  const res1 = await chatService.ask({
    question: 'What are the biggest complaints from customers?',
    companyId: 'demo-company',
    memoryEnabled: true,
    sessionId: testSessionId,
    history: []
  });
  const t1Duration = Date.now() - t1Start;

  const hasCitations = res1.evidence && res1.evidence.length > 0;
  const citesFbRecords = (res1.answer.includes('FB-') || res1.evidence.some(e => e.feedback_id && e.feedback_id.startsWith('FB-')));
  console.log(`Latency: ${t1Duration} ms`);
  console.log(`Memory Grounded: ${res1.memoryEnabled} (${res1.recalledMemoriesCount} memories retrieved)`);
  console.log(`Citations extracted: ${res1.evidence.length}`);
  console.log(`Answer excerpt:\n${res1.answer.substring(0, 300)}...\n`);

  liveResults.test1_biggestComplaints = {
    status: citesFbRecords && res1.answer.length > 50 ? 'PASS' : 'FAIL',
    latencyMs: t1Duration,
    memoriesRetrieved: res1.recalledMemoriesCount,
    evidenceCount: res1.evidence.length,
    citedSample: res1.evidence[0] || null
  };

  // -------------------------------------------------------------------------
  // TEST 2: Performance & Dashboard Speed
  // -------------------------------------------------------------------------
  console.log('--- [Test 2] Question: "What are customers saying about dashboard performance?" ---');
  const t2Start = Date.now();
  const res2 = await chatService.ask({
    question: 'What are customers saying about dashboard performance?',
    companyId: 'demo-company',
    memoryEnabled: true,
    sessionId: testSessionId,
    history: [
      { sender: 'user', text: 'What are the biggest complaints from customers?' },
      { sender: 'ai', text: res1.answer }
    ]
  });
  const t2Duration = Date.now() - t2Start;

  const mentionsLatencyOrSpeed = res2.answer.toLowerCase().includes('slow') || 
                                 res2.answer.toLowerCase().includes('load') || 
                                 res2.answer.toLowerCase().includes('morning') ||
                                 res2.answer.toLowerCase().includes('fb-001');

  console.log(`Latency: ${t2Duration} ms`);
  console.log(`Answer excerpt:\n${res2.answer.substring(0, 300)}...\n`);

  liveResults.test2_performance = {
    status: mentionsLatencyOrSpeed ? 'PASS' : 'FAIL',
    latencyMs: t2Duration,
    evidenceCount: res2.evidence.length
  };

  // -------------------------------------------------------------------------
  // TEST 3: Feature Requests (Dark mode, Mobile app, Slack)
  // -------------------------------------------------------------------------
  console.log('--- [Test 3] Question: "Which features are requested most often?" ---');
  const t3Start = Date.now();
  const res3 = await chatService.ask({
    question: 'Which features are requested most often?',
    companyId: 'demo-company',
    memoryEnabled: true,
    sessionId: testSessionId,
    history: []
  });
  const t3Duration = Date.now() - t3Start;

  const mentionsRequestedFeatures = res3.answer.toLowerCase().includes('dark mode') ||
                                   res3.answer.toLowerCase().includes('mobile') ||
                                   res3.answer.toLowerCase().includes('slack') ||
                                   res3.answer.toLowerCase().includes('pdf') ||
                                   res3.answer.toLowerCase().includes('fb-002');

  console.log(`Latency: ${t3Duration} ms`);
  console.log(`Answer excerpt:\n${res3.answer.substring(0, 300)}...\n`);

  liveResults.test3_featureRequests = {
    status: mentionsRequestedFeatures ? 'PASS' : 'FAIL',
    latencyMs: t3Duration,
    evidenceCount: res3.evidence.length
  };

  // -------------------------------------------------------------------------
  // TEST 4: Question with NO matching evidence (Must NOT hallucinate)
  // -------------------------------------------------------------------------
  console.log('--- [Test 4] Question with No Evidence: "What are customers saying about our QuickBooks and Salesforce integrations?" ---');
  const t4Start = Date.now();
  const res4 = await chatService.ask({
    question: 'What are customers saying about our QuickBooks and Salesforce integrations?',
    companyId: 'demo-company',
    memoryEnabled: true,
    sessionId: testSessionId,
    history: []
  });
  const t4Duration = Date.now() - t4Start;

  const explicitlyNotesInsufficientEvidence = res4.answer.toLowerCase().includes('insufficient') ||
                                             res4.answer.toLowerCase().includes('no mention') ||
                                             res4.answer.toLowerCase().includes('no feedback') ||
                                             res4.answer.toLowerCase().includes('not mentioned') ||
                                             res4.answer.toLowerCase().includes('do not mention');

  console.log(`Latency: ${t4Duration} ms`);
  console.log(`Answer excerpt:\n${res4.answer.substring(0, 300)}...\n`);
  console.log(`Did it state insufficient evidence without hallucinating? ${explicitlyNotesInsufficientEvidence ? 'YES' : 'NO'}`);

  liveResults.test4_noEvidenceHandling = {
    status: explicitlyNotesInsufficientEvidence ? 'PASS' : 'FAIL',
    latencyMs: t4Duration,
    explicitlyHonest: explicitlyNotesInsufficientEvidence
  };

  // -------------------------------------------------------------------------
  // TEST 5: Follow-up question depending on previous conversation context
  // -------------------------------------------------------------------------
  console.log('--- [Test 5] Follow-up Question: "Between the dashboard loading latency and the password reset issue, which one is more urgent and what should our product team fix first?" ---');
  const t5Start = Date.now();
  const res5 = await chatService.ask({
    question: 'Between the dashboard loading latency and the password reset issue, which one is more urgent and what should our product team fix first?',
    companyId: 'demo-company',
    memoryEnabled: true,
    sessionId: testSessionId,
    history: [
      { sender: 'user', text: 'What are the biggest complaints from customers?' },
      { sender: 'ai', text: res1.answer }
    ]
  });
  const t5Duration = Date.now() - t5Start;

  const providesComparativeRecommendation = (res5.answer.toLowerCase().includes('urgent') || res5.answer.toLowerCase().includes('priority') || res5.answer.toLowerCase().includes('fix first')) &&
                                            (res5.answer.includes('FB-001') || res5.answer.includes('FB-004') || res5.answer.toLowerCase().includes('password') || res5.answer.toLowerCase().includes('dashboard'));

  console.log(`Latency: ${t5Duration} ms`);
  console.log(`Answer excerpt:\n${res5.answer.substring(0, 300)}...\n`);

  liveResults.test5_contextualFollowUp = {
    status: providesComparativeRecommendation ? 'PASS' : 'FAIL',
    latencyMs: t5Duration,
    hasComparativeRecommendation: providesComparativeRecommendation
  };

  // -------------------------------------------------------------------------
  // TEST 6: Memory OFF Mode (Zero Hindsight Recall)
  // -------------------------------------------------------------------------
  console.log('--- [Test 6] Memory OFF Mode: "What are the most urgent problems?" ---');
  const t6Start = Date.now();
  const res6 = await chatService.ask({
    question: 'What are the most urgent problems?',
    companyId: 'demo-company',
    memoryEnabled: false,
    sessionId: testSessionId,
    history: []
  });
  const t6Duration = Date.now() - t6Start;

  const memOffVerified = res6.memoryEnabled === false && res6.recalledMemoriesCount === 0;
  console.log(`Latency: ${t6Duration} ms`);
  console.log(`Memory Mode: ${res6.memoryEnabled ? 'ON' : 'OFF'} (Memories recalled: ${res6.recalledMemoriesCount})`);
  console.log(`Answer excerpt:\n${res6.answer.substring(0, 250)}...\n`);

  liveResults.test6_memoryOff = {
    status: memOffVerified ? 'PASS' : 'FAIL',
    latencyMs: t6Duration,
    recalledCount: res6.recalledMemoriesCount,
    memoryUsed: res6.memoryEnabled
  };

  // -------------------------------------------------------------------------
  // TEST 7: SQLite chat_history Persistence
  // -------------------------------------------------------------------------
  console.log('--- [Test 7] Verify SQLite Persistence in chat_history ---');
  const db = getDatabase();
  const savedMessages = db.prepare('SELECT id, question, answer, evidence_json FROM chat_history WHERE session_id = ?').all(testSessionId);

  const persistencePassed = savedMessages.length >= 5;
  console.log(`Persisted messages in SQLite for session: ${savedMessages.length}`);
  liveResults.test7_chatPersistence = {
    status: persistencePassed ? 'PASS' : 'FAIL',
    persistedCount: savedMessages.length
  };

  console.log('\n======================================================');
  console.log('PHASE 5 LIVE INTEGRATION SUMMARY:');
  console.log(JSON.stringify(liveResults, null, 2));
  console.log('======================================================');
}

runLivePhase5Test().catch(err => {
  console.error('Phase 5 live test error:', err);
  process.exit(1);
});

