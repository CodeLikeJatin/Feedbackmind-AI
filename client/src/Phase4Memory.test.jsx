import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import MemoryCentreSection from './components/memory/MemoryCentreSection';

describe('Phase 4 — Frontend Hindsight Long-Term Memory Test Suite', () => {
  beforeEach(() => {
    global.fetch = vi.fn().mockImplementation((url) => {
      if (url.includes('/api/memory/overview')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            configured: true,
            serviceOnline: true,
            companyId: 'demo-company',
            bankId: 'feedbackmind-demo',
            totalFeedback: 20,
            retainedFeedback: 18
          })
        });
      }
      if (url.includes('/api/memory/list')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            bankId: 'feedbackmind-demo',
            total: 2,
            items: [
              {
                id: 1,
                feedback_id: 'FB-MEM-1',
                customer_id: 'CUST-Acme',
                date: '2026-07-04',
                feedback: 'Dashboard takes 15s to load.',
                topic: 'performance',
                rating: 2.0,
                retained_in_hindsight: 1,
                hindsight_memory_id: 'mem_FB-MEM-1'
              },
              {
                id: 2,
                feedback_id: 'FB-MEM-2',
                customer_id: 'CUST-Globex',
                date: '2026-09-05',
                feedback: 'Dashboard loads in under 2 seconds now.',
                topic: 'performance',
                rating: 5.0,
                retained_in_hindsight: 1,
                hindsight_memory_id: 'mem_FB-MEM-2'
              }
            ]
          })
        });
      }
      if (url.includes('/api/memory/recall')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            bankId: 'feedbackmind-demo',
            query: 'performance complaints',
            total: 1,
            results: [
              {
                id: 'mem_FB-MEM-1',
                text: 'Customer Acme: Dashboard takes 15s to load.',
                context: 'performance',
                entities: ['AcmeCorp', 'dashboard'],
                occurred_start: '2026-07-04'
              }
            ]
          })
        });
      }
      if (url.includes('/api/memory/retain-batch')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            total: 2,
            retained: 2,
            bankId: 'feedbackmind-demo'
          })
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ status: 'ok' })
      });
    });
  });

  it('renders Memory Centre with bank ID, 3 core pillars (Retain, Recall, Reflect), and company isolation', async () => {
    await act(async () => {
      render(<MemoryCentreSection memoryEnabled={true} onToggleMemory={() => {}} />);
    });

    expect(screen.getByText(/Memory Centre & Cognitive Architecture/i)).toBeInTheDocument();
    expect(screen.getByText(/1. RETAIN/i)).toBeInTheDocument();
    expect(screen.getByText(/2. RECALL/i)).toBeInTheDocument();
    expect(screen.getByText(/3. REFLECT/i)).toBeInTheDocument();
    expect(screen.getByText(/Dedicated Company Bank Isolation/i)).toBeInTheDocument();
  });

  it('displays the Memory ON vs Memory OFF judging criterion comparison', async () => {
    await act(async () => {
      render(<MemoryCentreSection memoryEnabled={true} onToggleMemory={() => {}} />);
    });

    expect(screen.getByText(/Why Long-Term Memory Matters/i)).toBeInTheDocument();
    expect(screen.getByText(/WITHOUT MEMORY \(Memory OFF\)/i)).toBeInTheDocument();
    expect(screen.getByText(/WITH HINDSIGHT MEMORY \(Memory ON\)/i)).toBeInTheDocument();
  });

  it('runs interactive Recall query and displays retrieved memory cards with entities', async () => {
    await act(async () => {
      render(<MemoryCentreSection memoryEnabled={true} onToggleMemory={() => {}} />);
    });

    const runRecallBtn = screen.getByRole('button', { name: /Run Recall/i });
    await act(async () => {
      fireEvent.click(runRecallBtn);
    });

    expect(global.fetch).toHaveBeenCalledWith('/api/memory/recall', expect.anything());
    expect(await screen.findByText(/Customer Acme: Dashboard takes 15s to load/i)).toBeInTheDocument();
    expect(screen.getByText('AcmeCorp')).toBeInTheDocument();
  });

  it('triggers batch retention when clicking Retain Pending Records button', async () => {
    await act(async () => {
      render(<MemoryCentreSection memoryEnabled={true} onToggleMemory={() => {}} />);
    });

    const retainBtn = screen.getByRole('button', { name: /Retain Pending Records/i });
    await act(async () => {
      fireEvent.click(retainBtn);
    });

    expect(global.fetch).toHaveBeenCalledWith('/api/memory/retain-batch', expect.anything());
    expect(await screen.findByText(/Retained 2 feedback memories to Hindsight Cloud bank/i)).toBeInTheDocument();
  });

  it('renders retained memories explorer list with memory IDs and ratings', async () => {
    await act(async () => {
      render(<MemoryCentreSection memoryEnabled={true} onToggleMemory={() => {}} />);
    });

    expect(screen.getByText('mem_FB-MEM-1')).toBeInTheDocument();
    expect(screen.getByText('mem_FB-MEM-2')).toBeInTheDocument();
    expect(screen.getByText('★ 2')).toBeInTheDocument();
    expect(screen.getByText('★ 5')).toBeInTheDocument();
  });
});

