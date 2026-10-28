import React from 'react';

/**
 * Clean pulsing green dot indicating an unread message.
 * Rendered inside a fixed-width slot (w-3 shrink-0) so subjects always align.
 */
export const UnreadDot = () => {
  return (
    <span
      title="New message"
      className="relative flex h-2.5 w-2.5 items-center justify-center shrink-0"
    >
      <span className="animate-ping motion-reduce:animate-none absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
      <span className="sr-only">New message</span>
    </span>
  );
};

export default UnreadDot;
