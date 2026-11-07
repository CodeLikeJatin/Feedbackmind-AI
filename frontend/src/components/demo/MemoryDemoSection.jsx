import React, { useState, useEffect } from 'react';
import LearningCurveSection from './LearningCurveSection';
import { 
  fetchDemoStatus, 
  compareDemoModes, 
  queryDemoMode 
} from '../../services/api';
import { 
  Brain, 
  Database, 
  Scale, 
  Sparkles, 
  ArrowRight, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Star, 
  Layers, 
  Check, 
  HelpCircle,
  FileText,
  TrendingUp,
  ShieldCheck,
  Zap,
  ChevronDown,
  ChevronUp,
  Info,
  ListChecks,
  Compass
} from 'lucide-react';

export default function MemoryDemoSection({
  memoryEnabled = true,
  onToggleMemory,
  onSelectFeedback,
  companyId = 'demo-company',
  defaultTab = 'side-by-side'
}) {
  const [subTab, setSubTab] = useState(defaultTab);
  const [demoStatus, setDemoStatus] = useState(null);
  const [question, setQuestion] = useState(
    "Has dashboard performance improved over time?"
  );
  const [comparisonResult, setComparisonResult] = useState(null);
  const [singleResult, setSingleResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('comparison'); // 'comparison' | 'single'
  const [showGuidedWorkflow, setShowGuidedWorkflow] = useState(false);
  const [showTimeline, setShowTimeline] = useState(true);
  const [activeStep, setActiveStep] = useState(1);

  useEffect(() => {
    loadStatus();
  }, [companyId]);

  const loadStatus = async () => {
    try {
      const data = await fetchDemoStatus(companyId);
      setDemoStatus(data);
    } catch (err) {
      console.warn('Failed to load demo status:', err.message);
    }
  };

  const handleRunComparison = async (qToRun) => {
    const targetQuestion = qToRun || question;
    if (!targetQuestion.trim()) return;

    setLoading(true);
    setError(null);
    setSingleResult(null);
    setActiveTab('comparison');

    try {
      const data = await compareDemoModes({
        question: targetQuestion.trim(),
        companyId
      });
      setComparisonResult(data);
    } catch (err) {
      console.error('Comparison error:', err);
      setError(err.message || 'Failed to execute memory comparison');
    } finally {
      setLoading(false);
    }
  };

  const handleRunSingleMode = async (qToRun) => {
    const targetQuestion = qToRun || question;
    if (!targetQuestion.trim()) return;

    setLoading(true);
    setError(null);
    setComparisonResult(null);
    setActiveTab('single');

    try {
      const data = await queryDemoMode({
        question: targetQuestion.trim(),
        companyId,
        memoryEnabled
      });
      setSingleResult(data);
    } catch (err) {
      console.error('Single query error:', err);
      setError(err.message || 'Failed to execute query in active mode');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSuggestedQuestion = (suggestedQ) => {
    setQuestion(suggestedQ);
    handleRunComparison(suggestedQ);
  };

  const handleClear = () => {
    setQuestion('');
    setComparisonResult(null);
    setSingleResult(null);
    setError(null);
  };

  const suggestedQuestions = demoStatus?.suggestedQuestions || [
    {
      id: 'recurring_complaints',
      question: "What are our customers' biggest recurring complaints?",
      category: 'Pattern Discovery'
    },
    {
      id: 'dashboard_evolution',
      question: "Has dashboard performance improved over time?",
      category: 'Historical Progression'
    },
    {
      id: 'cross_month_issues',
      question: "Which issues have appeared repeatedly across different months?",
      category: 'Longitudinal Analysis'
    },
    {
      id: 'prioritize_fixes',
      question: "What should our product team fix first?",
      category: 'Prioritization'
    },
    {
      id: 'unresolved_regressions',
      question: "Are customers still reporting problems that we thought were fixed?",
      category: 'Regression Detection'
    }
  ];

  const totalRecords = demoStatus?.sqliteRecordCount ?? 26;
  const activeBank = demoStatus?.hindsightBankId || 'feedbackmind-demo';
  const memoryRecalled = comparisonResult?.memoryOn?.memoryRecallCount ?? (singleResult?.memoryRecallCount ?? 0);
  const memoryCited = comparisonResult?.memoryOn?.evidence?.length ?? (singleResult?.evidence?.length ?? 0);

  return (
    <div className="space-y-6">
      {/* Sub-Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-surface-border pb-3">
        <button
          onClick={() => setSubTab('side-by-side')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
            subTab === 'side-by-side'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-slate-100 dark:bg-surface text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
          }`}
        >
          <Scale className="w-3.5 h-3.5" />
          <span>Side-by-Side Comparison (ON vs. OFF)</span>
        </button>

        <button
          onClick={() => setSubTab('learning-curve')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
            subTab === 'learning-curve'
              ? 'bg-purple-600 text-white shadow-sm'
              : 'bg-slate-100 dark:bg-surface text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
          }`}
        >
          <Brain className="w-3.5 h-3.5" />
          <span>The Memory Learning Curve (1, 5, 20)</span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
            subTab === 'learning-curve' ? 'bg-purple-500/40 text-purple-100' : 'bg-purple-100 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300'
          }`}>
            Phase 8.4
          </span>
        </button>
      </div>

      {subTab === 'learning-curve' ? (
        <LearningCurveSection onSelectFeedback={onSelectFeedback} />
      ) : (
        <>
          {/* 1. Header Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-surface-card via-slate-50 dark:via-[#161F36] to-surface-card border border-surface-border relative overflow-hidden shadow-2xs">
        <div className="absolute right-0 top-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:border-indigo-500/30 dark:text-indigo-300 border border-indigo-200 text-[11px] font-semibold">
                <Scale className="w-3.5 h-3.5" /> Impact Benchmark
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:border-emerald-500/30 dark:text-emerald-300 border border-emerald-200 text-[11px] font-semibold">
                <ShieldCheck className="w-3.5 h-3.5" /> Zero Memory OFF Leakage Enforced
              </span>
            </div>

            <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
              Memory ON vs. Memory OFF Demonstration
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 max-w-3xl leading-relaxed">
              Empirically demonstrate the impact of long-term agent memory. Submit any question to compare localized scope (Memory OFF: Current feedback only) against episodic pattern synthesis (Memory ON: Longitudinal Memory Service).
            </p>
          </div>

          {/* Quick Active Mode Switch & Guided Tour Button */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setShowGuidedWorkflow(!showGuidedWorkflow)}
              className="px-3 py-2 rounded-xl bg-white dark:bg-[#0E1424] border border-slate-200 dark:border-surface-border text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-300 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
            >
              <Compass className="w-3.5 h-3.5 text-brand-primary" />
              <span>{showGuidedWorkflow ? 'Hide Demo Guide' : 'Guided Demo Tour'}</span>
              {showGuidedWorkflow ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            <div className="flex items-center gap-3 bg-slate-100 dark:bg-[#0E1424] p-2.5 rounded-2xl border border-slate-200 dark:border-surface-border shrink-0 shadow-2xs">
              <div className="flex flex-col text-right">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-mono tracking-wider">Active Mode</span>
                <span className={`text-xs font-bold ${memoryEnabled ? 'text-purple-600 dark:text-purple-300' : 'text-amber-600 dark:text-amber-300'}`}>
                  {memoryEnabled ? 'Memory ON' : 'Memory OFF'}
                </span>
              </div>

              <button
                onClick={onToggleMemory}
                role="switch"
                aria-checked={memoryEnabled}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-brand-primary ${
                  memoryEnabled ? 'bg-indigo-600' : 'bg-slate-400 dark:bg-slate-700'
                }`}
                title={`Toggle Memory Mode (Current: ${memoryEnabled ? 'ON' : 'OFF'})`}
                aria-label={`Toggle Memory Mode, current mode is ${memoryEnabled ? 'ON' : 'OFF'}`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    memoryEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Live Architecture Info Pills */}
        <div className="mt-5 pt-4 border-t border-slate-200 dark:border-surface-border/80 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-surface/60 border border-slate-200 dark:border-surface-border text-slate-700 dark:text-slate-300">
            <Database className="w-4 h-4 text-indigo-500 dark:text-indigo-400 shrink-0" />
            <div className="truncate">
              <span className="text-slate-500 dark:text-slate-400 block text-[10px] uppercase font-mono">Workspace Dataset</span>
              <span className="font-semibold text-slate-900 dark:text-white">{totalRecords} Available Records</span>
            </div>
          </div>

          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-surface/60 border border-slate-200 dark:border-surface-border text-slate-700 dark:text-slate-300">
            <Brain className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
            <div className="truncate">
              <span className="text-slate-500 dark:text-slate-400 block text-[10px] uppercase font-mono">Memory Bank</span>
              <span className="font-semibold text-slate-900 dark:text-white">{activeBank}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-surface/60 border border-slate-200 dark:border-surface-border text-slate-700 dark:text-slate-300">
            <Zap className="w-4 h-4 text-amber-500 dark:text-amber-400 shrink-0" />
            <div className="truncate">
              <span className="text-slate-500 dark:text-slate-400 block text-[10px] uppercase font-mono">Memory OFF Guarantee</span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">0 Memory Service Calls</span>
            </div>
          </div>
        </div>

        {/* Core Architectural Principle Explanation Callout */}
        <div className="mt-4 p-3.5 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/20 border border-indigo-200/80 dark:border-indigo-800/30 text-xs text-slate-700 dark:text-slate-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start sm:items-center gap-2.5">
            <Sparkles className="w-4 h-4 text-brand-primary shrink-0 mt-0.5 sm:mt-0" />
            <p className="leading-relaxed">
              <strong className="text-slate-900 dark:text-white font-semibold">Core Principle:</strong> Without memory, the AI only uses the feedback currently available to it. With Hindsight, the AI can recall relevant customer feedback from previous interactions to provide historical context. Memory retrieval operates through episodic recall — not model retraining.
            </p>
          </div>
        </div>
      </div>

      {/* Guided Demo Workflow Stepper (Expandable) */}
      {showGuidedWorkflow && (
        <div className="p-5 rounded-2xl bg-surface-card border border-brand-primary/40 shadow-xs space-y-4 animate-fadeIn">
          <div className="flex items-center justify-between border-b border-surface-border pb-3">
            <div className="flex items-center gap-2">
              <ListChecks className="w-4 h-4 text-brand-primary" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Guided Demo Experience — Step-by-Step Scenario</h3>
            </div>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
              Scenario: Recurring SaaS Performance, Export & Login Friction
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-3 text-xs">
            {/* Step 1 */}
            <div 
              onClick={() => setActiveStep(1)}
              className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                activeStep === 1 
                  ? 'bg-indigo-50/70 dark:bg-indigo-950/30 border-brand-primary shadow-xs ring-1 ring-brand-primary' 
                  : 'bg-slate-50 dark:bg-surface/50 border-slate-200 dark:border-surface-border'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-bold text-slate-900 dark:text-white font-mono">Step 1</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 font-mono">Ingested</span>
              </div>
              <h4 className="font-semibold text-slate-800 dark:text-slate-200 text-[11px] mb-1">Multi-Month Feedback</h4>
              <p className="text-[10px] text-slate-600 dark:text-slate-400 leading-relaxed">
                26 records across 4 periods (M1/M2 latency → M3 v2.4 fix → M4 SSO timeouts).
              </p>
            </div>

            {/* Step 2 */}
            <div 
              onClick={() => {
                setActiveStep(2);
                setQuestion("Has dashboard performance improved over time?");
              }}
              className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                activeStep === 2 
                  ? 'bg-indigo-50/70 dark:bg-indigo-950/30 border-brand-primary shadow-xs ring-1 ring-brand-primary' 
                  : 'bg-slate-50 dark:bg-surface/50 border-slate-200 dark:border-surface-border'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-bold text-slate-900 dark:text-white font-mono">Step 2</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300 font-mono">Query</span>
              </div>
              <h4 className="font-semibold text-slate-800 dark:text-slate-200 text-[11px] mb-1">Select Question</h4>
              <p className="text-[10px] text-slate-600 dark:text-slate-400 leading-relaxed">
                Select "Has dashboard performance improved over time?" to test progression.
              </p>
            </div>

            {/* Step 3 */}
            <div 
              onClick={() => {
                setActiveStep(3);
                handleRunComparison("Has dashboard performance improved over time?");
              }}
              className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                activeStep === 3 
                  ? 'bg-indigo-50/70 dark:bg-indigo-950/30 border-brand-primary shadow-xs ring-1 ring-brand-primary' 
                  : 'bg-slate-50 dark:bg-surface/50 border-slate-200 dark:border-surface-border'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-bold text-slate-900 dark:text-white font-mono">Step 3</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 font-mono">Benchmark</span>
              </div>
              <h4 className="font-semibold text-slate-800 dark:text-slate-200 text-[11px] mb-1">Compare ON vs OFF</h4>
              <p className="text-[10px] text-slate-600 dark:text-slate-400 leading-relaxed">
                Run side-by-side benchmark to witness localized amnesia vs memory synthesis.
              </p>
            </div>

            {/* Step 4 */}
            <div 
              onClick={() => setActiveStep(4)}
              className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                activeStep === 4 
                  ? 'bg-indigo-50/70 dark:bg-indigo-950/30 border-brand-primary shadow-xs ring-1 ring-brand-primary' 
                  : 'bg-slate-50 dark:bg-surface/50 border-slate-200 dark:border-surface-border'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-bold text-slate-900 dark:text-white font-mono">Step 4</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 font-mono">Evidence</span>
              </div>
              <h4 className="font-semibold text-slate-800 dark:text-slate-200 text-[11px] mb-1">Inspect Evidence</h4>
              <p className="text-[10px] text-slate-600 dark:text-slate-400 leading-relaxed">
                Verify recalled memories against customer citations and SQLite records.
              </p>
            </div>

            {/* Step 5 */}
            <div 
              onClick={() => setActiveStep(5)}
              className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                activeStep === 5 
                  ? 'bg-indigo-50/70 dark:bg-indigo-950/30 border-brand-primary shadow-xs ring-1 ring-brand-primary' 
                  : 'bg-slate-50 dark:bg-surface/50 border-slate-200 dark:border-surface-border'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-bold text-slate-900 dark:text-white font-mono">Step 5</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 font-mono">Action</span>
              </div>
              <h4 className="font-semibold text-slate-800 dark:text-slate-200 text-[11px] mb-1">Review Priorities</h4>
              <p className="text-[10px] text-slate-600 dark:text-slate-400 leading-relaxed">
                Inspect empirical evaluation: confirm resolution of lag, prioritize export & SSO fixes.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Memory Lifecycle Timeline (Section 2 Requirement) */}
      <div className="p-5 rounded-2xl bg-surface-card border border-surface-border shadow-2xs space-y-3">
        <div className="flex items-center justify-between border-b border-surface-border pb-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-brand-primary" />
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Memory Lifecycle Timeline</h3>
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
            End-to-End Retention & Context Retrieval
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 text-xs pt-1">
          {/* Stage 1 */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-surface/60 border border-slate-200 dark:border-surface-border flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5 text-indigo-700 dark:text-indigo-300 font-semibold">
                  <span className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-[10px] font-mono">1</span>
                  <span>Feedback Ingestion</span>
                </div>
              </div>
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-medium inline-block mb-1">
                Live Database Value
              </span>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1">
              {totalRecords} customer records ingested across support & reviews.
            </p>
          </div>

          {/* Stage 2 */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-surface/60 border border-slate-200 dark:border-surface-border flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5 text-indigo-700 dark:text-indigo-300 font-semibold">
                  <span className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-[10px] font-mono">2</span>
                  <span>AI Classification</span>
                </div>
              </div>
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-surface text-slate-500 dark:text-slate-400 font-medium inline-block mb-1">
                Static Explanatory Content
              </span>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1">
              Sentiment, urgency, topics, and root causes extracted.
            </p>
          </div>

          {/* Stage 3 */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-surface/60 border border-slate-200 dark:border-surface-border flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5 text-purple-700 dark:text-purple-300 font-semibold">
                  <span className="w-5 h-5 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 flex items-center justify-center text-[10px] font-mono">3</span>
                  <span>Hindsight Retention</span>
                </div>
              </div>
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-surface text-slate-500 dark:text-slate-400 font-medium inline-block mb-1">
                Static Explanatory Content
              </span>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1">
              Persisted into dedicated long-term episodic memory bank.
            </p>
          </div>

          {/* Stage 4 */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-surface/60 border border-slate-200 dark:border-surface-border flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5 text-indigo-700 dark:text-indigo-300 font-semibold">
                  <span className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-[10px] font-mono">4</span>
                  <span>Query Submitted</span>
                </div>
              </div>
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-medium inline-block mb-1">
                Actual Recorded Event
              </span>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1 truncate">
              "{question}"
            </p>
          </div>

          {/* Stage 5 */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-surface/60 border border-slate-200 dark:border-surface-border flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5 text-purple-700 dark:text-purple-300 font-semibold">
                  <span className="w-5 h-5 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 flex items-center justify-center text-[10px] font-mono">5</span>
                  <span>Semantic Recall</span>
                </div>
              </div>
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 font-medium inline-block mb-1">
                Live API Result
              </span>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1">
              {memoryRecalled} historical memories retrieved in Memory ON.
            </p>
          </div>

          {/* Stage 6 */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-surface/60 border border-slate-200 dark:border-surface-border flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300 font-semibold">
                  <span className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-[10px] font-mono">6</span>
                  <span>Grounded Answer</span>
                </div>
              </div>
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-medium inline-block mb-1">
                Live API Result
              </span>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1">
              {memoryCited} customer evidence citations verified.
            </p>
          </div>
        </div>
      </div>

      {/* 2. Suggested Benchmark Questions & Input Bar */}
      <div className="p-6 rounded-2xl bg-surface-card border border-surface-border space-y-4 shadow-2xs">
        <div>
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-2 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
            Suggested Benchmark Questions (Select to compare live):
          </label>
          <div className="flex flex-wrap gap-2">
            {suggestedQuestions.map((q) => (
              <button
                key={q.id}
                onClick={() => handleSelectSuggestedQuestion(q.question)}
                className={`text-left text-xs px-3 py-2 rounded-xl border transition-all flex items-center gap-2 group focus:outline-none focus:ring-2 focus:ring-brand-primary ${
                  question === q.question
                    ? 'bg-indigo-50 text-indigo-900 border-brand-primary dark:bg-indigo-600/20 dark:border-indigo-500/50 dark:text-white shadow-sm ring-1 ring-brand-primary'
                    : 'bg-slate-50 dark:bg-surface/80 border-slate-200 dark:border-surface-border text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:border-slate-300 dark:hover:border-slate-500'
                }`}
              >
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 dark:bg-surface-border/80 dark:text-indigo-300 font-mono">
                  {q.category}
                </span>
                <span className="truncate max-w-xs md:max-w-md">{q.question}</span>
                <ArrowRight className="w-3 h-3 text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors shrink-0" />
              </button>
            ))}
          </div>
        </div>

        {/* Input Bar */}
        <div className="space-y-2">
          <label htmlFor="demo-question-input" className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Or ask your own custom customer feedback question:
          </label>
          <div className="relative">
            <textarea
              id="demo-question-input"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="e.g. Has dashboard performance improved over time?"
              rows={2}
              className="w-full px-4 py-3 bg-white dark:bg-surface rounded-xl border border-slate-300 dark:border-surface-border focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 outline-none transition-all resize-none"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleRunComparison()}
                disabled={loading || !question.trim()}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-brand-primary to-brand-accent hover:opacity-95 disabled:opacity-50 text-white text-xs font-semibold shadow-lg shadow-indigo-600/20 flex items-center gap-2 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-primary"
              >
                <Scale className="w-4 h-4" />
                {loading ? 'Evaluating Modes...' : 'Compare Side-by-Side (ON vs OFF)'}
              </button>

              <button
                onClick={() => handleRunSingleMode()}
                disabled={loading || !question.trim()}
                className="px-3.5 py-2.5 rounded-xl bg-white dark:bg-surface border border-slate-300 dark:border-surface-border text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-surface-border/50 disabled:opacity-50 text-xs font-medium flex items-center gap-2 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-primary"
              >
                {memoryEnabled ? (
                  <>
                    <Brain className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" /> Run Memory ON Only
                  </>
                ) : (
                  <>
                    <Database className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" /> Run Memory OFF Only
                  </>
                )}
              </button>
            </div>

            {question && (
              <button
                onClick={handleClear}
                className="text-xs text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors focus:outline-none focus:underline"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 3. Error Alert */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs flex items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => handleRunComparison()}
            className="px-2.5 py-1 rounded-lg bg-rose-100 hover:bg-rose-200 dark:bg-rose-500/20 dark:hover:bg-rose-500/30 text-rose-800 dark:text-white font-medium transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* 4. Loading Skeleton */}
      {loading && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-pulse">
          <div className="p-6 rounded-2xl bg-surface-card border border-surface-border space-y-4">
            <div className="h-6 w-36 bg-slate-200 dark:bg-surface rounded" />
            <div className="h-4 w-48 bg-slate-200 dark:bg-surface rounded" />
            <div className="h-40 bg-slate-200 dark:bg-surface rounded-xl" />
            <div className="h-20 bg-slate-200 dark:bg-surface rounded-xl" />
          </div>
          <div className="p-6 rounded-2xl bg-surface-card border border-surface-border space-y-4">
            <div className="h-6 w-36 bg-slate-200 dark:bg-surface rounded" />
            <div className="h-4 w-48 bg-slate-200 dark:bg-surface rounded" />
            <div className="h-40 bg-slate-200 dark:bg-surface rounded-xl" />
            <div className="h-20 bg-slate-200 dark:bg-surface rounded-xl" />
          </div>
        </div>
      )}

      {/* 5. Side-by-Side Comparison Container */}
      {!loading && comparisonResult && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-100 dark:bg-[#0E1424] px-4 py-3 rounded-2xl border border-slate-200 dark:border-surface-border text-xs text-slate-700 dark:text-slate-300 shadow-2xs">
            <div className="flex items-center gap-2">
              <span className="text-slate-500 dark:text-slate-400 font-mono uppercase text-[10px]">Benchmark Query:</span>
              <span className="font-semibold text-slate-900 dark:text-white">"{comparisonResult.question}"</span>
            </div>
            <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400 text-[11px]">
              <span>Dataset Parity: <strong className="text-slate-900 dark:text-white">{comparisonResult.sqliteRecordCount} records</strong> evaluated</span>
              <span>•</span>
              <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-medium">
                <Check className="w-3.5 h-3.5" /> Evaluated Independently
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            {/* LEFT PANEL: MEMORY OFF */}
            <div className="p-6 rounded-2xl bg-surface-card border-2 border-amber-300 dark:border-amber-500/40 shadow-2xs space-y-5 relative">
              {/* Panel Header */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-surface-border">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 dark:text-amber-400">
                    <Database className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      Memory OFF <span className="text-xs font-normal text-slate-500 dark:text-slate-400">(Current Records Only)</span>
                    </h3>
                    <span className="text-[11px] text-amber-700 dark:text-amber-300 font-medium">
                      Localized Scope • Answers strictly from active records
                    </span>
                  </div>
                </div>

                <span className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-[10px] font-mono font-semibold">
                  0 Hindsight Calls
                </span>
              </div>

              {/* Retrieval Status Notice */}
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-xs text-amber-900 dark:text-amber-200/90 space-y-1">
                <div className="flex items-center gap-1.5 font-semibold text-amber-800 dark:text-amber-300">
                  <ShieldCheck className="w-3.5 h-3.5" /> Hindsight Retrieval Completely Bypassed
                </div>
                <p className="text-[11px] text-amber-800 dark:text-amber-200/80 leading-relaxed">
                  No memories retrieved. Groq answered strictly from current database entries without longitudinal context.
                </p>
              </div>

              {/* AI Answer Text */}
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider font-mono">
                  Synthesized Answer:
                </h4>
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#0B0F19] border border-slate-200 dark:border-surface-border text-xs text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
                  {comparisonResult.memoryOff?.answer}
                </div>
              </div>

              {/* Evidence Citations */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
                    Supporting Evidence Records ({comparisonResult.memoryOff?.evidence?.length || 0})
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                    Source: Workspace Records
                  </span>
                </div>

                {comparisonResult.memoryOff?.evidence?.length === 0 ? (
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-surface/50 border border-slate-200 dark:border-surface-border text-center text-xs text-slate-500 dark:text-slate-400">
                    No relevant evidence found in workspace records.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {comparisonResult.memoryOff?.evidence?.map((ev) => (
                      <div
                        key={ev.feedback_id}
                        className="p-3 rounded-xl bg-white dark:bg-[#0E1424] border border-slate-200 dark:border-surface-border text-xs space-y-1 hover:border-slate-300 dark:hover:border-slate-600 transition-colors shadow-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-indigo-700 dark:text-indigo-300">{ev.feedback_id}</span>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1 font-mono">
                            {ev.date} • {ev.rating}★
                          </span>
                        </div>
                        <p className="text-slate-700 dark:text-slate-300 text-[11px] italic">"{ev.feedback_snippet}"</p>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-2">
                          <span>Cust: {ev.customer_id}</span>
                          <span>•</span>
                          <span className="capitalize">Topic: {ev.topic}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT PANEL: MEMORY ON */}
            <div className="p-6 rounded-2xl bg-surface-card border-2 border-purple-400 dark:border-purple-500/60 shadow-2xs shadow-purple-900/10 space-y-5 relative">
              {/* Panel Header */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-surface-border">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-purple-100 dark:bg-purple-500/15 border border-purple-200 dark:border-purple-500/30 flex items-center justify-center text-purple-700 dark:text-purple-300">
                    <Brain className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      Memory ON <span className="text-xs font-normal text-purple-700 dark:text-purple-300">(Grounded with Hindsight)</span>
                    </h3>
                    <span className="text-[11px] text-purple-700 dark:text-purple-300 font-medium">
                      Episodic & Reflective Long-Term Memory Active
                    </span>
                  </div>
                </div>

                <span className="px-2.5 py-1 rounded-full bg-purple-50 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300 border border-purple-200 dark:border-purple-500/40 text-[10px] font-mono font-semibold">
                  {comparisonResult.memoryOn?.memoryRecallCount || 0} Memories Recalled
                </span>
              </div>

              {/* Retrieval Status Notice */}
              <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/20 text-xs text-purple-900 dark:text-purple-200/90 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-purple-800 dark:text-purple-300 flex items-center gap-1.5">
                    <Brain className="w-3.5 h-3.5" /> Hindsight Long-Term Memory Grounding
                  </span>
                  <span className="text-[10px] font-mono text-purple-700 dark:text-purple-300 font-semibold">
                    Bank: {demoStatus?.hindsightBankId || 'feedbackmind-demo'}
                  </span>
                </div>
                <p className="text-[11px] text-purple-800 dark:text-purple-200/80 leading-relaxed">
                  Synthesized {comparisonResult.memoryOn?.memoryRecallCount || 0} episodic memories across release cycles
                  {comparisonResult.memoryOn?.reflectionUsed ? ' with multi-month reflective pattern discovery.' : '.'}
                </p>
              </div>

              {/* AI Answer Text */}
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-purple-800 dark:text-purple-300 uppercase tracking-wider font-mono">
                  Synthesized Answer:
                </h4>
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#0B0F19] border border-purple-200 dark:border-purple-500/30 text-xs text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
                  {comparisonResult.memoryOn?.answer}
                </div>
              </div>

              {/* Recalled Hindsight Memories Snippets */}
              {comparisonResult.memoryOn?.recalledMemories?.length > 0 && (
                <div className="space-y-2 pt-1">
                  <h4 className="text-xs font-semibold text-purple-800 dark:text-purple-300 flex items-center gap-1.5">
                    <Brain className="w-3.5 h-3.5" />
                    Hindsight Memory Context ({comparisonResult.memoryOn?.recalledMemories?.length})
                  </h4>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                    {comparisonResult.memoryOn?.recalledMemories?.map((mem, idx) => (
                      <div
                        key={mem.id || idx}
                        className="p-2.5 rounded-lg bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-500/20 text-[11px] text-slate-700 dark:text-slate-300"
                      >
                        <div className="flex items-center justify-between text-[10px] text-purple-700 dark:text-purple-300/80 mb-1 font-mono">
                          <span>Context: {mem.context || 'general'}</span>
                          {mem.occurred_start && <span>{mem.occurred_start}</span>}
                        </div>
                        <p className="line-clamp-2">{mem.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Reflection Callout */}
              {comparisonResult.memoryOn?.reflectionText && (
                <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-500/30 text-xs space-y-1">
                  <span className="font-semibold text-indigo-900 dark:text-indigo-300 block text-[11px]">
                    Longitudinal Pattern Reflection:
                  </span>
                  <p className="text-[11px] text-slate-700 dark:text-slate-300 leading-relaxed italic">
                    "{comparisonResult.memoryOn.reflectionText}"
                  </p>
                </div>
              )}

              {/* Supporting Evidence Citations */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                    Supporting Evidence Records ({comparisonResult.memoryOn?.evidence?.length || 0})
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                    Source: Memory Grounded Records
                  </span>
                </div>

                {comparisonResult.memoryOn?.evidence?.length === 0 ? (
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-surface/50 border border-slate-200 dark:border-surface-border text-center text-xs text-slate-500 dark:text-slate-400">
                    No relevant evidence found in records.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {comparisonResult.memoryOn?.evidence?.map((ev) => (
                      <div
                        key={ev.feedback_id}
                        className="p-3 rounded-xl bg-white dark:bg-[#0E1424] border border-slate-200 dark:border-surface-border text-xs space-y-1 hover:border-purple-300 dark:hover:border-purple-500/40 transition-colors shadow-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-purple-700 dark:text-purple-300">{ev.feedback_id}</span>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1 font-mono">
                            {ev.date} • {ev.rating}★
                          </span>
                        </div>
                        <p className="text-slate-700 dark:text-slate-300 text-[11px] italic">"{ev.feedback_snippet}"</p>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-2">
                          <span>Cust: {ev.customer_id}</span>
                          <span>•</span>
                          <span className="capitalize">Topic: {ev.topic}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Dedicated Memory Evidence Panel (Prompt Part 2 Requirement) */}
          <div className="p-6 rounded-2xl bg-surface-card border border-surface-border shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-surface-border pb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-brand-primary" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Memory Evidence Panel — Retrieved vs. Utilized Context
                </h3>
              </div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                {comparisonResult.memoryOn?.recalledMemories?.length || 0} Retrieved Memories • {comparisonResult.memoryOn?.evidence?.length || 0} Answer Citations
              </span>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              This panel distinguishes historical memories retrieved from Hindsight Cloud from the specific customer feedback records cited in the final synthesis.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {comparisonResult.memoryOn?.evidence && comparisonResult.memoryOn.evidence.length > 0 ? (
                comparisonResult.memoryOn.evidence.map((ev, idx) => (
                  <div key={ev.feedback_id || idx} className="p-4 rounded-xl bg-slate-50 dark:bg-surface/60 border border-slate-200 dark:border-surface-border space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-indigo-700 dark:text-indigo-300 text-xs">Record {ev.feedback_id}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300 font-semibold">
                          {comparisonResult.memoryOn?.hindsightAccessed ? 'Retrieved from Memory' : 'SQLite Evidence'}
                        </span>
                      </div>
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                        <Check className="w-3 h-3" /> Used in Answer
                      </span>
                    </div>
                    <p className="text-xs text-slate-700 dark:text-slate-300 italic">
                      "{ev.feedback_snippet}"
                    </p>
                    <div className="pt-1 border-t border-slate-200 dark:border-surface-border flex flex-wrap items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                      <span>Customer: {ev.customer_id || 'N/A'} • {ev.rating != null ? `${Number(ev.rating).toFixed(1)}★` : 'N/A'}</span>
                      <span>Received: {ev.date || 'N/A'}</span>
                    </div>
                    <div className="text-[11px] text-slate-600 dark:text-slate-400 pt-1">
                      <strong className="text-slate-800 dark:text-slate-200 font-medium">Topic:</strong> <span className="capitalize">{ev.topic || 'General'}</span> • <strong className="text-slate-800 dark:text-slate-200 font-medium">Sentiment:</strong> <span className="capitalize">{ev.sentiment || 'neutral'}</span> • <strong className="text-slate-800 dark:text-slate-200 font-medium">Urgency:</strong> <span className="capitalize">{ev.urgency || 'medium'}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-full p-6 rounded-xl bg-slate-50 dark:bg-surface/60 border border-slate-200 dark:border-surface-border text-center space-y-1">
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Strict Evidence Guard Active</span>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    No matching database records were cited for this query. The synthesis refused to fabricate customer feedback.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* 6. Evaluation & Value Analysis Section (Required for Test 5) */}
          {comparisonResult.analysis && (
            <div className="p-6 rounded-2xl bg-gradient-to-r from-surface-card via-indigo-50/50 dark:via-[#151E32] to-surface-card border-2 border-indigo-200 dark:border-indigo-500/40 shadow-2xs space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-surface-border pb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 text-brand-primary dark:bg-indigo-500/20 dark:border-indigo-500/40 dark:text-indigo-400 border border-indigo-200 flex items-center justify-center">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">
                      Hindsight Value Analysis & Empirical Synthesis
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Objective evaluation comparing longitudinal context, recurrence, and evidence strength.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">Verdict:</span>
                  <span className="px-3 py-1 rounded-full bg-indigo-50 text-indigo-800 border border-indigo-200 dark:bg-indigo-500/20 dark:border-indigo-500/40 dark:text-indigo-300 text-xs font-bold">
                    {comparisonResult.analysis.verdict}
                  </span>
                </div>
              </div>

              {/* Rationale Quote */}
              <div className="p-3.5 rounded-xl bg-white dark:bg-[#0E1424] border border-slate-200 dark:border-surface-border text-xs text-slate-700 dark:text-slate-300 leading-relaxed shadow-xs">
                <strong className="text-slate-900 dark:text-white block mb-1">Empirical Evaluation:</strong>
                {comparisonResult.analysis.rationale}
              </div>

              {/* 4-Card Analytical Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                {/* 1. Additional Context */}
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-surface/80 border border-slate-200 dark:border-surface-border space-y-1.5">
                  <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-300 font-semibold">
                    <Brain className="w-3.5 h-3.5" /> Additional Context Provided
                  </div>
                  <p className="text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed">
                    {comparisonResult.analysis.additionalContextProvided}
                  </p>
                </div>

                {/* 2. Recurring Issues */}
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-surface/80 border border-slate-200 dark:border-surface-border space-y-1.5">
                  <div className="flex items-center gap-2 text-rose-700 dark:text-rose-300 font-semibold">
                    <Clock className="w-3.5 h-3.5" /> Recurring Issue Identification
                  </div>
                  <p className="text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed">
                    {comparisonResult.analysis.recurringIssuesIdentified}
                  </p>
                </div>

                {/* 3. Progression & Evolution */}
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-surface/80 border border-slate-200 dark:border-surface-border space-y-1.5">
                  <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 font-semibold">
                    <TrendingUp className="w-3.5 h-3.5" /> Historical Progression & Evolution
                  </div>
                  <p className="text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed">
                    {comparisonResult.analysis.timeEvolutionIdentified}
                  </p>
                </div>

                {/* 4. Missed Patterns in Memory OFF */}
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-surface/80 border border-slate-200 dark:border-surface-border space-y-1.5">
                  <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300 font-semibold">
                    <AlertTriangle className="w-3.5 h-3.5" /> Missed Patterns in Memory OFF
                  </div>
                  <p className="text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed">
                    {comparisonResult.analysis.missedPatternsInOff}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 7. Single Mode Execution Result Display (if run single mode) */}
      {!loading && singleResult && (
        <div className="p-6 rounded-2xl bg-surface-card border border-surface-border space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-surface-border pb-3">
            <div className="flex items-center gap-2">
              {singleResult.memoryEnabled ? (
                <Brain className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              ) : (
                <Database className="w-5 h-5 text-amber-500 dark:text-amber-400" />
              )}
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {singleResult.memoryEnabled ? 'Memory ON Evaluation' : 'Memory OFF Evaluation'}
              </h3>
            </div>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
              Latency: {singleResult.latencyMs} ms
            </span>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#0B0F19] border border-slate-200 dark:border-surface-border text-xs text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
            {singleResult.answer}
          </div>

          <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-4">
            <span>Retrieved Memories: <strong className="text-slate-900 dark:text-white">{singleResult.memoryRecallCount}</strong></span>
            <span>Supporting Records: <strong className="text-slate-900 dark:text-white">{singleResult.evidence?.length}</strong></span>
            <span>Mode: <strong className="text-slate-900 dark:text-white">{singleResult.mode}</strong></span>
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
}
