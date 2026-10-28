/**
 * Shared status and priority styles matching BookLeaf's warm, friendly theme.
 *
 * Status: small 8px dot + plain text.
 *   - Open: warm slate-denim blue (#4A6FA5 dot, #28436C text)
 *   - In Progress: warm golden amber (#D97706 dot, #B45309 text) - NO harsh yellow!
 *   - Resolved: botanical leaf green (#16A34A dot, #15803D text)
 *   - Closed: warm neutral slate (#9CA3AF dot, #6B7280 text)
 *
 * Coral is NEVER used as a status colour.
 *
 * Priority: plain text only.
 *   - Critical: red semibold (#D92D20)
 *   - High: orange semibold (#E8590C)
 *   - Medium / Low: muted
 */

export const statusBadgeStyles = {
  Open: {
    text: 'text-status-open-text font-medium',
    dot: 'bg-status-open',
  },
  'In Progress': {
    text: 'text-status-progress-text font-medium',
    dot: 'bg-status-progress',
  },
  Resolved: {
    text: 'text-status-resolved-text font-medium',
    dot: 'bg-status-resolved',
  },
  Closed: {
    text: 'text-status-closed-text font-medium',
    dot: 'bg-status-closed',
  },
};

export const priorityBadgeStyles = {
  Critical: {
    text: 'text-priority-critical font-semibold',
  },
  High: {
    text: 'text-priority-high font-semibold',
  },
  Medium: {
    text: 'text-muted',
  },
  Low: {
    text: 'text-muted',
  },
};

/**
 * Returns style for book publication status:
 * 'Published & Live' = green dot; others = warm amber dot.
 */
export const getBookStatusStyle = (status) => {
  if (status === 'Published & Live') {
    return statusBadgeStyles.Resolved;
  }
  return statusBadgeStyles['In Progress'];
};
