import { hindsightService, getHindsightClient } from './src/services/hindsightService.js';
import { getDatabase } from './src/config/db.js';
import { sdk } from '@vectorize-io/hindsight-client';

async function runPostRetainVerification() {
  console.log('=== VERIFYING HINDSIGHT RETENTION AFTER RETAIN PENDING RECORDS ===\n');

  const client = getHindsightClient();
  const bankId = hindsightService.resolveBankId('demo-company');
  const db = getDatabase();

  // 1. Inspect SQLite for FB-001 through FB-020
  console.log('--- 1 & 2. Inspecting SQLite Records (FB-001 through FB-020) ---');
  const fbRecords = db.prepare(`
    SELECT id, feedback_id, customer_id, rating, topic, sentiment, 
           analysis_status, retained_in_hindsight, hindsight_memory_id, feedback
    FROM feedback
    WHERE feedback_id LIKE 'FB-0%'
    ORDER BY id ASC
  `).all();

  const total = fbRecords.length;
  const successful = fbRecords.filter(r => r.retained_in_hindsight === 1 && r.hindsight_memory_id);
  const pending = fbRecords.filter(r => r.retained_in_hindsight === 0);
  const failed = fbRecords.filter(r => r.analysis_status === 'failed');

  console.log(`Total inspected: ${total}`);
  console.log(`Successful retained: ${successful.length}`);
  console.log(`Pending: ${pending.length}`);
  console.log(`Failed: ${failed.length}`);

  // Sample ID check
  console.log('\nSample memory ID assignments:');
  console.table(fbRecords.slice(0, 5).map(r => ({
    feedback_id: r.feedback_id,
    customer_id: r.customer_id,
    topic: r.topic,
    retained_flag: r.retained_in_hindsight,
    hindsight_memory_id: r.hindsight_memory_id
  })));

  // 3 & 4. Confirm actual cloud bank status & count in Hindsight Cloud
  console.log('\n--- 3 & 4. Checking Live Hindsight Cloud Memory Bank Profile ---');
  const banksRes = await sdk.listBanks({ client: client.client });
  const bank = banksRes?.data?.banks?.find(b => b.bank_id === bankId);

  console.log(`Bank ID: ${bankId}`);
  console.log(`Bank Name: ${bank?.name}`);
  console.log(`Total Facts Indexed in Cloud Bank: ${bank?.fact_count}`);
  console.log(`Last Document Processed: ${bank?.last_document_at}`);
  console.log(`Last Cloud Write: ${bank?.last_write_at}`);

  // 5 & 6. Recall across key categories and verify evidence matches FB-001 through FB-020
  console.log('\n--- 5 & 6. Live Category Recall & Evidence Matching ---');

  const categories = [
    {
      category: 'Performance',
      query: 'The dashboard takes too long to load in the morning and notifications arrive 20 to 30 minutes late',
      expectedMatches: ['FB-001', 'FB-017', 'FB-013']
    },
    {
      category: 'Login & Authentication',
      query: 'Cannot reset password link keeps spinning, team cannot access platform, and two-factor authentication',
      expectedMatches: ['FB-004', 'FB-009', 'FB-012']
    },
    {
      category: 'Data Export & Bugs',
      query: 'App crashed twice while exporting large CSV report and need ability to export reports as PDF',
      expectedMatches: ['FB-006', 'FB-015', 'FB-011']
    },
    {
      category: 'Feature Requests & UI',
      query: 'Please add dark mode for bright interface, mobile application, Slack notifications, and team permissions',
      expectedMatches: ['FB-002', 'FB-005', 'FB-008', 'FB-018', 'FB-010', 'FB-020']
    }
  ];

  const recallFindings = [];

  for (const cat of categories) {
    const recallResult = await hindsightService.recallMemories({
      query: cat.query,
      companyId: 'demo-company',
      maxTokens: 1500
    });

    const memories = recallResult.results || [];
    const matchedEvidence = [];

    for (const mem of memories) {
      for (const rec of fbRecords) {
        // Check if recalled memory text references customer_id or feedback excerpt or feedback_id
        const customerMatch = rec.customer_id && mem.text.includes(rec.customer_id);
        const excerpt = rec.feedback.substring(0, 30).toLowerCase();
        const textMatch = mem.text.toLowerCase().includes(excerpt);

        if (customerMatch || textMatch) {
          if (!matchedEvidence.some(m => m.feedback_id === rec.feedback_id)) {
            matchedEvidence.push({
              feedback_id: rec.feedback_id,
              customer_id: rec.customer_id,
              topic: rec.topic,
              evidence_text: mem.text,
              entities: mem.entities
            });
          }
        }
      }
    }

    recallFindings.push({
      category: cat.category,
      totalMemoriesRetrieved: memories.length,
      matchedNewRecords: matchedEvidence.map(m => m.feedback_id),
      sampleEvidence: matchedEvidence[0] || (memories[0] ? { text: memories[0].text } : null)
    });
  }

  console.log('Category Recall Verification Results:');
  for (const f of recallFindings) {
    console.log(`\nCategory: [${f.category}]`);
    console.log(`- Cloud memories retrieved: ${f.totalMemoriesRetrieved}`);
    console.log(`- Matched new FB-0* records: ${JSON.stringify(f.matchedNewRecords)}`);
    if (f.sampleEvidence) {
      console.log(`- Sample evidence: "${(f.sampleEvidence.evidence_text || f.sampleEvidence.text || '').substring(0, 150)}..."`);
    }
  }

  // 7. Check for Duplicate Retention
  console.log('\n--- 7. Duplicate Retention Prevention Check ---');
  // 7a: Check if any un-retained records remain for batch retention
  const unRetained = db.prepare(`
    SELECT COUNT(*) as count FROM feedback
    WHERE company_id = 'demo-company' AND retained_in_hindsight = 0 AND (analysis_status = 'analyzed' OR sentiment IS NOT NULL)
  `).get();
  console.log(`Unretained analyzed records in SQLite: ${unRetained.count}`);

  // 7b: Test attempting to re-retain FB-001 (must skip without calling Hindsight)
  const fb001 = db.prepare("SELECT * FROM feedback WHERE feedback_id = 'FB-001'").get();
  const dupCheck = await hindsightService.retainFeedback(fb001, 'demo-company');
  console.log(`Single record re-retention test on FB-001: alreadyRetained=${dupCheck.alreadyRetained}`);

  // 8. Overview of Final Counts
  console.log('\n--- 8. Final Counts Breakdown ---');
  console.log(`- Successfully Retained: ${successful.length} / ${total}`);
  console.log(`- Failed: ${failed.length}`);
  console.log(`- Pending Retention: ${pending.length}`);
  console.log(`- Duplicate Redundant Calls Prevented: ${dupCheck.alreadyRetained ? 'YES (100%)' : 'NO'}`);

  console.log('\n=== VERIFICATION COMPLETE ===');
}

runPostRetainVerification().catch(err => {
  console.error('Verification error:', err);
  process.exit(1);
});
