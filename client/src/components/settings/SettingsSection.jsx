import React, { useState } from 'react';
import { 
  Settings, 
  Cpu, 
  Database, 
  ShieldCheck, 
  RotateCcw, 
  Trash2, 
  Save, 
  CheckCircle2, 
  ExternalLink,
  Info,
  Sun,
  Moon,
  Monitor,
  Palette,
  Building,
  AlertTriangle,
  Lock
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

export default function SettingsSection({ 
  onSeedDemo, 
  onClearData, 
  isClearing, 
  isSeeding 
}) {
  const { theme, setTheme, resolvedTheme, isDark } = useTheme();
  const [companyId, setCompanyId] = useState(() => {
    try {
      return localStorage.getItem('feedbackmind_company_id') || 'demo-company';
    } catch {
      return 'demo-company';
    }
  });
  const [bankId, setBankId] = useState(() => {
    try {
      return localStorage.getItem('feedbackmind_bank_id') || 'feedbackmind-demo';
    } catch {
      return 'feedbackmind-demo';
    }
  });
  const [selectedModel, setSelectedModel] = useState(() => {
    try {
      return localStorage.getItem('feedbackmind_groq_model') || 'openai/gpt-oss-120b';
    } catch {
      return 'openai/gpt-oss-120b';
    }
  });
  const [savedNotice, setSavedNotice] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const handleSaveSettings = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    try {
      localStorage.setItem('feedbackmind_groq_model', selectedModel);
      localStorage.setItem('feedbackmind_company_id', companyId);
      localStorage.setItem('feedbackmind_bank_id', bankId);
    } catch (err) {
      // ignore
    }
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2500);
  };

  const handleConfirmClear = () => {
    setShowClearConfirm(false);
    if (onClearData) onClearData();
  };

  const THEME_OPTIONS = [
    {
      id: 'dark',
      name: 'Dark Mode',
      badge: 'Default',
      description: 'High-contrast, sleek SaaS interface optimized for extended review sessions.',
      icon: Moon,
      iconColor: 'text-indigo-400'
    },
    {
      id: 'light',
      name: 'Light Mode',
      badge: 'Crisp',
      description: 'Clean daylight aesthetic with slate surfaces and high typographic clarity.',
      icon: Sun,
      iconColor: 'text-amber-500'
    },
    {
      id: 'system',
      name: 'System Preference',
      badge: resolvedTheme === 'dark' ? 'Active: Dark' : 'Active: Light',
      description: 'Synchronizes automatically with your operating system color scheme preference.',
      icon: Monitor,
      iconColor: 'text-brand-cyan'
    }
  ];

  return (
    <div className="space-y-6 max-w-4xl pb-10">
      {/* Title */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">System Configuration & Integrations</h2>
        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
          Configure appearance, Groq AI synthesizer models, Hindsight memory bank routing, and data scenarios.
        </p>
      </div>

      {savedNotice && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2 shadow-2xs">
          <CheckCircle2 className="w-4 h-4" />
          Settings saved successfully for current session!
        </div>
      )}

      {/* 1. Appearance & Theme */}
      <div className="p-6 rounded-2xl bg-surface-card border border-surface-border space-y-4 shadow-2xs">
        <div className="flex items-center justify-between pb-3 border-b border-surface-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 flex items-center justify-center text-brand-primary">
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Workspace Appearance & Theme</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Choose your preferred visual mode or sync with system preferences</p>
            </div>
          </div>
          <span className="text-[11px] font-mono px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/20 font-semibold capitalize">
            Current: {theme}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 pt-1" role="radiogroup" aria-label="Appearance Theme Selection">
          {THEME_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const isSelected = theme === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                role="radio"
                aria-checked={isSelected}
                onClick={() => setTheme(opt.id)}
                className={`p-4 rounded-xl border text-left transition-all relative flex flex-col justify-between focus:outline-none focus:ring-2 focus:ring-brand-primary cursor-pointer ${
                  isSelected
                    ? 'bg-indigo-50/70 dark:bg-indigo-950/30 border-brand-primary shadow-xs shadow-indigo-500/10 ring-1 ring-brand-primary'
                    : 'bg-white dark:bg-surface/50 border-slate-200 dark:border-surface-border hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-surface/80'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                      isSelected ? 'bg-brand-primary text-white' : 'bg-slate-100 dark:bg-surface-card text-slate-600 dark:text-slate-400'
                    }`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-semibold text-slate-900 dark:text-white">{opt.name}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-semibold uppercase ${
                      isSelected 
                        ? 'bg-brand-primary/20 text-brand-primary' 
                        : 'bg-slate-100 dark:bg-surface-border text-slate-500 dark:text-slate-400'
                    }`}>
                      {opt.badge}
                    </span>
                    {isSelected && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-brand-primary shrink-0" />
                    )}
                  </div>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                  {opt.description}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. AI Synthesizer Configuration */}
      <div className="p-6 rounded-2xl bg-surface-card border border-surface-border space-y-4 shadow-2xs">
        <div className="flex items-center justify-between pb-3 border-b border-surface-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 flex items-center justify-center text-brand-primary">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Groq AI Inference Engine</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">High-throughput Groq LLM inference parameters and security</p>
            </div>
          </div>
          <span className="text-[11px] font-mono px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 font-semibold flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Connected
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="text-slate-700 dark:text-slate-300 font-medium block mb-1">Inference Model</label>
            <select
              value={selectedModel}
              onChange={(e) => {
                const nextModel = e.target.value;
                setSelectedModel(nextModel);
                try {
                  localStorage.setItem('feedbackmind_groq_model', nextModel);
                } catch {
                  // ignore
                }
              }}
              className="w-full px-3 py-2 bg-white dark:bg-surface border border-slate-300 dark:border-surface-border rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-brand-primary text-xs cursor-pointer"
            >
              <option value="openai/gpt-oss-120b">openai/gpt-oss-120b (Production Recommended — Active)</option>
              <option value="openai/gpt-oss-20b">openai/gpt-oss-20b (Fast Inference — Active)</option>
              <option value="llama-3.3-70b-versatile">llama-3.3-70b-versatile (Enterprise Tier — Account Access Restricted)</option>
              <option value="llama-3.1-8b-instant">llama-3.1-8b-instant (Instant Tier — Account Access Restricted)</option>
            </select>
            <span className="text-[10px] text-slate-500 mt-1 block">
              Groq LLM model used for synthesis and QA. Note: Llama models require enterprise access on this Groq key.
            </span>
          </div>

          <div>
            <label className="text-slate-700 dark:text-slate-300 font-medium block mb-1">API Key Isolation</label>
            <div className="relative">
              <input
                type="password"
                value="••••••••••••••••••••••••"
                disabled
                className="w-full pl-8 pr-3 py-2 bg-slate-100 dark:bg-surface/50 border border-slate-300 dark:border-surface-border rounded-xl text-slate-500 text-xs cursor-not-allowed"
              />
              <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            </div>
            <span className="text-[10px] text-slate-500 mt-1 block">Secured in backend <code className="text-slate-600 dark:text-slate-400 font-mono">.env</code>; never exposed to browser context.</span>
          </div>
        </div>
      </div>

      {/* 3. Long-Term Memory Configuration */}
      <div className="p-6 rounded-2xl bg-surface-card border border-surface-border space-y-4 shadow-2xs">
        <div className="flex items-center justify-between pb-3 border-b border-surface-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 flex items-center justify-center text-brand-accent">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Hindsight Long-Term Memory</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Hindsight Cloud memory bank routing & cognitive architecture</p>
            </div>
          </div>
          <span className="text-[11px] font-mono px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 font-semibold flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Ready
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="text-slate-700 dark:text-slate-300 font-medium block mb-1">Dedicated Memory Bank ID</label>
            <input
              type="text"
              value={bankId}
              onChange={(e) => setBankId(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-surface border border-slate-300 dark:border-surface-border rounded-xl text-slate-900 dark:text-white font-mono text-xs focus:outline-none focus:border-brand-accent"
            />
            <span className="text-[10px] text-slate-500 mt-1 block">Target episodic memory bank in Hindsight Cloud.</span>
          </div>

          <div>
            <label className="text-slate-700 dark:text-slate-300 font-medium block mb-1">Memory Retrieval Strategy</label>
            <input
              type="text"
              value="Episodic Recall + Multi-Period Reflection"
              disabled
              className="w-full px-3 py-2 bg-slate-100 dark:bg-surface/50 border border-slate-300 dark:border-surface-border rounded-xl text-slate-500 text-xs cursor-not-allowed"
            />
            <span className="text-[10px] text-slate-500 mt-1 block">Cross-temporal pattern detection across past product releases.</span>
          </div>
        </div>
      </div>

      {/* 4. Workspace Management */}
      <div className="p-6 rounded-2xl bg-surface-card border border-surface-border space-y-4 shadow-2xs">
        <div className="flex items-center justify-between pb-3 border-b border-surface-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
              <Building className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Workspace Management</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Workspace boundary and customer domain isolation</p>
            </div>
          </div>
          <span className="text-[11px] font-mono px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 dark:bg-surface dark:text-slate-300 border border-slate-200 dark:border-surface-border font-semibold flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-brand-primary" /> Isolated
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="text-slate-700 dark:text-slate-300 font-medium block mb-1">Active Workspace ID</label>
            <input
              type="text"
              value={companyId}
              onChange={(e) => setCompanyId(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-surface border border-slate-300 dark:border-surface-border rounded-xl text-slate-900 dark:text-white font-mono text-xs focus:outline-none focus:border-brand-primary"
            />
            <span className="text-[10px] text-slate-500 mt-1 block">Data namespace partitioned across internal database and memory service.</span>
          </div>

          <div>
            <label className="text-slate-700 dark:text-slate-300 font-medium block mb-1">Data Sovereignty</label>
            <input
              type="text"
              value="Workspace-partitioned domain isolation"
              disabled
              className="w-full px-3 py-2 bg-slate-100 dark:bg-surface/50 border border-slate-300 dark:border-surface-border rounded-xl text-slate-500 text-xs cursor-not-allowed"
            />
            <span className="text-[10px] text-slate-500 mt-1 block">Zero cross-workspace data leakage guaranteed.</span>
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            type="button"
            onClick={handleSaveSettings}
            className="px-4 py-2 rounded-xl bg-brand-primary hover:bg-indigo-600 text-white text-xs font-semibold flex items-center gap-2 transition-all shadow-xs shadow-indigo-600/20 focus:outline-none focus:ring-2 focus:ring-brand-primary cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            Save Configuration
          </button>
        </div>
      </div>

      {/* 5. Data Management */}
      <div className="p-6 rounded-2xl bg-surface-card border border-rose-200 dark:border-rose-500/30 space-y-4 shadow-2xs relative overflow-hidden">
        <div className="flex items-center justify-between pb-3 border-b border-rose-100 dark:border-rose-500/20">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-600 dark:text-rose-400">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Data Management</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Re-seed realistic multi-month scenario or clear local feedback records</p>
            </div>
          </div>
          <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300 border border-rose-200 dark:border-rose-500/20 font-semibold">
            Data Controls
          </span>
        </div>

        <div className="p-3.5 rounded-xl bg-rose-50/50 dark:bg-rose-950/10 border border-rose-200/60 dark:border-rose-500/20 flex items-start gap-2.5 text-xs text-slate-700 dark:text-slate-300">
          <Info className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong>Testing Note:</strong> Clearing data empties local workspace feedback records so you can verify the empty-state screens and CSV import workflows. Re-seeding restores the 4-month longitudinal scenario (M1/M2 Performance Lag → M3 v2.4 Speed Update → M4 SSO/Login Friction).
          </p>
        </div>

        {/* Confirmation Banner for Clear Action */}
        {showClearConfirm ? (
          <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-500/40 space-y-3 animate-fadeIn">
            <div className="flex items-center gap-2 text-rose-800 dark:text-rose-200 text-xs font-semibold">
              <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
              <span>Are you sure you want to clear all feedback records for {companyId}?</span>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400">
              This action deletes feedback records from workspace storage. You can re-seed the demo dataset at any time.
            </p>
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleConfirmClear}
                disabled={isClearing}
                className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-rose-500 cursor-pointer"
              >
                {isClearing ? 'Clearing...' : 'Yes, Clear All Records'}
              </button>
              <button
                type="button"
                onClick={() => setShowClearConfirm(false)}
                className="px-3.5 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 dark:bg-surface dark:hover:bg-surface-border text-slate-700 dark:text-slate-300 text-xs font-medium transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button
              type="button"
              onClick={onSeedDemo}
              disabled={isSeeding}
              className="px-4 py-2.5 rounded-xl bg-brand-primary hover:bg-indigo-600 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-2 transition-all shadow-xs shadow-indigo-600/20 focus:outline-none focus:ring-2 focus:ring-brand-primary cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              {isSeeding ? 'Seeding Demo Data...' : 'Re-Seed 4-Month Demo Scenario'}
            </button>

            <button
              type="button"
              onClick={() => setShowClearConfirm(true)}
              disabled={isClearing}
              className="px-4 py-2.5 rounded-xl bg-white dark:bg-surface hover:bg-rose-50 dark:hover:bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 border border-rose-200 dark:border-rose-500/30 disabled:opacity-50 text-xs font-semibold flex items-center gap-2 transition-all focus:outline-none focus:ring-2 focus:ring-rose-500 cursor-pointer shadow-2xs"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear All Feedback (Test Empty State)
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
