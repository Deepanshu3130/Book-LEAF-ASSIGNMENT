import React from 'react';

/**
 * Clean, single-element pulsing green dot indicating an unread message.
 */
export const UnreadDot = () => {
  return (
    <span
      title="New message"
      className="relative flex h-2.5 w-2.5 items-center justify-center shrink-0"
    >
      <span className="animate-ping motion-reduce:animate-none absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
    </span>
  );
};

export default UnreadDot;
