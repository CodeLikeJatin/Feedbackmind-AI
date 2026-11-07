import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import TrendAnalysisSection from './components/trends/TrendAnalysisSection';
import AIInsightsSection from './components/insights/AIInsightsSection';
import * as api from './services/api';

// Mock ResponsiveContainer for Recharts in jsdom
vi.mock('recharts', async () => {
  const original = await vi.importActual('recharts');
  return {
    ...original,
    ResponsiveContainer: ({ children }) => <div className="recharts-mock">{children}</div>
  };
});

describe('Phase 6 — Trend Detection and Product Recommendations Frontend Tests', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const mockTrendsData = {
    hasSufficientData: true,
    totalFeedback: 26,
    timePeriodCount: 3,
    reportingPeriods: ['2026-08', '2026-09', '2026-10'],
    sentimentTrajectory: 'improving',
    sentimentTrends: [
      { period: '2026-08', total: 2, positive: 0, negative: 2, neutral: 0, positivePct: 0, negativePct: 100, neutralPct: 0, avgRating: 1.5 },
      { period: '2026-09', total: 2, positive: 2, negative: 0, neutral: 0, positivePct: 100, negativePct: 0, neutralPct: 0, avgRating: 5.0 },
      { period: '2026-10', total: 22, positive: 14, negative: 6, neutral: 2, positivePct: 64, negativePct: 27, neutralPct: 9, avgRating: 3.4 }
    ],
    frequentProblems: [
      {
        problem: 'Morning Dashboard Loading Latency',
        topic: 'Performance',
        count: 4,
        dominantUrgency: 'high',
        avgRating: 2.0,
        feedbackIds: ['FB-001', 'FB-013'],
        customerIds: ['CUST-001'],
        firstSeen: '2026-10-01',
        lastSeen: '2026-10-13'
      }
    ],
    emergingIssues: [
      {
        problem: 'Google OAuth 500 Internal Server Error',
        topic: 'login',
        trendStatus: 'newly_emerging',
        recentCount: 2,
        historicalCount: 0,
        feedbackIds: ['FB-020'],
        description: 'Newly reported in 2026-10 (2 feedback entries). Not present in earlier reporting windows.'
      }
    ],
    historicalResolved: [
      {
        problem: 'CSV export 504 timeouts on large datasets',
        topic: 'Export & Reporting',
        trendStatus: 'diminished_or_resolved',
        historicalCount: 4,
        recentCount: 0,
        feedbackIds: ['AUDIT-EXP-1', 'AUDIT-EXP-2'],
        description: 'Frequently reported previously (4 times in 2026-08, 2026-09), with 0 complaints in 2026-10.'
      }
    ],
    featureRequests: [
      {
        feature: 'Role-Based Team Permissions (RBAC)',
        topic: 'Features',
        count: 4,
        customerIds: ['CUST-018'],
        feedbackIds: ['FB-018'],
        percentageOfAll: 15.4
      },
      {
        feature: 'Dark Mode UI Theme',
        topic: 'Features',
        count: 3,
        customerIds: ['CUST-002'],
        feedbackIds: ['FB-002'],
        percentageOfAll: 11.5
      }
    ],
    categoryBreakdown: {
      login_auth: {
        category: 'Authentication & Session Access',
        count: 3,
        highUrgencyCount: 2,
        feedbackIds: ['FB-004', 'FB-020'],
        issues: ['Password reset link expires immediately']
      },
      performance: {
        category: 'Performance & Latency',
        count: 4,
        highUrgencyCount: 1,
        feedbackIds: ['FB-001', 'FB-013'],
        issues: ['Morning dashboard slowness']
      }
    },
    positiveTrends: [
      {
        feedback_id: 'FB-013',
        customer_id: 'CUST-013',
        date: '2026-10-13',
        rating: 5,
        topic: 'performance',
        highlight: 'Dashboard noticeably faster after v2.4 update',
        snippet: 'The latest update made the dashboard noticeably faster for our team.'
      }
    ],
    historicalContext: {
      bankId: 'feedbackmind-demo',
      memoriesRetrievedCount: 14,
      reflectionText: 'Longitudinal analysis reveals that performance complaints were high in August but dropped significantly following release v2.4 in September.'
    },
    memoryEnabled: true
  };

  const mockRecommendationsData = {
    hasSufficientData: true,
    totalEvaluated: 26,
    memoryGrounded: true,
    recommendations: [
      {
        id: 'REC-AUTH-01',
        title: 'Fix Authentication Token Expiry and Login Access Outage',
        problem: 'Customers are locked out due to expired password reset links and team access outages, blocking work.',
        whyItMatters: 'Authentication failures completely block paying users from accessing their accounts, creating immediate churn risk.',
        supportingFeedbackIds: ['FB-004', 'FB-009', 'FB-020'],
        affectedCount: 3,
        customerRatings: ['1★', '1★', '2★'],
        urgency: 'high',
        expectedImpact: 'Eliminates login drop-offs and restores reliable access for blocked teams.',
        priority: 'Critical',
        recommendedNextAction: 'Patch token expiration window and fix Google OAuth callback exception handler.',
        category: 'Authentication'
      },
      {
        id: 'REC-PERF-01',
        title: 'Optimize Morning Dashboard Query Caching & Asset Loading',
        problem: 'Dashboard loading latency spikes during morning peak hours, causing slow responsiveness.',
        whyItMatters: 'The dashboard is the primary workspace; morning slowness impacts daily customer productivity.',
        supportingFeedbackIds: ['FB-001', 'FB-013'],
        affectedCount: 2,
        customerRatings: ['2★', '5★'],
        urgency: 'medium',
        expectedImpact: 'Reduces morning dashboard load times to under 2 seconds consistently.',
        priority: 'High',
        recommendedNextAction: 'Implement Redis caching on aggregate tenant metric queries.',
        category: 'Performance'
      },
      {
        id: 'REC-FEAT-01',
        title: 'Implement Granular Role-Based Team Permissions (RBAC)',
        problem: 'Organizations currently lack role-based access control for team members.',
        whyItMatters: 'Enterprise expansion requires strict permission governance.',
        supportingFeedbackIds: ['FB-018'],
        affectedCount: 4,
        customerRatings: ['3★', '4★'],
        urgency: 'medium',
        expectedImpact: 'Unlocks multi-user team onboarding for enterprise accounts.',
        priority: 'Medium',
        recommendedNextAction: 'Design RBAC schema with Admin, Member, and Viewer roles.',
        category: 'Feature Roadmap'
      }
    ]
  };

  // Test 1: TrendAnalysisSection renders live metrics, charts, and emerging issues
  it('renders TrendAnalysisSection with sentiment trajectory, emerging issues, and feature demands', async () => {
    vi.spyOn(api, 'fetchTrendsOverview').mockResolvedValue(mockTrendsData);

    render(
      <TrendAnalysisSection 
        stats={{ total: 26 }} 
        memoryEnabled={true} 
        companyId="demo-company"
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/Customer Sentiment & Topic Velocity/i)).toBeInTheDocument();
      expect(screen.getByText(/Longitudinal Trend Analytics/i)).toBeInTheDocument();
      expect(screen.getByText('Feedback Evaluated')).toBeInTheDocument();
      expect(screen.getByText(/improving/i)).toBeInTheDocument(); // Net Sentiment Shift
      expect(screen.getByText(/Emerging Customer Complaints/i)).toBeInTheDocument();
      expect(screen.getByText(/Google OAuth 500 Internal Server Error/i)).toBeInTheDocument();
      expect(screen.getByText(/Repeated Feature Requests/i)).toBeInTheDocument();
      expect(screen.getAllByText(/Role-Based Team Permissions \(RBAC\)/i).length).toBeGreaterThan(0);
      expect(screen.getByText(/Authentication & Session Access/i)).toBeInTheDocument();
      expect(screen.getByText(/Hindsight Cloud Longitudinal Reflection/i)).toBeInTheDocument();
    });
  });

  // Test 2: TrendAnalysisSection handles insufficient data
  it('displays insufficient data banner when records are fewer than 3 or dates are insufficient', async () => {
    vi.spyOn(api, 'fetchTrendsOverview').mockResolvedValue({
      hasSufficientData: false,
      totalFeedback: 1,
      message: 'Insufficient customer feedback data to establish longitudinal trends.'
    });

    render(
      <TrendAnalysisSection 
        stats={{ total: 1 }} 
        memoryEnabled={false} 
        companyId="test-org"
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/Insufficient Data for Longitudinal Trends/i)).toBeInTheDocument();
      expect(screen.getByText(/3\+ entries across 2\+ dates/i)).toBeInTheDocument();
    });
  });

  // Test 3: TrendAnalysisSection displays Memory OFF notice when memoryEnabled is false
  it('displays Memory OFF indicator when memory is disabled', async () => {
    vi.spyOn(api, 'fetchTrendsOverview').mockResolvedValue({
      ...mockTrendsData,
      memoryEnabled: false,
      historicalContext: null
    });

    render(
      <TrendAnalysisSection 
        stats={{ total: 26 }} 
        memoryEnabled={false} 
        companyId="demo-company"
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/Memory OFF \(SQLite Only\)/i)).toBeInTheDocument();
      expect(screen.getByText(/Longitudinal Hindsight Cloud memory retrieval is suppressed/i)).toBeInTheDocument();
    });
  });

  // Test 4: AIInsightsSection renders prioritized recommendations with all required fields
  it('renders AIInsightsSection with Critical, High, and Medium recommendation cards including all 10 required fields', async () => {
    vi.spyOn(api, 'fetchProductRecommendations').mockResolvedValue(mockRecommendationsData);

    const onAskAiMock = vi.fn();

    const { container } = render(
      <AIInsightsSection 
        stats={{ total: 26 }} 
        memoryEnabled={true} 
        companyId="demo-company"
        onAskAi={onAskAiMock}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/Prioritized Product Recommendations/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/Fix Authentication Token Expiry and Login Access Outage/i)).toBeInTheDocument();
    expect(screen.getAllByText(/CRITICAL Priority/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Why It Matters/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Expected Customer Impact/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Supporting Evidence Records/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/FB-004/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Recommended Next Action/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Optimize Morning Dashboard Query Caching & Asset Loading/i)).toBeInTheDocument();
    expect(screen.getAllByText(/HIGH Priority/i).length).toBeGreaterThanOrEqual(1);
  });

  // Test 5: AIInsightsSection priority filter tabs
  it('filters recommendations when priority tabs are clicked', async () => {
    vi.spyOn(api, 'fetchProductRecommendations').mockResolvedValue(mockRecommendationsData);

    render(
      <AIInsightsSection 
        stats={{ total: 26 }} 
        memoryEnabled={true} 
        companyId="demo-company"
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/Fix Authentication Token Expiry and Login Access Outage/i)).toBeInTheDocument();
    });

    // Click 'Critical Friction' tab
    const criticalTab = screen.getByRole('button', { name: /Critical Friction/i });
    fireEvent.click(criticalTab);

    expect(screen.getByText(/Fix Authentication Token Expiry and Login Access Outage/i)).toBeInTheDocument();
    // High priority item should be filtered out
    expect(screen.queryByText(/Optimize Morning Dashboard Query Caching & Asset Loading/i)).not.toBeInTheDocument();

    // Click 'All Recommendations' tab
    const allTab = screen.getByRole('button', { name: /All Recommendations/i });
    fireEvent.click(allTab);

    expect(screen.getByText(/Optimize Morning Dashboard Query Caching & Asset Loading/i)).toBeInTheDocument();
  });

  // Test 6: Clicking "Ask AI Prioritization" or "Ask AI Details" invokes onAskAi callback
  it('invokes onAskAi callback with recommendation context when clicked', async () => {
    vi.spyOn(api, 'fetchProductRecommendations').mockResolvedValue(mockRecommendationsData);
    const onAskAiMock = vi.fn();

    render(
      <AIInsightsSection 
        stats={{ total: 26 }} 
        memoryEnabled={true} 
        companyId="demo-company"
        onAskAi={onAskAiMock}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/Ask AI Prioritization/i)).toBeInTheDocument();
    });

    const headerButton = screen.getByRole('button', { name: /Ask AI Prioritization/i });
    fireEvent.click(headerButton);

    expect(onAskAiMock).toHaveBeenCalledWith('What should our product team prioritise next?');

    // Click card-level Ask AI Details
    const cardButtons = screen.getAllByRole('button', { name: /Ask AI Details/i });
    fireEvent.click(cardButtons[0]);

    expect(onAskAiMock).toHaveBeenCalledWith('Tell me more about recommendation REC-AUTH-01: Fix Authentication Token Expiry and Login Access Outage');
  });
});
