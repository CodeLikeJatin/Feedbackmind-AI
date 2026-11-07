import http from 'http';

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

async function runRouteVerification() {
  console.log('================================================================');
  console.log('FEEDBACKMIND AI — COMPREHENSIVE BACKEND API ROUTE VERIFICATION');
  console.log('================================================================\n');

  const results = [];

  // Query baseline count dynamically to support user additions (e.g. record 021)
  const baselineRes = await request('/api/feedback?companyId=demo-company');
  const expectedDemoCount = baselineRes.data.total;

  function record(route, testName, expectedStatus, actualStatus, pass, details = '') {
    results.push({ route, testName, expectedStatus, actualStatus, pass, details });
    const mark = pass ? '✅ PASS' : '❌ FAIL';
    console.log(`${mark} | ${route} | ${testName} | HTTP ${actualStatus} (Expected ${expectedStatus}) ${details ? `| ${details}` : ''}`);
  }

  // 1. GET /api/health
  {
    const res = await request('/api/health');
    const valid = res.status === 200 && res.data.status === 'ok' && res.data.database === 'connected';
    record('GET /api/health', 'Valid health check', 200, res.status, valid, `Engine: ${res.data.aiEngine}`);
  }

  // 2. POST /api/health (Method Not Allowed / Unknown endpoint)
  {
    const res = await request('/api/health', { method: 'POST' });
    record('POST /api/health', 'Invalid HTTP method handling', 404, res.status, res.status === 404);
  }

  // 3. GET /api/dashboard/stats
  {
    const res = await request('/api/dashboard/stats?companyId=demo-company');
    const valid = res.status === 200 && res.data.total === expectedDemoCount && res.data.sentiment && typeof res.data.sentiment.positive === 'number';
    record('GET /api/dashboard/stats', 'Valid stats query for demo-company', 200, res.status, valid, `Total: ${res.data.total}, Positive: ${res.data.sentiment?.positive}, Topics: ${res.data.topics?.length}`);
  }

  // 4. GET /api/feedback (default query)
  {
    const res = await request('/api/feedback?companyId=demo-company');
    const valid = res.status === 200 && res.data.total === expectedDemoCount && Array.isArray(res.data.items);
    record('GET /api/feedback', 'List all feedback for demo-company', 200, res.status, valid, `Count: ${res.data.items?.length}`);
  }

  // 5. GET /api/feedback with topic filter
  {
    const res = await request('/api/feedback?companyId=demo-company&topic=performance');
    const valid = res.status === 200 && res.data.items.every(i => i.topic?.toLowerCase() === 'performance');
    record('GET /api/feedback?topic=performance', 'Filter feedback by topic', 200, res.status, valid, `Matched: ${res.data.items?.length}`);
  }

  // 6. GET /api/feedback with sentiment filter
  {
    const res = await request('/api/feedback?companyId=demo-company&sentiment=negative');
    const valid = res.status === 200 && res.data.items.every(i => i.sentiment === 'negative');
    record('GET /api/feedback?sentiment=negative', 'Filter feedback by sentiment', 200, res.status, valid, `Matched: ${res.data.items?.length}`);
  }

  // 7. GET /api/feedback with pagination (limit & offset)
  {
    const res = await request('/api/feedback?companyId=demo-company&limit=5&offset=2');
    const valid = res.status === 200 && res.data.items.length === 5;
    record('GET /api/feedback?limit=5&offset=2', 'Pagination limit and offset', 200, res.status, valid, `Returned ${res.data.items?.length} items`);
  }

  // 8. POST /api/feedback/upload (missing body)
  {
    const res = await request('/api/feedback/upload', {
      method: 'POST',
      body: {}
    });
    const valid = res.status === 400 && Boolean(res.data.error);
    record('POST /api/feedback/upload', 'Missing CSV content returns 400', 400, res.status, valid, res.data.error);
  }

  // 9. POST /api/feedback/upload (invalid CSV columns)
  {
    const res = await request('/api/feedback/upload', {
      method: 'POST',
      body: {
        companyId: 'temp-verify-co',
        csvContent: 'random,column,names\n1,2,3'
      }
    });
    const valid = res.status === 400 && res.data.error?.toLowerCase().includes('missing required');
    record('POST /api/feedback/upload', 'Invalid columns rejected with 400', 400, res.status, valid, res.data.error);
  }

  // 10. POST /api/feedback/upload (valid CSV ingestion on temp tenant)
  const TS = Date.now();
  const TEMP_TENANT = `temp-verify-tenant-${TS}`;
  const TEMP_FEEDBACK_ID = `VERIFY-${TS}`;
  {
    const validCsv = `feedback_id,customer_id,date,source,feedback,rating\n${TEMP_FEEDBACK_ID},CUST-99,2026-11-01,Zendesk,"API latency has increased significantly on reports",2.0`;
    const res = await request('/api/feedback/upload', {
      method: 'POST',
      body: {
        companyId: TEMP_TENANT,
        csvContent: validCsv
      }
    });
    const valid = res.status === 200 && res.data.imported === 1;
    record('POST /api/feedback/upload', 'Valid CSV ingestion on isolated tenant', 200, res.status, valid, `Imported: ${res.data.imported}`);
  }

  // 11. GET /api/analysis/status
  {
    const res = await request(`/api/analysis/status?companyId=${TEMP_TENANT}`);
    const valid = res.status === 200 && res.data.total === 1 && res.data.pending === 1;
    record('GET /api/analysis/status', 'Analysis counts for pending items', 200, res.status, valid, `Pending: ${res.data.pending}`);
  }

  // 12. POST /api/analysis/preview (missing feedback text)
  {
    const res = await request('/api/analysis/preview', {
      method: 'POST',
      body: {}
    });
    record('POST /api/analysis/preview', 'Missing feedback returns 400', 400, res.status, res.status === 400);
  }

  // 13. POST /api/analysis/preview (valid preview via real Groq)
  {
    const res = await request('/api/analysis/preview', {
      method: 'POST',
      body: {
        feedback: "The batch PDF export feature is fantastic and saved us 4 hours every week!",
        rating: 5,
        source: "Zendesk"
      }
    });
    const valid = res.status === 200 && res.data.sentiment === 'positive';
    record('POST /api/analysis/preview', 'Real Groq AI analysis preview', 200, res.status, valid, `Sentiment: ${res.data.sentiment}, Topic: ${res.data.topic}`);
  }

  // 14. POST /api/analysis/analyze-record/:id (nonexistent record)
  {
    const res = await request('/api/analysis/analyze-record/NON-EXISTENT-ID-999', { method: 'POST' });
    record('POST /api/analysis/analyze-record/:id', 'Nonexistent record returns 404', 404, res.status, res.status === 404);
  }

  // 15. POST /api/analysis/analyze-record/:id (valid record on temp tenant)
  {
    const res = await request(`/api/analysis/analyze-record/${TEMP_FEEDBACK_ID}`, { method: 'POST' });
    const valid = res.status === 200 && res.data.status === 'analyzed';
    record('POST /api/analysis/analyze-record/:id', 'Real Groq analysis of single record', 200, res.status, valid, `Sentiment: ${res.data.sentiment}, Topic: ${res.data.topic}`);
  }

  // 16. GET /api/memory/overview
  {
    const res = await request('/api/memory/overview?companyId=demo-company');
    const valid = res.status === 200 && res.data.configured === true && res.data.bankId === 'feedbackmind-demo' && typeof res.data.retainedFeedback === 'number';
    record('GET /api/memory/overview', 'Memory bank status and overview', 200, res.status, valid, `Retained in DB: ${res.data.retainedFeedback}, Total: ${res.data.totalFeedback}`);
  }

  // 17. GET /api/memory/list
  {
    const res = await request('/api/memory/list?companyId=demo-company');
    const valid = res.status === 200 && Array.isArray(res.data.items) && res.data.items.length > 0;
    record('GET /api/memory/list', 'List retained memories with memory IDs', 200, res.status, valid, `Count: ${res.data.items?.length}`);
  }

  // 18. POST /api/memory/recall (missing query)
  {
    const res = await request('/api/memory/recall', {
      method: 'POST',
      body: {}
    });
    record('POST /api/memory/recall', 'Missing query returns 400', 400, res.status, res.status === 400);
  }

  // 19. POST /api/memory/recall (valid recall on real Hindsight Cloud)
  {
    const res = await request('/api/memory/recall', {
      method: 'POST',
      body: {
        query: "What complaints do users have about slow loading dashboards?",
        companyId: 'demo-company'
      }
    });
    const valid = res.status === 200 && Array.isArray(res.data.results) && typeof res.data.total === 'number';
    record('POST /api/memory/recall', 'Real Hindsight memory recall', 200, res.status, valid, `Recalled ${res.data.total} memories from bank "${res.data.bankId}"`);
  }

  // 20. POST /api/memory/reflect (missing query)
  {
    const res = await request('/api/memory/reflect', {
      method: 'POST',
      body: {}
    });
    record('POST /api/memory/reflect', 'Missing query returns 400', 400, res.status, res.status === 400);
  }

  // 21. POST /api/memory/reflect (valid longitudinal reflection)
  {
    const res = await request('/api/memory/reflect', {
      method: 'POST',
      body: {
        query: "Recurring patterns in dashboard performance feedback",
        companyId: 'demo-company'
      }
    });
    const valid = res.status === 200 && typeof res.data.text === 'string' && res.data.text.length > 0;
    record('POST /api/memory/reflect', 'Real Hindsight longitudinal reflection', 200, res.status, valid, `Reflection length: ${res.data.text?.length} chars`);
  }

  // 22. POST /api/chat/ask (missing question)
  {
    const res = await request('/api/chat/ask', {
      method: 'POST',
      body: {}
    });
    record('POST /api/chat/ask', 'Missing question returns 400', 400, res.status, res.status === 400);
  }

  // 23. POST /api/chat/ask (valid Memory ON query)
  {
    const res = await request('/api/chat/ask', {
      method: 'POST',
      body: {
        question: "What are the biggest customer complaints regarding login?",
        companyId: 'demo-company',
        memoryEnabled: true
      }
    });
    const valid = res.status === 200 && res.data.memoryEnabled === true && res.data.memoriesRetrievedCount > 0 && Array.isArray(res.data.evidence);
    record('POST /api/chat/ask', 'Memory ON chat query with evidence citations', 200, res.status, valid, `Retrieved: ${res.data.memoriesRetrievedCount}, Evidence: ${res.data.evidence?.length}`);
  }

  // 24. POST /api/chat/ask (valid Memory OFF query)
  {
    const res = await request('/api/chat/ask', {
      method: 'POST',
      body: {
        question: "What are the biggest customer complaints regarding login?",
        companyId: 'demo-company',
        memoryEnabled: false
      }
    });
    const valid = res.status === 200 && res.data.memoryEnabled === false && res.data.memoriesRetrievedCount === 0;
    record('POST /api/chat/ask', 'Memory OFF chat query guarantees zero Hindsight calls', 200, res.status, valid, `Retrieved: ${res.data.memoriesRetrievedCount}, MemoryEnabled: ${res.data.memoryEnabled}`);
  }

  // 25. GET /api/chat/history
  {
    const res = await request('/api/chat/history?companyId=demo-company&sessionId=default-session');
    const valid = res.status === 200 && Array.isArray(res.data.history);
    record('GET /api/chat/history', 'Retrieve chat history', 200, res.status, valid, `History entries: ${res.data.history?.length}`);
  }

  // 26. DELETE /api/chat/history (on temporary test session)
  {
    const res = await request('/api/chat/history?companyId=temp-test-chat-co&sessionId=temp-session', {
      method: 'DELETE'
    });
    const valid = res.status === 200 && res.data.success === true;
    record('DELETE /api/chat/history', 'Clear chat history', 200, res.status, valid, res.data.message);
  }

  // 27. GET /api/trends/overview
  {
    const res = await request('/api/trends/overview?companyId=demo-company&memoryEnabled=true');
    const valid = res.status === 200 && Array.isArray(res.data.monthlyTrends) && Array.isArray(res.data.frequentProblems);
    record('GET /api/trends/overview', 'Longitudinal trend analytics overview', 200, res.status, valid, `Problems: ${res.data.frequentProblems?.length}, Months: ${res.data.monthlyTrends?.length}`);
  }

  // 28. GET /api/trends/recommendations
  {
    const res = await request('/api/trends/recommendations?companyId=demo-company&memoryEnabled=true');
    const valid = res.status === 200 && Array.isArray(res.data.recommendations) && res.data.recommendations.length > 0;
    const firstRec = res.data.recommendations[0];
    const requiredKeys = ['id', 'title', 'problem', 'whyItMatters', 'supportingFeedbackIds', 'affectedCount', 'customerRatings', 'urgency', 'expectedImpact', 'priority', 'recommendedNextAction', 'category'];
    const hasAllKeys = firstRec && requiredKeys.every(k => k in firstRec);
    record('GET /api/trends/recommendations', 'Prioritized recommendations with all required fields', 200, res.status, valid && hasAllKeys, `Total recs: ${res.data.recommendations?.length}, 12 required fields verified: ${hasAllKeys}`);
  }

  // 29. GET /api/demo/status
  {
    const res = await request('/api/demo/status?companyId=demo-company');
    const valid = res.status === 200 && res.data.sqliteRecordCount === expectedDemoCount && Array.isArray(res.data.suggestedQuestions);
    record('GET /api/demo/status', 'Demo showcase status and suggested questions', 200, res.status, valid, `Suggested questions: ${res.data.suggestedQuestions?.length}, SQLite count: ${res.data.sqliteRecordCount}`);
  }

  // 30. POST /api/demo/query (Memory OFF)
  {
    const res = await request('/api/demo/query', {
      method: 'POST',
      body: {
        question: "Has dashboard performance improved over time?",
        companyId: 'demo-company',
        memoryEnabled: false
      }
    });
    const valid = res.status === 200 && res.data.mode === 'memory_off' && res.data.hindsightAccessed === false;
    record('POST /api/demo/query', 'Demo query Memory OFF mode', 200, res.status, valid, `Hindsight calls: ${res.data.memoryRecallCount}`);
  }

  // 31. POST /api/demo/query (Memory ON)
  {
    const res = await request('/api/demo/query', {
      method: 'POST',
      body: {
        question: "Has dashboard performance improved over time?",
        companyId: 'demo-company',
        memoryEnabled: true
      }
    });
    const valid = res.status === 200 && res.data.mode === 'memory_on' && res.data.hindsightAccessed === true && res.data.memoryRecallCount > 0;
    record('POST /api/demo/query', 'Demo query Memory ON mode with real memories', 200, res.status, valid, `Memories retrieved: ${res.data.memoryRecallCount}`);
  }

  // 32. POST /api/demo/compare (Side-by-side comparison)
  {
    const res = await request('/api/demo/compare', {
      method: 'POST',
      body: {
        question: "Has dashboard performance improved over time?",
        companyId: 'demo-company'
      }
    });
    const valid = res.status === 200 && res.data.memoryOff && res.data.memoryOn && res.data.analysis;
    const anl = res.data.analysis;
    const anlValid = anl && anl.additionalContextProvided && anl.recurringIssuesIdentified && anl.timeEvolutionIdentified && anl.strongerMode;
    record('POST /api/demo/compare', 'Side-by-side judging comparison with 5 criteria', 200, res.status, valid && Boolean(anlValid), `Stronger mode: ${anl?.strongerMode}`);
  }

  // 33. DELETE /api/feedback/clear (clean up temporary test tenant)
  {
    const res = await request(`/api/feedback/clear?companyId=${TEMP_TENANT}`, { method: 'DELETE' });
    const valid = res.status === 200;
    record('DELETE /api/feedback/clear', 'Clear isolated test tenant data', 200, res.status, valid, `Cleared: ${res.data.cleared}`);
  }

  // 34. GET /api/nonexistent-route-audit (404 handler)
  {
    const res = await request('/api/nonexistent-route-audit');
    const valid = res.status === 404 && res.data.error === 'Endpoint not found';
    record('GET /api/nonexistent-route-audit', 'Unknown endpoint returns 404', 404, res.status, valid, res.data.error);
  }

  console.log('\n================================================================');
  console.log(`ROUTE VERIFICATION SUMMARY: ${results.filter(r => r.pass).length}/${results.length} PASSED`);
  console.log('================================================================\n');

  if (results.some(r => !r.pass)) {
    process.exit(1);
  }
}

runRouteVerification().catch(err => {
  console.error('Fatal route verification error:', err);
  process.exit(1);
});
