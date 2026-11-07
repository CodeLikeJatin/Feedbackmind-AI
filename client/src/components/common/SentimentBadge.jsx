import React from 'react';
import { ThumbsUp, ThumbsDown, Minus } from 'lucide-react';

export default function SentimentBadge({ sentiment, showIcon = true, size = 'sm' }) {
  const norm = (sentiment || '').toLowerCase();
  
  let color = 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
  let icon = <Minus className="w-3 h-3" />;
  let label = 'Neutral';

  if (norm === 'positive') {
    color = 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/30';
    icon = <ThumbsUp className="w-3 h-3" />;
    label = 'Positive';
  } else if (norm === 'negative') {
    color = 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/30';
    icon = <ThumbsDown className="w-3 h-3" />;
    label = 'Negative';
  }

  const sizeClasses = size === 'xs' ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2.5 py-1';

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-medium border ${color} ${sizeClasses}`}>
      {showIcon && icon}
      {label}
    </span>
  );
}
