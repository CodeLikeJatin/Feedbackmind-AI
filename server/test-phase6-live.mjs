import { trendService } from './src/services/trendService.js';
import { getDatabase } from './src/config/db.js';

async function runLivePhase6Verification() {
  console.log('=== PHASE 6: TREND DETECTION & PRODUCT RECOMMENDATIONS LIVE VERIFICATION ===\n');

  const results = {};
  const db = getDatabase();

  // Snapshot record count before test to verify zero data mutation
  const initialCountRow = db.prepare('SELECT COUNT(*) as count FROM feedback WHERE company_id = ?').get('demo-company');
  const initialCount = initialCountRow?.count || 0;
  console.log(`Initial SQLite records for 'demo-company': ${initialCount}`);

  // -------------------------------------------------------------------------
  // TEST 1: Live Trend Detection Overview (Memory ON)
  // -------------------------------------------------------------------------
  console.log('\n--- [Test 1] Trend Detection Engine (demo-company, Memory ON) ---');
  const t1Start = Date.now();
  const trendsOn = await trendService.detectTrends({ companyId: 'demo-company', memoryEnabled: true });
  const t1Duration = Date.now() - t1Start;

  console.log(`Execution time: ${t1Duration} ms`);
  console.log(`Has Sufficient Data: ${trendsOn.hasSufficientData}`);
  console.log(`Total Feedback Evaluated: ${trendsOn.totalFeedback}`);
  console.log(`Reporting Periods: ${trendsOn.reportingPeriods?.join(', ')}`);
  console.log(`Sentiment Trajectory: ${trendsOn.sentimentTrajectory}`);
  console.log(`Monthly Trends Count: ${trendsOn.monthlyTrends?.length}`);
  console.log(`Top Frequent Problems: ${trendsOn.frequentProblems?.length}`);
  console.log(`Emerging Issues: ${trendsOn.emergingIssues?.length}`);
  console.log(`Feature Requests: ${trendsOn.featureRequests?.length}`);
  console.log(`Categorical Friction Clusters: ${trendsOn.categoricalClusters?.length}`);
  console.log(`Positive Praise Themes: ${trendsOn.positiveTrends?.length}`);
  console.log(`Memory Grounded: ${trendsOn.memoryGrounded}`);
  console.log(`Hindsight Synthesis: ${trendsOn.hindsightSynthesis ? 'Available (' + trendsOn.hindsightSynthesis.length + ' chars)' : 'None'}`);

  const test1Valid = 
    trendsOn.hasSufficientData === true &&
    trendsOn.totalFeedback === initialCount &&
    Array.isArray(trendsOn.monthlyTrends) && trendsOn.monthlyTrends.length >= 2 &&
    ['improving', 'declining', 'stable'].includes(trendsOn.sentimentTrajectory) &&
    Array.isArray(trendsOn.frequentProblems) && trendsOn.frequentProblems.length > 0 &&
    Array.isArray(trendsOn.featureRequests) && trendsOn.featureRequests.length > 0 &&
    Array.isArray(trendsOn.categoricalClusters) && trendsOn.categoricalClusters.length > 0 &&
    trendsOn.memoryGrounded === true;

  results.test1_trendDetectionOn = {
    status: test1Valid ? 'PASS' : 'FAIL',
    latencyMs: t1Duration,
    totalFeedback: trendsOn.totalFeedback,
    monthlyPeriods: trendsOn.monthlyTrends?.map(m => m.period),
    trajectory: trendsOn.sentimentTrajectory,
    topProblem: trendsOn.frequentProblems?.[0]?.problem,
    topFeature: trendsOn.featureRequests?.[0]?.feature,
    memoryGrounded: trendsOn.memoryGrounded
  };

  // -------------------------------------------------------------------------
  // TEST 2: Memory OFF vs Memory ON Comparative Evaluation
  // -------------------------------------------------------------------------
  console.log('\n--- [Test 2] Memory OFF vs Memory ON Comparative Evaluation ---');
  const t2Start = Date.now();
  const trendsOff = await trendService.detectTrends({ companyId: 'demo-company', memoryEnabled: false });
  const t2Duration = Date.now() - t2Start;

  console.log(`Memory OFF Execution time: ${t2Duration} ms`);
  console.log(`Memory OFF Grounded: ${trendsOff.memoryGrounded}`);
  console.log(`Memory OFF Hindsight Synthesis: ${trendsOff.hindsightSynthesis}`);
  console.log(`SQLite Record Count parity: ON=${trendsOn.totalFeedback}, OFF=${trendsOff.totalFeedback}`);

  const test2Valid = 
    trendsOff.hasSufficientData === true &&
    trendsOff.memoryGrounded === false &&
    trendsOff.hindsightSynthesis === null &&
    trendsOff.totalFeedback === trendsOn.totalFeedback &&
    trendsOff.sentimentTrajectory === trendsOn.sentimentTrajectory;

  results.test2_memoryComparison = {
    status: test2Valid ? 'PASS' : 'FAIL',
    memoryOnGrounded: trendsOn.memoryGrounded,
    memoryOffGrounded: trendsOff.memoryGrounded,
    feedbackCountPreserved: trendsOff.totalFeedback === trendsOn.totalFeedback,
    hindsightSynthesisExcludedInOff: trendsOff.hindsightSynthesis === null
  };

  // -------------------------------------------------------------------------
  // TEST 3: Prioritized Product Recommendations with All 10 Required Fields
  // -------------------------------------------------------------------------
  console.log('\n--- [Test 3] Prioritized Product Recommendations Engine ---');
  const t3Start = Date.now();
  const recsResponse = await trendService.getRecommendations({ companyId: 'demo-company', memoryEnabled: true });
  const t3Duration = Date.now() - t3Start;

  const recs = recsResponse.recommendations || [];
  console.log(`Recommendations generated: ${recs.length}`);
  console.log(`Memory Grounded: ${recsResponse.memoryGrounded}`);

  const requiredFields = [
    'id',
    'title',
    'problem',
    'whyItMatters',
    'supportingFeedbackIds',
    'affectedCount',
    'customerRatings',
    'urgency',
    'expectedImpact',
    'priority',
    'recommendedNextAction',
    'category'
  ];

  let allFieldsValid = true;
  let allEvidenceExistsInDb = true;
  const missingFieldsReport = [];
  const invalidEvidenceReport = [];

  for (const rec of recs) {
    for (const field of requiredFields) {
      if (rec[field] === undefined || rec[field] === null || rec[field] === '') {
        allFieldsValid = false;
        missingFieldsReport.push(`Rec ${rec.id} missing ${field}`);
      }
    }

    if (!Array.isArray(rec.supportingFeedbackIds) || rec.supportingFeedbackIds.length === 0) {
      allFieldsValid = false;
      missingFieldsReport.push(`Rec ${rec.id} has empty supportingFeedbackIds`);
    } else {
      // Check each supporting ID actually exists in SQLite
      for (const fId of rec.supportingFeedbackIds) {
        const found = db.prepare('SELECT 1 FROM feedback WHERE feedback_id = ? AND company_id = ?').get(fId, 'demo-company');
        if (!found) {
          allEvidenceExistsInDb = false;
          invalidEvidenceReport.push(`Feedback ID ${fId} cited by ${rec.id} does not exist in SQLite`);
        }
      }
    }
  }

  // Count priorities
  const criticalCount = recs.filter(r => r.priority === 'Critical').length;
  const highCount = recs.filter(r => r.priority === 'High').length;
  const mediumCount = recs.filter(r => r.priority === 'Medium').length;
  const lowCount = recs.filter(r => r.priority === 'Low').length;

  console.log(`Priority Distribution: Critical=${criticalCount}, High=${highCount}, Medium=${mediumCount}, Low=${lowCount}`);
  if (recs[0]) {
    console.log('\nTop Recommendation Sample:');
    console.log(`- Priority: [${recs[0].priority}] ${recs[0].title}`);
    console.log(`- Problem: ${recs[0].problem}`);
    console.log(`- Why It Matters: ${recs[0].whyItMatters}`);
    console.log(`- Supporting IDs: ${recs[0].supportingFeedbackIds.join(', ')} (${recs[0].affectedCount} affected)`);
    console.log(`- Expected Impact: ${recs[0].expectedImpact}`);
    console.log(`- Next Action: ${recs[0].recommendedNextAction}`);
  }

  const test3Valid = 
    recs.length > 0 &&
    allFieldsValid &&
    allEvidenceExistsInDb &&
    criticalCount > 0 &&
    highCount > 0;

  results.test3_productRecommendations = {
    status: test3Valid ? 'PASS' : 'FAIL',
    latencyMs: t3Duration,
    recommendationsCount: recs.length,
    criticalCount,
    highCount,
    mediumCount,
    all10FieldsPresent: allFieldsValid,
    allEvidenceValidatedAgainstDb: allEvidenceExistsInDb,
    missingFields: missingFieldsReport,
    invalidEvidence: invalidEvidenceReport
  };

  // -------------------------------------------------------------------------
  // TEST 4: Insufficient Data Guard Handling (< 3 records or < 2 dates)
  // -------------------------------------------------------------------------
  console.log('\n--- [Test 4] Insufficient Data Guard (empty-tenant-zero) ---');
  const emptyTrends = await trendService.detectTrends({ companyId: 'empty-tenant-zero', memoryEnabled: true });
  const emptyRecs = await trendService.getRecommendations({ companyId: 'empty-tenant-zero', memoryEnabled: true });

  console.log(`Empty Tenant Trends hasSufficientData: ${emptyTrends.hasSufficientData}`);
  console.log(`Empty Tenant Trends message: "${emptyTrends.message}"`);
  console.log(`Empty Tenant Recs hasSufficientData: ${emptyRecs.hasSufficientData}`);
  console.log(`Empty Tenant Recs count: ${emptyRecs.recommendations?.length}`);

  const test4Valid = 
    emptyTrends.hasSufficientData === false &&
    emptyTrends.monthlyTrends?.length === 0 &&
    emptyTrends.frequentProblems?.length === 0 &&
    typeof emptyTrends.message === 'string' &&
    emptyTrends.message.length > 10 &&
    emptyRecs.hasSufficientData === false &&
    emptyRecs.recommendations?.length === 0;

  results.test4_insufficientDataGuard = {
    status: test4Valid ? 'PASS' : 'FAIL',
    trendsHasSufficientData: emptyTrends.hasSufficientData,
    recsHasSufficientData: emptyRecs.hasSufficientData,
    informativeMessage: emptyTrends.message
  };

  // -------------------------------------------------------------------------
  // TEST 5: SQLite Database Integrity Verification
  // -------------------------------------------------------------------------
  console.log('\n--- [Test 5] SQLite Database Mutation & Non-Destructive Verification ---');
  const finalCountRow = db.prepare('SELECT COUNT(*) as count FROM feedback WHERE company_id = ?').get('demo-company');
  const finalCount = finalCountRow?.count || 0;
  console.log(`Final SQLite record count: ${finalCount} (Initial was ${initialCount})`);

  const test5Valid = initialCount === finalCount && initialCount >= 20;

  results.test5_databaseIntegrity = {
    status: test5Valid ? 'PASS' : 'FAIL',
    initialCount,
    finalCount,
    recordsAlteredOrDeleted: initialCount !== finalCount
  };

  // -------------------------------------------------------------------------
  // SUMMARY
  // -------------------------------------------------------------------------
  console.log('\n=== PHASE 6 LIVE VERIFICATION SUMMARY ===');
  let overallPass = true;
  for (const [k, v] of Object.entries(results)) {
    console.log(`- ${k}: ${v.status}`);
    if (v.status !== 'PASS') overallPass = false;
  }
  console.log(`\nOVERALL STATUS: ${overallPass ? 'ALL TESTS PASSED (PASS)' : 'FAILURES DETECTED (FAIL)'}`);

  return { overallPass, results };
}

runLivePhase6Verification().catch(err => {
  console.error('Fatal live verification error:', err);
  process.exit(1);
});

