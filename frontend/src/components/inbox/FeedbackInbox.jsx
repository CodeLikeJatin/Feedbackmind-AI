import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  RotateCcw, 
  Star, 
  ExternalLink, 
  Download,
  Upload,
  Calendar,
  CheckCircle2,
  Brain,
  Sparkles,
  Clock,
  AlertCircle,
  Zap
} from 'lucide-react';
import SentimentBadge from '../common/SentimentBadge';
import UrgencyBadge from '../common/UrgencyBadge';
import Modal from '../common/Modal';
import { triggerBatchAnalysis, analyzeSingleRecord } from '../../services/api';

export default function FeedbackInbox({ 
  items = [], 
  onRefresh, 
  onSeedDemo,
  onOpenUpload,
  companyId = 'demo-company'
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sentimentFilter, setSentimentFilter] = useState('all');
  const [topicFilter, setTopicFilter] = useState('all');
  const [urgencyFilter, setUrgencyFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [selectedItem, setSelectedItem] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisNotice, setAnalysisNotice] = useState(null);

  const pendingItems = useMemo(() => {
    return items.filter(i => i.analysis_status === 'pending');
  }, [items]);

  // Client-side filtering for immediate snappy response
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchText = (item.feedback || '').toLowerCase().includes(q);
        const matchCust = (item.customer_id || '').toLowerCase().includes(q);
        const matchProb = (item.customer_problem || '').toLowerCase().includes(q);
        const matchId = (item.feedback_id || '').toLowerCase().includes(q);
        if (!matchText && !matchCust && !matchProb && !matchId) return false;
      }
      if (sentimentFilter !== 'all' && item.sentiment !== sentimentFilter) return false;
      if (topicFilter !== 'all' && item.topic !== topicFilter) return false;
      if (urgencyFilter !== 'all' && item.urgency !== urgencyFilter) return false;
      if (sourceFilter !== 'all' && item.source !== sourceFilter) return false;
      return true;
    });
  }, [items, searchTerm, sentimentFilter, topicFilter, urgencyFilter, sourceFilter]);

  const uniqueTopics = useMemo(() => {
    const s = new Set();
    items.forEach(i => i.topic && s.add(i.topic));
    return Array.from(s);
  }, [items]);

  const uniqueSources = useMemo(() => {
    const s = new Set();
    items.forEach(i => i.source && s.add(i.source));
    return Array.from(s);
  }, [items]);

  const resetFilters = () => {
    setSearchTerm('');
    setSentimentFilter('all');
    setTopicFilter('all');
    setUrgencyFilter('all');
    setSourceFilter('all');
  };

  const handleBatchAnalysis = async () => {
    setIsAnalyzing(true);
    setAnalysisNotice(null);
    try {
      const res = await triggerBatchAnalysis(companyId, 10);
      setAnalysisNotice(`Analyzed ${res.analyzed} record(s) with Groq LLM.`);
      if (onRefresh) onRefresh();
      setTimeout(() => setAnalysisNotice(null), 3500);
    } catch (err) {
      setAnalysisNotice(`Analysis error: ${err.message}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSingleAnalysis = async (recordId) => {
    setIsAnalyzing(true);
    try {
      const updated = await analyzeSingleRecord(recordId);
      setSelectedItem(prev => ({ ...prev, ...updated, analysis_status: 'analyzed' }));
      if (onRefresh) onRefresh();
    } catch (err) {
      alert(`Analysis failed: ${err.message}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const hasActiveFilters = searchTerm !== '' || sentimentFilter !== 'all' || topicFilter !== 'all' || urgencyFilter !== 'all' || sourceFilter !== 'all';

  return (
    <div className="space-y-4">
      {/* Search and Action Toolbar */}
      <div className="p-4 rounded-2xl bg-surface-card border border-surface-border flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between shadow-2xs">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search feedback text, customer problem, ID..."
            className="w-full pl-10 pr-8 py-2 bg-white dark:bg-surface border border-slate-300 dark:border-surface-border rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-primary"
          />
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-white"
            >
              ×
            </button>
          )}
        </div>

        {/* Filter dropdowns and Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Sentiment Filter */}
          <select
            value={sentimentFilter}
            onChange={(e) => setSentimentFilter(e.target.value)}
            className="px-3 py-2 bg-white dark:bg-surface border border-slate-300 dark:border-surface-border rounded-xl text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-primary capitalize cursor-pointer hover:border-slate-400 dark:hover:border-slate-600 transition-colors"
          >
            <option value="all">All Sentiments</option>
            <option value="positive">Positive</option>
            <option value="negative">Negative</option>
            <option value="neutral">Neutral</option>
          </select>

          {/* Topic Filter */}
          <select
            value={topicFilter}
            onChange={(e) => setTopicFilter(e.target.value)}
            className="px-3 py-2 bg-white dark:bg-surface border border-slate-300 dark:border-surface-border rounded-xl text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-primary capitalize cursor-pointer hover:border-slate-400 dark:hover:border-slate-600 transition-colors"
          >
            <option value="all">All Topics</option>
            {uniqueTopics.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>

          {/* Urgency Filter */}
          <select
            value={urgencyFilter}
            onChange={(e) => setUrgencyFilter(e.target.value)}
            className="px-3 py-2 bg-white dark:bg-surface border border-slate-300 dark:border-surface-border rounded-xl text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-primary capitalize cursor-pointer hover:border-slate-400 dark:hover:border-slate-600 transition-colors"
          >
            <option value="all">All Urgency</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          {/* Source Filter */}
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="px-3 py-2 bg-white dark:bg-surface border border-slate-300 dark:border-surface-border rounded-xl text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-primary capitalize cursor-pointer hover:border-slate-400 dark:hover:border-slate-600 transition-colors"
          >
            <option value="all">All Sources</option>
            {uniqueSources.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-300 dark:border-slate-700 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-primary"
              title="Reset all filters"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Batch Analysis Button for pending items */}
          {pendingItems.length > 0 && (
            <button
              onClick={handleBatchAnalysis}
              disabled={isAnalyzing}
              className="px-3 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:opacity-95 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-purple-600/25 transition-all shrink-0 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-brand-accent"
              title="Run Groq AI synthesis on all pending imported records"
            >
              <Sparkles className={`w-3.5 h-3.5 ${isAnalyzing ? 'animate-spin' : ''}`} />
              {isAnalyzing ? 'Analyzing...' : `Analyze Pending (${pendingItems.length})`}
            </button>
          )}

          <button
            onClick={onOpenUpload}
            className="px-3 py-2 rounded-xl bg-brand-primary hover:bg-indigo-600 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm shadow-indigo-600/30 transition-all shrink-0 focus:outline-none focus:ring-2 focus:ring-brand-primary"
          >
            <Upload className="w-3.5 h-3.5" />
            Upload CSV
          </button>
        </div>
      </div>

      {/* Analysis notice alert */}
      {analysisNotice && (
        <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-700/30 text-indigo-800 dark:text-indigo-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-brand-primary shrink-0" />
            <span>{analysisNotice}</span>
          </div>
          <button onClick={() => setAnalysisNotice(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white">×</button>
        </div>
      )}

      {/* Result Count and Quick Stats */}
      <div className="flex items-center justify-between px-1 text-xs text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-3">
          <span>
            Showing <strong className="text-slate-900 dark:text-white font-semibold">{filteredItems.length}</strong> of {items.length} feedback items
          </span>
          {pendingItems.length > 0 && (
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20">
              {pendingItems.length} awaiting Groq synthesis
            </span>
          )}
        </div>
        <span className="text-[11px] font-mono hidden sm:inline">
          Click any row for full AI synthesis breakdown
        </span>
      </div>

      {/* Feedback Items Table/List */}
      {filteredItems.length === 0 ? (
        <div className="p-12 rounded-2xl bg-surface-card border border-surface-border text-center shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-brand-primary mx-auto flex items-center justify-center mb-4">
            <Filter className="w-6 h-6" />
          </div>
          <h4 className="text-base font-semibold text-slate-900 dark:text-white">No feedback matches your filter</h4>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 max-w-sm mx-auto">
            Try adjusting your search keywords, clear active topic/sentiment filters, or reset to view all items.
          </p>
          <div className="mt-4 flex justify-center gap-2">
            <button
              onClick={resetFilters}
              className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-surface border border-slate-300 dark:border-surface-border text-xs text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              Clear Filters
            </button>
            <button
              onClick={onSeedDemo}
              className="px-3.5 py-2 rounded-xl bg-brand-primary text-xs font-medium text-white hover:bg-indigo-600 transition-colors"
            >
              Re-seed Demo Data
            </button>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl bg-surface-card border border-surface-border overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-surface-border bg-slate-50/90 dark:bg-surface/90 text-[11px] font-mono text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Source</th>
                  <th className="py-3 px-4">Feedback & AI Summary</th>
                  <th className="py-3 px-4">Status / Sentiment</th>
                  <th className="py-3 px-4">Topic</th>
                  <th className="py-3 px-4">Urgency</th>
                  <th className="py-3 px-4 text-right">Rating</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-surface-border/50 text-xs">
                {filteredItems.map((item) => (
                  <tr
                    key={item.feedback_id}
                    onClick={() => setSelectedItem(item)}
                    className="hover:bg-slate-50/80 dark:hover:bg-surface/60 transition-colors cursor-pointer group"
                  >
                    <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      {item.date}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-white whitespace-nowrap group-hover:text-brand-primary transition-colors">
                      {item.customer_id}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-surface border border-slate-200 dark:border-surface-border text-[11px] font-mono text-slate-700 dark:text-slate-300">
                        {item.source}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 max-w-md">
                      <p className="text-slate-800 dark:text-slate-200 font-medium line-clamp-1">{item.feedback}</p>
                      {item.customer_problem ? (
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5 flex items-center gap-1">
                          <span className="text-rose-600 dark:text-rose-400 font-medium shrink-0">Problem:</span> {item.customer_problem}
                        </p>
                      ) : item.summary ? (
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                          {item.summary}
                        </p>
                      ) : null}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {item.analysis_status === 'pending' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30">
                          <Clock className="w-3 h-3" /> Pending
                        </span>
                      ) : (
                        <SentimentBadge sentiment={item.sentiment} size="xs" />
                      )}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="capitalize font-mono text-[11px] text-slate-700 dark:text-slate-300">
                        {item.topic || '—'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {item.urgency ? (
                        <UrgencyBadge urgency={item.urgency} size="xs" />
                      ) : (
                        <span className="text-slate-400 text-[11px] font-mono">—</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap font-mono text-slate-700 dark:text-slate-300">
                      ★ {item.rating != null ? Number(item.rating).toFixed(1) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Detailed Feedback Inspector Modal */}
      <Modal
        isOpen={Boolean(selectedItem)}
        onClose={() => setSelectedItem(null)}
        title={selectedItem ? `Feedback Detail — ${selectedItem.feedback_id}` : ''}
      >
        {selectedItem && (
          <div className="space-y-5 text-xs">
            {/* Meta attributes */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 rounded-xl bg-slate-50 dark:bg-surface/80 border border-slate-200 dark:border-surface-border">
              <div>
                <span className="text-slate-500 dark:text-slate-400 block text-[10px] font-mono uppercase">Customer</span>
                <span className="font-semibold text-slate-900 dark:text-white mt-0.5 block">{selectedItem.customer_id}</span>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400 block text-[10px] font-mono uppercase">Date</span>
                <span className="font-mono text-slate-700 dark:text-slate-200 mt-0.5 block">{selectedItem.date}</span>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400 block text-[10px] font-mono uppercase">Source</span>
                <span className="text-slate-700 dark:text-slate-200 mt-0.5 block">{selectedItem.source}</span>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400 block text-[10px] font-mono uppercase">Rating</span>
                <span className="font-semibold text-amber-500 dark:text-amber-400 mt-0.5 block">
                  ★ {selectedItem.rating != null ? Number(selectedItem.rating).toFixed(1) : '—'} / 5
                </span>
              </div>
            </div>

            {/* Original Customer Voice */}
            <div className="p-4 rounded-xl bg-slate-50/70 dark:bg-surface/40 border border-slate-200 dark:border-surface-border/80">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-2 font-mono">
                Original Customer Feedback
              </span>
              <p className="text-sm text-slate-800 dark:text-slate-100 italic leading-relaxed">
                "{selectedItem.feedback}"
              </p>
            </div>

            {/* AI Synthesized Attributes or Pending Banner */}
            {selectedItem.analysis_status === 'pending' ? (
              <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-amber-800 dark:text-amber-300 block flex items-center gap-1.5">
                    <Clock className="w-4 h-4" /> Awaiting AI Analysis
                  </span>
                  <p className="text-[11px] text-amber-700 dark:text-amber-200/80 mt-0.5">
                    This imported record has not been analyzed by Groq LLM yet.
                  </p>
                </div>
                <button
                  onClick={() => handleSingleAnalysis(selectedItem.id || selectedItem.feedback_id)}
                  disabled={isAnalyzing}
                  className="px-3.5 py-1.5 rounded-xl bg-brand-primary hover:bg-indigo-600 text-white font-semibold text-xs shadow-md shadow-indigo-600/20 transition-all flex items-center gap-1.5 shrink-0 focus:outline-none focus:ring-2 focus:ring-brand-primary"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  {isAnalyzing ? 'Analyzing...' : 'Analyze Now'}
                </button>
              </div>
            ) : (
              <div className="space-y-3 p-4 rounded-xl bg-surface-card border border-brand-primary/30 relative">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-surface-border">
                  <span className="text-xs font-semibold text-brand-primary flex items-center gap-1.5">
                    <Brain className="w-3.5 h-3.5" />
                    Groq LLM Synthesis
                  </span>
                  <div className="flex items-center gap-2">
                    <SentimentBadge sentiment={selectedItem.sentiment} size="xs" />
                    <UrgencyBadge urgency={selectedItem.urgency} size="xs" />
                  </div>
                </div>

                {selectedItem.customer_problem && (
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 font-mono text-[10px] uppercase block">Customer Problem</span>
                    <p className="text-xs text-rose-600 dark:text-rose-300 font-medium mt-0.5">{selectedItem.customer_problem}</p>
                  </div>
                )}

                {selectedItem.feature_request && (
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 font-mono text-[10px] uppercase block">Feature Request</span>
                    <p className="text-xs text-indigo-600 dark:text-indigo-300 font-medium mt-0.5">{selectedItem.feature_request}</p>
                  </div>
                )}

                {selectedItem.summary && (
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 font-mono text-[10px] uppercase block">Executive Summary</span>
                    <p className="text-xs text-slate-700 dark:text-slate-200 mt-0.5">{selectedItem.summary}</p>
                  </div>
                )}

                {selectedItem.suggested_action && (
                  <div className="p-3 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-700/30">
                    <span className="text-indigo-900 dark:text-indigo-300 font-semibold block text-[11px]">Recommended Engineering Action</span>
                    <p className="text-xs text-indigo-800 dark:text-indigo-200 mt-0.5">{selectedItem.suggested_action}</p>
                  </div>
                )}
              </div>
            )}

            {/* Hindsight Long-term Memory Status */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-surface/50 border border-slate-200 dark:border-surface-border text-xs">
              <div className="flex items-center gap-2">
                <Brain className="w-4 h-4 text-brand-accent" />
                <span className="text-slate-700 dark:text-slate-300">Hindsight Long-Term Memory Bank:</span>
                <code className="text-indigo-600 dark:text-indigo-400 text-[11px]">feedbackmind-demo</code>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold flex items-center gap-1 ${
                selectedItem.retained_in_hindsight || selectedItem.analysis_status === 'analyzed'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20'
                  : 'bg-slate-100 text-slate-600 border border-slate-300 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
              }`}>
                <CheckCircle2 className="w-3 h-3" /> {selectedItem.retained_in_hindsight ? 'Retained' : 'Queued'}
              </span>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
