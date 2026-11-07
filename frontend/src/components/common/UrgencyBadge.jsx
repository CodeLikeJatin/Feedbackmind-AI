import React from 'react';
import { AlertCircle, AlertTriangle, Info } from 'lucide-react';

export default function UrgencyBadge({ urgency, size = 'sm' }) {
  const norm = (urgency || 'low').toLowerCase();

  let color = 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/30';
  let icon = <Info className="w-3 h-3" />;
  let label = 'Low';

  if (norm === 'high') {
    color = 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/15 dark:text-rose-400 dark:border-rose-500/40 font-semibold';
    icon = <AlertCircle className="w-3 h-3" />;
    label = 'High Priority';
  } else if (norm === 'medium') {
    color = 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/15 dark:text-amber-400 dark:border-amber-500/30';
    icon = <AlertTriangle className="w-3 h-3" />;
    label = 'Medium';
  }

  const sizeClasses = size === 'xs' ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2.5 py-1';

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-medium border ${color} ${sizeClasses}`}>
      {icon}
      {label}
    </span>
  );
}
