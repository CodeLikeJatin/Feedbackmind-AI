import React from 'react';
import { Menu, Cpu, Database, RefreshCw, Zap, ShieldCheck, Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

export default function Header({ 
  currentSectionTitle, 
  onToggleMobileMenu, 
  isRefreshing, 
  onRefresh,
  memoryEnabled = true,
  onToggleMemory
}) {
  const { theme, setTheme, isDark } = useTheme();

  const cycleTheme = () => {
    if (theme === 'dark') setTheme('light');
    else if (theme === 'light') setTheme('system');
    else setTheme('dark');
  };

  const nextThemeName = theme === 'dark' ? 'Light' : theme === 'light' ? 'System' : 'Dark';
  const currentThemeLabel = theme === 'dark' ? 'Dark' : theme === 'light' ? 'Light' : `System (${isDark ? 'Dark' : 'Light'})`;

  return (
    <header className="sticky top-0 z-30 h-16 bg-white/90 dark:bg-[#0B0F19]/90 backdrop-blur-md border-b border-surface-border px-4 lg:px-8 flex items-center justify-between transition-colors">
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onToggleMobileMenu}
          className="lg:hidden p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-surface-card transition-colors focus:outline-none focus:ring-2 focus:ring-brand-primary shrink-0"
          aria-label="Open sidebar menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white tracking-tight truncate">
            {currentSectionTitle}
          </h2>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Memory ON/OFF Toggle indicator */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-surface-card border border-surface-border shadow-2xs">
          <span className="text-[11px] font-medium text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
            <Zap className={`w-3.5 h-3.5 ${memoryEnabled ? 'text-brand-accent' : 'text-slate-400 dark:text-slate-500'}`} />
            AI Memory:
          </span>
          <button
            onClick={onToggleMemory}
            className={`text-xs px-2.5 py-0.5 rounded-full font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-brand-accent cursor-pointer ${
              memoryEnabled
                ? 'bg-brand-accent/15 text-brand-accent border border-brand-accent/40 shadow-xs shadow-purple-500/10'
                : 'bg-slate-100 text-slate-500 border border-slate-300 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
            }`}
            title="Click to toggle Hindsight long-term memory retrieval mode"
          >
            {memoryEnabled ? 'ON' : 'OFF'}
          </button>
        </div>

        {/* AI Service Status Indicator */}
        <div className="hidden md:flex items-center gap-2 px-2.5 py-1 rounded-lg bg-surface-card border border-surface-border text-slate-600 dark:text-slate-300 text-[11px] font-medium shadow-2xs">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>AI Engine Ready</span>
        </div>

        {/* Theme Toggle Button */}
        <button
          onClick={cycleTheme}
          aria-label={`Toggle color theme. Current theme is ${currentThemeLabel}. Click to switch to ${nextThemeName} mode.`}
          title={`Theme: ${currentThemeLabel} (Click to switch to ${nextThemeName})`}
          className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-surface-card border border-surface-border transition-colors focus:outline-none focus:ring-2 focus:ring-brand-primary cursor-pointer shadow-2xs"
        >
          {theme === 'light' ? (
            <Sun className="w-4 h-4 text-amber-500" />
          ) : theme === 'dark' ? (
            <Moon className="w-4 h-4 text-indigo-400" />
          ) : (
            <Monitor className="w-4 h-4 text-brand-cyan" />
          )}
        </button>

        {/* Refresh button */}
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-surface-card border border-surface-border transition-colors disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-brand-primary cursor-pointer shadow-2xs"
          title="Refresh dashboard data from backend"
          aria-label="Refresh dashboard data"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-brand-primary' : ''}`} />
        </button>
      </div>
    </header>
  );
}
