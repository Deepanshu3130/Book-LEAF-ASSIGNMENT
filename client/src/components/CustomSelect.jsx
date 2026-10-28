import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

/**
 * Accessible custom select dropdown matching BookLeaf's "friendly bands" theme.
 * Replaces native OS select popups with BookLeaf's soft blush, coral, and rounded listboxes.
 */
export const CustomSelect = ({
  value,
  onChange,
  options = [],
  id,
  className = '',
  buttonClassName = '',
  ariaLabel,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Normalize options: accepts ['Option 1'] or [{ value: '1', label: 'Option 1' }]
  const normalizedOptions = options.map((opt) =>
    typeof opt === 'string' ? { value: opt, label: opt } : opt
  );

  const selectedOption =
    normalizedOptions.find((opt) => String(opt.value) === String(value)) ||
    normalizedOptions[0];

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleSelect = (val) => {
    if (onChange) {
      onChange({ target: { value: val } });
    }
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className={`relative inline-block text-left ${className || 'w-full'}`}>
      <button
        id={id}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={ariaLabel}
        onClick={() => setIsOpen((prev) => !prev)}
        className={
          buttonClassName ||
          'input w-full flex items-center justify-between cursor-pointer'
        }
      >
        <span className="truncate text-left">{selectedOption?.label || 'Select...'}</span>
        <ChevronDown
          className={`w-3.5 h-3.5 ml-2 text-muted shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {isOpen && (
        <ul
          role="listbox"
          tabIndex={-1}
          className="absolute left-0 mt-1.5 min-w-full w-max max-w-[calc(100vw-3rem)] sm:max-w-sm bg-white border border-line rounded-xl shadow-lg py-1 z-50 max-h-60 overflow-y-auto focus:outline-none animate-fade-in-up"
        >
          {normalizedOptions.map((opt) => {
            const isSelected = String(opt.value) === String(value);
            return (
              <li
                key={opt.value}
                role="option"
                aria-selected={isSelected}
                onClick={() => handleSelect(opt.value)}
                className={`px-3.5 py-2 text-xs sm:text-sm flex items-center justify-between cursor-pointer transition-colors ${
                  isSelected
                    ? 'bg-blush text-coral-deep font-semibold'
                    : 'text-body hover:bg-blush-soft hover:text-coral-deep'
                }`}
              >
                <span className="truncate">{opt.label}</span>
                {isSelected && <Check className="w-3.5 h-3.5 text-coral shrink-0 ml-2" />}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default CustomSelect;
