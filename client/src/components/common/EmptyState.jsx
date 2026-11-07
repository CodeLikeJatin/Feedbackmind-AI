import React from 'react';
import { Inbox, RotateCcw, Upload } from 'lucide-react';

export default function EmptyState({ 
  title = "No customer feedback found",
  description = "Your feedback repository is currently empty. Seed the realistic 4-month demo scenario or import customer feedback from CSV.",
  onSeedDemo,
  onOpenUpload,
  isSeeding = false
}) {
  return (
    <div className="p-12 sm:p-16 rounded-2xl bg-surface-card border border-surface-border text-center max-w-xl mx-auto my-8 shadow-sm">
      <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-brand-primary mx-auto flex items-center justify-center mb-5 shadow-inner">
        <Inbox className="w-8 h-8" />
      </div>
      <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">{title}</h3>
      <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
        {description}
      </p>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <button
          onClick={onSeedDemo}
          disabled={isSeeding}
          className="px-4 py-2.5 rounded-xl bg-brand-primary hover:bg-indigo-600 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-indigo-600/25 transition-all focus:outline-none focus:ring-2 focus:ring-brand-primary"
        >
          <RotateCcw className="w-4 h-4" />
          {isSeeding ? 'Seeding Demo Data...' : 'Seed 4-Month Demo Scenario'}
        </button>

        <button
          onClick={onOpenUpload}
          className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-surface dark:hover:bg-surface-border text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white border border-slate-300 dark:border-surface-border text-xs font-semibold flex items-center gap-2 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-primary"
        >
          <Upload className="w-4 h-4" />
          Upload Feedback CSV
        </button>
      </div>
    </div>
  );
}
