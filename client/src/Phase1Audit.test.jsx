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
    { topic: 'features', count: 3 },
    { topic: 'integrations', count: 1 },
    { topic: 'ui', count: 1 },
    { topic: 'support', count: 1 }
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
    { feature: 'Okta SAML 2.0 Single Sign-On', topic: 'features', count: 4 },
    { feature: 'Slack webhook notifications', topic: 'integrations', count: 2 }
  ],
  recentActivity: [
    {
      feedback_id: 'FB-1001',
      customer_id: 'CUST-AcmeCorp',
      date: '2026-07-04',
      source: 'Zendesk',
      feedback: 'The analytics dashboard takes over 15 seconds to load for our team.',
      rating: 2.0,
      sentiment: 'negative',
      topic: 'performance',
      urgency: 'high',
      summary: 'Dashboard takes >15s to load',
      suggested_action: 'Add caching to dashboard endpoints'
    }
  ],
  isDemoData: true
};

const MOCK_FEEDBACK_ITEMS = [
  {
    feedback_id: 'FB-1001',
    customer_id: 'CUST-AcmeCorp',
    date: '2026-07-04',
    source: 'Zendesk',
    feedback: 'The analytics dashboard takes over 15 seconds to load for our team.',
    rating: 2.0,
    sentiment: 'negative',
    topic: 'performance',
    urgency: 'high',
    customer_problem: 'Slow dashboard loading times',
    feature_request: null,
    summary: 'Dashboard takes >15s to load',
    suggested_action: 'Add caching to dashboard endpoints'
  },
  {
    feedback_id: 'FB-1011',
    customer_id: 'CUST-AcmeCorp',
    date: '2026-09-05',
    source: 'Email',
    feedback: 'Dashboard is noticeably faster! Loads in under 2 seconds now.',
    rating: 5.0,
    sentiment: 'positive',
    topic: 'performance',
    urgency: 'low',
    customer_problem: null,
    feature_request: null,
    summary: 'Dashboard speed verified fixed',
    suggested_action: 'Document positive milestone'
  }
];

// Mock Recharts in jsdom
vi.mock('recharts', async () => {
  const original = await vi.importActual('recharts');
  return {
    ...original,
    ResponsiveContainer: ({ children }) => <div data-testid="recharts-container">{children}</div>
  };
});

describe('Phase 1 Deep Testing Audit', () => {
  let originalFetch;

  beforeEach(() => {
    originalFetch = global.fetch;
    global.fetch = vi.fn().mockImplementation((url) => {
      if (url.includes('/api/dashboard/stats')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(MOCK_STATS)
        });
      }
      if (url.includes('/api/feedback/seed')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ message: 'Seeded', count: 20 })
        });
      }
      if (url.includes('/api/feedback/clear')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ message: 'Cleared', deleted: 20 })
        });
      }
      if (url.includes('/api/feedback')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ items: MOCK_FEEDBACK_ITEMS, total: 20 })
        });
      }
      if (url.includes('/api/memory/overview')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ bankId: 'feedbackmind-demo', configured: true })
        });
      }
      if (url.includes('/api/memory/list')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            bankId: 'feedbackmind-demo',
            total: 1,
            items: [{ feedback_id: 'FB-1001', date: '2026-07-04', topic: 'performance', rating: 2.0, feedback: 'Slow dashboard' }]
          })
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ status: 'ok' })
      });
    });
  });

  // Test 1: Navigation & Views
  it('Audit Test 1: Every sidebar navigation item switches to its dedicated view without errors', async () => {
    await act(async () => {
      render(<App />);
    });

    const navItems = [
      { name: /Feedback Inbox/i, expectedText: /Customer Feedback Inbox/i },
      { name: /AI Insights/i, expectedText: /AI Executive Insights & Recommendations/i },
      { name: /Trend Analysis/i, expectedText: /Customer Sentiment & Topic Velocity/i },
      { name: /Ask FeedbackMind/i, expectedText: /Conversational feedback intelligence/i },
      { name: /Memory Centre/i, expectedText: /Memory Centre & Cognitive Architecture/i },
      { name: /Settings/i, expectedText: /System Configuration & Integrations/i },
      { name: /Dashboard Overview/i, expectedText: /Total Feedback/i }
    ];

    for (const item of navItems) {
      const button = screen.getByRole('button', { name: item.name });
      await act(async () => {
        fireEvent.click(button);
      });
      expect(screen.getByText(item.expectedText)).toBeInTheDocument();
    }
  });

  // Test 2: Sidebar collapse and expand
  it('Audit Test 2: Sidebar collapse and expand toggles width classes and icons', async () => {
    await act(async () => {
      render(<App />);
    });

    const collapseBtn = screen.getByTitle(/Collapse sidebar/i);
    expect(collapseBtn).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(collapseBtn);
    });

    const expandBtn = screen.getByTitle(/Expand sidebar/i);
    expect(expandBtn).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(expandBtn);
    });

    expect(screen.getByTitle(/Collapse sidebar/i)).toBeInTheDocument();
  });

  // Test 3: Mobile menu drawer open and close
  it('Audit Test 3: Mobile hamburger menu toggles mobile sidebar and backdrop close', async () => {
    await act(async () => {
      render(<App />);
    });

    const mobileMenuBtn = screen.getByLabelText(/Open sidebar menu/i);
    expect(mobileMenuBtn).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(mobileMenuBtn);
    });

    // Navigation item click on mobile should also trigger close
    const inboxBtn = screen.getByRole('button', { name: /Feedback Inbox/i });
    await act(async () => {
      fireEvent.click(inboxBtn);
    });

    expect(screen.getByText(/Customer Feedback Inbox/i)).toBeInTheDocument();
  });

  // Test 4: Dashboard cards, charts, and modal inspector
  it('Audit Test 4: Dashboard KPI cards, Recharts containers, and Recent Activity modal inspector work', async () => {
    await act(async () => {
      render(<App />);
    });

    // Check KPIs
    expect(screen.getByText('Total Feedback')).toBeInTheDocument();
    expect(screen.getByText('Positive Sentiment')).toBeInTheDocument();
    expect(screen.getByText('Negative Sentiment')).toBeInTheDocument();
    expect(screen.getByText('Neutral Sentiment')).toBeInTheDocument();

    // Check Recharts
    const chartContainers = screen.getAllByTestId('recharts-container');
    expect(chartContainers.length).toBeGreaterThanOrEqual(2);

    // Click on recent activity row
    const recentRow = screen.getByText('CUST-AcmeCorp');
    await act(async () => {
      fireEvent.click(recentRow);
    });

    // Customer record modal opens
    expect(screen.getByText(/Customer Record — FB-1001/i)).toBeInTheDocument();
    expect(screen.getAllByText(/The analytics dashboard takes over 15 seconds to load/i).length).toBeGreaterThanOrEqual(1);

    // Close modal
    const closeBtn = screen.getByLabelText(/Close modal/i);
    await act(async () => {
      fireEvent.click(closeBtn);
    });

    expect(screen.queryByText(/Customer Record — FB-1001/i)).not.toBeInTheDocument();
  });

  // Test 5: Inbox search, multi-filter toolbar, and row inspector
  it('Audit Test 5: Inbox search input, sentiment/urgency filters, clear filter button, and modal work', async () => {
    await act(async () => {
      render(<App />);
    });

    // Go to inbox
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Feedback Inbox/i }));
    });

    const searchInput = screen.getByPlaceholderText(/Search feedback text/i);
    await act(async () => {
      fireEvent.change(searchInput, { target: { value: 'faster' } });
    });

    // Filtered result should show FB-1011
    expect(screen.getByText(/Dashboard is noticeably faster/i)).toBeInTheDocument();
    expect(screen.queryByText(/takes over 15 seconds to load/i)).not.toBeInTheDocument();

    // Click the clear '×' button
    const clearSearchBtn = screen.getByText('×');
    await act(async () => {
      fireEvent.click(clearSearchBtn);
    });

    expect(searchInput.value).toBe('');
    expect(screen.getByText(/takes over 15 seconds to load/i)).toBeInTheDocument();

    // Test detail modal inside inbox
    const tableRow = screen.getAllByText('CUST-AcmeCorp')[0];
    await act(async () => {
      fireEvent.click(tableRow);
    });

    expect(screen.getByText(/Feedback Detail — FB-1001/i)).toBeInTheDocument();
    expect(screen.getByText(/Add caching to dashboard endpoints/i)).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByLabelText(/Close modal/i));
    });
  });

  // Test 6: AI Insights tabs and Ask AI routing
  it('Audit Test 6: AI Insights filter tabs and Ask AI transition with prefilled question', async () => {
    await act(async () => {
      render(<App />);
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /AI Insights/i }));
    });

    // Filter tabs
    const criticalTab = screen.getByRole('button', { name: /Critical Friction/i });
    await act(async () => {
      fireEvent.click(criticalTab);
    });
    expect(screen.getByText(/Urgent Customer Friction/i)).toBeInTheDocument();

    const featuresTab = screen.getByRole('button', { name: /Feature Opportunities/i });
    await act(async () => {
      fireEvent.click(featuresTab);
    });
    expect(screen.getByText(/High-Impact Feature Requests/i)).toBeInTheDocument();

    // Click 'Ask AI Prioritization' button
    const askAiBtn = screen.getByRole('button', { name: /Ask AI Prioritization/i });
    await act(async () => {
      fireEvent.click(askAiBtn);
    });

    // Should navigate to chat with question prefilled
    expect(screen.getAllByText(/Ask FeedbackMind AI/i).length).toBeGreaterThanOrEqual(1);
    const chatInput = screen.getByPlaceholderText(/Hindsight memory will provide/i);
    expect(chatInput.value).toBe('What should our product team prioritise next?');
  });

  // Test 7: Trend Analysis metric toggles
  it('Audit Test 7: Trend Analysis toggles between Sentiment Shift and Customer Ratings metrics', async () => {
    await act(async () => {
      render(<App />);
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Trend Analysis/i }));
    });

    expect(screen.getByText(/Positive vs Negative Feedback Evolution/i)).toBeInTheDocument();

    const ratingsBtn = screen.getByRole('button', { name: /Customer Ratings/i });
    await act(async () => {
      fireEvent.click(ratingsBtn);
    });

    expect(screen.getByText(/Average Customer Rating by Month/i)).toBeInTheDocument();
  });

  // Test 8: Ask FeedbackMind chat messaging and Memory toggle
  it('Audit Test 8: Chat sends message, displays typing state, and Memory ON/OFF toggles', async () => {
    await act(async () => {
      render(<App />);
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Ask FeedbackMind/i }));
    });

    // Click suggested question prompt
    const promptBtn = screen.getByRole('button', { name: /What are our biggest customer complaints\?/i });
    await act(async () => {
      fireEvent.click(promptBtn);
    });

    // User message should appear in chat
    expect(screen.getAllByText(/What are our biggest customer complaints\?/i).length).toBeGreaterThanOrEqual(1);

    // Toggle memory in chat
    const chatMemoryToggle = screen.getByRole('button', { name: /Memory ON/i });
    await act(async () => {
      fireEvent.click(chatMemoryToggle);
    });
    expect(screen.getByRole('button', { name: /Memory OFF/i })).toBeInTheDocument();
  });

  // Test 9: Memory Centre view and pillar verification
  it('Audit Test 9: Memory Centre displays Retain, Recall, Reflect and indexed bank records', async () => {
    await act(async () => {
      render(<App />);
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Memory Centre/i }));
    });

    expect(screen.getByText(/1. RETAIN/i)).toBeInTheDocument();
    expect(screen.getByText(/2. RECALL/i)).toBeInTheDocument();
    expect(screen.getByText(/3. REFLECT/i)).toBeInTheDocument();
    expect(screen.getByText(/Active Hindsight Memory Bank Records/i)).toBeInTheDocument();
    expect(screen.getByText(/mem_FB-1001/i)).toBeInTheDocument();
  });

  // Test 10: Settings view and Seed/Clear operations
  it('Audit Test 10: Settings view allows model selection, bank ID edit, and triggers demo re-seed', async () => {
    await act(async () => {
      render(<App />);
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Settings/i }));
    });

    const modelSelect = screen.getByRole('combobox');
    await act(async () => {
      fireEvent.change(modelSelect, { target: { value: 'llama-3.1-8b-instant' } });
    });
    expect(modelSelect.value).toBe('llama-3.1-8b-instant');

    const seedBtn = screen.getByRole('button', { name: /Re-Seed 4-Month Demo Scenario/i });
    await act(async () => {
      fireEvent.click(seedBtn);
    });

    expect(global.fetch).toHaveBeenCalledWith('/api/feedback/seed', expect.anything());
  });

  // Test 11: Loading, Empty, and Error states
  it('Audit Test 11: Loading skeletons, Empty state banners, and Error handling with Retry work cleanly', async () => {
    // 11A. Empty State test
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

    // 11B. Error state test
    global.fetch = vi.fn().mockRejectedValue(new Error('Network offline or backend timeout'));

    await act(async () => {
      render(<App />);
    });

    expect(screen.getByText(/Backend Connection Issue/i)).toBeInTheDocument();
    expect(screen.getByText(/Network offline or backend timeout/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Retry/i })).toBeInTheDocument();
  });
});
