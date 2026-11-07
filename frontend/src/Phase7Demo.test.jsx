import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import MemoryDemoSection from './components/demo/MemoryDemoSection';
import * as api from './services/api';

describe('Phase 7 — Memory ON/OFF Judging Demo Frontend Test Suite', () => {
  const mockDemoStatus = {
    companyId: 'demo-company',
    sqliteRecordCount: 26,
    hindsightBankId: 'feedbackmind-demo',
    hindsightConfigured: true,
    suggestedQuestions: [
      { id: 'q1', question: "What are our customers' biggest recurring complaints?", category: 'Pattern Discovery' },
      { id: 'q2', question: "Has dashboard performance improved over time?", category: 'Historical Progression' }
    ],
    modes: {
      memory_off: { label: 'Memory OFF', description: 'SQLite only' },
      memory_on: { label: 'Memory ON', description: 'SQLite + Hindsight' }
    }
  };

  const mockComparisonResponse = {
    question: "Has dashboard performance improved over time?",
    companyId: "demo-company",
    sqliteRecordCount: 26,
    memoryOff: {
      mode: "memory_off",
      memoryEnabled: false,
      question: "Has dashboard performance improved over time?",
      answer: "Current database records show FB-001 reported morning dashboard latency, while FB-013 reported caching speedup.",
      evidence: [
        {
          feedback_id: "FB-001",
          customer_id: "CUST-Acme",
          date: "2026-10-01",
          rating: 2.0,
          topic: "performance",
          feedback_snippet: "The analytics dashboard takes over 15 seconds to load in the morning."
        }
      ],
      sourceFeedbackIds: ["FB-001"],
      memoryUsed: false,
      memoryRecallCount: 0,
      hindsightAccessed: false,
      recalledMemories: [],
      reflectionUsed: false,
      reflectionText: null,
      sqliteRecordCount: 26,
      latencyMs: 140
    },
    memoryOn: {
      mode: "memory_on",
      memoryEnabled: true,
      question: "Has dashboard performance improved over time?",
      answer: "Grounding in Hindsight historical memories confirms that across August to October, dashboard performance transitioned from chronic morning latency (FB-001) to under-2-second loads after the caching update (FB-013).",
      evidence: [
        {
          feedback_id: "FB-001",
          customer_id: "CUST-Acme",
          date: "2026-10-01",
          rating: 2.0,
          topic: "performance",
          feedback_snippet: "The analytics dashboard takes over 15 seconds to load in the morning."
        },
        {
          feedback_id: "FB-013",
          customer_id: "CUST-Initech",
          date: "2026-10-13",
          rating: 5.0,
          topic: "performance",
          feedback_snippet: "The recent dashboard caching update made our morning reports load in under 2 seconds!"
        }
      ],
      sourceFeedbackIds: ["FB-001", "FB-013"],
      memoryUsed: true,
      memoryRecallCount: 4,
      hindsightAccessed: true,
      recalledMemories: [
        {
          id: "mem_perf_1",
          text: "August 2026: Customer CUST-Acme reported slow dashboard loading",
          context: "performance",
          occurred_start: "2026-08-10"
        }
      ],
      reflectionUsed: true,
      reflectionText: "Longitudinal analysis confirms major resolution following Q4 caching rollout.",
      sqliteRecordCount: 26,
      latencyMs: 290
    },
    analysis: {
      verdict: "Memory ON Demonstrated Superior Longitudinal Context",
      strongerMode: "Memory ON",
      rationale: "Memory ON synthesized 4 recalled memories spanning August to October to confirm resolution of morning latency.",
      additionalContextProvided: "Memory ON retrieved 4 historical episodic memories from Hindsight Cloud, connecting customer experiences across release cycles.",
      recurringIssuesIdentified: "Identified contrast between early morning dashboard slowness and recent caching optimizations.",
      timeEvolutionIdentified: "Memory ON established a chronological timeline contrasting early issues with subsequent product releases.",
      missedPatternsInOff: "Memory OFF evaluated the current dataset without historical episodic memory synthesis, missing cross-release pattern grounding.",
      evidenceParity: {
        memoryOffEvidenceCount: 1,
        memoryOnEvidenceCount: 2,
        memoryRecallCount: 4,
        hindsightBypassedInOff: true
      }
    }
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(api, 'fetchDemoStatus').mockResolvedValue(mockDemoStatus);
  });

  // Test 1: Renders Header, Status Pills, and Suggested Questions
  it('renders Memory Demo header, active mode indicator, dataset count, and suggested question buttons', async () => {
    render(
      <MemoryDemoSection 
        memoryEnabled={true} 
        onToggleMemory={vi.fn()} 
        companyId="demo-company" 
      />
    );

    expect(screen.getByText(/Memory ON vs. Memory OFF Demonstration/i)).toBeInTheDocument();
    expect(screen.getByText(/Impact Benchmark/i)).toBeInTheDocument();
    expect(screen.getByText(/Zero Memory OFF Leakage Enforced/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText(/26 Available Records/i)).toBeInTheDocument();
      expect(screen.getByText(/feedbackmind-demo/i)).toBeInTheDocument();
    });

    expect(screen.getAllByText(/Has dashboard performance improved over time\?/i).length).toBeGreaterThanOrEqual(1);
  });

  // Test 2: Mode Toggle Callback
  it('invokes onToggleMemory when the active mode switch is clicked', async () => {
    const onToggleMock = vi.fn();
    render(
      <MemoryDemoSection 
        memoryEnabled={true} 
        onToggleMemory={onToggleMock} 
        companyId="demo-company" 
      />
    );

    const toggleButton = screen.getByRole('switch');
    fireEvent.click(toggleButton);

    expect(onToggleMock).toHaveBeenCalledTimes(1);
  });

  // Test 3: Clicking Suggested Question updates input and triggers comparison
  it('updates question input and triggers comparison when a suggested question is clicked', async () => {
    const compareSpy = vi.spyOn(api, 'compareDemoModes').mockResolvedValue(mockComparisonResponse);

    render(
      <MemoryDemoSection 
        memoryEnabled={true} 
        onToggleMemory={vi.fn()} 
        companyId="demo-company" 
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/What are our customers' biggest recurring complaints\?/i)).toBeInTheDocument();
    });

    const suggestedBtn = screen.getByText(/What are our customers' biggest recurring complaints\?/i);
    fireEvent.click(suggestedBtn);

    expect(compareSpy).toHaveBeenCalledWith({
      question: "What are our customers' biggest recurring complaints?",
      companyId: 'demo-company'
    });
  });

  // Test 4: Side-by-Side Comparison Rendering
  it('executes comparison and renders side-by-side Memory OFF (0 calls) and Memory ON panels', async () => {
    vi.spyOn(api, 'compareDemoModes').mockResolvedValue(mockComparisonResponse);

    render(
      <MemoryDemoSection 
        memoryEnabled={true} 
        onToggleMemory={vi.fn()} 
        companyId="demo-company" 
      />
    );

    const compareBtn = screen.getByRole('button', { name: /Compare Side-by-Side/i });
    fireEvent.click(compareBtn);

    await waitFor(() => {
      // Left Panel: Memory OFF
      expect(screen.getByText(/Hindsight Retrieval Completely Bypassed/i)).toBeInTheDocument();
      expect(screen.getByText(/0 Hindsight Calls/i)).toBeInTheDocument();
      expect(screen.getByText(/Current database records show FB-001/i)).toBeInTheDocument();

      // Right Panel: Memory ON
      expect(screen.getByText(/4 Memories Recalled/i)).toBeInTheDocument();
      expect(screen.getByText(/Hindsight Long-Term Memory Grounding/i)).toBeInTheDocument();
      expect(screen.getByText(/Grounding in Hindsight historical memories confirms/i)).toBeInTheDocument();
    });

    // Evidence Citations present
    expect(screen.getAllByText('FB-001').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('FB-013')).toBeInTheDocument();
  });

  // Test 5: Evaluation & Value Analysis Section
  it('displays the 5 required value analysis categories derived from comparison results', async () => {
    vi.spyOn(api, 'compareDemoModes').mockResolvedValue(mockComparisonResponse);

    render(
      <MemoryDemoSection 
        memoryEnabled={true} 
        onToggleMemory={vi.fn()} 
        companyId="demo-company" 
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Compare Side-by-Side/i }));

    await waitFor(() => {
      expect(screen.getByText(/Hindsight Value Analysis & Empirical Synthesis/i)).toBeInTheDocument();
      expect(screen.getByText(/Memory ON Demonstrated Superior Longitudinal Context/i)).toBeInTheDocument();
      expect(screen.getByText(/Additional Context Provided/i)).toBeInTheDocument();
      expect(screen.getByText(/Recurring Issue Identification/i)).toBeInTheDocument();
      expect(screen.getByText(/Historical Progression & Evolution/i)).toBeInTheDocument();
      expect(screen.getByText(/Missed Patterns in Memory OFF/i)).toBeInTheDocument();
    });
  });

  // Test 6: Error Handling
  it('displays an error alert with retry button when the comparison API fails', async () => {
    vi.spyOn(api, 'compareDemoModes').mockRejectedValue(new Error('Network offline or backend timeout'));

    render(
      <MemoryDemoSection 
        memoryEnabled={true} 
        onToggleMemory={vi.fn()} 
        companyId="demo-company" 
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Compare Side-by-Side/i }));

    await waitFor(() => {
      expect(screen.getByText(/Network offline or backend timeout/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Retry/i })).toBeInTheDocument();
    });
  });

  // Test 7: Single Mode Execution
  it('runs active mode only when "Run Memory ON Only" button is clicked', async () => {
    const querySpy = vi.spyOn(api, 'queryDemoMode').mockResolvedValue({
      mode: 'memory_on',
      memoryEnabled: true,
      answer: 'Single mode answer grounded in memory.',
      evidence: [],
      memoryRecallCount: 2,
      latencyMs: 150
    });

    render(
      <MemoryDemoSection 
        memoryEnabled={true} 
        onToggleMemory={vi.fn()} 
        companyId="demo-company" 
      />
    );

    const singleBtn = screen.getByRole('button', { name: /Run Memory ON Only/i });
    fireEvent.click(singleBtn);

    await waitFor(() => {
      expect(screen.getByText(/Single mode answer grounded in memory/i)).toBeInTheDocument();
      expect(screen.getByText(/Memory ON Evaluation/i)).toBeInTheDocument();
    });

    expect(querySpy).toHaveBeenCalledWith({
      question: "Has dashboard performance improved over time?",
      companyId: 'demo-company',
      memoryEnabled: true
    });
  });
});
