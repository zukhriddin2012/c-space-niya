'use client';

import { useState } from 'react';

export type PeriodPreset = 'this_month' | 'last_month' | 'custom';

interface PeriodSelectorProps {
  startDate: string;
  endDate: string;
  onPeriodChange: (start: string, end: string) => void;
}

function getThisMonth() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return { start: fmt(start), end: fmt(end) };
}

function getLastMonth() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const end = new Date(now.getFullYear(), now.getMonth(), 0);
  return { start: fmt(start), end: fmt(end) };
}

function fmt(d: Date) {
  return d.toISOString().split('T')[0];
}

export default function PeriodSelector({ startDate, endDate, onPeriodChange }: PeriodSelectorProps) {
  const thisMonth = getThisMonth();
  const lastMonth = getLastMonth();

  const activePreset: PeriodPreset =
    startDate === thisMonth.start && endDate === thisMonth.end ? 'this_month' :
    startDate === lastMonth.start && endDate === lastMonth.end ? 'last_month' : 'custom';

  const [showCustom, setShowCustom] = useState(activePreset === 'custom');
  const [customStart, setCustomStart] = useState(startDate);
  const [customEnd, setCustomEnd] = useState(endDate);

  function selectPreset(preset: PeriodPreset) {
    if (preset === 'this_month') {
      setShowCustom(false);
      onPeriodChange(thisMonth.start, thisMonth.end);
    } else if (preset === 'last_month') {
      setShowCustom(false);
      onPeriodChange(lastMonth.start, lastMonth.end);
    } else {
      setShowCustom(true);
    }
  }

  function applyCustom() {
    if (customStart && customEnd && customStart <= customEnd) {
      onPeriodChange(customStart, customEnd);
    }
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="inline-flex rounded-lg border border-gray-200 overflow-hidden">
        <button
          onClick={() => selectPreset('this_month')}
          className={`px-3 py-1.5 text-sm font-medium transition-colors ${
            activePreset === 'this_month' ? 'bg-purple-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
          }`}
        >
          This Month
        </button>
        <button
          onClick={() => selectPreset('last_month')}
          className={`px-3 py-1.5 text-sm font-medium transition-colors border-l border-gray-200 ${
            activePreset === 'last_month' ? 'bg-purple-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
          }`}
        >
          Last Month
        </button>
        <button
          onClick={() => selectPreset('custom')}
          className={`px-3 py-1.5 text-sm font-medium transition-colors border-l border-gray-200 ${
            activePreset === 'custom' ? 'bg-purple-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
          }`}
        >
          Custom
        </button>
      </div>
      {showCustom && (
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={customStart}
            onChange={(e) => setCustomStart(e.target.value)}
            className="px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <span className="text-gray-400 text-sm">to</span>
          <input
            type="date"
            value={customEnd}
            onChange={(e) => setCustomEnd(e.target.value)}
            className="px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <button
            onClick={applyCustom}
            className="px-3 py-1.5 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors"
          >
            Apply
          </button>
        </div>
      )}
    </div>
  );
}
