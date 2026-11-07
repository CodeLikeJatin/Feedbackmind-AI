import { hindsightService, getHindsightClient } from './src/services/hindsightService.js';
import { getDatabase } from './src/config/db.js';
import { sdk } from '@vectorize-io/hindsight-client';

async function checkRetention() {
  console.log('=== HINDSIGHT CLOUD RETENTION VERIFICATION FOR 20 NEW RECORDS ===\n');

  const client = getHindsightClient();
  const bankId = hindsightService.resolveBankId('demo-company');
  const db = getDatabase();

  // 1. Check actual Hindsight Memory Bank
  console.log('--- 1. Checking Actual Hindsight Memory Bank ---');
  let bankDetails = null;
  try {
    const listRes = await sdk.listBanks({ client: client.client });
    bankDetails = listRes?.data?.banks?.find(b => b.bank_id === bankId);
    console.log(`Bank ID: ${bankId}`);
    console.log(`Bank Name: ${bankDetails?.name}`);
    console.log(`Fact Count in Cloud: ${bankDetails?.fact_count}`);
    console.log(`Last Document Time: ${bankDetails?.last_document_at}`);
  } catch (err) {
    console.error('Failed to query bank details:', err.message);
  }

  // 2. Inspect SQLite for the 20 newly uploaded records
  console.log('\n--- 2. Checking SQLite Database Records (FB-001 through FB-020) ---');
  const newRecords = db.prepare(`
    SELECT id, feedback_id, customer_id, date, source, feedback, rating, 
           sentiment, topic, customer_problem, feature_request,
           analysis_status, retained_in_hindsight, hindsight_memory_id
    FROM feedback
    WHERE feedback_id LIKE 'FB-0%'
    ORDER BY id ASC
  `).all();

  console.log(`Found ${newRecords.length} records matching 'FB-0*':`);
  const retainedInDb = newRecords.filter(r => r.retained_in_hindsight === 1);
  const pendingInDb = newRecords.filter(r => r.retained_in_hindsight === 0);
  console.log(`- Retained in Hindsight flag = 1: ${retainedInDb.length} records`);
  console.log(`- Retained in Hindsight flag = 0: ${pendingInDb.length} records`);

  // 3. Search Hindsight Cloud for specific fingerprints from the new records
  console.log('\n--- 3. Probing Hindsight Cloud for New Records Content ---');
  const probes = [
    { id: 'FB-001', topic: 'performance', query: 'The dashboard takes too long to load, especially in the morning' },
    { id: 'FB-002', topic: 'ui / feature', query: 'Please add dark mode. I work late and the bright interface hurts my eyes' },
    { id: 'FB-004', topic: 'login', query: 'I cannot reset my password. The reset link keeps spinning' },
    { id: 'FB-006', topic: 'export / bug', query: 'The app crashed twice while exporting a large CSV report' },
    { id: 'FB-012', topic: 'login / security', query: 'Please support two-factor authentication for better security' },
    { id: 'FB-015', topic: 'export / feature', query: 'We need the ability to export reports as PDF instead of CSV' },
    { id: 'FB-017', topic: 'performance', query: 'Notifications arrive 20 to 30 minutes late' },
    { id: 'FB-019', topic: 'integrations', query: 'The latest update broke the integration with our CRM' }
  ];

  const probeResults = [];
  for (const probe of probes) {
    const res = await hindsightService.recallMemories({
      query: probe.query,
      companyId: 'demo-company'
    });

    // Check if any returned result contains the exact text or feedback_id of the probe
    const match = (res.results || []).find(r => 
      r.text.includes(probe.id) || 
      r.text.toLowerCase().includes(probe.query.toLowerCase().substring(0, 30))
    );

    probeResults.push({
      probeId: probe.id,
      topic: probe.topic,
      foundInCloud: Boolean(match),
      matchedText: match ? match.text.substring(0, 100) : null
    });
  }

  console.log('Specific probe matches in Hindsight Cloud:');
  console.table(probeResults);

  // 4. Recall most common customer complaints from Hindsight Cloud
  console.log('\n--- 4. Asking Hindsight Cloud to Recall Most Common Customer Complaints ---');
  const commonRecall = await hindsightService.recallMemories({
    query: 'What are the most common customer complaints and problems?',
    companyId: 'demo-company',
    maxTokens: 2000
  });

  console.log(`Total memory items retrieved: ${commonRecall.results?.length || 0}`);
  if (commonRecall.results?.length > 0) {
    console.log('\nTop 5 retrieved memories:');
    commonRecall.results.slice(0, 5).forEach((m, i) => {
      console.log(`[${i + 1}] ID: ${m.id}`);
      console.log(`    Entities: ${JSON.stringify(m.entities)}`);
      console.log(`    Context: ${m.context}`);
      console.log(`    Text: ${m.text}`);
    });
  }

  // 5. Categorized Topic Recall Verification
  console.log('\n--- 5. Verifying Retrieval Across 4 Categories ---');
  const categories = [
    { name: 'Performance', query: 'Dashboard latency, slow loading, and notification delays' },
    { name: 'Login & Auth', query: 'Password reset link spinning, 2FA, and team login errors' },
    { name: 'Data Export', query: 'CSV crashes, export timeouts, and PDF export requests' },
    { name: 'Feature Requests', query: 'Dark mode, mobile app, Slack notifications, and team permissions' }
  ];

  const categoryResults = {};
  for (const cat of categories) {
    const catRecall = await hindsightService.recallMemories({
      query: cat.query,
      companyId: 'demo-company'
    });
    categoryResults[cat.name] = {
      retrievedCount: catRecall.results?.length || 0,
      sampleMatch: catRecall.results?.[0]?.text || 'No memories found',
      entities: catRecall.results?.[0]?.entities || []
    };
  }

  console.log('Category Retrieval Results:');
  console.log(JSON.stringify(categoryResults, null, 2));

  // 6. Cross-reference retrieved evidence with actual SQLite records
  console.log('\n--- 6. Cross-Referencing Cloud Evidence with SQLite Records ---');
  const allCloudText = (commonRecall.results || []).map(r => r.text).join(' ');
  
  // Check which records in SQLite match the cloud text
  const dbAllRecords = db.prepare("SELECT feedback_id, customer_id, topic, retained_in_hindsight, feedback FROM feedback WHERE company_id = 'demo-company'").all();
  const matchedDbRecords = dbAllRecords.filter(r => allCloudText.includes(r.feedback_id) || (r.customer_id && allCloudText.includes(r.customer_id)));
  
  console.log(`Total records in SQLite for demo-company: ${dbAllRecords.length}`);
  console.log(`SQLite records referenced directly in cloud recall: ${matchedDbRecords.length}`);
  console.log('Directly referenced IDs:', matchedDbRecords.map(r => ({ id: r.feedback_id, customer: r.customer_id, topic: r.topic, retained: r.retained_in_hindsight })));

  return {
    bankDetails,
    newRecordsCount: newRecords.length,
    newRecordsRetainedInDb: retainedInDb.length,
    probeResults,
    categoryResults,
    matchedDbRecordsCount: matchedDbRecords.length
  };
}

checkRetention().then(res => {
  console.log('\n=== TEST RUN COMPLETED ===');
}).catch(err => {
  console.error('Error running test:', err);
});
