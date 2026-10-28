import React from 'react';
import { statusBadgeStyles, priorityBadgeStyles, getBookStatusStyle } from './badgeStyles';

/**
 * Status: small 8px dot + plain text (no pill, no border).
 * Open = blue, In Progress = amber, Resolved = green, Closed = grey.
 */
export const StatusBadge = ({ status }) => {
  const config = statusBadgeStyles[status] || statusBadgeStyles.Closed;

  return (
    <span className={`inline-flex items-center gap-1.5 text-xs whitespace-nowrap ${config.text}`}>
      <span className={`w-2 h-2 rounded-full shrink-0 ${config.dot}`} aria-hidden="true" />
      <span>{status}</span>
    </span>
  );
};

/**
 * Priority: plain text; only Critical (red) and High (orange) get colour and are semibold.
 * Medium and Low are muted. No flag icons, no pill borders.
 */
export const PriorityBadge = ({ priority }) => {
  const config = priorityBadgeStyles[priority] || priorityBadgeStyles.Low;

  return (
    <span className={`text-xs whitespace-nowrap ${config.text}`}>
      {priority}
    </span>
  );
};

/**
 * Book publication status: small dot + text.
 */
export const BookStatusBadge = ({ status }) => {
  const config = getBookStatusStyle(status);

  return (
    <span className={`inline-flex items-center gap-1.5 text-xs whitespace-nowrap ${config.text}`}>
      <span className={`w-2 h-2 rounded-full shrink-0 ${config.dot}`} aria-hidden="true" />
      <span>{status}</span>
    </span>
  );
};

export default StatusBadge;
