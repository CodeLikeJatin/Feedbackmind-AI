import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import FeedbackInbox from './components/inbox/FeedbackInbox';

describe('Phase 3 — Frontend Groq AI Feedback Analysis Test Suite', () => {
  const MOCK_ITEMS_WITH_PENDING = [
    {
      id: 1,
      feedback_id: 'FB-PENDING-1',
      customer_id: 'CUST-Unanalyzed',
      date: '2026-11-01',
      source: 'Zendesk',
      feedback: 'The app hangs on mobile Chrome when loading analytics.',
      rating: 1.0,
      analysis_status: 'pending',
      sentiment: null,
      topic: null,
      urgency: null,
      customer_problem: null
    },
    {
      id: 2,
      feedback_id: 'FB-ANALYZED-1',
      customer_id: 'CUST-Done',
      date: '2026-11-02',
      source: 'Email',
      feedback: 'Great performance and smooth animations!',
      rating: 5.0,
      analysis_status: 'analyzed',
      sentiment: 'positive',
      topic: 'performance',
      urgency: 'low',
      customer_problem: null,
      summary: 'Praise for performance'
    }
  ];

  beforeEach(() => {
    global.fetch = vi.fn().mockImplementation((url) => {
      if (url.includes('/api/analysis/batch')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ total: 1, analyzed: 1, failed: 0 })
        });
      }
      if (url.includes('/api/analysis/analyze-record')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            id: 1,
            feedback_id: 'FB-PENDING-1',
            sentiment: 'negative',
            topic: 'performance',
            urgency: 'high',
            customer_problem: 'Mobile Chrome hangs on analytics',
            summary: 'Mobile freezing reported',
            suggested_action: 'Profile canvas rendering on mobile Chrome'
          })
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ status: 'ok' })
      });
    });
  });

  it('renders pending status badge for unanalyzed imported records', () => {
    render(
      <FeedbackInbox
        items={MOCK_ITEMS_WITH_PENDING}
        onRefresh={() => {}}
        onSeedDemo={() => {}}
        onOpenUpload={() => {}}
      />
    );

    expect(screen.getAllByText(/Pending/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/1 awaiting Groq synthesis/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Analyze Pending \(1\)/i })).toBeInTheDocument();
  });

  it('triggers batch analysis when clicking Analyze Pending button', async () => {
    const handleRefresh = vi.fn();
    render(
      <FeedbackInbox
        items={MOCK_ITEMS_WITH_PENDING}
        onRefresh={handleRefresh}
        onSeedDemo={() => {}}
        onOpenUpload={() => {}}
      />
    );

    const analyzeBtn = screen.getByRole('button', { name: /Analyze Pending \(1\)/i });
    await act(async () => {
      fireEvent.click(analyzeBtn);
    });

    expect(global.fetch).toHaveBeenCalledWith('/api/analysis/batch', expect.anything());
    expect(await screen.findByText(/Analyzed 1 record\(s\) with Groq LLM/i)).toBeInTheDocument();
    expect(handleRefresh).toHaveBeenCalled();
  });

  it('opens modal for pending item and allows single record AI synthesis', async () => {
    const handleRefresh = vi.fn();
    render(
      <FeedbackInbox
        items={MOCK_ITEMS_WITH_PENDING}
        onRefresh={handleRefresh}
        onSeedDemo={() => {}}
        onOpenUpload={() => {}}
      />
    );

    // Click on pending row
    const pendingRow = screen.getByText('CUST-Unanalyzed');
    await act(async () => {
      fireEvent.click(pendingRow);
    });

    expect(screen.getByText(/Awaiting AI Analysis/i)).toBeInTheDocument();
    const analyzeNowBtn = screen.getByRole('button', { name: /Analyze Now/i });

    await act(async () => {
      fireEvent.click(analyzeNowBtn);
    });

    expect(global.fetch).toHaveBeenCalledWith('/api/analysis/analyze-record/1', expect.anything());
    expect(await screen.findByText(/Mobile Chrome hangs on analytics/i)).toBeInTheDocument();
  });
});
