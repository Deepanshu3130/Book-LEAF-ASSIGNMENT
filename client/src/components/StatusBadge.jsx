import React from 'react';

/**
 * Status indicator: small 8px colored dot + plain text.
 * Open = blue, In Progress = amber, Resolved = green, Closed = grey.
 */
export const StatusBadge = ({ status }) => {
  const dotColors = {
    Open: 'bg-blue-500',
    'In Progress': 'bg-amber-500',
    Resolved: 'bg-emerald-500',
    Closed: 'bg-slate-400',
  };

  const dotClass = dotColors[status] || 'bg-slate-400';

  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-ink font-medium">
      <span className={`w-2 h-2 rounded-full ${dotClass} shrink-0`} />
      <span>{status}</span>
    </span>
  );
};

/**
 * Priority indicator: Critical (red dot), High (orange dot), Medium & Low (plain muted text).
 */
export const PriorityBadge = ({ priority }) => {
  if (priority === 'Critical') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-rose-600 font-semibold">
        <span className="w-2 h-2 rounded-full bg-rose-600 shrink-0" />
        <span>Critical</span>
      </span>
    );
  }

  if (priority === 'High') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-orange-600 font-medium">
        <span className="w-2 h-2 rounded-full bg-orange-500 shrink-0" />
        <span>High</span>
      </span>
    );
  }

  return (
    <span className="text-xs text-muted font-normal">
      {priority}
    </span>
  );
};

export default StatusBadge;
