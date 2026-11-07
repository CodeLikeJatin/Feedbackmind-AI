import React, { useState, useEffect } from 'react';
import {
  fetchLearningCurveStatus,
  fetchLearningCurveCheckpoints,
  fetchLearningCurveInteractions,
  initializeLearningCurve,
  runLearningCurveBenchmark,
  resetLearningCurveEnvironment
} from '../../services/api';
import {
  Brain,
  Database,
  Layers,
  Sparkles,
  ArrowRight,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Star,
  ShieldCheck,
  Zap,
  ChevronDown,
  ChevronUp,
  Info,
  RotateCcw,
  Scale,
  Eye,
  Calendar,
  Tag,
  User,
  Sliders,
  Check,
  TrendingUp,
  Award,
  HelpCircle,
  FileText
} from 'lucide-react';

export default function LearningCurveSection({ onSelectFeedback }) {
  const [status, setStatus] = useState(null);
  const [checkpoints, setCheckpoints] = useState([]);
  const [interactions, setInteractions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [benchmarking, setBenchmarking] = useState(false);
  const [benchmarkResult, setBenchmarkResult] = useState(null);
  const [error, setError] = useState(null);
  const [selectedCheckpointIndex, setSelectedCheckpointIndex] = useState(2); // Default to checkpoint 20
  const [selectedInteraction, setSelectedInteraction] = useState(null);
  const [showResetModal, setShowResetModal] = useState(false);
  const [showAllInteractions, setShowAllInteractions] = useState(false);

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [st, cpRes, intRes] = await Promise.all([
        fetchLearningCurveStatus(),
        fetchLearningCurveCheckpoints(),
        fetchLearningCurveInteractions()
      ]);
      setStatus(st);
      if (cpRes && cpRes.checkpoints) {
        setCheckpoints(cpRes.checkpoints);
      }
      if (intRes && intRes.interactions) {
        setInteractions(intRes.interactions);
      }
    } catch (err) {
      console.error('Failed to load learning curve data:', err);
      setError(err.message || 'Failed to load learning curve data');
    } finally {
      setLoading(false);
    }
  };

  const handleInitialize = async () => {
    setInitializing(true);
    setError(null);
    try {
      await initializeLearningCurve(true);
      await loadAllData();
    } catch (err) {
      console.error('Failed to initialize learning curve:', err);
      setError(err.message || 'Failed to initialize learning curve scenario');
    } finally {
      setInitializing(false);
    }
  };

  const handleReset = async () => {
    setResetting(true);
    setError(null);
    try {
      await resetLearningCurveEnvironment();
      setShowResetModal(false);
      setBenchmarkResult(null);
      await loadAllData();
    } catch (err) {
      console.error('Failed to reset learning curve environment:', err);
      setError(err.message || 'Failed to reset learning curve environment');
    } finally {
      setResetting(false);
    }
  };

  const handleRunBenchmark = async () => {
    setBenchmarking(true);
    setError(null);
    try {
      const res = await runLearningCurveBenchmark({
        question: "Considering everything you have learned about this SaaS company, what are its recurring customer problems, which problems have been resolved, and what should the product team prioritize next?"
      });
      setBenchmarkResult(res);
    } catch (err) {
      console.error('Failed to run benchmark:', err);
      setError(err.message || 'Failed to run benchmark');
    } finally {
      setBenchmarking(false);
    }
  };

  const activeCheckpoint = checkpoints[selectedCheckpointIndex] || checkpoints[checkpoints.length - 1];

  const displayedInteractions = showAllInteractions 
    ? interactions 
    : interactions.slice(0, 8);

  return (
    <div className="space-y-8">
      {/* 1. Header Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-surface-card via-slate-50 dark:via-[#161F36] to-surface-card border border-surface-border relative overflow-hidden shadow-2xs">
        <div className="absolute right-0 top-0 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 dark:bg-purple-500/15 dark:border-purple-500/30 dark:text-purple-300 border border-purple-200 text-[11px] font-semibold">
                <Brain className="w-3.5 h-3.5" /> Longitudinal Memory Demonstration
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:border-blue-500/30 dark:text-blue-300 border border-blue-200 text-[11px] font-semibold">
                <Calendar className="w-3.5 h-3.5" /> Synthetic Demonstration Scenario (Aug 1 – Nov 6, 2026)
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:border-emerald-500/30 dark:text-emerald-300 border border-emerald-200 text-[11px] font-semibold">
                <ShieldCheck className="w-3.5 h-3.5" /> Isolated Cloud Bank: feedbackmind-learning-curve
              </span>
            </div>

            <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
              The Memory Learning Curve
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 max-w-3xl leading-relaxed">
              Witness how an AI agent evolves from narrow snapshot awareness to comprehensive strategic insight as it retains and recalls memories across 1, 5, and 20 customer interactions over time.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              onClick={() => setShowResetModal(true)}
              disabled={resetting || initializing || loading}
              className="px-3 py-2 rounded-xl bg-white dark:bg-[#0E1424] border border-slate-200 dark:border-surface-border text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
              title="Reset isolated learning curve environment"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Environment</span>
            </button>

            {(!status?.isInitialized || checkpoints.length === 0) && (
              <button
                onClick={handleInitialize}
                disabled={initializing || loading}
                className="px-3.5 py-2 rounded-xl bg-brand-primary hover:bg-brand-primary-hover text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${initializing ? 'animate-spin' : ''}`} />
                <span>{initializing ? 'Synthesizing...' : 'Initialize 20-Interaction Scenario'}</span>
              </button>
            )}

            <button
              onClick={handleRunBenchmark}
              disabled={benchmarking || loading || !status?.isInitialized}
              className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer disabled:opacity-50"
            >
              <Zap className={`w-3.5 h-3.5 ${benchmarking ? 'animate-spin text-amber-300' : ''}`} />
              <span>{benchmarking ? 'Evaluating Benchmark...' : 'Run Memory OFF vs ON'}</span>
            </button>
          </div>
        </div>

        {/* Live Architecture Info Bar */}
        <div className="mt-5 pt-4 border-t border-slate-200 dark:border-surface-border/80 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-surface/60 border border-slate-200 dark:border-surface-border text-slate-700 dark:text-slate-300">
            <Database className="w-4 h-4 text-indigo-500 shrink-0" />
            <div className="truncate">
              <span className="text-slate-500 dark:text-slate-400 block text-[10px] uppercase font-mono">Dataset Size</span>
              <span className="font-semibold text-slate-900 dark:text-white">{status?.storedRecordsCount ?? 0} Interactions</span>
            </div>
          </div>

          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-surface/60 border border-slate-200 dark:border-surface-border text-slate-700 dark:text-slate-300">
            <Brain className="w-4 h-4 text-purple-500 shrink-0" />
            <div className="truncate">
              <span className="text-slate-500 dark:text-slate-400 block text-[10px] uppercase font-mono">Hindsight Bank</span>
              <span className="font-semibold text-slate-900 dark:text-white">{status?.bankId || 'feedbackmind-learning-curve'}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-surface/60 border border-slate-200 dark:border-surface-border text-slate-700 dark:text-slate-300">
            <Layers className="w-4 h-4 text-emerald-500 shrink-0" />
            <div className="truncate">
              <span className="text-slate-500 dark:text-slate-400 block text-[10px] uppercase font-mono">Checkpoints</span>
              <span className="font-semibold text-slate-900 dark:text-white">{checkpoints.length} Synthesized</span>
            </div>
          </div>

          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-surface/60 border border-slate-200 dark:border-surface-border text-slate-700 dark:text-slate-300">
            <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
            <div className="truncate">
              <span className="text-slate-500 dark:text-slate-400 block text-[10px] uppercase font-mono">AI Engine</span>
              <span className="font-semibold text-slate-900 dark:text-white">Groq Llama 3.3 / OSS</span>
            </div>
          </div>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => setError(null)}
            className="text-xs font-semibold hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* 2. Checkpoint Selection Cards (1, 5, 20) */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider font-mono">
              Progression Across Interaction Milestones
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Each checkpoint evaluates the identical benchmark question against accumulating episodic memory:
            </p>
          </div>
          <span className="text-[11px] font-mono text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/30 px-2.5 py-1 rounded-lg border border-indigo-200 dark:border-indigo-800/40">
            Standard Question: "What recurring problems exist, what has been resolved, and what should be prioritized next?"
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {checkpoints.map((cp, idx) => {
            const isSelected = selectedCheckpointIndex === idx;
            const interactionLabel = cp.interactionNumber === 1 
              ? 'Interaction 1' 
              : cp.interactionNumber === 5 
                ? 'Interaction 5' 
                : 'Interaction 20';
            
            const stageTitle = cp.interactionNumber === 1
              ? 'Single-Point Snapshot'
              : cp.interactionNumber === 5
                ? 'Emerging Pattern Recognition'
                : 'Longitudinal Strategic Mastery';

            const stageTag = cp.interactionNumber === 1
              ? 'Knows 1 Problem'
              : cp.interactionNumber === 5
                ? 'Learned 3 Categories'
                : 'Connects 3 Releases';

            const tagColor = cp.interactionNumber === 1
              ? 'text-amber-700 bg-amber-50 border-amber-200 dark:text-amber-300 dark:bg-amber-950/30 dark:border-amber-800/40'
              : cp.interactionNumber === 5
                ? 'text-blue-700 bg-blue-50 border-blue-200 dark:text-blue-300 dark:bg-blue-950/30 dark:border-blue-800/40'
                : 'text-purple-700 bg-purple-50 border-purple-200 dark:text-purple-300 dark:bg-purple-950/30 dark:border-purple-800/40';

            return (
              <div
                key={cp.checkpointId || idx}
                data-testid={`checkpoint-card-${cp.interactionNumber}`}
                onClick={() => setSelectedCheckpointIndex(idx)}
                className={`p-5 rounded-2xl border transition-all cursor-pointer relative overflow-hidden ${
                  isSelected
                    ? 'bg-surface-card border-brand-primary shadow-md ring-2 ring-brand-primary/20'
                    : 'bg-surface-card/60 hover:bg-surface-card border-surface-border hover:border-slate-300 dark:hover:border-slate-700 shadow-2xs'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-slate-900 dark:text-white">
                      {interactionLabel}
                    </span>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${tagColor}`}>
                      {stageTag}
                    </span>
                  </div>
                  {isSelected && (
                    <span className="flex h-2 w-2 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-primary opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-primary"></span>
                    </span>
                  )}
                </div>

                <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-2">
                  {stageTitle}
                </h4>

                <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-3 mb-4 leading-relaxed">
                  {cp.historicalContext}
                </p>

                <div className="pt-3 border-t border-slate-100 dark:border-surface-border flex items-center justify-between text-[11px] font-mono text-slate-500 dark:text-slate-400">
                  <div className="flex items-center gap-1">
                    <Brain className="w-3.5 h-3.5 text-purple-500" />
                    <span>{cp.recalledCount} recalled</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>{cp.latencyMs} ms</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Detailed Checkpoint Inspection Card */}
      {activeCheckpoint && (
        <div className="p-6 rounded-2xl bg-surface-card border border-surface-border shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-surface-border pb-4">
            <div>
              <div className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                <h3 data-testid="checkpoint-detail-title" className="text-base font-bold text-slate-900 dark:text-white">
                  Checkpoint Detail: Interaction {activeCheckpoint.interactionNumber} of 20
                </h3>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                Staged Bank: <span className="font-mono text-purple-600 dark:text-purple-400 font-semibold">{activeCheckpoint.bankId || ('feedbackmind-lc-cp' + activeCheckpoint.interactionNumber)}</span> | Model: <span className="font-mono text-slate-800 dark:text-slate-200">{activeCheckpoint.modelUsed}</span> | Latency: <span className="font-mono">{activeCheckpoint.latencyMs}ms</span> | Memories Recalled: <span className="font-semibold text-purple-600 dark:text-purple-400">{activeCheckpoint.recalledCount}</span>
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                {activeCheckpoint.retainedCount} memories in bank
              </span>
            </div>
          </div>

          {/* Context vs Uncertainty Callout */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-purple-50/60 dark:bg-purple-950/20 border border-purple-200/80 dark:border-purple-800/30">
              <div className="flex items-center gap-2 text-purple-800 dark:text-purple-300 font-semibold text-xs mb-1.5">
                <CheckCircle2 className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <span>Historical Context Synthesized</span>
              </div>
              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                {activeCheckpoint.historicalContext}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-800/30">
              <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-semibold text-xs mb-1.5">
                <HelpCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span>Grounded Uncertainty (Hallucination Resistance)</span>
              </div>
              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                {activeCheckpoint.remainingUncertainty}
              </p>
            </div>
          </div>

          {/* Full AI Response */}
          <div>
            <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider font-mono mb-2 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-brand-primary" />
              Grounded AI Synthesis Output
            </h4>
            <div className="p-5 rounded-xl bg-slate-50 dark:bg-[#0B0F19] border border-slate-200 dark:border-surface-border text-xs text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap font-sans max-h-96 overflow-y-auto">
              {activeCheckpoint.answer}
            </div>
          </div>

          {/* Recalled Memories Chips */}
          {activeCheckpoint.recalledMemories && activeCheckpoint.recalledMemories.length > 0 && (
            <div className="pt-2">
              <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider font-mono mb-2 flex items-center gap-2">
                <Brain className="w-4 h-4 text-purple-500" />
                Hindsight Episodic Memories Recalled ({activeCheckpoint.recalledMemories.length})
              </h4>
              <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto p-2 bg-slate-50/50 dark:bg-surface/40 rounded-xl border border-slate-200/60 dark:border-surface-border">
                {activeCheckpoint.recalledMemories.map((m, i) => (
                  <div
                    key={m.id || i}
                    className="p-2.5 rounded-lg bg-white dark:bg-[#121829] border border-slate-200 dark:border-surface-border text-xs text-slate-700 dark:text-slate-300 max-w-sm"
                  >
                    <div className="flex items-center justify-between text-[10px] font-mono text-purple-600 dark:text-purple-400 mb-1">
                      <span>Memory #{i + 1}</span>
                      <span>Score: {m.score ? (m.score * 100).toFixed(0) + '%' : 'recalled'}</span>
                    </div>
                    <p className="line-clamp-2 text-[11px] leading-snug">
                      {m.text}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 4. Structured Progression Summary Comparison Table */}
      <div className="p-6 rounded-2xl bg-surface-card border border-surface-border shadow-2xs space-y-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider font-mono">
            Memory Progression Comparison: 1 vs. 5 vs. 20 Interactions
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
            Demonstrating how agent comprehension transforms from point-in-time noise into coherent product intelligence:
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-surface-border bg-slate-50/80 dark:bg-surface/60">
                <th className="py-3 px-4 font-semibold text-slate-700 dark:text-slate-300 w-1/4">Capability Dimension</th>
                <th className="py-3 px-4 font-semibold text-amber-700 dark:text-amber-300 w-1/4">Interaction 1 (Baseline)</th>
                <th className="py-3 px-4 font-semibold text-blue-700 dark:text-blue-300 w-1/4">Interaction 5 (Emerging)</th>
                <th className="py-3 px-4 font-semibold text-purple-700 dark:text-purple-300 w-1/4">Interaction 20 (Mastery)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-surface-border/60">
              <tr>
                <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">
                  Retained Episodic Memories
                </td>
                <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-400">
                  1 memory retained
                </td>
                <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-400">
                  5 memories retained
                </td>
                <td className="py-3 px-4 font-mono font-bold text-purple-600 dark:text-purple-400">
                  20 memories retained
                </td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">
                  What the Agent Knows
                </td>
                <td className="py-3 px-4 text-slate-600 dark:text-slate-400 leading-relaxed">
                  Knows only 1 complaint (morning dashboard 16s latency). Treats it as an isolated incident.
                </td>
                <td className="py-3 px-4 text-slate-600 dark:text-slate-400 leading-relaxed">
                  Learns 3 distinct problem clusters: morning latency, CSV 504 timeouts, and Google OAuth SSO lockouts.
                </td>
                <td className="py-3 px-4 text-slate-600 dark:text-slate-400 leading-relaxed">
                  Connects a full 4-month timeline across 3 software releases: v2.3 (SSO), v2.4 (Redis caching), and v2.5 (async CSV queue).
                </td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">
                  Release Resolution Tracking
                </td>
                <td className="py-3 px-4 text-slate-600 dark:text-slate-400 leading-relaxed">
                  Cannot determine if any fixes took place. Grounded answer states: "Insufficient evidence of any resolution."
                </td>
                <td className="py-3 px-4 text-slate-600 dark:text-slate-400 leading-relaxed">
                  Identifies all 3 problems as ongoing friction; knows engineering is investigating caching and background workers.
                </td>
                <td className="py-3 px-4 text-slate-600 dark:text-slate-400 leading-relaxed">
                  Accurately identifies all 3 resolved problems with post-release confirmation (e.g. latency down to 1.8s).
                </td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">
                  Roadmap Prioritization
                </td>
                <td className="py-3 px-4 text-slate-600 dark:text-slate-400 leading-relaxed">
                  Can only prioritize investigating dashboard latency or gathering more customer feedback.
                </td>
                <td className="py-3 px-4 text-slate-600 dark:text-slate-400 leading-relaxed">
                  Prioritizes fixing Google OAuth redirect URI mismatch and synchronous CSV generation to stop customer churn.
                </td>
                <td className="py-3 px-4 text-slate-600 dark:text-slate-400 leading-relaxed">
                  Pinpoints actual remaining roadmap polish: extending 15-minute export email link expiry to 24 hours.
                </td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">
                  Hallucination Resistance
                </td>
                <td className="py-3 px-4 text-emerald-600 dark:text-emerald-400 font-medium">
                  Refuses to invent trends or fake fixes.
                </td>
                <td className="py-3 px-4 text-emerald-600 dark:text-emerald-400 font-medium">
                  Cites feedback IDs LC-001 through LC-005.
                </td>
                <td className="py-3 px-4 text-emerald-600 dark:text-emerald-400 font-medium">
                  Cross-cites feedback IDs LC-001 to LC-020 with release milestone evidence.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. Memory OFF vs Memory ON Benchmark Comparison */}
      {benchmarkResult && (
        <div className="p-6 rounded-2xl bg-surface-card border border-surface-border shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-surface-border pb-3">
            <div>
              <div className="flex items-center gap-2">
                <Scale className="w-5 h-5 text-indigo-500" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Empirical Benchmark: Memory OFF vs. Memory ON
                </h3>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                Comparing answers to the exact same prompt against the 20-interaction dataset:
              </p>
            </div>
            <button
              onClick={() => setBenchmarkResult(null)}
              className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 font-semibold"
            >
              Close Comparison
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Memory OFF */}
            <div className="p-5 rounded-xl bg-amber-50/40 dark:bg-amber-950/15 border border-amber-200 dark:border-amber-800/40 space-y-3">
              <div className="flex items-center justify-between border-b border-amber-200/60 dark:border-amber-800/40 pb-2">
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  <span className="font-bold text-xs text-amber-900 dark:text-amber-200">
                    Memory OFF (Current Records Only)
                  </span>
                </div>
                <div className="text-[10px] font-mono text-amber-700 dark:text-amber-400">
                  0 Hindsight Calls | {benchmarkResult.memoryOff?.latencyMs}ms
                </div>
              </div>

              <div className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap max-h-80 overflow-y-auto">
                {benchmarkResult.memoryOff?.answer}
              </div>

              <div className="pt-2 border-t border-amber-200/60 dark:border-amber-800/40 text-[11px] text-amber-800 dark:text-amber-300 flex items-center justify-between">
                <span>Model: {benchmarkResult.memoryOff?.modelUsed}</span>
                <span>Evidence Records: {benchmarkResult.memoryOff?.evidenceCount}</span>
              </div>
            </div>

            {/* Memory ON */}
            <div className="p-5 rounded-xl bg-purple-50/40 dark:bg-purple-950/15 border border-purple-200 dark:border-purple-800/40 space-y-3">
              <div className="flex items-center justify-between border-b border-purple-200/60 dark:border-purple-800/40 pb-2">
                <div className="flex items-center gap-2">
                  <Brain className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  <span className="font-bold text-xs text-purple-900 dark:text-purple-200">
                    Memory ON (Hindsight Episodic Recall)
                  </span>
                </div>
                <div className="text-[10px] font-mono text-purple-700 dark:text-purple-400">
                  {benchmarkResult.memoryOn?.hindsightCalls} Recall Call | {benchmarkResult.memoryOn?.memoriesRetrievedCount} Memories | {benchmarkResult.memoryOn?.latencyMs}ms
                </div>
              </div>

              <div className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap max-h-80 overflow-y-auto">
                {benchmarkResult.memoryOn?.answer}
              </div>

              <div className="pt-2 border-t border-purple-200/60 dark:border-purple-800/40 text-[11px] text-purple-800 dark:text-purple-300 flex items-center justify-between">
                <span>Model: {benchmarkResult.memoryOn?.modelUsed}</span>
                <span>Evidence Records: {benchmarkResult.memoryOn?.evidenceCount}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. Inspectable Memory History Table (All 20 Interactions) */}
      <div className="p-6 rounded-2xl bg-surface-card border border-surface-border shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider font-mono">
              Inspectable Memory History ({interactions.length} Interactions)
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
              Chronological feedback progression showing real retention and checkpoint recall state:
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAllInteractions(!showAllInteractions)}
              className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-surface border border-slate-200 dark:border-surface-border text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
            >
              {showAllInteractions ? `Show Recent 8` : `Show All ${interactions.length}`}
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-surface-border bg-slate-50/80 dark:bg-surface/60 font-mono text-[11px] uppercase">
                <th className="py-2.5 px-3">#</th>
                <th className="py-2.5 px-3">ID</th>
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">Customer</th>
                <th className="py-2.5 px-3">Rating</th>
                <th className="py-2.5 px-3">Topic</th>
                <th className="py-2.5 px-3">Feedback Summary</th>
                <th className="py-2.5 px-3">Hindsight Status</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-surface-border/60">
              {displayedInteractions.map((item) => {
                const isRetained = item.retainedInHindsight;
                return (
                  <tr 
                    key={item.feedback_id}
                    className="hover:bg-slate-50/50 dark:hover:bg-surface/50 transition-colors cursor-pointer"
                    onClick={() => setSelectedInteraction(item)}
                  >
                    <td className="py-2.5 px-3 font-mono text-slate-500 dark:text-slate-400">
                      {item.interaction_number}
                    </td>
                    <td className="py-2.5 px-3 font-mono font-semibold text-indigo-600 dark:text-indigo-400">
                      {item.feedback_id}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                      {item.date}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-700 dark:text-slate-300 whitespace-nowrap">
                      {item.customer_id}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-0.5">
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{item.rating}</span>
                        <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                      </div>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-surface text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-surface-border text-[10px]">
                        {item.topic}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300 max-w-xs truncate">
                      {item.feedback}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      {isRetained ? (
                        <span className="inline-flex items-center gap-1 text-[10px] text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/30 px-2 py-0.5 rounded-full border border-purple-200 dark:border-purple-800/40">
                          <Brain className="w-3 h-3 text-purple-500" />
                          <span>Retained in Bank</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-surface px-2 py-0.5 rounded-full">
                          Pending
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedInteraction(item);
                        }}
                        className="text-indigo-600 dark:text-indigo-400 hover:underline text-[11px] font-semibold"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 7. Interaction Detail Modal */}
      {selectedInteraction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-surface-card border border-surface-border rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-surface-border pb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-500" />
                <h4 data-testid="modal-title" className="text-sm font-bold text-slate-900 dark:text-white">
                  Interaction #{selectedInteraction.interaction_number}: {selectedInteraction.feedback_id}
                </h4>
              </div>
              <button
                onClick={() => setSelectedInteraction(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-slate-600 dark:text-slate-400">
                <div>Customer: <strong className="text-slate-900 dark:text-white">{selectedInteraction.customer_id}</strong></div>
                <div>Date: <strong className="text-slate-900 dark:text-white">{selectedInteraction.date}</strong></div>
                <div>Topic: <strong className="text-slate-900 dark:text-white">{selectedInteraction.topic}</strong></div>
                <div>Rating: <strong className="text-slate-900 dark:text-white">{selectedInteraction.rating}★</strong></div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-surface border border-slate-200 dark:border-surface-border">
                <span className="text-[10px] font-mono uppercase text-slate-500 block mb-1">Customer Quote</span>
                <p className="text-slate-800 dark:text-slate-200 italic leading-relaxed">
                  "{selectedInteraction.feedback}"
                </p>
              </div>

              <div className="p-3 rounded-xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200/60 dark:border-purple-800/30">
                <span className="text-[10px] font-mono uppercase text-purple-600 dark:text-purple-400 block mb-1">Diagnosed Customer Problem</span>
                <p className="text-slate-800 dark:text-slate-200 font-medium">
                  {selectedInteraction.customer_problem}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-800/30">
                <span className="text-[10px] font-mono uppercase text-emerald-600 dark:text-emerald-400 block mb-1">Engineering Suggested Action</span>
                <p className="text-slate-800 dark:text-slate-200 font-medium">
                  {selectedInteraction.suggested_action}
                </p>
              </div>

              <div className="pt-2 flex items-center justify-between text-[11px] font-mono text-slate-500">
                <span>Hindsight ID: {selectedInteraction.hindsightMemoryId || 'mem_' + selectedInteraction.feedback_id}</span>
                <span>Bank: feedbackmind-learning-curve</span>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200 dark:border-surface-border flex justify-end">
              <button
                onClick={() => setSelectedInteraction(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-surface hover:bg-slate-200 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. Reset Environment Safety Confirmation Modal */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-surface-card border border-rose-200 dark:border-rose-900 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h4 className="text-base font-bold text-slate-900 dark:text-white">
                Reset Isolated Learning Curve Demo?
              </h4>
            </div>

            <div className="text-xs text-slate-600 dark:text-slate-300 space-y-2 leading-relaxed">
              <p>
                This action will wipe the 20 records in company <strong className="text-slate-900 dark:text-white font-mono">learning-curve-demo</strong> and clear memories in Hindsight bank <strong className="text-slate-900 dark:text-white font-mono">feedbackmind-learning-curve</strong>.
              </p>
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 text-emerald-800 dark:text-emerald-300">
                <span className="font-semibold block mb-0.5">Safety Guarantee:</span>
                Your primary workspace dataset (<strong className="font-mono">demo-company</strong>, 27 records) and main bank (<strong className="font-mono">feedbackmind-demo</strong>) will NOT be touched.
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200 dark:border-surface-border flex items-center justify-end gap-2.5">
              <button
                onClick={() => setShowResetModal(false)}
                disabled={resetting}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-surface hover:bg-slate-200 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleReset}
                disabled={resetting}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-50"
              >
                <RotateCcw className={`w-3.5 h-3.5 ${resetting ? 'animate-spin' : ''}`} />
                <span>{resetting ? 'Resetting...' : 'Confirm Reset'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
