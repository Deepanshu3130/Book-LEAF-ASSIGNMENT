import React, { useEffect, useRef } from 'react';
import { AlertTriangle } from 'lucide-react';

/**
 * Accessible confirmation dialog modal.
 * Moves focus to Cancel button on open, closes on Escape or backdrop click.
 */
export const ConfirmModal = ({
  open,
  title = 'Are you sure?',
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
}) => {
  const cancelButtonRef = useRef(null);

  // Focus the Cancel button on open and listen for Escape key
  useEffect(() => {
    if (!open) return;

    cancelButtonRef.current?.focus();

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onCancel();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs transition-opacity"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div className="bg-white border border-line rounded-2xl p-6 max-w-md w-full shadow-xl relative transform transition-all animate-fade-in-up">
        <div className="flex items-start gap-3.5 mb-4">
          <div className="w-10 h-10 rounded-full bg-blush text-coral-deep flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5 text-coral" />
          </div>
          <div>
            <h2 id="confirm-modal-title" className="text-base font-semibold text-ink">
              {title}
            </h2>
            <div className="text-xs text-muted mt-1 leading-relaxed">
              {message}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5 mt-6 pt-3 border-t border-line/60">
          <button
            ref={cancelButtonRef}
            type="button"
            onClick={onCancel}
            className="btn-secondary text-xs px-4 py-2"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="btn-primary text-xs px-4 py-2 !bg-coral hover:!bg-coral-deep"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
