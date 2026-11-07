import Papa from 'papaparse';
import { getDatabase } from '../config/db.js';

export const REQUIRED_COLUMNS = [
  'feedback_id',
  'customer_id',
  'date',
  'source',
  'feedback',
  'rating'
];

/**
 * Validates date string (accepts YYYY-MM-DD or standard parseable ISO dates)
 */
export function isValidDate(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return false;
  const trimmed = dateStr.trim();
  // Check YYYY-MM-DD format regex or parseable date
  const isoRegex = /^\d{4}-\d{2}-\d{2}/;
  if (!isoRegex.test(trimmed)) return false;
  const d = new Date(trimmed);
  return !isNaN(d.getTime());
}

/**
 * Validates rating (numeric between 1.0 and 5.0)
 */
export function parseRating(ratingVal) {
  if (ratingVal === null || ratingVal === undefined || ratingVal === '') return null;
  const num = Number(ratingVal);
  if (isNaN(num) || num < 1 || num > 5) return null;
  return Math.round(num * 10) / 10;
}

export const csvService = {
  /**
   * Parse and validate CSV content, detect duplicates, and store into SQLite.
   */
  processCsv({ csvContent, companyId = 'demo-company' }) {
    if (!csvContent || typeof csvContent !== 'string' || !csvContent.trim()) {
      return {
        success: false,
        error: 'CSV file is empty or contains no readable data',
        totalRows: 0,
        imported: 0,
        duplicates: 0,
        errors: [{ row: 0, reason: 'File is empty' }],
        records: []
      };
    }

    const parseResult = Papa.parse(csvContent, {
      header: true,
      skipEmptyLines: 'greedy',
      transformHeader: (h) => h.trim().toLowerCase()
    });

    if (parseResult.errors && parseResult.errors.length > 0) {
      const fatalErrors = parseResult.errors.filter(e => e.type === 'Delimiter' || e.code === 'UndetectableDelimiter');
      if (fatalErrors.length > 0) {
        return {
          success: false,
          error: `Malformed CSV structure: ${fatalErrors[0].message}`,
          totalRows: 0,
          imported: 0,
          duplicates: 0,
          errors: fatalErrors.map(e => ({ row: e.row || 0, reason: e.message })),
          records: []
        };
      }
    }

    const headers = parseResult.meta.fields || [];
    const missingHeaders = REQUIRED_COLUMNS.filter(col => !headers.includes(col));

    if (missingHeaders.length > 0) {
      return {
        success: false,
        error: `Missing required column(s): ${missingHeaders.join(', ')}`,
        requiredColumns: REQUIRED_COLUMNS,
        missingColumns: missingHeaders,
        totalRows: 0,
        imported: 0,
        duplicates: 0,
        errors: [{ row: 1, reason: `Missing required header columns: ${missingHeaders.join(', ')}` }],
        records: []
      };
    }

    const rows = parseResult.data || [];
    if (rows.length === 0) {
      return {
        success: false,
        error: 'CSV contains valid headers but zero data rows',
        totalRows: 0,
        imported: 0,
        duplicates: 0,
        errors: [{ row: 1, reason: 'No data rows found below header' }],
        records: []
      };
    }

    const db = getDatabase();

    // Query existing feedback_ids across database to detect duplicates against UNIQUE constraint
    const existingRows = db.prepare('SELECT feedback_id FROM feedback').all();
    const existingFeedbackIds = new Set(existingRows.map(r => r.feedback_id));

    const seenInBatch = new Set();
    const validRecords = [];
    const duplicates = [];
    const rowErrors = [];

    rows.forEach((row, index) => {
      const rowNum = index + 2; // Row 1 is header, so data starts at row 2

      const feedbackId = (row.feedback_id || '').trim();
      const customerId = (row.customer_id || '').trim();
      const dateStr = (row.date || '').trim();
      const source = (row.source || '').trim();
      const feedbackText = (row.feedback || '').trim();
      const ratingRaw = row.rating;

      // 1. Check feedback_id
      if (!feedbackId) {
        rowErrors.push({ row: rowNum, reason: 'Missing feedback_id' });
        return;
      }

      // 2. Check feedback text
      if (!feedbackText) {
        rowErrors.push({ row: rowNum, feedback_id: feedbackId, reason: 'Missing feedback text' });
        return;
      }

      // 3. Check date
      if (!isValidDate(dateStr)) {
        rowErrors.push({ row: rowNum, feedback_id: feedbackId, reason: `Invalid date format: "${dateStr}". Expected YYYY-MM-DD` });
        return;
      }

      // 4. Check rating
      const rating = parseRating(ratingRaw);
      if (rating === null) {
        rowErrors.push({ row: rowNum, feedback_id: feedbackId, reason: `Invalid rating: "${ratingRaw}". Expected number between 1.0 and 5.0` });
        return;
      }

      // 5. Duplicate detection (within batch)
      if (seenInBatch.has(feedbackId)) {
        duplicates.push({ row: rowNum, feedback_id: feedbackId, reason: 'Duplicate feedback_id found within this CSV upload' });
        return;
      }
      seenInBatch.add(feedbackId);

      // 6. Duplicate detection (against database)
      if (existingFeedbackIds.has(feedbackId)) {
        duplicates.push({ row: rowNum, feedback_id: feedbackId, reason: 'Duplicate feedback_id already exists in database' });
        return;
      }

      validRecords.push({
        feedback_id: feedbackId,
        customer_id: customerId || 'Anonymous',
        date: dateStr.slice(0, 10), // normalize to YYYY-MM-DD
        source: source || 'Direct',
        feedback: feedbackText,
        rating
      });
    });

    // Insert valid records in a transaction
    if (validRecords.length > 0) {
      const insertStmt = db.prepare(`
        INSERT INTO feedback (
          feedback_id, customer_id, date, source, feedback, rating,
          company_id, analysis_status, sentiment, topic, urgency,
          customer_problem, feature_request, summary, suggested_action, retained_in_hindsight
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?, 'pending', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0
        )
      `);

      db.exec('BEGIN TRANSACTION');
      try {
        for (const item of validRecords) {
          insertStmt.run(
            item.feedback_id,
            item.customer_id,
            item.date,
            item.source,
            item.feedback,
            item.rating,
            companyId
          );
        }
        db.exec('COMMIT');
      } catch (err) {
        db.exec('ROLLBACK');
        throw new Error(`Database transaction error during CSV import: ${err.message}`);
      }
    }

    return {
      success: validRecords.length > 0 || (duplicates.length === 0 && rowErrors.length === 0),
      totalRows: rows.length,
      imported: validRecords.length,
      duplicates: duplicates.length,
      duplicateDetails: duplicates,
      errors: rowErrors,
      records: validRecords
    };
  }
};

