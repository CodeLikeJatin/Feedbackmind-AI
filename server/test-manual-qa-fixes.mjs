import { chatService } from './src/services/chatService.js';

function normalizeText(text) {
  return String(text || '').replace(/[\u2010-\u2015\u2212]/g, '-');
}

async function runManualQAFixTests() {
  console.log('=== PHASE 5 MANUAL QA BUG FIX VERIFICATION ===\n');
  const results = {};
  const sessionId = `qa-fix-sess-${Date.now()}`;

  // ---------------------------------------------------------------------------
  // TEST 1: Question about QuickBooks with Memory ON
  // ---------------------------------------------------------------------------
  console.log('--- [Test 1] Question: "What are customers saying about QuickBooks?" (Memory ON) ---');
  const res1 = await chatService.ask({
    question: 'What are customers saying about QuickBooks?',
    companyId: 'demo-company',
    memoryEnabled: true,
    sessionId,
    history: []
  });

  const notesInsufficientEvidence1 = res1.answer.toLowerCase().includes('insufficient') ||
                                    res1.answer.toLowerCase().includes('no customer feedback') ||
                                    res1.answer.toLowerCase().includes('do not mention');
  const zeroEvidenceCards1 = Array.isArray(res1.evidence) && res1.evidence.length === 0;

  console.log(`Answer:\n${res1.answer}\n`);
  console.log(`Memory Grounded: ${res1.memoryEnabled}`);
  console.log(`Evidence items count: ${res1.evidence.length}`);
  console.log(`Sufficiently identified lack of evidence: ${notesInsufficientEvidence1 ? 'YES' : 'NO'}`);
  console.log(`Unrelated citations suppressed (empty array): ${zeroEvidenceCards1 ? 'YES (0 citations)' : 'FAIL (' + res1.evidence.length + ' citations)'}`);

  results.test1_quickbooksMemoryOn = {
    status: notesInsufficientEvidence1 && zeroEvidenceCards1 ? 'PASS' : 'FAIL',
    insufficientNoted: notesInsufficientEvidence1,
    evidenceCount: res1.evidence.length
  };

  // ---------------------------------------------------------------------------
  // TEST 2: Question about QuickBooks with Memory OFF
  // ---------------------------------------------------------------------------
  console.log('\n--- [Test 2] Question: "What are customers saying about QuickBooks?" (Memory OFF) ---');
  const res2 = await chatService.ask({
    question: 'What are customers saying about QuickBooks?',
    companyId: 'demo-company',
    memoryEnabled: false,
    sessionId,
    history: []
  });

  const notesInsufficientEvidence2 = res2.answer.toLowerCase().includes('insufficient') ||
                                    res2.answer.toLowerCase().includes('no customer feedback') ||
                                    res2.answer.toLowerCase().includes('do not mention');
  const zeroEvidenceCards2 = Array.isArray(res2.evidence) && res2.evidence.length === 0;

  console.log(`Answer:\n${res2.answer}\n`);
  console.log(`Memory Grounded: ${res2.memoryEnabled}`);
  console.log(`Evidence items count: ${res2.evidence.length}`);
  console.log(`Unrelated citations suppressed (empty array): ${zeroEvidenceCards2 ? 'YES (0 citations)' : 'FAIL'}`);

  results.test2_quickbooksMemoryOff = {
    status: notesInsufficientEvidence2 && zeroEvidenceCards2 ? 'PASS' : 'FAIL',
    insufficientNoted: notesInsufficientEvidence2,
    evidenceCount: res2.evidence.length
  };

  // ---------------------------------------------------------------------------
  // TEST 3: Question about Dashboard Performance with Memory OFF (Bug 2 verification)
  // ---------------------------------------------------------------------------
  console.log('\n--- [Test 3] Question: "What are customers saying about dashboard performance?" (Memory OFF) ---');
  const res3 = await chatService.ask({
    question: 'What are customers saying about dashboard performance?',
    companyId: 'demo-company',
    memoryEnabled: false,
    sessionId,
    history: []
  });

  const normAns3 = normalizeText(res3.answer);
  const mentionsFb001InMemOff = normAns3.includes('FB-001') || res3.evidence.some(e => e.feedback_id === 'FB-001');
  const mentionsFb013InMemOff = normAns3.includes('FB-013') || res3.evidence.some(e => e.feedback_id === 'FB-013');
  const distinguishesDashboard = res3.answer.toLowerCase().includes('morning') || res3.answer.toLowerCase().includes('slow') || res3.answer.toLowerCase().includes('load');

  console.log(`Answer:\n${res3.answer}\n`);
  console.log(`Memory Grounded: ${res3.memoryEnabled}`);
  console.log(`Includes FB-001 (morning slow loading): ${mentionsFb001InMemOff ? 'YES' : 'NO'}`);
  console.log(`Includes FB-013 (noticeably faster update): ${mentionsFb013InMemOff ? 'YES' : 'NO'}`);
  console.log(`Evidence citations count: ${res3.evidence.length}`);
  console.log('Citations attached:', res3.evidence.map(e => e.feedback_id));

  results.test3_dashboardPerformanceMemoryOff = {
    status: mentionsFb001InMemOff && mentionsFb013InMemOff ? 'PASS' : 'FAIL',
    includesFB001: mentionsFb001InMemOff,
    includesFB013: mentionsFb013InMemOff,
    evidenceCount: res3.evidence.length
  };

  // ---------------------------------------------------------------------------
  // TEST 4: Question about Dashboard Performance with Memory ON
  // ---------------------------------------------------------------------------
  console.log('\n--- [Test 4] Question: "What are customers saying about dashboard performance?" (Memory ON) ---');
  const res4 = await chatService.ask({
    question: 'What are customers saying about dashboard performance?',
    companyId: 'demo-company',
    memoryEnabled: true,
    sessionId,
    history: []
  });

  const normAns4 = normalizeText(res4.answer);
  const mentionsFb001InMemOn = normAns4.includes('FB-001') || res4.evidence.some(e => e.feedback_id === 'FB-001');
  const mentionsFb013InMemOn = normAns4.includes('FB-013') || res4.evidence.some(e => e.feedback_id === 'FB-013');

  console.log(`Answer:\n${res4.answer}\n`);
  console.log(`Memory Grounded: ${res4.memoryEnabled} (${res4.recalledMemoriesCount} memories retrieved)`);
  console.log(`Includes FB-001 in Memory ON: ${mentionsFb001InMemOn ? 'YES' : 'NO'}`);
  console.log(`Includes FB-013 in Memory ON: ${mentionsFb013InMemOn ? 'YES' : 'NO'}`);
  console.log('Citations attached:', res4.evidence.map(e => e.feedback_id));

  results.test4_dashboardPerformanceMemoryOn = {
    status: mentionsFb001InMemOn && mentionsFb013InMemOn ? 'PASS' : 'FAIL',
    includesFB001: mentionsFb001InMemOn,
    includesFB013: mentionsFb013InMemOn,
    evidenceCount: res4.evidence.length
  };

  // ---------------------------------------------------------------------------
  // TEST 5: Another Question with Zero Evidence (Kubernetes clusters)
  // ---------------------------------------------------------------------------
  console.log('\n--- [Test 5] Question with Zero Evidence: "How do customers feel about our Kubernetes cluster support?" ---');
  const res5 = await chatService.ask({
    question: 'How do customers feel about our Kubernetes cluster support?',
    companyId: 'demo-company',
    memoryEnabled: true,
    sessionId,
    history: []
  });

  const notesInsufficient5 = res5.answer.toLowerCase().includes('insufficient') ||
                            res5.answer.toLowerCase().includes('no customer feedback') ||
                            res5.answer.toLowerCase().includes('do not mention');
  const zeroEvidence5 = Array.isArray(res5.evidence) && res5.evidence.length === 0;

  console.log(`Answer:\n${res5.answer}\n`);
  console.log(`Evidence count: ${res5.evidence.length}`);
  console.log(`Empty evidence verified: ${zeroEvidence5 ? 'YES' : 'NO'}`);

  results.test5_zeroEvidenceGeneral = {
    status: notesInsufficient5 && zeroEvidence5 ? 'PASS' : 'FAIL',
    insufficientNoted: notesInsufficient5,
    evidenceCount: res5.evidence.length
  };

  // ---------------------------------------------------------------------------
  // TEST 6: Contextual Follow-up Questioning
  // ---------------------------------------------------------------------------
  console.log('\n--- [Test 6] Follow-up Question: "Why did the morning loading issue happen in FB-001?" ---');
  const res6 = await chatService.ask({
    question: 'Why did the morning loading issue happen in FB-001?',
    companyId: 'demo-company',
    memoryEnabled: true,
    sessionId,
    history: [
      { sender: 'user', text: 'What are customers saying about dashboard performance?' },
      { sender: 'ai', text: res4.answer }
    ]
  });

  const answersFollowUp = res6.answer.length > 50 && (res6.answer.includes('FB-001') || res6.answer.toLowerCase().includes('morning') || res6.answer.toLowerCase().includes('dashboard'));
  console.log(`Answer:\n${res6.answer}\n`);

  results.test6_followUpContinuity = {
    status: answersFollowUp ? 'PASS' : 'FAIL',
    hasContextualAnswer: answersFollowUp
  };

  console.log('\n======================================================');
  console.log('MANUAL QA BUG FIX RESULTS SUMMARY:');
  console.log(JSON.stringify(results, null, 2));
  console.log('======================================================');
}

runManualQAFixTests().catch(err => {
  console.error('Manual QA Fix Test failed:', err);
  process.exit(1);
});
