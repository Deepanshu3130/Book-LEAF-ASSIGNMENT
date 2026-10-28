import React from 'react';

/**
 * Presentational page-header band used by every page.
 * Renders a blush background with a decorative blob SVG and a curved bottom edge.
 *
 * Props:
 *  - title        (string)  – the page heading
 *  - subtitle     (string)  – one-line description under the title
 *  - action       (element) – optional button/link placed on the right
 *  - above        (element) – optional content above the title (e.g. a back-link)
 *  - children     (element) – optional extra content below the subtitle (e.g. summary, tabs)
 */
export const PageBand = ({ title, subtitle, action, above, children }) => {
  return (
    <div className="relative overflow-hidden bg-blush rounded-b-[32px]">
      {/* Decorative blob + swirl lines */}
      <svg
        viewBox="-100 -100 200 200"
        aria-hidden="true"
        className="absolute -right-12 -top-16 w-56 sm:w-80 opacity-95 pointer-events-none"
      >
        <path
          fill="var(--color-blush-deep)"
          d="M44.7,-58.3C57.6,-49.4,67.4,-35.1,71.6,-19.3C75.8,-3.5,74.4,13.8,67.1,27.7C59.8,41.6,46.6,52,32.2,59.5C17.8,67,2.2,71.6,-14.4,70.2C-31,68.8,-48.6,61.4,-58.9,48.3C-69.2,35.2,-72.2,16.4,-70.4,-1C-68.6,-18.4,-62,-34.4,-50.8,-43.7C-39.6,-52.9,-23.8,-55.4,-8.7,-57.3C-6.4,-59.2,31.8,-67.2,44.7,-58.3Z"
        />
        <path fill="none" stroke="#fff" strokeWidth="1.2" d="M-85 30 C-40 -70, 30 70, 85 -25" />
        <path fill="none" stroke="#fff" strokeWidth="1.2" d="M-80 50 C-30 -50, 40 80, 90 -5" />
      </svg>

      {/* Content */}
      <div className="relative z-10 mx-auto max-w-6xl px-6 py-7">
        {/* Above slot (e.g. back link) */}
        {above && <div className="mb-2">{above}</div>}

        {/* Title row */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-coral-deep">{title}</h1>
            {subtitle && <p className="text-sm text-muted mt-1">{subtitle}</p>}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>

        {/* Children slot (summary lines, tabs, etc.) */}
        {children && <div className="mt-4">{children}</div>}
      </div>
    </div>
  );
};

export default PageBand;
