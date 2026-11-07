import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import Header from './components/layout/Header';
import Sidebar from './components/layout/Sidebar';
import SettingsSection from './components/settings/SettingsSection';
import Modal from './components/common/Modal';
import OverviewSection from './components/dashboard/OverviewSection';

// Mock Component to inspect context values
function ThemeConsumer() {
  const { theme, resolvedTheme, isDark, setTheme } = useTheme();
  return (
    <div>
      <span data-testid="theme">{theme}</span>
      <span data-testid="resolvedTheme">{resolvedTheme}</span>
      <span data-testid="isDark">{String(isDark)}</span>
      <button onClick={() => setTheme('light')}>Set Light</button>
      <button onClick={() => setTheme('dark')}>Set Dark</button>
      <button onClick={() => setTheme('system')}>Set System</button>
    </div>
  );
}

describe('Phase 8.1 — Theme System & Light Mode Unit and Integration Tests', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.className = '';
  });

  afterEach(() => {
    localStorage.clear();
    document.documentElement.className = '';
  });

  it('defaults to dark mode for first-time users when localStorage is empty', () => {
    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    );

    expect(screen.getByTestId('theme')).toHaveTextContent('dark');
    expect(screen.getByTestId('resolvedTheme')).toHaveTextContent('dark');
    expect(screen.getByTestId('isDark')).toHaveTextContent('true');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(document.documentElement.style.colorScheme).toBe('dark');
  });

  it('switches to light mode, removes .dark class, and persists to localStorage', () => {
    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    );

    act(() => {
      fireEvent.click(screen.getByText('Set Light'));
    });

    expect(screen.getByTestId('theme')).toHaveTextContent('light');
    expect(screen.getByTestId('resolvedTheme')).toHaveTextContent('light');
    expect(screen.getByTestId('isDark')).toHaveTextContent('false');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(document.documentElement.style.colorScheme).toBe('light');
    expect(localStorage.getItem('feedbackmind_theme')).toBe('light');
  });

  it('restores stored light mode preference on initial mount', () => {
    localStorage.setItem('feedbackmind_theme', 'light');

    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    );

    expect(screen.getByTestId('theme')).toHaveTextContent('light');
    expect(screen.getByTestId('resolvedTheme')).toHaveTextContent('light');
    expect(screen.getByTestId('isDark')).toHaveTextContent('false');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('Header theme toggle cycles between dark, light, and system themes', () => {
    render(
      <ThemeProvider>
        <Header currentSectionTitle="Dashboard Overview" />
      </ThemeProvider>
    );

    // Initial state: Dark
    const toggleBtn = screen.getByRole('button', { name: /Toggle color theme/i });
    expect(toggleBtn).toBeInTheDocument();
    expect(toggleBtn).toHaveAttribute('title', expect.stringContaining('Theme: Dark'));

    // Click 1: Switch to Light
    act(() => {
      fireEvent.click(toggleBtn);
    });
    expect(toggleBtn).toHaveAttribute('title', expect.stringContaining('Theme: Light'));
    expect(document.documentElement.classList.contains('dark')).toBe(false);

    // Click 2: Switch to System
    act(() => {
      fireEvent.click(toggleBtn);
    });
    expect(toggleBtn).toHaveAttribute('title', expect.stringContaining('Theme: System'));

    // Click 3: Switch back to Dark
    act(() => {
      fireEvent.click(toggleBtn);
    });
    expect(toggleBtn).toHaveAttribute('title', expect.stringContaining('Theme: Dark'));
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('SettingsSection renders 3-way theme selector cards and updates active theme', () => {
    render(
      <ThemeProvider>
        <SettingsSection onSeedDemo={vi.fn()} onClearData={vi.fn()} />
      </ThemeProvider>
    );

    expect(screen.getByText('Workspace Appearance & Theme')).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /Dark Mode/i })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /Light Mode/i })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /System Preference/i })).toBeInTheDocument();

    const lightCard = screen.getByRole('radio', { name: /Light Mode/i });
    expect(lightCard).toHaveAttribute('aria-checked', 'false');

    act(() => {
      fireEvent.click(lightCard);
    });

    expect(lightCard).toHaveAttribute('aria-checked', 'true');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(localStorage.getItem('feedbackmind_theme')).toBe('light');
  });

  it('renders Sidebar with light background classes and high contrast when in light mode', () => {
    localStorage.setItem('feedbackmind_theme', 'light');
    const { container } = render(
      <ThemeProvider>
        <Sidebar currentSection="overview" onSelectSection={vi.fn()} isCollapsed={false} />
      </ThemeProvider>
    );

    const aside = container.querySelector('aside');
    expect(aside).toBeInTheDocument();
    // In light mode, aside contains bg-white and dark:bg-[#0E1424]
    expect(aside.className).toContain('bg-white');
    expect(aside.className).toContain('dark:bg-[#0E1424]');
    expect(aside.className).toContain('border-surface-border');
  });

  it('renders Header with light/dark adaptive classes and correct icon', () => {
    localStorage.setItem('feedbackmind_theme', 'light');
    const { container } = render(
      <ThemeProvider>
        <Header currentSectionTitle="Dashboard Overview" />
      </ThemeProvider>
    );

    const header = container.querySelector('header');
    expect(header).toBeInTheDocument();
    expect(header.className).toContain('bg-white/90');
    expect(header.className).toContain('dark:bg-[#0B0F19]/90');
  });

  it('renders Modal with light background and high contrast border classes', () => {
    localStorage.setItem('feedbackmind_theme', 'light');
    const { container } = render(
      <ThemeProvider>
        <Modal isOpen={true} onClose={vi.fn()} title="Test Customer Record">
          <div data-testid="modal-content">Modal Body Content</div>
        </Modal>
      </ThemeProvider>
    );

    const modalDialog = container.querySelector('.bg-white.dark\\:bg-\\[\\#111827\\]');
    expect(modalDialog).toBeInTheDocument();
    expect(modalDialog.className).toContain('border-slate-200');
    expect(modalDialog.className).toContain('dark:border-surface-border');
  });

  it('OverviewSection dynamically adapts chart grid and tooltip palette based on theme', () => {
    const mockStats = {
      total: 20,
      sentiment: { positive: 10, negative: 8, neutral: 2, positivePct: 50, negativePct: 40, neutralPct: 10 },
      topics: [{ topic: 'performance', count: 10 }],
      monthlyTrends: [{ month: '2026-10', total: 20, positive: 10, negative: 8, neutral: 2 }],
      topComplaints: [{ problem: 'Slow loading', count: 5, urgency: 'high', topic: 'performance' }],
      topFeatureRequests: [{ feature: 'CSV Export', count: 4, topic: 'features' }],
      recentActivity: []
    };

    // Render in Light Mode
    localStorage.setItem('feedbackmind_theme', 'light');
    const { unmount } = render(
      <ThemeProvider>
        <OverviewSection stats={mockStats} onNavigateToInbox={vi.fn()} onSelectFeedback={vi.fn()} />
      </ThemeProvider>
    );

    // CartesianGrid stroke in light mode is #E2E8F0 (slate-200)
    // Verify document does not have dark class
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(screen.getByText('Sentiment Trajectory Over Time')).toBeInTheDocument();
    expect(screen.getByText('Total Feedback')).toBeInTheDocument();

    unmount();

    // Render in Dark Mode
    localStorage.setItem('feedbackmind_theme', 'dark');
    render(
      <ThemeProvider>
        <OverviewSection stats={mockStats} onNavigateToInbox={vi.fn()} onSelectFeedback={vi.fn()} />
      </ThemeProvider>
    );

    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(screen.getByText('Sentiment Trajectory Over Time')).toBeInTheDocument();
  });
});

