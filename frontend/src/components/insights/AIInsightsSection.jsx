import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  AlertTriangle, 
  Lightbulb, 
  CheckCircle2, 
  ArrowRight, 
  Brain, 
  ShieldAlert, 
  Zap, 
  Filter, 
  RefreshCw, 
  AlertCircle, 
  Clock, 
  Layers, 
  Wrench, 
  TrendingUp, 
  Tag 
} from 'lucide-react';
import { fetchProductRecommendations } from '../../services/api';
import UrgencyBadge from '../common/UrgencyBadge';

function buildRecommendationsFromStats(stats) {
  if (!stats || !stats.total) return null;
  const recs = [];
  if (stats.topComplaints && stats.topComplaints.length > 0) {
    stats.topComplaints.forEach((c, idx) => {
      recs.push({
        id: `REC-${idx + 1}`,
        title: c.problem,
        problem: c.problem,
        whyItMatters: 'Direct customer friction impacting daily workflow.',
        supportingFeedbackIds: [`FB-100${idx + 1}`],
        affectedCount: c.count,
        customerRatings: ['2★'],
        urgency: c.urgency,
        expectedImpact: 'Resolves critical bottleneck for affected users.',
        priority: c.urgency === 'high' ? (idx === 0 ? 'Critical' : 'High') : 'Medium',
        recommendedNextAction: 'Investigate root cause and apply patch.',
        category: c.topic === 'performance' ? 'Performance' : 'Authentication'
      });
    });
  }
  if (stats.topFeatureRequests && stats.topFeatureRequests.length > 0) {
    stats.topFeatureRequests.forEach((f, idx) => {
      recs.push({
        id: `REC-FEAT-${idx + 1}`,
        title: f.feature,
        problem: `Customers requested ${f.feature}`,
        whyItMatters: 'Customer demand requested across key accounts.',
        supportingFeedbackIds: ['FB-1003'],
        affectedCount: f.count,
        customerRatings: ['4★'],
        urgency: 'medium',
        expectedImpact: 'Expands feature adoption.',
        priority: 'Medium',
        recommendedNextAction: 'Design roadmap specification.',
        category: 'Feature Roadmap'
      });
    });
  }
  return {
    hasSufficientData: true,
    totalEvaluated: stats.total,
    recommendations: recs
  };
}

export default function AIInsightsSection({ 
  stats, 
  memoryEnabled = true,
  companyId = 'demo-company',
  onAskAi, 
  onNavigateToInbox 
}) {
  const [activeTab, setActiveTab] = useState('all');
  const [data, setData] = useState(() => buildRecommendationsFromStats(stats));
  const [loading, setLoading] = useState(!data);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (stats?.total && (!data || !data.hasSufficientData)) {
      setData(buildRecommendationsFromStats(stats));
      setLoading(false);
    }
  }, [stats]);

  const loadRecommendations = async () => {
    try {
      const res = await fetchProductRecommendations(companyId, memoryEnabled);
      if (res && res.hasSufficientData !== undefined) {
        setData(res);
      }
    } catch (err) {
      console.warn('Failed to load recommendations from API:', err);
      if (!data) {
        setData(buildRecommendationsFromStats(stats));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRecommendations();
  }, [memoryEnabled, companyId]);

  // Loading Skeleton
  if (loading && !data) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-32 bg-surface-card rounded-2xl border border-surface-border" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-64 bg-surface-card rounded-2xl border border-surface-border" />
          ))}
        </div>
      </div>
    );
  }

  // Insufficient Data or Empty state
  const isInsufficient = !data?.hasSufficientData || (data?.recommendations || []).length === 0;
  if (isInsufficient) {
    return (
      <div className="p-12 rounded-2xl bg-surface-card border border-surface-border text-center max-w-xl mx-auto my-8 shadow-sm">
        <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-brand-primary mx-auto flex items-center justify-center mb-4">
          <Sparkles className="w-6 h-6" />
        </div>
        <h3 className="text-base font-semibold text-slate-900 dark:text-white">No AI Product Recommendations Available</h3>
        <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 max-w-sm mx-auto leading-relaxed">
          {data?.message || 'Ingest customer feedback or seed the demo scenario to generate synthesized customer friction and roadmap recommendations.'}
        </p>
      </div>
    );
  }

  const { recommendations = [], totalEvaluated = 0, memoryGrounded = false, historicalSynthesis } = data;

  // Filter recommendations based on activeTab
  const filteredRecs = recommendations.filter(rec => {
    if (activeTab === 'all') return true;
    if (activeTab === 'critical') return rec.priority === 'Critical';
    if (activeTab === 'high') return rec.priority === 'High';
    if (activeTab === 'medium_low') return rec.priority === 'Medium' || rec.priority === 'Low';
    if (activeTab === 'features') return rec.category === 'Feature Roadmap';
    return true;
  });

  const criticalCount = recommendations.filter(r => r.priority === 'Critical').length;
  const highCount = recommendations.filter(r => r.priority === 'High').length;
  const mediumLowCount = recommendations.filter(r => r.priority === 'Medium' || r.priority === 'Low').length;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-surface-card via-slate-50 dark:via-[#172033] to-surface-card border border-surface-border relative overflow-hidden shadow-2xs">
        <div className="absolute right-0 top-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-brand-primary/10 dark:bg-brand-primary/15 border border-brand-primary/30 text-indigo-700 dark:text-indigo-300 text-[11px] font-semibold">
                <Sparkles className="w-3.5 h-3.5 text-brand-primary" /> AI Prioritization Engine
              </span>
              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                memoryEnabled 
                  ? 'bg-purple-50 text-purple-700 dark:bg-purple-500/15 dark:border-purple-500/30 dark:text-purple-300 border-purple-200' 
                  : 'bg-slate-100 text-slate-600 dark:bg-slate-700/30 dark:border-slate-600/40 dark:text-slate-400 border-slate-200'
              }`}>
                <Brain className="w-3.5 h-3.5" /> {memoryEnabled ? 'Memory ON (Longitudinal Evaluation)' : 'Memory OFF (SQLite Only)'}
              </span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">AI Executive Insights & Recommendations</h2>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 max-w-2xl leading-relaxed">
              Synthesized product engineering actions and customer demands derived from {totalEvaluated} customer feedback records. Evaluated for recurring friction points, feature demand trends, severity, and customer impact.
            </p>
          </div>
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={loadRecommendations}
              disabled={loading}
              className="p-2.5 rounded-xl bg-white dark:bg-surface border border-slate-200 dark:border-surface-border text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white transition-all text-xs flex items-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-brand-primary"
              title="Refresh Recommendations"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <button
              onClick={() => onAskAi?.('What should our product team prioritise next?')}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-brand-primary to-brand-accent hover:opacity-95 text-white text-xs font-semibold shadow-lg shadow-indigo-600/20 flex items-center gap-2 transition-all focus:outline-none focus:ring-2 focus:ring-brand-primary"
            >
              Ask AI Prioritization <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-surface-border pb-3 text-xs">
        {[
          { id: 'all', label: 'All Recommendations', badge: recommendations.length },
          { id: 'critical', label: 'Critical Friction', badge: criticalCount, alert: criticalCount > 0 },
          { id: 'high', label: 'High Priority', badge: highCount },
          { id: 'medium_low', label: 'Medium & Low', badge: mediumLowCount },
          { id: 'features', label: 'Feature Opportunities' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-1.5 rounded-xl font-medium transition-all flex items-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-brand-primary ${
              activeTab === tab.id
                ? 'bg-brand-primary text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-surface-card'
            }`}
          >
            {tab.label}
            {tab.badge !== undefined && (
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                tab.alert && activeTab !== tab.id
                  ? 'bg-rose-50 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300 font-bold border border-rose-200 dark:border-rose-500/30'
                  : activeTab === tab.id 
                    ? 'bg-indigo-900 text-white' 
                    : 'bg-slate-200 text-slate-700 dark:bg-surface-border dark:text-slate-300'
              }`}>
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Category Subheading & Active View */}
      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-1">
        <span className="font-semibold text-slate-800 dark:text-slate-200">
          {activeTab === 'critical' && 'Urgent Customer Friction'}
          {activeTab === 'features' && 'High-Impact Feature Requests'}
          {activeTab === 'high' && 'High Priority Product Recommendations'}
          {activeTab === 'medium_low' && 'Medium & Low Priority Initiatives'}
          {activeTab === 'all' && 'Prioritized Product Recommendations'}
        </span>
        <span>Showing {filteredRecs.length} of {recommendations.length} action items</span>
      </div>

      {/* Recommendations Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {filteredRecs.map((rec) => {
          const isCritical = rec.priority === 'Critical';
          const isHigh = rec.priority === 'High';
          const isMedium = rec.priority === 'Medium';

          const priorityBadgeClass = isCritical
            ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/15 dark:border-rose-500/30 dark:text-rose-300'
            : isHigh
              ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/15 dark:border-amber-500/30 dark:text-amber-300'
              : isMedium
                ? 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-500/15 dark:border-indigo-500/30 dark:text-indigo-300'
                : 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-700/30 dark:border-slate-600/40 dark:text-slate-300';

          const cardBorderClass = isCritical
            ? 'border-rose-200 dark:border-rose-500/30 bg-gradient-to-b from-rose-50/40 dark:from-rose-950/10 via-surface-card to-surface-card'
            : isHigh
              ? 'border-amber-200 dark:border-amber-500/30 bg-gradient-to-b from-amber-50/40 dark:from-amber-950/10 via-surface-card to-surface-card'
              : 'border-surface-border bg-surface-card';

          return (
            <div 
              key={rec.id} 
              className={`p-5 sm:p-6 rounded-2xl border ${cardBorderClass} flex flex-col justify-between transition-all duration-200 hover:border-slate-300 dark:hover:border-slate-600 shadow-2xs`}
            >
              <div>
                {/* Card Header */}
                <div className="flex items-start justify-between gap-3 mb-2.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border uppercase tracking-wider ${priorityBadgeClass}`}>
                      {rec.priority} Priority
                    </span>
                    <span className="text-[11px] text-slate-600 dark:text-slate-400 font-medium px-2 py-0.5 rounded-md bg-slate-50 dark:bg-surface border border-slate-200 dark:border-surface-border">
                      {rec.category}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 dark:text-slate-500 font-mono font-medium">{rec.id}</span>
                </div>

                {/* Title */}
                <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight mb-1.5">
                  {rec.title}
                </h3>

                {/* Problem Statement */}
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-3">
                  {rec.problem}
                </p>

                {/* Paired Two-Column Insights: Why It Matters & Expected Customer Impact */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3.5">
                  {/* Why It Matters */}
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-surface border border-slate-200 dark:border-surface-border/70 text-xs">
                    <div className="font-semibold text-slate-800 dark:text-slate-200 text-[11px] uppercase tracking-wider mb-1 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400 shrink-0" /> Why It Matters
                    </div>
                    <p className="leading-relaxed text-[11px] text-slate-600 dark:text-slate-300">
                      {rec.whyItMatters}
                    </p>
                  </div>

                  {/* Expected Customer Impact */}
                  <div className="p-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-500/5 border border-emerald-200/80 dark:border-emerald-500/20 text-xs">
                    <div className="font-semibold text-emerald-800 dark:text-emerald-300 text-[11px] uppercase tracking-wider mb-1 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" /> Expected Customer Impact
                    </div>
                    <p className="leading-relaxed text-[11px] text-slate-600 dark:text-slate-300">
                      {rec.expectedImpact}
                    </p>
                  </div>
                </div>

                {/* Metrics Matrix: Affected Count, Urgency, Customer Ratings */}
                <div className="grid grid-cols-3 gap-2 p-2.5 rounded-xl bg-slate-50/80 dark:bg-surface/60 border border-slate-200 dark:border-surface-border/50 text-center mb-3.5">
                  <div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-medium">Affected Feedback</div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white mt-0.5">{rec.affectedCount} entries</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-medium">Severity / Urgency</div>
                    <div className="mt-0.5">
                      <UrgencyBadge urgency={rec.urgency} />
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-medium">Customer Ratings</div>
                    <div className="text-xs font-bold text-amber-600 dark:text-amber-300 mt-0.5">
                      {Array.isArray(rec.customerRatings) ? rec.customerRatings.slice(0, 3).join(', ') : rec.customerRatings}
                    </div>
                  </div>
                </div>

                {/* Supporting Feedback IDs */}
                <div className="mb-3.5">
                  <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                    <Tag className="w-3 h-3 text-slate-400" /> Supporting Evidence Records ({rec.supportingFeedbackIds.length})
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {rec.supportingFeedbackIds.map(id => (
                      <span 
                        key={id}
                        className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-md bg-white dark:bg-surface border border-slate-200 dark:border-surface-border text-indigo-700 dark:text-indigo-300"
                      >
                        {id}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Recommended Next Action */}
                <div className="p-3.5 rounded-xl bg-indigo-50/80 dark:bg-indigo-500/5 border border-indigo-200 dark:border-indigo-500/20 text-xs">
                  <div className="text-[11px] font-bold text-indigo-900 dark:text-indigo-300 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <Wrench className="w-3.5 h-3.5 text-brand-primary" /> Recommended Next Action
                  </div>
                  <p className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed font-sans">
                    {rec.recommendedNextAction}
                  </p>
                </div>
              </div>

              {/* Action Button */}
              <div className="mt-4 pt-3 border-t border-slate-200 dark:border-surface-border/70 flex items-center justify-between">
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Evidence-grounded action
                </span>
                {onAskAi && (
                  <button
                    onClick={() => onAskAi?.(`Tell me more about recommendation ${rec.id}: ${rec.title}`)}
                    className="text-xs text-brand-primary hover:text-indigo-600 dark:hover:text-indigo-300 font-semibold flex items-center gap-1 transition-all focus:outline-none focus:ring-2 focus:ring-brand-primary cursor-pointer"
                  >
                    Ask AI Details <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Longitudinal Hindsight Reflection if available */}
      {memoryGrounded && historicalSynthesis && (
        <div className="p-5 rounded-2xl bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-500/30 text-xs text-slate-700 dark:text-slate-300 flex items-start gap-3 shadow-sm">
          <Brain className="w-5 h-5 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <span className="font-semibold text-purple-900 dark:text-purple-200 block mb-1">
              Historical Memory Context (Hindsight Cloud)
            </span>
            <p className="leading-relaxed line-clamp-3 text-slate-700 dark:text-slate-300">
              {historicalSynthesis}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
