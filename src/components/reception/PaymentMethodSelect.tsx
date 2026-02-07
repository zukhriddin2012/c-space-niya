'use client';

import { useState, useRef, useEffect } from 'react';
import { PaymentIcon } from './PaymentIcon';

interface PaymentMethod {
  id: string;
  name: string;
  code?: string;
  icon?: string;
}

interface PaymentMethodSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: PaymentMethod[];
  placeholder?: string;
  className?: string;
  required?: boolean;
  error?: boolean;
}

export function PaymentMethodSelect({
  value,
  onChange,
  options,
  placeholder = 'Select payment',
  className = '',
  required = false,
  error = false,
}: PaymentMethodSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.id === value);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center gap-2 px-3 py-2 border rounded-lg text-left focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white ${
          error ? 'border-red-300' : 'border-gray-200'
        }`}
      >
        {selected ? (
          <>
            <PaymentIcon code={selected.code} icon={selected.icon} size={20} />
            <span className="flex-1 truncate">{selected.name}</span>
          </>
        ) : (
          <span className="flex-1 text-gray-400 truncate">{placeholder}</span>
        )}
        <svg className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto">
          {/* Empty / all option */}
          <button
            type="button"
            onClick={() => { onChange(''); setIsOpen(false); }}
            className={`w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-gray-50 ${
              !value ? 'bg-purple-50 text-purple-700' : ''
            }`}
          >
            <span className="text-gray-400">{placeholder}</span>
          </button>

          {options.map((pm) => (
            <button
              key={pm.id}
              type="button"
              onClick={() => { onChange(pm.id); setIsOpen(false); }}
              className={`w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-gray-50 ${
                value === pm.id ? 'bg-purple-50 text-purple-700' : ''
              }`}
            >
              <PaymentIcon code={pm.code} icon={pm.icon} size={20} />
              <span>{pm.name}</span>
            </button>
          ))}
        </div>
      )}

      {/* Hidden input for form validation */}
      {required && <input type="hidden" value={value} required />}
    </div>
  );
}
