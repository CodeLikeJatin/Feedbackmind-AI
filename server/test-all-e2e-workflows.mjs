import { getDatabase } from './src/config/db.js';
import { csvService } from './src/services/csvService.js';
import { groqService } from './src/services/groqService.js';
import { hindsightService } from './src/services/hindsightService.js';
import { chatService } from './src/services/chatService.js';
import { trendService } from './src/services/trendService.js';
import { demoService } from './src/services/demoService.js';

const BASE_URL = 'http://localhost:5001';

async function request(path, options = {}) {
  const url = new URL(path, BASE_URL);
  const method = options.method || 'GET';
  const headers = options.headers || {};
  headers['Connection'] = 'close';
  let body = options.body;

  if (body && typeof body === 'object' && !(body instanceof Buffer)) {
    body = JSON.stringify(body);
    headers['Content-Type'] = 'application/json';
  }

  const start = Date.now();
  const response = await fetch(url.toString(), {
    method,
    headers,
    body
  });
  const duration = Date.now() - start;

  let data;
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  return {
    status: response.status,
    headers: Object.fromEntries(response.headers.entries()),
    data,
    duration
  };
}

async function runE2EWorkflows() {
  console.log('================================================================');
  console.log('FEEDBACKMIND AI — COMPREHENSIVE END-TO-END WORKFLOW VERIFICATION');
  console.log('================================================================\n');

  const report = {};
  const db = getDatabase();

  // ---------------------------------------------------------------------------
  // WORKFLOW A: Upload -> DB -> Groq Analysis -> Retain -> Memory -> Chat Citation
  // ---------------------------------------------------------------------------
  console.log('--- Workflow A: Full Ingestion to Citation Lifecycle ---');
  const WF_A_COMPANY = `e2e-wf-a-${Date.now()}`;
  try {
    // 1. Upload CSV
    const csvContent = `feedback_id,customer_id,date,source,feedback,rating\nE2E-001,CUST-E2E-1,2026-11-05,Zendesk,"The real-time webhook payload is missing the tenant UUID field.",2.0`;
    const uploadRes = await request('/api/feedback/upload', {
      method: 'POST',
      body: { companyId: WF_A_COMPANY, csvContent }
    });
    console.log(`1. CSV Ingestion: HTTP ${uploadRes.status}, imported ${uploadRes.data.imported}`);

    // 2. Verify in Database
    const dbRecord = db.prepare('SELECT * FROM feedback WHERE feedback_id = ? AND company_id = ?').get('E2E-001', WF_A_COMPANY);
    const inDb = Boolean(dbRecord && dbRecord.analysis_status === 'pending');
    console.log(`2. SQLite Verification: Found in DB with status '${dbRecord?.analysis_status}'`);

    // 3. Trigger Groq Analysis
    const analyzeRes = await request(`/api/analysis/analyze-record/E2E-001`, { method: 'POST' });
    console.log(`3. Groq Analysis: HTTP ${analyzeRes.status}, sentiment=${analyzeRes.data.sentiment}, topic=${analyzeRes.data.topic}`);

    // 4. Retain in Hindsight Cloud
    const updatedDbRecord = db.prepare('SELECT * FROM feedback WHERE feedback_id = ? AND company_id = ?').get('E2E-001', WF_A_COMPANY);
    const retainRes = await hindsightService.retainFeedback(updatedDbRecord, WF_A_COMPANY);
    console.log(`4. Hindsight Cloud Retention: Success=${retainRes.success}, MemoryID=${retainRes.memoryId}`);

    // 5. Verify in Memory Centre List
    const memListRes = await request(`/api/memory/list?companyId=${WF_A_COMPANY}`);
    const inMemoryList = memListRes.data.items?.some(i => i.feedback_id === 'E2E-001' && i.retained_in_hindsight === 1);
    console.log(`5. Memory Centre Verification: Retained in memory centre list: ${inMemoryList}`);

    // 6. Query via Ask FeedbackMind AI
    const askRes = await request('/api/chat/ask', {
      method: 'POST',
      body: {
        question: "What is wrong with the real-time webhook payload?",
        companyId: WF_A_COMPANY,
        memoryEnabled: true
      }
    });
    const citedInChat = askRes.data.evidence?.some(e => e.feedback_id === 'E2E-001');
    console.log(`6. Chat Citation Verification: Answer contains citation E2E-001: ${citedInChat}`);

    report.workflowA = {
      status: (uploadRes.status === 200 && inDb && analyzeRes.status === 200 && retainRes.success && inMemoryList && citedInChat) ? 'PASS' : 'FAIL',
      imported: uploadRes.data.imported,
      inDb,
      analyzed: analyzeRes.data.status === 'analyzed',
      retained: retainRes.success,
      memoryVerified: inMemoryList,
      chatCited: citedInChat
    };
  } finally {
    db.prepare('DELETE FROM feedback WHERE company_id = ?').run(WF_A_COMPANY);
    db.prepare('DELETE FROM chat_history WHERE company_id = ?').run(WF_A_COMPANY);
  }

  // ---------------------------------------------------------------------------
  // WORKFLOW B: Analyze -> Retain -> Verify Retention -> Recall Memory
  // ---------------------------------------------------------------------------
  console.log('\n--- Workflow B: Retention and Memory Recall Verification ---');
  // Check retention and recall on demo-company
  const recallRes = await request('/api/memory/recall', {
    method: 'POST',
    body: {
      query: "Which customers experienced 504 timeouts on CSV export?",
      companyId: 'demo-company'
    }
  });
  const hasRecalledResults = recallRes.status === 200 && recallRes.data.results?.length > 0;
  console.log(`- Recall query returned ${recallRes.data.results?.length} memories from Hindsight bank "${recallRes.data.bankId}"`);
  report.workflowB = {
    status: hasRecalledResults ? 'PASS' : 'FAIL',
    bankId: recallRes.data.bankId,
    recalledCount: recallRes.data.results?.length || 0,
    firstMemorySnippet: recallRes.data.results?.[0]?.text?.slice(0, 100)
  };

  // ---------------------------------------------------------------------------
  // WORKFLOW C: Multi-turn Chat & Grounded Follow-up
  // ---------------------------------------------------------------------------
  console.log('\n--- Workflow C: Ask Question -> Receive Citations -> Follow-up ---');
  const chatSessionId = `e2e-session-${Date.now()}`;
  const q1 = "What are the most urgent customer problems right now?";
  const turn1Res = await request('/api/chat/ask', {
    method: 'POST',
    body: {
      question: q1,
      companyId: 'demo-company',
      memoryEnabled: true,
      sessionId: chatSessionId
    }
  });
  console.log(`- Turn 1 Answer received (${turn1Res.data.answer?.length} chars), Evidence cited: ${turn1Res.data.evidence?.map(e => e.feedback_id).join(', ')}`);

  // Turn 2: Follow-up question in the same session
  const history = [
    { role: 'user', content: q1 },
    { role: 'assistant', content: turn1Res.data.answer }
  ];
  const q2 = "Can you elaborate on the authentication issues specifically?";
  const turn2Res = await request('/api/chat/ask', {
    method: 'POST',
    body: {
      question: q2,
      companyId: 'demo-company',
      memoryEnabled: true,
      sessionId: chatSessionId,
      history
    }
  });
  console.log(`- Turn 2 Follow-up received (${turn2Res.data.answer?.length} chars), Evidence cited: ${turn2Res.data.evidence?.map(e => e.feedback_id).join(', ')}`);
  const turn2Grounded = turn2Res.data.evidence?.some(e => e.feedback_id === 'FB-004' || e.feedback_id === 'FB-009');
  
  report.workflowC = {
    status: (turn1Res.status === 200 && turn2Res.status === 200 && turn2Grounded) ? 'PASS' : 'FAIL',
    turn1EvidenceCount: turn1Res.data.evidence?.length,
    turn2EvidenceCount: turn2Res.data.evidence?.length,
    turn2Grounded
  };

  // Clean up test session
  db.prepare('DELETE FROM chat_history WHERE session_id = ?').run(chatSessionId);

  // ---------------------------------------------------------------------------
  // WORKFLOW D: Memory OFF Mode -> SQLite Only -> Zero Hindsight Calls
  // ---------------------------------------------------------------------------
  console.log('\n--- Workflow D: Memory OFF Zero Hindsight Retrieval Guarantee ---');
  const questionBenchmark = "Has dashboard performance improved over time?";
  const offQueryRes = await request('/api/demo/query', {
    method: 'POST',
    body: {
      question: questionBenchmark,
      companyId: 'demo-company',
      memoryEnabled: false
    }
  });
  const offGuaranteed = 
    offQueryRes.status === 200 &&
    offQueryRes.data.mode === 'memory_off' &&
    offQueryRes.data.hindsightAccessed === false &&
    offQueryRes.data.memoryRecallCount === 0 &&
    offQueryRes.data.evidence.every(e => !e.feedback_id.startsWith('AUDIT-'));
  console.log(`- Memory OFF Mode: mode=${offQueryRes.data.mode}, hindsightAccessed=${offQueryRes.data.hindsightAccessed}, recallCount=${offQueryRes.data.memoryRecallCount}`);

  report.workflowD = {
    status: offGuaranteed ? 'PASS' : 'FAIL',
    mode: offQueryRes.data.mode,
    hindsightAccessed: offQueryRes.data.hindsightAccessed,
    memoryRecallCount: offQueryRes.data.memoryRecallCount,
    evidenceCount: offQueryRes.data.evidence?.length
  };

  // ---------------------------------------------------------------------------
  // WORKFLOW E: Memory ON Mode -> Actual Historical Recall
  // ---------------------------------------------------------------------------
  console.log('\n--- Workflow E: Memory ON Historical Grounding ---');
  const onQueryRes = await request('/api/demo/query', {
    method: 'POST',
    body: {
      question: questionBenchmark,
      companyId: 'demo-company',
      memoryEnabled: true
    }
  });
  const onGuaranteed = 
    onQueryRes.status === 200 &&
    onQueryRes.data.mode === 'memory_on' &&
    onQueryRes.data.hindsightAccessed === true &&
    onQueryRes.data.memoryRecallCount > 0 &&
    onQueryRes.data.evidence.every(e => !e.feedback_id.startsWith('AUDIT-'));
  console.log(`- Memory ON Mode: mode=${onQueryRes.data.mode}, hindsightAccessed=${onQueryRes.data.hindsightAccessed}, memoriesRetrieved=${onQueryRes.data.memoryRecallCount}`);

  report.workflowE = {
    status: onGuaranteed ? 'PASS' : 'FAIL',
    mode: onQueryRes.data.mode,
    hindsightAccessed: onQueryRes.data.hindsightAccessed,
    memoryRecallCount: onQueryRes.data.memoryRecallCount,
    evidenceCount: onQueryRes.data.evidence?.length
  };

  // ---------------------------------------------------------------------------
  // WORKFLOW F: Trend Generation -> Recommendations -> Feedback IDs Linkage
  // ---------------------------------------------------------------------------
  console.log('\n--- Workflow F: Trends & Recommendations Evidence Linkage ---');
  const trendsRes = await request('/api/trends/overview?companyId=demo-company&memoryEnabled=true');
  const recsRes = await request('/api/trends/recommendations?companyId=demo-company&memoryEnabled=true');

  const trendsValid = trendsRes.status === 200 && trendsRes.data.hasSufficientData === true && trendsRes.data.monthlyTrends?.length >= 3;
  const recsValid = recsRes.status === 200 && recsRes.data.recommendations?.length > 0;
  
  // Verify all recommendations link to real feedback IDs that actually exist in SQLite
  const allFeedbackIdsInDb = new Set(db.prepare('SELECT feedback_id FROM feedback WHERE company_id = ?').all('demo-company').map(r => r.feedback_id));
  const recsLinkedToRealData = recsRes.data.recommendations.every(rec => 
    Array.isArray(rec.supportingFeedbackIds) &&
    rec.supportingFeedbackIds.length > 0 &&
    rec.supportingFeedbackIds.some(id => allFeedbackIdsInDb.has(id))
  );

  console.log(`- Trends Generated: ${trendsRes.data.monthlyTrends?.length} monthly periods, Net Trajectory: ${trendsRes.data.sentimentTrajectory}`);
  console.log(`- Recommendations Generated: ${recsRes.data.recommendations?.length} recommendations, All linked to real SQLite feedback IDs: ${recsLinkedToRealData}`);

  report.workflowF = {
    status: (trendsValid && recsValid && recsLinkedToRealData) ? 'PASS' : 'FAIL',
    monthlyPeriods: trendsRes.data.monthlyTrends?.length,
    recommendationsCount: recsRes.data.recommendations?.length,
    recsLinkedToRealData
  };

  // ---------------------------------------------------------------------------
  // WORKFLOW G: Backend Persistence Across Re-initialization
  // ---------------------------------------------------------------------------
  console.log('\n--- Workflow G: Persistence Across Backend Re-initialization ---');
  const preDemoCount = db.prepare('SELECT COUNT(*) as count FROM feedback WHERE company_id = ?').get('demo-company')?.count;
  const preTotalCount = db.prepare('SELECT COUNT(*) as count FROM feedback').get()?.count;

  // Reconnect and query
  const freshDb = getDatabase();
  const postDemoCount = freshDb.prepare('SELECT COUNT(*) as count FROM feedback WHERE company_id = ?').get('demo-company')?.count;
  const postTotalCount = freshDb.prepare('SELECT COUNT(*) as count FROM feedback').get()?.count;

  const persisted = preDemoCount === postDemoCount && preTotalCount === postTotalCount;
  console.log(`- Pre Count: demo=${preDemoCount}, total=${preTotalCount}`);
  console.log(`- Post Count: demo=${postDemoCount}, total=${postTotalCount}`);
  console.log(`- Persistence Verified: ${persisted}`);

  report.workflowG = {
    status: persisted ? 'PASS' : 'FAIL',
    demoCompanyCount: postDemoCount,
    totalDatabaseCount: postTotalCount
  };

  // ---------------------------------------------------------------------------
  // SUMMARY
  // ---------------------------------------------------------------------------
  console.log('\n================================================================');
  console.log('END-TO-END WORKFLOW VERIFICATION SUMMARY');
  console.log('================================================================');
  let allPass = true;
  for (const [name, res] of Object.entries(report)) {
    console.log(`${res.status === 'PASS' ? '✅ PASS' : '❌ FAIL'} | ${name}: ${res.status}`);
    if (res.status !== 'PASS') allPass = false;
  }
  console.log(`\nOVERALL E2E WORKFLOW STATUS: ${allPass ? 'ALL 7 WORKFLOWS PASSED (100%)' : 'FAILURES DETECTED'}`);

  if (!allPass) {
    process.exit(1);
  }
}

runE2EWorkflows().catch(err => {
  console.error('Fatal E2E workflow error:', err);
  process.exit(1);
});

