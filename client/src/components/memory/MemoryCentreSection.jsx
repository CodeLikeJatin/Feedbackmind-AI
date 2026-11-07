import React, { useState, useEffect } from 'react';
import { 
  Brain, 
  Database, 
  ShieldCheck, 
  Zap, 
  Search, 
  Clock, 
  Layers, 
  ArrowRight, 
  CheckCircle2, 
  RefreshCw,
  Sparkles,
  AlertCircle,
  FileText,
  Play
} from 'lucide-react';
import { 
  fetchMemoryOverview, 
  fetchMemoryList, 
  triggerRetainBatch, 
  performMemoryRecall, 
  performMemoryReflect 
} from '../../services/api';

export default function MemoryCentreSection({ 
  memoryEnabled, 
  onToggleMemory, 
  companyId = 'demo-company' 
}) {
  const [overview, setOverview] = useState(null);
  const [memories, setMemories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Recall playground state
  const [recallQuery, setRecallQuery] = useState('What were the biggest customer performance complaints?');
  const [recallResults, setRecallResults] = useState(null);
  const [isRecalling, setIsRecalling] = useState(false);
  const [recallError, setRecallError] = useState(null);

  // Reflect playground state
  const [reflectQuery, setReflectQuery] = useState('Did our performance improvements appear to solve the core customer problem?');
  const [reflectResult, setReflectResult] = useState(null);
  const [isReflecting, setIsReflecting] = useState(false);
  const [reflectError, setReflectError] = useState(null);

  // Batch retain state
  const [isRetaining, setIsRetaining] = useState(false);
  const [retainNotice, setRetainNotice] = useState(null);

  const loadMemoryData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [overviewData, listData] = await Promise.all([
        fetchMemoryOverview(companyId).catch(() => ({
          configured: false,
          serviceOnline: false,
          bankId: 'feedbackmind-demo',
          totalFeedback: 0,
          retainedFeedback: 0
        })),
        fetchMemoryList(companyId).catch(() => ({ total: 0, items: [] }))
      ]);
      setOverview(overviewData);
      setMemories(listData.items || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMemoryData();
  }, [companyId]);

  const handleRunRecall = async (e) => {
    e?.preventDefault();
    if (!recallQuery.trim()) return;
    setIsRecalling(true);
    setRecallError(null);
    setRecallResults(null);

    try {
      const result = await performMemoryRecall(recallQuery, companyId);
      setRecallResults(result);
    } catch (err) {
      setRecallError(err.message);
    } finally {
      setIsRecalling(false);
    }
  };

  const handleRunReflect = async (e) => {
    e?.preventDefault();
    if (!reflectQuery.trim()) return;
    setIsReflecting(true);
    setReflectError(null);
    setReflectResult(null);

    try {
      const result = await performMemoryReflect(reflectQuery, 'Customer feedback pattern discovery', companyId);
      setReflectResult(result);
    } catch (err) {
      setReflectError(err.message);
    } finally {
      setIsReflecting(false);
    }
  };

  const handleRetainBatch = async () => {
    setIsRetaining(true);
    setRetainNotice(null);
    try {
      const res = await triggerRetainBatch(companyId);
      setRetainNotice(`Retained ${res.retained} feedback memories to Hindsight Cloud bank.`);
      await loadMemoryData();
      setTimeout(() => setRetainNotice(null), 4000);
    } catch (err) {
      setRetainNotice(`Retain error: ${err.message}`);
    } finally {
      setIsRetaining(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Memory Bank Status Header */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-purple-50 via-white to-purple-50/50 dark:from-[#17172E] dark:via-surface-card dark:to-[#121B2F] border border-purple-200 dark:border-brand-accent/30 relative overflow-hidden shadow-2xs">
        <div className="absolute right-0 top-0 w-80 h-80 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-100 text-purple-800 dark:bg-purple-500/20 dark:border-purple-500/30 dark:text-purple-300 border border-purple-200 text-xs font-semibold mb-2">
              <Brain className="w-4 h-4 text-brand-accent" /> Hindsight Long-Term Memory
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              Memory Centre & Cognitive Architecture
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 max-w-2xl leading-relaxed">
              True episodic and longitudinal memory bank. FeedbackMind stores customer signals across months, surfaces historical patterns, and prevents AI amnesia.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={onToggleMemory}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg transition-all focus:outline-none focus:ring-2 focus:ring-brand-accent ${
                memoryEnabled
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-purple-600/25 border border-purple-400/40'
                  : 'bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-300 dark:bg-surface dark:border-slate-700 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              <Zap className="w-4 h-4" />
              Memory Retrieval: {memoryEnabled ? 'ENABLED' : 'DISABLED'}
            </button>
          </div>
        </div>
      </div>

      {/* Retain Notice Alert */}
      {retainNotice && (
        <div className="p-3.5 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-700/30 text-purple-900 dark:text-purple-200 text-xs flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-brand-accent shrink-0" />
            <span>{retainNotice}</span>
          </div>
          <button onClick={() => setRetainNotice(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white">×</button>
        </div>
      )}

      {/* 3 Core Pillars of Hindsight (Retain, Recall, Reflect) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Retain Card */}
        <div className="p-5 rounded-2xl bg-surface-card border border-surface-border flex flex-col justify-between shadow-2xs hover:border-slate-300 dark:hover:border-slate-600 transition-colors">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-brand-primary">
                <Database className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/20 font-semibold">
                1. RETAIN
              </span>
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">Persistent Episodic Storage</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Stores customer problem, sentiment, product area, and release milestones in dedicated company memory bank.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-200 dark:border-surface-border text-xs flex items-center justify-between">
            <span className="text-slate-500 dark:text-slate-400">Retained in Bank:</span>
            <span className="text-slate-900 dark:text-white font-mono font-bold">{memories.length} records</span>
          </div>
        </div>

        {/* Recall Card */}
        <div className="p-5 rounded-2xl bg-surface-card border border-surface-border flex flex-col justify-between shadow-2xs hover:border-slate-300 dark:hover:border-slate-600 transition-colors">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-brand-accent">
                <Search className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:text-purple-300 border border-purple-200 dark:border-purple-500/20 font-semibold">
                2. RECALL
              </span>
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">Contextual Semantic Search</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Retrieves relevant historical voice when answering questions. Suppresses irrelevant data and dates.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-200 dark:border-surface-border text-xs flex items-center justify-between">
            <span className="text-slate-500 dark:text-slate-400">Search Strategy:</span>
            <span className="text-purple-700 dark:text-brand-accent font-mono font-bold">Hybrid Semantic Index</span>
          </div>
        </div>

        {/* Reflect Card */}
        <div className="p-5 rounded-2xl bg-surface-card border border-surface-border flex flex-col justify-between shadow-2xs hover:border-slate-300 dark:hover:border-slate-600 transition-colors">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <Sparkles className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/20 font-semibold">
                3. REFLECT
              </span>
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">Longitudinal Patterns</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Discovers patterns across months: sentiment shifts, recurring complaints, and whether releases solved problems.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-200 dark:border-surface-border text-xs flex items-center justify-between">
            <span className="text-slate-500 dark:text-slate-400">Trend Horizon:</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-mono font-bold">4-Month Longitudinal</span>
          </div>
        </div>
      </div>

      {/* Workspace Isolation Callout */}
      <div className="p-4 rounded-xl bg-surface-card border border-surface-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <span className="font-semibold text-slate-900 dark:text-white block">Dedicated Company Bank Isolation</span>
            <span className="text-slate-500 dark:text-slate-400 text-[11px]">
              Active workspace bank: <code className="text-indigo-600 dark:text-indigo-300 font-mono">{overview?.bankId || 'feedbackmind-demo'}</code> (Workspace boundary enforced).
            </span>
          </div>
        </div>
        <button
          onClick={handleRetainBatch}
          disabled={isRetaining}
          className="px-3.5 py-1.5 rounded-xl bg-brand-primary hover:bg-indigo-600 text-white font-semibold text-xs shadow-md shadow-indigo-600/20 transition-all flex items-center gap-1.5 shrink-0 self-start sm:self-auto disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-brand-primary cursor-pointer"
        >
          <Database className="w-3.5 h-3.5" />
          {isRetaining ? 'Retaining...' : 'Retain Pending Records'}
        </button>
      </div>

      {/* Memory ON vs Memory OFF Comparative Analysis Card */}
      <div className="p-6 rounded-2xl bg-surface-card border border-surface-border shadow-2xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white tracking-tight">Why Long-Term Memory Matters</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Empirical difference between localized guessing vs. memory-informed synthesis</p>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:text-purple-300 border border-purple-200 dark:border-purple-500/20 uppercase font-semibold">
            Core Capability
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {/* Memory OFF */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-surface/60 border border-slate-200 dark:border-slate-700/60">
            <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-200 dark:border-surface-border">
              <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-slate-400" />
                WITHOUT MEMORY (Memory OFF)
              </span>
              <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">Current Scope Only</span>
            </div>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed mb-3">
              The AI only evaluates current-period feedback. When asked <em>"Did our performance improvements help?"</em>, it replies:
            </p>
            <div className="p-3 rounded-lg bg-white dark:bg-surface-card text-slate-600 dark:text-slate-400 italic text-[11px] border border-slate-200 dark:border-surface-border">
              "Current feedback mentions authentication timeouts and Google OAuth 500 errors. There are no performance complaints in recent tickets, so I cannot determine if performance improved or what caused the change."
            </div>
            <div className="mt-3 text-[11px] text-rose-600 dark:text-rose-400 font-medium">
              ❌ Suffers from conversational amnesia. Cannot correlate current state with historical releases.
            </div>
          </div>

          {/* Memory ON */}
          <div className="p-4 rounded-xl bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-500/40">
            <div className="flex items-center justify-between mb-2 pb-2 border-b border-purple-200 dark:border-purple-500/30">
              <span className="font-bold text-purple-900 dark:text-purple-300 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-brand-accent animate-pulse" />
                WITH HINDSIGHT MEMORY (Memory ON)
              </span>
              <span className="text-[10px] font-mono text-purple-700 dark:text-purple-300 font-semibold">Episodic Recall Active</span>
            </div>
            <p className="text-slate-700 dark:text-slate-300 leading-relaxed mb-3">
              Hindsight recalls past months (Month 1/2 performance lag, Month 3 v2.4 speed update), enabling true synthesis:
            </p>
            <div className="p-3 rounded-lg bg-white dark:bg-surface-card text-purple-900 dark:text-purple-200 italic text-[11px] border border-purple-200 dark:border-purple-500/30">
              "Recalled 9 historical memories from Months 1-2 reporting 15s dashboard lag and mobile Safari freezing. Following v2.4 update in Month 3, customer sentiment rebounded from 25% to 100% positive, with verified load times dropping under 2s. The decline suggests the performance experience improved significantly after the release. Current priority should pivot to Month 4 login timeouts."
            </div>
            <div className="mt-3 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
              ✓ Grounded in real historical memories. Surfaces evidence-backed product recommendations.
            </div>
          </div>
        </div>
      </div>

      {/* Interactive RECALL Testing Playground */}
      <div className="p-6 rounded-2xl bg-surface-card border border-surface-border shadow-2xs">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <Search className="w-4 h-4 text-brand-primary" />
              Live Memory Recall Playground
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Test semantic retrieval against Hindsight Cloud</p>
          </div>
          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-surface border border-slate-200 dark:border-surface-border text-slate-700 dark:text-slate-300">
            RECALL API
          </span>
        </div>

        <form onSubmit={handleRunRecall} className="flex gap-2 mb-4">
          <input
            type="text"
            value={recallQuery}
            onChange={(e) => setRecallQuery(e.target.value)}
            placeholder="Enter a semantic query to test memory recall..."
            className="flex-1 bg-white dark:bg-surface border border-slate-300 dark:border-surface-border rounded-xl px-4 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-brand-primary"
          />
          <button
            type="submit"
            disabled={isRecalling || !recallQuery.trim()}
            className="px-4 py-2 rounded-xl bg-brand-primary hover:bg-indigo-600 disabled:opacity-50 text-white font-semibold text-xs flex items-center gap-1.5 shadow-md shadow-indigo-600/20 transition-all shrink-0 focus:outline-none focus:ring-2 focus:ring-brand-primary"
          >
            {isRecalling ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
            {isRecalling ? 'Recalling...' : 'Run Recall'}
          </button>
        </form>

        {recallError && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2 mb-3">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{recallError}</span>
          </div>
        )}

        {recallResults && (
          <div className="space-y-2 mt-3 pt-3 border-t border-slate-200 dark:border-surface-border text-xs">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-[11px]">
              <span>Recalled {recallResults.total} relevant memories</span>
              <span className="font-mono">Bank: {recallResults.bankId}</span>
            </div>
            {recallResults.results.map((r, i) => (
              <div key={i} className="p-3 rounded-xl bg-slate-50 dark:bg-surface/70 border border-slate-200 dark:border-surface-border">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono text-[10px] text-purple-600 dark:text-purple-400 font-semibold">{r.id}</span>
                  {r.occurred_start && <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">{r.occurred_start}</span>}
                </div>
                <p className="text-slate-800 dark:text-slate-200 text-xs">{r.text}</p>
                {r.entities && r.entities.length > 0 && (
                  <div className="mt-1.5 flex gap-1 font-mono text-[10px]">
                    {r.entities.map((ent, ei) => (
                      <span key={ei} className="px-1.5 py-0.2 rounded bg-white dark:bg-surface border border-slate-200 dark:border-surface-border text-indigo-700 dark:text-indigo-300">
                        {ent}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Retained Memories Explorer Table */}
      <div className="p-6 rounded-2xl bg-surface-card border border-surface-border shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white tracking-tight">Active Hindsight Memory Bank Records</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Retained episodic feedback objects ready for recall queries</p>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500 dark:text-slate-400">Total Retained:</span>
            <span className="font-mono font-semibold text-slate-900 dark:text-white px-2 py-0.5 rounded bg-slate-100 dark:bg-surface border border-slate-200 dark:border-surface-border">
              {memories.length}
            </span>
          </div>
        </div>

        {memories.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500 dark:text-slate-400">
            No memories retained in this bank yet. Click "Retain Pending Records" above or seed the demo dataset.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-surface-border/60">
            {memories.map((item) => (
              <div key={item.feedback_id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-[11px] text-purple-600 dark:text-purple-400 font-medium">{item.hindsight_memory_id || `mem_${item.feedback_id}`}</span>
                    <span className="text-slate-500 dark:text-slate-400 font-mono text-[11px]">• {item.date}</span>
                    <span className="px-1.5 py-0.2 rounded bg-slate-100 dark:bg-surface border border-slate-200 dark:border-surface-border text-[10px] text-slate-700 dark:text-slate-300 capitalize">
                      {item.topic}
                    </span>
                    <span className="text-amber-500 dark:text-amber-400 text-[10px] font-mono">★ {item.rating}</span>
                  </div>
                  <p className="text-slate-800 dark:text-slate-200 line-clamp-1">{item.feedback}</p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20 text-[10px] font-mono">
                    Indexed in Cloud
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
