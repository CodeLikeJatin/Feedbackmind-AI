import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AskFeedbackMind from './components/chat/AskFeedbackMind';
import * as api from './services/api';

describe('Phase 5 — Ask FeedbackMind AI Chat Frontend Tests', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // Test 1: Rendering
  it('renders Ask FeedbackMind AI interface with welcome message and suggested prompt buttons', () => {
    render(
      <AskFeedbackMind 
        memoryEnabled={true} 
        onToggleMemory={vi.fn()} 
      />
    );

    expect(screen.getByText(/Ask FeedbackMind AI/i)).toBeInTheDocument();
    expect(screen.getByText(/Groq AI Engine/i)).toBeInTheDocument();
    expect(screen.getByText(/Memory ON/i)).toBeInTheDocument();
    expect(screen.getByText(/I continuously synthesize customer feedback/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Ask anything/i)).toBeInTheDocument();

    // Check suggested prompts
    expect(screen.getByText(/What are our biggest customer complaints\?/i)).toBeInTheDocument();
    expect(screen.getByText(/What are customers saying about dashboard performance\?/i)).toBeInTheDocument();
  });

  // Test 2: Message sending and response rendering
  it('submits a user question and renders AI response with Hindsight memory badge and evidence', async () => {
    const mockSend = vi.spyOn(api, 'sendChatMessage').mockResolvedValue({
      answer: 'Based on customer feedback [FB-001], morning dashboard slowness is the top performance issue.',
      memoryEnabled: true,
      recalledMemoriesCount: 15,
      evidence: [
        {
          feedback_id: 'FB-001',
          customer_id: 'CUST-001',
          topic: 'performance',
          rating: 2,
          date: '2026-10-01',
          feedback_snippet: 'The dashboard takes too long to load, especially in the morning.'
        }
      ]
    });

    render(
      <AskFeedbackMind 
        memoryEnabled={true} 
        onToggleMemory={vi.fn()} 
      />
    );

    const input = screen.getByPlaceholderText(/Ask anything/i);
    fireEvent.change(input, { target: { value: 'What are the main performance issues?' } });

    const submitBtn = screen.getByRole('button', { name: /Ask/i });
    fireEvent.click(submitBtn);

    // Verify user message appears immediately
    expect(screen.getByText('What are the main performance issues?')).toBeInTheDocument();

    // Verify AI response renders
    await waitFor(() => {
      expect(screen.getByText(/morning dashboard slowness is the top performance issue/i)).toBeInTheDocument();
    });

    // Verify memory badge
    expect(screen.getByText(/Hindsight Cloud Memory Grounded/i)).toBeInTheDocument();

    // Verify evidence card
    expect(screen.getByText('FB-001')).toBeInTheDocument();
    expect(screen.getByText(/CUST-001/i)).toBeInTheDocument();
    expect(screen.getByText(/★ 2\/5/i)).toBeInTheDocument();
    expect(screen.getByText(/"The dashboard takes too long to load, especially in the morning."/i)).toBeInTheDocument();
  });

  // Test 3: Suggested prompt click
  it('clicking a suggested prompt button automatically populates and submits the query', async () => {
    const mockSend = vi.spyOn(api, 'sendChatMessage').mockResolvedValue({
      answer: 'The most requested feature is dark mode (FB-002) and a mobile app (FB-005).',
      memoryEnabled: true,
      evidence: []
    });

    render(
      <AskFeedbackMind 
        memoryEnabled={true} 
        onToggleMemory={vi.fn()} 
      />
    );

    const promptBtn = screen.getByText('Which features are requested most often?');
    fireEvent.click(promptBtn);

    await waitFor(() => {
      expect(mockSend).toHaveBeenCalledWith(expect.objectContaining({
        question: 'Which features are requested most often?'
      }));
      expect(screen.getByText(/The most requested feature is dark mode/i)).toBeInTheDocument();
    });
  });

  // Test 4: Memory OFF mode styling and badge
  it('displays Memory OFF badge and scope indicator when memoryEnabled is false', () => {
    render(
      <AskFeedbackMind 
        memoryEnabled={false} 
        onToggleMemory={vi.fn()} 
      />
    );

    expect(screen.getByRole('button', { name: /Memory OFF/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Memory OFF: answers using only current query/i)).toBeInTheDocument();
  });

  // Test 5: Clear chat button
  it('clicking Clear resets conversation messages', async () => {
    const mockClear = vi.spyOn(api, 'clearChatHistory').mockResolvedValue({ success: true });

    render(
      <AskFeedbackMind 
        memoryEnabled={true} 
        onToggleMemory={vi.fn()} 
      />
    );

    const clearBtn = screen.getByTitle('Clear Chat Conversation');
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    fireEvent.click(clearBtn);

    await waitFor(() => {
      expect(screen.getByText(/Conversation cleared/i)).toBeInTheDocument();
    });
  });

  // Test 6: Error handling
  it('renders an error alert when the AI chat request fails', async () => {
    vi.spyOn(api, 'sendChatMessage').mockRejectedValue(new Error('Groq rate limit exceeded (429)'));

    render(
      <AskFeedbackMind 
        memoryEnabled={true} 
        onToggleMemory={vi.fn()} 
      />
    );

    const input = screen.getByPlaceholderText(/Ask anything/i);
    fireEvent.change(input, { target: { value: 'Test query' } });
    fireEvent.click(screen.getByRole('button', { name: /Ask/i }));

    await waitFor(() => {
      expect(screen.getByText(/Groq rate limit exceeded/i)).toBeInTheDocument();
    });
  });
});
