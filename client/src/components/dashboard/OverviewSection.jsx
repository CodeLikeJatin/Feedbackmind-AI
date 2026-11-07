import React from 'react';
import { 
  Inbox, 
  ThumbsUp, 
  ThumbsDown, 
  Minus, 
  AlertTriangle, 
  Lightbulb, 
  ArrowUpRight, 
  Activity,
  Layers,
  Sparkles
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import SentimentBadge from '../common/SentimentBadge';
import UrgencyBadge from '../common/UrgencyBadge';
import { useTheme } from '../../context/ThemeContext';

const TOPIC_COLORS = {
  performance: '#6366F1', // indigo
  login: '#F43F5E',       // rose
  features: '#10B981',    // emerald
  integrations: '#06B6D4',// cyan
  ui: '#8B5CF6',          // violet
  support: '#F59E0B'      // amber
};

const DEFAULT_TOPIC_COLORS = ['#6366F1', '#8B5CF6', '#EC4899', '#06B6D4', '#10B981', '#F59E0B'];

export default function OverviewSection({ 
  stats, 
  onNavigateToInbox, 
  onSelectFeedback,
  onSeedDemoData,
  onAskAi
}) {
  const { isDark } = useTheme();

  const {
    total = 0,
    sentiment = { positive: 0, negative: 0, neutral: 0, positivePct: 0, negativePct: 0, neutralPct: 0 },
    topics = [],
    monthlyTrends = [],
    topComplaints = [],
    topFeatureRequests = [],
    recentActivity = [],
    isDemoData = true
  } = stats || {};

  return (
    <div className="space-y-6">
      {/* Demo Notice Banner */}
      {isDemoData && (
        <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-800/40 text-xs shadow-2xs">
          <div className="flex items-center gap-2.5 text-indigo-900 dark:text-indigo-200">
            <Sparkles className="w-4 h-4 text-brand-primary shrink-0" />
            <span>
              <strong className="text-slate-900 dark:text-white font-semibold">Demo Scenario Active:</strong> Ingested 4 months of longitudinal SaaS feedback (M1-M2 Performance Bottlenecks → M3 v2.4 Speed Update → M4 SSO/Login Friction).
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onAskAi?.('Did our performance improvements appear to help?')}
              className="px-3 py-1.5 rounded-xl bg-indigo-600/10 hover:bg-indigo-600/20 dark:bg-indigo-600/30 dark:hover:bg-indigo-600/50 border border-indigo-300 dark:border-indigo-500/40 text-indigo-700 dark:text-indigo-200 font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-brand-primary cursor-pointer"
            >
              Ask AI about Trends →
            </button>
          </div>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Feedback */}
        <div className="p-5 rounded-2xl bg-surface-card border border-surface-border relative overflow-hidden group hover:border-slate-300 dark:hover:border-slate-700 transition-all shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Feedback</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-brand-primary">
              <Inbox className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">{total}</span>
            <span className="text-xs text-slate-500 dark:text-slate-400">synthesized items</span>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
            <Activity className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
            <span>Live across 4 reporting periods</span>
          </div>
        </div>

        {/* Positive Sentiment */}
        <div className="p-5 rounded-2xl bg-surface-card border border-surface-border relative overflow-hidden hover:border-slate-300 dark:hover:border-slate-700 transition-all shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Positive Sentiment</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <ThumbsUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold text-emerald-600 dark:text-emerald-400 tracking-tight">{sentiment.positive}</span>
            <span className="text-xs text-emerald-600/80 dark:text-emerald-400/80 font-medium">({sentiment.positivePct}%)</span>
          </div>
          <div className="mt-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${sentiment.positivePct}%` }} />
          </div>
        </div>

        {/* Negative Sentiment */}
        <div className="p-5 rounded-2xl bg-surface-card border border-surface-border relative overflow-hidden hover:border-slate-300 dark:hover:border-slate-700 transition-all shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Negative Sentiment</span>
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-600 dark:text-rose-400">
              <ThumbsDown className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold text-rose-600 dark:text-rose-400 tracking-tight">{sentiment.negative}</span>
            <span className="text-xs text-rose-600/80 dark:text-rose-400/80 font-medium">({sentiment.negativePct}%)</span>
          </div>
          <div className="mt-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div className="bg-rose-500 h-1.5 rounded-full" style={{ width: `${sentiment.negativePct}%` }} />
          </div>
        </div>

        {/* Neutral Sentiment */}
        <div className="p-5 rounded-2xl bg-surface-card border border-surface-border relative overflow-hidden hover:border-slate-300 dark:hover:border-slate-700 transition-all shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Neutral Sentiment</span>
            <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-500/10 border border-slate-200 dark:border-slate-500/20 flex items-center justify-center text-slate-600 dark:text-slate-300">
              <Minus className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold text-slate-800 dark:text-slate-200 tracking-tight">{sentiment.neutral}</span>
            <span className="text-xs text-slate-500 dark:text-slate-400">({sentiment.neutralPct}%)</span>
          </div>
          <div className="mt-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div className="bg-slate-400 h-1.5 rounded-full" style={{ width: `${sentiment.neutralPct}%` }} />
          </div>
        </div>
      </div>

      {/* Charts Section: Sentiment Over Time & Topic Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sentiment Trend Area Chart */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-surface-card border border-surface-border shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white tracking-tight">Sentiment Trajectory Over Time</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Monthly evolution across positive, negative, and neutral feedback</p>
            </div>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-surface border border-slate-200 dark:border-surface-border text-slate-700 dark:text-slate-300">
              4 Months
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyTrends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorPos" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorNeg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F43F5E" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#F43F5E" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#1F2E47' : '#E2E8F0'} vertical={false} />
                <XAxis dataKey="month" stroke={isDark ? '#64748B' : '#94A3B8'} fontSize={11} tickLine={false} />
                <YAxis stroke={isDark ? '#64748B' : '#94A3B8'} fontSize={11} tickLine={false} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: isDark ? '#111827' : '#FFFFFF', 
                    borderColor: isDark ? '#1F2E47' : '#E2E8F0', 
                    borderRadius: '0.75rem', 
                    fontSize: '12px',
                    color: isDark ? '#F8FAFC' : '#0F172A',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }} 
                  itemStyle={{ color: isDark ? '#F8FAFC' : '#0F172A' }}
                />
                <Area type="monotone" dataKey="positive" name="Positive" stroke="#10B981" strokeWidth={2} fillOpacity={1} fill="url(#colorPos)" />
                <Area type="monotone" dataKey="negative" name="Negative" stroke="#F43F5E" strokeWidth={2} fillOpacity={1} fill="url(#colorNeg)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Feedback Topic Distribution (Pie Chart) */}
        <div className="p-6 rounded-2xl bg-surface-card border border-surface-border flex flex-col justify-between shadow-sm">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white tracking-tight">Feedback by Topic</h3>
              <Layers className="w-4 h-4 text-slate-500 dark:text-slate-400" />
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Volume grouped by functional domain</p>
          </div>

          <div className="h-56 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={topics}
                  dataKey="count"
                  nameKey="topic"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={4}
                >
                  {topics.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={TOPIC_COLORS[entry.topic] || DEFAULT_TOPIC_COLORS[index % DEFAULT_TOPIC_COLORS.length]} 
                    />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: isDark ? '#111827' : '#FFFFFF', 
                    borderColor: isDark ? '#1F2E47' : '#E2E8F0', 
                    borderRadius: '0.75rem', 
                    fontSize: '12px',
                    color: isDark ? '#F8FAFC' : '#0F172A',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }} 
                  itemStyle={{ color: isDark ? '#F8FAFC' : '#0F172A' }}
                />
                <Legend 
                  verticalAlign="bottom" 
                  height={36} 
                  iconSize={8}
                  formatter={(val) => <span className="text-[11px] text-slate-600 dark:text-slate-300 capitalize">{val}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Top Customer Complaints & Top Feature Requests */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Complaints */}
        <div className="p-6 rounded-2xl bg-surface-card border border-surface-border shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-rose-500/10 flex items-center justify-center text-rose-600 dark:text-rose-400">
                <AlertTriangle className="w-3.5 h-3.5" />
              </div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white tracking-tight">Top Customer Complaints</h3>
            </div>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-mono">Ranked by Severity</span>
          </div>

          <div className="space-y-3">
            {topComplaints.map((item, idx) => (
              <div key={idx} className="p-3 rounded-xl bg-slate-50/70 dark:bg-surface/60 border border-slate-200 dark:border-surface-border/60 flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">{item.problem}</span>
                    <UrgencyBadge urgency={item.urgency} size="xs" />
                  </div>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 capitalize mt-0.5 block">Topic: {item.topic}</span>
                </div>
                <span className="text-xs font-mono font-semibold text-rose-600 dark:text-rose-400 px-2 py-1 rounded bg-rose-500/10 border border-rose-500/20 shrink-0">
                  {item.count} reports
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Top Feature Requests */}
        <div className="p-6 rounded-2xl bg-surface-card border border-surface-border shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-indigo-500/10 flex items-center justify-center text-brand-primary">
                <Lightbulb className="w-3.5 h-3.5" />
              </div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white tracking-tight">Most Requested Features</h3>
            </div>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-mono">Demand Frequency</span>
          </div>

          <div className="space-y-3">
            {topFeatureRequests.map((item, idx) => (
              <div key={idx} className="p-3 rounded-xl bg-slate-50/70 dark:bg-surface/60 border border-slate-200 dark:border-surface-border/60 flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block truncate">{item.feature}</span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 capitalize mt-0.5 block">Topic: {item.topic}</span>
                </div>
                <span className="text-xs font-mono font-semibold text-purple-600 dark:text-brand-accent px-2 py-1 rounded bg-purple-500/10 border border-purple-500/20 shrink-0">
                  {item.count} requests
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Feedback Activity */}
      <div className="p-6 rounded-2xl bg-surface-card border border-surface-border shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white tracking-tight">Recent Feedback Activity</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Latest customer submissions across all connected sources</p>
          </div>
          <button
            onClick={onNavigateToInbox}
            className="text-xs text-brand-primary hover:text-indigo-500 dark:hover:text-indigo-300 font-medium flex items-center gap-1 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-primary"
          >
            View all inbox ({total}) <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-surface-border/60">
          {recentActivity.map((item) => (
            <div 
              key={item.feedback_id}
              onClick={() => onSelectFeedback(item)}
              className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-surface/50 px-3 rounded-xl transition-colors cursor-pointer group"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-semibold text-slate-900 dark:text-white group-hover:text-brand-primary transition-colors">
                    {item.customer_id}
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-surface border border-slate-200 dark:border-surface-border text-slate-600 dark:text-slate-400">
                    {item.source}
                  </span>
                  <SentimentBadge sentiment={item.sentiment} size="xs" />
                  <UrgencyBadge urgency={item.urgency} size="xs" />
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-1">
                  {item.feedback}
                </p>
              </div>

              <div className="flex items-center gap-3 shrink-0 text-xs text-slate-500 dark:text-slate-400">
                <span className="font-mono text-[11px]">{item.date}</span>
                <span className="text-[11px] px-2 py-0.5 rounded bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 font-medium">
                  ★ {item.rating != null ? Number(item.rating).toFixed(1) : '—'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
