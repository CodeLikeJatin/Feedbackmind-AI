import React from 'react';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import App from './App';

const MOCK_STATS = {
  total: 20,
  sentiment: {
    positive: 7,
    negative: 9,
    neutral: 4,
    positivePct: 35,
    negativePct: 45,
    neutralPct: 20
  },
  topics: [
    { topic: 'performance', count: 9 },
    { topic: 'login', count: 5 },
    { topic: 'features', count: 3 }
  ],
  monthlyTrends: [
    { month: '2026-07', total: 5, positive: 1, negative: 2, neutral: 2, avgRating: 2.6 },
    { month: '2026-08', total: 5, positive: 2, negative: 3, neutral: 0, avgRating: 2.6 },
    { month: '2026-09', total: 4, positive: 4, negative: 0, neutral: 0, avgRating: 4.5 },
    { month: '2026-10', total: 6, positive: 2, negative: 4, neutral: 0, avgRating: 2.8 }
  ],
  topComplaints: [
    { problem: 'Slow dashboard loading times (>15s)', topic: 'performance', urgency: 'high', count: 3 },
    { problem: 'Session timeouts and 2FA loops', topic: 'login', urgency: 'high', count: 3 }
  ],
  topFeatureRequests: [
    { feature: 'Okta SAML 2.0 Single Sign-On', topic: 'features', count: 4 }
  ],
  recentActivity: [
    {
      feedback_id: 'FB-1001',
      customer_id: 'CUST-AcmeCorp',
      date: '2026-07-04',
      source: 'Zendesk',
      feedback: 'The analytics dashboard takes over 15 seconds to load.',
      rating: 2.0,
      sentiment: 'negative',
      topic: 'performance',
      urgency: 'high',
      summary: 'Slow dashboard loading time.'
    }
  ],
  isDemoData: true
};

const MOCK_FEEDBACK_LIST = {
  items: [
    {
      feedback_id: 'FB-1001',
      customer_id: 'CUST-AcmeCorp',
      date: '2026-07-04',
      source: 'Zendesk',
      feedback: 'The analytics dashboard takes over 15 seconds to load.',
      rating: 2.0,
      sentiment: 'negative',
      topic: 'performance',
      urgency: 'high',
      customer_problem: 'Slow dashboard loading times',
      feature_request: null,
      summary: 'Dashboard takes >15s to load',
      suggested_action: 'Add caching to dashboard endpoints'
    }
  ],
  total: 20
};

// Mock ResponsiveContainer for Recharts in jsdom
vi.mock('recharts', async () => {
  const original = await vi.importActual('recharts');
  return {
    ...original,
    ResponsiveContainer: ({ children }) => <div className="recharts-mock">{children}</div>
  };
});

describe('Phase 1 Dashboard UI & Navigation Test Suite', () => {
  beforeEach(() => {
    global.fetch = vi.fn().mockImplementation((url) => {
      if (url.includes('/api/dashboard/stats')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(MOCK_STATS)
        });
      }
      if (url.includes('/api/feedback')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(MOCK_FEEDBACK_LIST)
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ status: 'ok' })
      });
    });
  });

  it('renders Dashboard Overview with KPIs, sentiment metrics, and charts', async () => {
    await act(async () => {
      render(<App />);
    });

    expect(screen.getAllByText(/FeedbackMind AI/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Total Feedback')).toBeInTheDocument();
    expect(screen.getAllByText('20').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Positive Sentiment')).toBeInTheDocument();
    expect(screen.getByText('Negative Sentiment')).toBeInTheDocument();
    expect(screen.getByText('Neutral Sentiment')).toBeInTheDocument();
    expect(screen.getByText(/Slow dashboard loading times/i)).toBeInTheDocument();
  });

  it('navigates to Feedback Inbox and filters items', async () => {
    await act(async () => {
      render(<App />);
    });

    // Click 'Feedback Inbox' navigation item
    const inboxNav = screen.getByRole('button', { name: /Feedback Inbox/i });
    await act(async () => {
      fireEvent.click(inboxNav);
    });

    expect(screen.getByText(/Customer Feedback Inbox/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Search feedback text/i)).toBeInTheDocument();
    expect(screen.getByText('CUST-AcmeCorp')).toBeInTheDocument();
  });

  it('navigates to AI Insights section and displays recommendations', async () => {
    await act(async () => {
      render(<App />);
    });

    const insightsNav = screen.getByRole('button', { name: /AI Insights/i });
    await act(async () => {
      fireEvent.click(insightsNav);
    });

    expect(screen.getByText(/AI Executive Insights & Recommendations/i)).toBeInTheDocument();
    expect(screen.getByText(/Critical Friction/i)).toBeInTheDocument();
    expect(screen.getByText(/Feature Opportunities/i)).toBeInTheDocument();
  });

  it('navigates to Trend Analysis section', async () => {
    await act(async () => {
      render(<App />);
    });

    const trendsNav = screen.getByRole('button', { name: /Trend Analysis/i });
    await act(async () => {
      fireEvent.click(trendsNav);
    });

    expect(screen.getByText(/Customer Sentiment & Topic Velocity/i)).toBeInTheDocument();
    expect(screen.getByText(/Sentiment Shift/i)).toBeInTheDocument();
    expect(screen.getByText(/Customer Ratings/i)).toBeInTheDocument();
  });

  it('navigates to Ask FeedbackMind chat and allows question submission', async () => {
    await act(async () => {
      render(<App />);
    });

    const chatNav = screen.getByRole('button', { name: /Ask FeedbackMind/i });
    await act(async () => {
      fireEvent.click(chatNav);
    });

    expect(screen.getAllByText(/Ask FeedbackMind AI/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByPlaceholderText(/Hindsight memory will provide multi-month context/i)).toBeInTheDocument();
  });

  it('navigates to Memory Centre and verifies Hindsight memory bank controls', async () => {
    await act(async () => {
      render(<App />);
    });

    const memoryNav = screen.getByRole('button', { name: /Memory Centre/i });
    await act(async () => {
      fireEvent.click(memoryNav);
    });

    expect(screen.getByText(/Memory Centre & Cognitive Architecture/i)).toBeInTheDocument();
    expect(screen.getByText(/1. RETAIN/i)).toBeInTheDocument();
    expect(screen.getByText(/2. RECALL/i)).toBeInTheDocument();
    expect(screen.getByText(/3. REFLECT/i)).toBeInTheDocument();
    expect(screen.getByText(/Dedicated Company Bank Isolation/i)).toBeInTheDocument();
  });

  it('navigates to Settings section', async () => {
    await act(async () => {
      render(<App />);
    });

    const settingsNav = screen.getByRole('button', { name: /Settings/i });
    await act(async () => {
      fireEvent.click(settingsNav);
    });

    expect(screen.getByText(/System Configuration & Integrations/i)).toBeInTheDocument();
    expect(screen.getByText(/Groq AI Inference Engine/i)).toBeInTheDocument();
    expect(screen.getByText(/Hindsight Long-Term Memory/i)).toBeInTheDocument();
  });

  it('toggles Memory ON and OFF', async () => {
    await act(async () => {
      render(<App />);
    });

    // Find the header memory button
    const memoryToggleBtn = screen.getByTitle(/Click to toggle Hindsight long-term memory retrieval mode/i);
    expect(memoryToggleBtn).toHaveTextContent('ON');

    await act(async () => {
      fireEvent.click(memoryToggleBtn);
    });

    expect(memoryToggleBtn).toHaveTextContent('OFF');
  });

  it('opens and closes CSV Upload modal', async () => {
    await act(async () => {
      render(<App />);
    });

    const inboxNav = screen.getByRole('button', { name: /Feedback Inbox/i });
    await act(async () => {
      fireEvent.click(inboxNav);
    });

    const uploadBtn = screen.getByRole('button', { name: /Upload CSV/i });
    await act(async () => {
      fireEvent.click(uploadBtn);
    });

    expect(screen.getByText(/Import Customer Feedback CSV/i)).toBeInTheDocument();
    expect(screen.getByText(/Required Columns/i)).toBeInTheDocument();

    const closeBtn = screen.getByRole('button', { name: /Close modal/i });
    await act(async () => {
      fireEvent.click(closeBtn);
    });

    expect(screen.queryByText(/Import Customer Feedback CSV/i)).not.toBeInTheDocument();
  });

  it('renders EmptyState when stats total is zero', async () => {
    global.fetch = vi.fn().mockImplementation((url) => {
      if (url.includes('/api/dashboard/stats')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ total: 0, items: [] })
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ items: [], total: 0 })
      });
    });

    await act(async () => {
      render(<App />);
    });

    expect(screen.getByText(/No customer feedback found/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Seed 4-Month Demo Scenario/i })).toBeInTheDocument();
  });
});
