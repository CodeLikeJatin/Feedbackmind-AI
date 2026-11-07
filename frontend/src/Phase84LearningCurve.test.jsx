import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import MemoryDemoSection from './components/demo/MemoryDemoSection';
import LearningCurveSection from './components/demo/LearningCurveSection';
import * as api from './services/api';

const mockStatus = {
  isInitialized: true,
  companyId: 'learning-curve-demo',
  bankId: 'feedbackmind-learning-curve',
  storedRecordsCount: 20,
  checkpointsRecordedCount: 3,
  hindsightConfigured: true,
  groqConfigured: true
};

const mockCheckpoints = [
  {
    checkpointId: 'checkpoint-1',
    interactionNumber: 1,
    bankId: 'feedbackmind-lc-cp1',
    question: "Considering everything you have learned about this SaaS company, what are its recurring customer problems, which problems have been resolved, and what should the product team prioritize next?",
    answer: "1. Recurring customer problems: The only documented complaint is LC-001 regarding dashboard load latency >16s. 2. Problems resolved: Insufficient evidence of any resolution. 3. Priorities: Verify dashboard latency.",
    retainedCount: 1,
    recalledCount: 2,
    recalledMemories: [
      { id: 'mem_1', text: 'Customer reports 16s morning dashboard latency', score: 0.95 }
    ],
    evidence: [{ feedback_id: 'LC-001' }],
    historicalContext: "Initial baseline established for morning dashboard latency (>16s). Zero prior interactions exist.",
    remainingUncertainty: "No longitudinal context: cannot establish recurrence, cannot identify whether fixes occurred.",
    modelUsed: "openai/gpt-oss-120b",
    latencyMs: 3986
  },
  {
    checkpointId: 'checkpoint-5',
    interactionNumber: 5,
    bankId: 'feedbackmind-lc-cp5',
    question: "Considering everything you have learned about this SaaS company, what are its recurring customer problems, which problems have been resolved, and what should the product team prioritize next?",
    answer: "1. Recurring customer problems: Morning latency (LC-001, LC-004), CSV export timeouts (LC-002, LC-005), Google OAuth login failures (LC-003). 2. Problems resolved: OAuth redirect investigated. 3. Priorities: Implement async CSV and Redis cache.",
    retainedCount: 5,
    recalledCount: 15,
    recalledMemories: [
      { id: 'mem_2', text: 'CSV export 504 timeout on 5k rows', score: 0.92 }
    ],
    evidence: [{ feedback_id: 'LC-001' }, { feedback_id: 'LC-002' }, { feedback_id: 'LC-003' }],
    historicalContext: "Accumulated awareness across 3 distinct friction categories: morning dashboard latency, CSV 504 timeouts, and Google OAuth SSO lockouts.",
    remainingUncertainty: "Zero verified fixes recorded: all 3 issues appear chronic and unresolved.",
    modelUsed: "openai/gpt-oss-120b",
    latencyMs: 4311
  },
  {
    checkpointId: 'checkpoint-20',
    interactionNumber: 20,
    bankId: 'feedbackmind-lc-cp20',
    question: "Considering everything you have learned about this SaaS company, what are its recurring customer problems, which problems have been resolved, and what should the product team prioritize next?",
    answer: "1. Recurring problems: Morning dashboard latency (resolved v2.4), CSV export timeouts (resolved v2.5), Google OAuth login (resolved v2.3). 2. Problems resolved: All three resolved across releases. 3. Priorities: Extend 15-minute export email link expiry to 24h.",
    retainedCount: 20,
    recalledCount: 33,
    recalledMemories: [
      { id: 'mem_3', text: 'v2.4 release deployed Redis dashboard caching reducing latency to 1.8s', score: 0.98 }
    ],
    evidence: [{ feedback_id: 'LC-001' }, { feedback_id: 'LC-013' }, { feedback_id: 'LC-020' }],
    historicalContext: "Full 4-month longitudinal timeline connected across 3 releases: Google OAuth resolved in v2.3, morning latency resolved in v2.4 (down to 1.8s), and CSV timeouts resolved in v2.5 async queue.",
    remainingUncertainty: "Identifies current remaining roadmap polish: 15-minute export link expiry causes dead links for managers.",
    modelUsed: "openai/gpt-oss-20b",
    latencyMs: 3261
  }
];

const mockInteractions = Array.from({ length: 20 }, (_, i) => ({
  interaction_number: i + 1,
  feedback_id: `LC-${String(i + 1).padStart(3, '0')}`,
  customer_id: `CUST-LC-${String(i + 1).padStart(2, '0')}`,
  date: '2026-08-01',
  source: 'Zendesk',
  rating: i % 2 === 0 ? 1 : 2,
  topic: i % 3 === 0 ? 'performance' : i % 3 === 1 ? 'export' : 'auth',
  urgency: 'high',
  sentiment: 'negative',
  feedback: `Feedback test quote for interaction ${i + 1}`,
  customer_problem: `Problem description ${i + 1}`,
  suggested_action: `Suggested action ${i + 1}`,
  summary: `Summary ${i + 1}`,
  isPersistedInDb: true,
  retainedInHindsight: true,
  hindsightMemoryId: `mem_LC-${String(i + 1).padStart(3, '0')}`
}));

describe('Phase 8.4 — Hindsight Memory Learning Curve Frontend Tests', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(api, 'fetchLearningCurveStatus').mockResolvedValue(mockStatus);
    vi.spyOn(api, 'fetchLearningCurveCheckpoints').mockResolvedValue({
      isInitialized: true,
      checkpoints: mockCheckpoints
    });
    vi.spyOn(api, 'fetchLearningCurveInteractions').mockResolvedValue({
      total: 20,
      interactions: mockInteractions
    });
  });

  it('renders Learning Curve Section header, isolated bank badge, and metrics', async () => {
    render(<LearningCurveSection />);

    expect(screen.getByText(/The Memory Learning Curve/i)).toBeInTheDocument();
    expect(screen.getByText(/Longitudinal Memory Demonstration/i)).toBeInTheDocument();
    expect(screen.getAllByText(/feedbackmind-learning-curve/i).length).toBeGreaterThanOrEqual(1);

    await waitFor(() => {
      expect(screen.getAllByText(/20 Interactions/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText(/3 Synthesized/i)).toBeInTheDocument();
    });
  });

  it('displays the three checkpoint cards (Interaction 1, 5, 20) with stage descriptions', async () => {
    render(<LearningCurveSection />);

    await waitFor(() => {
      expect(screen.getByTestId('checkpoint-card-1')).toBeInTheDocument();
      expect(screen.getByTestId('checkpoint-card-5')).toBeInTheDocument();
      expect(screen.getByTestId('checkpoint-card-20')).toBeInTheDocument();

      expect(screen.getByText(/Single-Point Snapshot/i)).toBeInTheDocument();
      expect(screen.getByText(/Emerging Pattern Recognition/i)).toBeInTheDocument();
      expect(screen.getByText(/Longitudinal Strategic Mastery/i)).toBeInTheDocument();
    });
  });

  it('allows clicking checkpoint cards to inspect detailed synthesis and uncertainty', async () => {
    render(<LearningCurveSection />);

    await waitFor(() => {
      expect(screen.getByTestId('checkpoint-card-1')).toBeInTheDocument();
    });

    // Click Checkpoint 1 card
    fireEvent.click(screen.getByTestId('checkpoint-card-1'));

    await waitFor(() => {
      expect(screen.getByTestId('checkpoint-detail-title')).toHaveTextContent(/Interaction 1 of 20/i);
      expect(screen.getAllByText(/Initial baseline established for morning dashboard latency/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText(/No longitudinal context: cannot establish recurrence/i)).toBeInTheDocument();
    });
  });

  it('renders the structured progression summary comparison table', async () => {
    render(<LearningCurveSection />);

    await waitFor(() => {
      expect(screen.getByText(/Memory Progression Comparison: 1 vs. 5 vs. 20 Interactions/i)).toBeInTheDocument();
      expect(screen.getByText(/Interaction 1 \(Baseline\)/i)).toBeInTheDocument();
      expect(screen.getByText(/Interaction 5 \(Emerging\)/i)).toBeInTheDocument();
      expect(screen.getByText(/Interaction 20 \(Mastery\)/i)).toBeInTheDocument();
      expect(screen.getByText(/Release Resolution Tracking/i)).toBeInTheDocument();
      expect(screen.getByText(/Hallucination Resistance/i)).toBeInTheDocument();
    });
  });

  it('renders the inspectable memory history table with all 20 interactions', async () => {
    render(<LearningCurveSection />);

    await waitFor(() => {
      expect(screen.getAllByText('LC-001').length).toBeGreaterThanOrEqual(1);
    });

    // Expand to show all
    const showAllButton = screen.getByText(/Show All 20/i);
    fireEvent.click(showAllButton);

    await waitFor(() => {
      expect(screen.getByText('LC-020')).toBeInTheDocument();
    });
  });

  it('clicking inspect opens the interaction detail modal with customer quote and suggested action', async () => {
    render(<LearningCurveSection />);

    await waitFor(() => {
      expect(screen.getAllByText('LC-001').length).toBeGreaterThanOrEqual(1);
    });

    const inspectButtons = screen.getAllByRole('button', { name: /^Inspect$/i });
    fireEvent.click(inspectButtons[0]);

    await waitFor(() => {
      expect(screen.getByTestId('modal-title')).toHaveTextContent(/LC-001/i);
      expect(screen.getByText(/Customer Quote/i)).toBeInTheDocument();
      expect(screen.getAllByText(/Feedback test quote for interaction 1/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText(/Diagnosed Customer Problem/i)).toBeInTheDocument();
      expect(screen.getByText(/Engineering Suggested Action/i)).toBeInTheDocument();
    });

    // Close modal
    fireEvent.click(screen.getByText('✕'));
    expect(screen.queryByTestId('modal-title')).not.toBeInTheDocument();
  });

  it('opens safety reset confirmation modal emphasizing demo-company is untouched', async () => {
    render(<LearningCurveSection />);

    await waitFor(() => {
      expect(screen.getByText(/Reset Environment/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText(/Reset Environment/i));

    await waitFor(() => {
      expect(screen.getByText(/Reset Isolated Learning Curve Demo\?/i)).toBeInTheDocument();
      expect(screen.getByText(/learning-curve-demo/i)).toBeInTheDocument();
      expect(screen.getByText(/Safety Guarantee:/i)).toBeInTheDocument();
      expect(screen.getByText(/demo-company/i)).toBeInTheDocument();
    });

    // Cancel modal
    fireEvent.click(screen.getByText('Cancel'));
    expect(screen.queryByText(/Reset Isolated Learning Curve Demo\?/i)).not.toBeInTheDocument();
  });

  it('navigates seamlessly between Side-by-Side and Learning Curve tabs inside MemoryDemoSection', async () => {
    vi.spyOn(api, 'fetchDemoStatus').mockResolvedValue({
      sqliteRecordCount: 26,
      hindsightBankId: 'feedbackmind-demo',
      suggestedQuestions: []
    });

    render(<MemoryDemoSection />);

    // Initially on side-by-side
    expect(screen.getByText(/Memory ON vs. Memory OFF Demonstration/i)).toBeInTheDocument();

    // Switch to Learning Curve
    const learningCurveTab = screen.getByText(/The Memory Learning Curve \(1, 5, 20\)/i);
    fireEvent.click(learningCurveTab);

    await waitFor(() => {
      expect(screen.getByText(/Witness how an AI agent evolves from narrow snapshot awareness/i)).toBeInTheDocument();
    });

    // Switch back to side-by-side
    const sideBySideTab = screen.getByText(/Side-by-Side Comparison \(ON vs. OFF\)/i);
    fireEvent.click(sideBySideTab);

    await waitFor(() => {
      expect(screen.getByText(/Memory ON vs. Memory OFF Demonstration/i)).toBeInTheDocument();
    });
  });
});
