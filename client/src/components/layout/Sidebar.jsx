import React from 'react';
import { 
  LayoutDashboard, 
  Inbox, 
  Sparkles, 
  TrendingUp, 
  MessageSquare, 
  Brain, 
  Settings, 
  Database,
  Scale,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

const NAV_ITEMS = [
  { id: 'overview', label: 'Dashboard Overview', icon: LayoutDashboard },
  { id: 'inbox', label: 'Feedback Inbox', icon: Inbox },
  { id: 'insights', label: 'AI Insights', icon: Sparkles },
  { id: 'trends', label: 'Trend Analysis', icon: TrendingUp },
  { id: 'chat', label: 'Ask FeedbackMind', icon: MessageSquare },
  { id: 'memory', label: 'Memory Centre', icon: Brain },
  { id: 'demo', label: 'Memory Demo', icon: Scale },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export default function Sidebar({ 
  currentSection, 
  onSelectSection, 
  totalFeedback = 0, 
  isCollapsed, 
  onToggleCollapse,
  isMobileOpen,
  onCloseMobile
}) {
  return (
    <>
      {/* Mobile backdrop */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      <aside 
        className={`fixed top-0 bottom-0 left-0 z-50 bg-white dark:bg-[#0E1424] border-r border-surface-border flex flex-col transition-all duration-300 ease-in-out ${
          isCollapsed ? 'w-20' : 'w-64'
        } ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand header */}
        <div className="h-16 px-4 flex items-center justify-between border-b border-surface-border">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-primary via-indigo-500 to-brand-accent flex items-center justify-center shrink-0 shadow-md shadow-indigo-500/20">
              <Brain className="w-5 h-5 text-white" />
            </div>
            {!isCollapsed && (
              <div className="min-w-0">
                <span className="font-bold text-slate-900 dark:text-white tracking-tight text-sm block truncate">FeedbackMind AI</span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium block truncate">Customer Feedback Intelligence</span>
              </div>
            )}
          </div>
          <button
            onClick={onToggleCollapse}
            className="hidden lg:flex p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-surface-card transition-colors focus:outline-none focus:ring-2 focus:ring-brand-primary cursor-pointer"
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = currentSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onSelectSection(item.id);
                  if (onCloseMobile) onCloseMobile();
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all group relative focus:outline-none focus:ring-2 focus:ring-brand-primary cursor-pointer ${
                  isActive
                    ? 'bg-brand-primary text-white shadow-xs shadow-indigo-600/25 font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-300 dark:hover:text-white dark:hover:bg-surface-card/80'
                }`}
                title={isCollapsed ? item.label : undefined}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon className={`w-4 h-4 shrink-0 transition-transform ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400'}`} />
                {!isCollapsed && (
                  <span className="truncate flex-1 text-left">{item.label}</span>
                )}
                {!isCollapsed && item.id === 'inbox' && totalFeedback > 0 && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-mono ${
                    isActive ? 'bg-indigo-900/60 text-white' : 'bg-slate-200 text-slate-700 dark:bg-surface-border dark:text-slate-300'
                  }`}>
                    {totalFeedback}
                  </span>
                )}
                {!isCollapsed && item.badge && (
                  <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono uppercase tracking-wider font-semibold ${
                    item.badge === 'Groq' 
                      ? 'bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-500/20 dark:text-indigo-300 dark:border-indigo-500/30'
                      : item.badge === 'Hindsight'
                        ? 'bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-500/20 dark:text-purple-300 dark:border-purple-500/30'
                        : 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Memory bank status footer */}
        <div className="p-3 border-t border-surface-border bg-slate-50 dark:bg-surface/40">
          <div className="p-2.5 rounded-xl bg-white dark:bg-surface-card/60 border border-slate-200 dark:border-surface-border/60 shadow-2xs">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              {!isCollapsed && (
                <div className="min-w-0">
                  <span className="text-[11px] font-semibold text-slate-800 dark:text-slate-200 block truncate">Memory Service Connected</span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono block truncate flex items-center gap-1">
                    <Database className="w-2.5 h-2.5 text-brand-primary" />
                    Active Bank: feedbackmind-demo
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
