import React from 'react';

const STEPS = ['Open', 'In Progress', 'Resolved', 'Closed'];

const STATUS_INDEX = {
  Open: 0,
  'In Progress': 1,
  Resolved: 2,
  Closed: 3,
};

/**
 * Visual progress bar for author ticket status.
 * Four steps in a row with a 2px connecting line.
 *
 * - Done steps: coral dot, coral line before it.
 * - Current step: coral dot with ring-4 ring-coral/20, label in text-coral-deep font-semibold.
 * - Future steps: pale (border-line colour) dot and line.
 */
export const TicketProgress = ({ status = 'Open' }) => {
  const currentIndex = STATUS_INDEX[status] ?? 0;
  const currentStepNumber = currentIndex + 1;
  const isClosedStatus = status === 'Closed';

  return (
    <div
      role="progressbar"
      aria-valuemin={1}
      aria-valuemax={4}
      aria-valuenow={currentStepNumber}
      aria-label={`Ticket progress: ${status}`}
      className="w-full px-2 py-3"
    >
      <div className="flex items-start justify-between">
        {STEPS.map((step, idx) => {
          const isCompleted = isClosedStatus || idx < currentIndex;
          const isCurrent = !isClosedStatus && idx === currentIndex;
          const hasNext = idx < STEPS.length - 1;
          const isConnectorCompleted = isClosedStatus || idx < currentIndex;

          return (
            <React.Fragment key={step}>
              {/* Step indicator (dot + label) */}
              <div className="flex flex-col items-center shrink-0">
                <div className="h-5 flex items-center justify-center">
                  {isCompleted ? (
                    <div
                      className="w-3 h-3 rounded-full bg-coral"
                      aria-hidden="true"
                    />
                  ) : isCurrent ? (
                    <div
                      className="w-3.5 h-3.5 rounded-full bg-coral ring-4 ring-coral/20"
                      aria-hidden="true"
                    />
                  ) : (
                    <div
                      className="w-3 h-3 rounded-full bg-line"
                      aria-hidden="true"
                    />
                  )}
                </div>
                <span
                  className={`text-xs mt-1 text-center whitespace-nowrap select-none ${
                    isCurrent || (isClosedStatus && idx === 3)
                      ? 'text-coral-deep font-semibold'
                      : isCompleted
                      ? 'text-ink font-medium'
                      : 'text-muted font-normal'
                  }`}
                >
                  {step}
                </span>
              </div>

              {/* Connecting line to next step */}
              {hasNext && (
                <div className="flex-1 mx-1.5 sm:mx-2 mt-2.5 h-0.5 self-start">
                  <div
                    className={`h-full w-full rounded-full ${
                      isConnectorCompleted
                        ? 'bg-coral'
                        : 'bg-line'
                    }`}
                  />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

export default TicketProgress;
