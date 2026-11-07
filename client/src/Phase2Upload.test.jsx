import React from 'react';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import App from './App';
import UploadModal from './components/common/UploadModal';

describe('Phase 2 — Frontend CSV Upload & Processing Test Suite', () => {
  beforeEach(() => {
    global.fetch = vi.fn().mockImplementation((url, options) => {
      if (url.includes('/api/dashboard/stats')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ total: 20, isDemoData: true })
        });
      }
      if (url.includes('/api/feedback/upload')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            totalRows: 5,
            imported: 4,
            duplicates: 1,
            duplicateDetails: [
              { row: 3, feedback_id: 'FB-DUPE', reason: 'Duplicate feedback_id found within this CSV upload' }
            ],
            errors: [
              { row: 4, feedback_id: 'FB-BAD', reason: 'Invalid rating: "99.0". Expected number between 1.0 and 5.0' }
            ],
            records: [
              { feedback_id: 'FB-1', customer_id: 'CUST-1', feedback: 'Great job!', rating: 5.0 }
            ]
          })
        });
      }
      if (url.includes('/api/feedback')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ items: [], total: 20 })
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ status: 'ok' })
      });
    });
  });

  it('renders UploadModal with schema specifications and template download', () => {
    render(<UploadModal isOpen={true} onClose={() => {}} onUploadSuccess={() => {}} />);

    expect(screen.getByText(/Import Customer Feedback CSV/i)).toBeInTheDocument();
    expect(screen.getByText(/Required Columns/i)).toBeInTheDocument();
    expect(screen.getByText('feedback_id')).toBeInTheDocument();
    expect(screen.getByText('customer_id')).toBeInTheDocument();
    expect(screen.getAllByText('date').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('source')).toBeInTheDocument();
    expect(screen.getByText('feedback')).toBeInTheDocument();
    expect(screen.getAllByText('rating').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole('button', { name: /Download Sample CSV/i })).toBeInTheDocument();
  });

  it('handles CSV file selection and enables the Ingest Feedback button', async () => {
    render(<UploadModal isOpen={true} onClose={() => {}} onUploadSuccess={() => {}} />);

    const file = new File(['feedback_id,customer_id,date,source,feedback,rating\nFB-1,C1,2026-11-01,Zendesk,Fast,5.0'], 'test_feedback.csv', { type: 'text/csv' });
    const fileInput = document.getElementById('csvFileInput');

    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [file] } });
    });

    expect(screen.getByText('test_feedback.csv')).toBeInTheDocument();
    const ingestBtn = screen.getByRole('button', { name: /Ingest Feedback/i });
    expect(ingestBtn).not.toBeDisabled();
  });

  it('submits CSV to backend and displays comprehensive post-import summary report', async () => {
    const handleSuccess = vi.fn();
    render(<UploadModal isOpen={true} onClose={() => {}} onUploadSuccess={handleSuccess} />);

    const file = new File(['feedback_id,customer_id,date,source,feedback,rating\nFB-1,C1,2026-11-01,Zendesk,Fast,5.0'], 'batch.csv', { type: 'text/csv' });
    const fileInput = document.getElementById('csvFileInput');

    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [file] } });
    });

    const ingestBtn = screen.getByRole('button', { name: /Ingest Feedback/i });
    await act(async () => {
      fireEvent.click(ingestBtn);
    });

    // Check post-import summary card
    expect(screen.getByText(/CSV Ingestion Complete/i)).toBeInTheDocument();
    expect(screen.getByText('Total Rows')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument(); // totalRows
    expect(screen.getByText('4')).toBeInTheDocument(); // imported
    expect(screen.getAllByText('1').length).toBeGreaterThanOrEqual(1); // duplicates & errors

    // Check duplicate details
    expect(screen.getByText(/Duplicate Records Skipped/i)).toBeInTheDocument();
    expect(screen.getByText('FB-DUPE')).toBeInTheDocument();

    // Check row validation errors
    expect(screen.getByText(/Row Validation Errors/i)).toBeInTheDocument();
    expect(screen.getByText(/Invalid rating: "99.0"/i)).toBeInTheDocument();

    // Verify callback
    expect(handleSuccess).toHaveBeenCalled();
  });

  it('rejects non-CSV files with user-friendly error message', async () => {
    render(<UploadModal isOpen={true} onClose={() => {}} onUploadSuccess={() => {}} />);

    const badFile = new File(['malicious'], 'script.js', { type: 'application/javascript' });
    const fileInput = document.getElementById('csvFileInput');

    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [badFile] } });
    });

    expect(screen.getByText(/Only CSV files \(\.csv\) are supported\./i)).toBeInTheDocument();
  });

  it('navigates to inbox and refreshes data when clicking Done & View in Inbox', async () => {
    const handleClose = vi.fn();
    render(<UploadModal isOpen={true} onClose={handleClose} onUploadSuccess={() => {}} />);

    const file = new File(['valid csv content'], 'upload.csv', { type: 'text/csv' });
    await act(async () => {
      fireEvent.change(document.getElementById('csvFileInput'), { target: { files: [file] } });
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Ingest Feedback/i }));
    });

    const doneBtn = screen.getByRole('button', { name: /Done & View in Inbox/i });
    await act(async () => {
      fireEvent.click(doneBtn);
    });

    expect(handleClose).toHaveBeenCalled();
  });
});
