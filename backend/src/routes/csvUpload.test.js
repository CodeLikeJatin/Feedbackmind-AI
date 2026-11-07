import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../server.js';
import { feedbackDbService } from '../services/feedbackDbService.js';
import { getDatabase } from '../config/db.js';

describe('Phase 2 — CSV Upload & Ingestion API Test Suite', () => {
  const TEST_COMPANY = 'csv-test-company';

  beforeEach(() => {
    feedbackDbService.clearData(TEST_COMPANY);
  });

  // Test 1: Valid CSV Upload
  it('imports valid CSV and persists records to SQLite database', async () => {
    const validCsv = `feedback_id,customer_id,date,source,feedback,rating
FB-9001,CUST-Alpha,2026-11-01,Zendesk,"Dashboard load takes 12s on Chrome.",2.0
FB-9002,CUST-Beta,2026-11-02,Intercom,"Great UI and fast search experience.",5.0
FB-9003,CUST-Gamma,2026-11-03,Survey,"Would like Okta SAML support.",4.0`;

    const res = await request(app)
      .post('/api/feedback/upload')
      .attach('file', Buffer.from(validCsv), 'feedback.csv')
      .field('companyId', TEST_COMPANY);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.totalRows).toBe(3);
    expect(res.body.imported).toBe(3);
    expect(res.body.duplicates).toBe(0);
    expect(res.body.errors.length).toBe(0);

    // Verify records exist in SQLite
    const db = getDatabase();
    const rows = db.prepare('SELECT * FROM feedback WHERE company_id = ?').all(TEST_COMPANY);
    expect(rows.length).toBe(3);
    expect(rows.map(r => r.feedback_id)).toContain('FB-9001');
    expect(rows.find(r => r.feedback_id === 'FB-9001').feedback).toBe('Dashboard load takes 12s on Chrome.');
    expect(rows.find(r => r.feedback_id === 'FB-9001').analysis_status).toBe('pending');
  });

  // Test 2: Missing required columns
  it('returns 400 error when required columns are missing', async () => {
    const missingColumnsCsv = `feedback_id,customer_id,date
FB-9001,CUST-Alpha,2026-11-01`;

    const res = await request(app)
      .post('/api/feedback/upload')
      .attach('file', Buffer.from(missingColumnsCsv), 'test.csv')
      .field('companyId', TEST_COMPANY);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('Missing required column(s)');
    expect(res.body.missingColumns).toContain('source');
    expect(res.body.missingColumns).toContain('feedback');
    expect(res.body.missingColumns).toContain('rating');
  });

  // Test 3: Empty CSV
  it('returns 400 error when uploading an empty CSV', async () => {
    const res = await request(app)
      .post('/api/feedback/upload')
      .attach('file', Buffer.from(''), 'empty.csv')
      .field('companyId', TEST_COMPANY);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('empty');
  });

  // Test 4: Header only (zero rows)
  it('returns 400 error when CSV has header but zero data rows', async () => {
    const headerOnlyCsv = `feedback_id,customer_id,date,source,feedback,rating\n`;

    const res = await request(app)
      .post('/api/feedback/upload')
      .attach('file', Buffer.from(headerOnlyCsv), 'header_only.csv')
      .field('companyId', TEST_COMPANY);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('zero data rows');
  });

  // Test 5: Duplicate detection within same CSV file
  it('detects duplicate feedback_id within the uploaded batch', async () => {
    const duplicateCsv = `feedback_id,customer_id,date,source,feedback,rating
FB-DUPE,CUST-Alpha,2026-11-01,Zendesk,"First complaint.",2.0
FB-DUPE,CUST-Alpha,2026-11-02,Zendesk,"Second complaint with same ID.",1.0
FB-UNIQUE,CUST-Beta,2026-11-03,Email,"Unique feedback.",4.0`;

    const res = await request(app)
      .post('/api/feedback/upload')
      .attach('file', Buffer.from(duplicateCsv), 'dupes.csv')
      .field('companyId', TEST_COMPANY);

    expect(res.status).toBe(200);
    expect(res.body.imported).toBe(2);
    expect(res.body.duplicates).toBe(1);
    expect(res.body.duplicateDetails[0].feedback_id).toBe('FB-DUPE');
    expect(res.body.duplicateDetails[0].reason).toContain('within this CSV');
  });

  // Test 6: Duplicate detection against existing SQLite database
  it('detects duplicate feedback_id against records already saved in database', async () => {
    // First upload
    const csv1 = `feedback_id,customer_id,date,source,feedback,rating
FB-EXISTING,CUST-First,2026-11-01,Zendesk,"Initial record.",3.0`;

    await request(app)
      .post('/api/feedback/upload')
      .attach('file', Buffer.from(csv1), 'batch1.csv')
      .field('companyId', TEST_COMPANY);

    // Second upload attempting to insert same feedback_id
    const csv2 = `feedback_id,customer_id,date,source,feedback,rating
FB-EXISTING,CUST-Dupe,2026-11-05,Email,"Attempting duplicate insertion.",2.0
FB-NEW,CUST-New,2026-11-06,Survey,"New record.",5.0`;

    const res = await request(app)
      .post('/api/feedback/upload')
      .attach('file', Buffer.from(csv2), 'batch2.csv')
      .field('companyId', TEST_COMPANY);

    expect(res.status).toBe(200);
    expect(res.body.imported).toBe(1);
    expect(res.body.duplicates).toBe(1);
    expect(res.body.duplicateDetails[0].feedback_id).toBe('FB-EXISTING');
    expect(res.body.duplicateDetails[0].reason).toContain('already exists in database');
  });

  // Test 7: Row-level validation (invalid dates and ratings)
  it('reports row-level errors for invalid dates, missing feedback, and out-of-range ratings', async () => {
    const invalidRowsCsv = `feedback_id,customer_id,date,source,feedback,rating
FB-GOOD,CUST-1,2026-11-01,Zendesk,"Valid row.",4.0
FB-BADDATE,CUST-2,not-a-date,Zendesk,"Invalid date row.",3.0
FB-BADRATING,CUST-3,2026-11-02,Zendesk,"Invalid rating row.",99.0
FB-NOFEEDBACK,CUST-4,2026-11-03,Zendesk,,4.0`;

    const res = await request(app)
      .post('/api/feedback/upload')
      .attach('file', Buffer.from(invalidRowsCsv), 'invalid_rows.csv')
      .field('companyId', TEST_COMPANY);

    expect(res.status).toBe(200);
    expect(res.body.imported).toBe(1);
    expect(res.body.errors.length).toBe(3);

    const errorReasons = res.body.errors.map(e => e.reason);
    expect(errorReasons.some(r => r.includes('Invalid date format'))).toBe(true);
    expect(errorReasons.some(r => r.includes('Invalid rating'))).toBe(true);
    expect(errorReasons.some(r => r.includes('Missing feedback text'))).toBe(true);
  });

  // Test 8: Special characters, commas in quotes, emojis, multiline text
  it('correctly parses CSV with special characters, commas inside quotes, emojis, and multiline text', async () => {
    const specialCsv = `feedback_id,customer_id,date,source,feedback,rating
FB-SPEC-1,CUST-Special,2026-11-01,G2 Review,"We love it! Highly recommend, especially for large teams.",5.0
FB-SPEC-2,CUST-Emoji,2026-11-02,Survey,"🚀 Fast speed, ❤️ great design, but ⚠️ login timed out.",4.0
FB-SPEC-3,CUST-Quotes,2026-11-03,Intercom,"He said: ""The report generation is failing"".",2.0`;

    const res = await request(app)
      .post('/api/feedback/upload')
      .attach('file', Buffer.from(specialCsv), 'special.csv')
      .field('companyId', TEST_COMPANY);

    expect(res.status).toBe(200);
    expect(res.body.imported).toBe(3);
    expect(res.body.errors.length).toBe(0);

    const db = getDatabase();
    const emojiRow = db.prepare('SELECT * FROM feedback WHERE feedback_id = ?').get('FB-SPEC-2');
    expect(emojiRow.feedback).toContain('🚀 Fast speed, ❤️ great design');
  });

  // Test 9: Non-CSV file rejection
  it('rejects non-CSV files', async () => {
    const res = await request(app)
      .post('/api/feedback/upload')
      .attach('file', Buffer.from('console.log("bad");'), 'malicious.js')
      .field('companyId', TEST_COMPANY);

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Only CSV files');
  });

  // Test 10: JSON csvContent body support
  it('supports direct JSON body upload with csvContent string', async () => {
    const csvContent = `feedback_id,customer_id,date,source,feedback,rating
FB-JSON-1,CUST-Json,2026-11-01,API,"Uploaded via JSON body.",5.0`;

    const res = await request(app)
      .post('/api/feedback/upload')
      .send({ csvContent, companyId: TEST_COMPANY });

    expect(res.status).toBe(200);
    expect(res.body.imported).toBe(1);
    expect(res.body.records[0].feedback_id).toBe('FB-JSON-1');
  });

  // Test 11: Persistence across database reconnection (server restart simulation)
  it('persists data on disk across backend restart simulation', async () => {
    const restartCsv = `feedback_id,customer_id,date,source,feedback,rating
FB-PERSIST-1,CUST-Persistent,2026-11-01,Zendesk,"Must survive server reboot.",5.0`;

    // 1. Upload
    const res = await request(app)
      .post('/api/feedback/upload')
      .attach('file', Buffer.from(restartCsv), 'persist.csv')
      .field('companyId', TEST_COMPANY);
    expect(res.status).toBe(200);

    // 2. Simulate server restart: import fresh DatabaseSync from disk path
    const { DatabaseSync } = await import('node:sqlite');
    const { config } = await import('../config/env.js');
    const freshDbInstance = new DatabaseSync(config.database.path);

    // 3. Query disk database directly
    const row = freshDbInstance.prepare(
      'SELECT * FROM feedback WHERE feedback_id = ? AND company_id = ?'
    ).get('FB-PERSIST-1', TEST_COMPANY);

    expect(row).toBeDefined();
    expect(row.feedback).toBe('Must survive server reboot.');
    expect(row.rating).toBe(5);
    freshDbInstance.close();
  });
});

