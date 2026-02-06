'use client';

import { useEffect, useState } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

export interface ToastData {
  id: string;
  variant: ToastVariant;
  title: string;
  message?: string;
  action?: { label: string; onClick: () => void };
  duration?: number;
}

const variantStyles: Record<ToastVariant, { bg: string; border: string; icon: typeof CheckCircle }> = {
  success: { bg: 'bg-emerald-50', border: 'border-emerald-300', icon: CheckCircle },
  error: { bg: 'bg-red-50', border: 'border-red-300', icon: XCircle },
  warning: { bg: 'bg-amber-50', border: 'border-amber-300', icon: AlertTriangle },
  info: { bg: 'bg-blue-50', border: 'border-blue-300', icon: Info },
};

const variantIconColors: Record<ToastVariant, string> = {
  success: 'text-emerald-600',
  error: 'text-red-600',
  warning: 'text-amber-600',
  info: 'text-blue-600',
};

interface ToastProps {
  toast: ToastData;
  onDismiss: (id: string) => void;
}

export default function Toast({ toast, onDismiss }: ToastProps) {
  const [isVisible, setIsVisible] = useState(false);
  const style = variantStyles[toast.variant];
  const IconComponent = style.icon;
  const iconColor = variantIconColors[toast.variant];

  // Default durations
  const defaultDuration = toast.variant === 'error' ? 8000 : toast.variant === 'warning' ? 8000 : 5000;
  const duration = toast.duration || defaultDuration;

  useEffect(() => {
    // Animate in
    requestAnimationFrame(() => setIsVisible(true));

    // Auto-dismiss
    if (duration > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(() => onDismiss(toast.id), 300);
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [toast.id, duration, onDismiss]);

  return (
    <div
      className={`
        w-80 rounded-lg border shadow-lg p-4 transition-all duration-300 ease-out
        ${style.bg} ${style.border}
        ${isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
      `}
      role="alert"
    >
      <div className="flex items-start gap-3">
        <IconComponent size={20} className={`${iconColor} flex-shrink-0 mt-0.5`} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900">{toast.title}</p>
          {toast.message && (
            <p className="text-sm text-gray-600 mt-0.5">{toast.message}</p>
          )}
          {toast.action && (
            <button
              onClick={toast.action.onClick}
              className="text-sm font-medium text-purple-600 hover:text-purple-700 mt-1"
            >
              {toast.action.label}
            </button>
          )}
        </div>
        <button
          onClick={() => {
            setIsVisible(false);
            setTimeout(() => onDismiss(toast.id), 300);
          }}
          className="text-gray-400 hover:text-gray-600 flex-shrink-0"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
