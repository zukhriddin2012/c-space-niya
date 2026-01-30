'use client';

import { Monitor } from 'lucide-react';
import { useReceptionMode } from '@/contexts/ReceptionModeContext';

export function ReceptionModeToggle() {
  const { isReceptionMode, toggleReceptionMode } = useReceptionMode();

  return (
    <button
      onClick={toggleReceptionMode}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
        isReceptionMode
          ? 'bg-purple-100 text-purple-700'
          : 'text-gray-600 hover:bg-gray-100'
      }`}
      title={isReceptionMode ? 'Exit Reception Mode' : 'Enter Reception Mode'}
    >
      <Monitor className="w-4 h-4" />
      <span className="hidden xl:inline">
        {isReceptionMode ? 'Exit Reception' : 'Reception Mode'}
      </span>
    </button>
  );
}
