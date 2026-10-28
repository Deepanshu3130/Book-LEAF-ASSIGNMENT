import React from 'react';

/**
 * Tiny reusable loading skeleton placeholder block.
 * Uses animate-pulse with motion-reduce:animate-none for accessibility.
 */
export const Skeleton = ({ className = '', ...props }) => {
  return (
    <div
      className={`animate-pulse motion-reduce:animate-none bg-slate-200 dark:bg-slate-800 rounded-md ${className}`}
      {...props}
    />
  );
};

export default Skeleton;
