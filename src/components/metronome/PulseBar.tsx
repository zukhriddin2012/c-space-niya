'use client';

import { Activity, Calendar, AlertTriangle, CheckCircle, TrendingUp } from 'lucide-react';
import type { MetronomeSummary } from '@/lib/db/metronome';

interface PulseBarProps {
  summary: MetronomeSummary;
  canRunMeeting: boolean;
  canCreate: boolean;
  onStartSync: () => void;
  onNewInitiative: () => void;
}

export default function PulseBar({ summary, canRunMeeting, canCreate, onStartSync, onNewInitiative }: PulseBarProps) {
  const overdueTotal = summary.overdueActionItems + summary.overdueDecisions;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center justify-between">
        {/* Metrics */}
        <div className="flex items-center gap-6">
          {/* Days to Sync */}
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-purple-100 flex items-center justify-center">
              <Calendar size={18} className="text-purple-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Next Sync</p>
              <p className="text-sm font-semibold text-gray-900">
                {summary.nextSync.daysUntil !== null
                  ? `${summary.nextSync.daysUntil}d`
                  : '—'}
              </p>
            </div>
          </div>

          {/* Active */}
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center">
              <Activity size={18} className="text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Active</p>
              <p className="text-sm font-semibold text-gray-900">{summary.totalActive}</p>
            </div>
          </div>

          {/* Open Decisions */}
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center">
              <AlertTriangle size={18} className="text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Open Decisions</p>
              <p className="text-sm font-semibold text-gray-900">{summary.openDecisions}</p>
            </div>
          </div>

          {/* Overdue */}
          {overdueTotal > 0 && (
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-lg bg-red-100 flex items-center justify-center">
                <AlertTriangle size={18} className="text-red-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Overdue</p>
                <p className="text-sm font-semibold text-red-600">{overdueTotal}</p>
              </div>
            </div>
          )}

          {/* On Track */}
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-green-100 flex items-center justify-center">
              <TrendingUp size={18} className="text-green-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">On Track</p>
              <p className="text-sm font-semibold text-gray-900">{summary.onTrackPercentage}%</p>
            </div>
          </div>

          {/* Last Sync */}
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center">
              <CheckCircle size={18} className="text-gray-500" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Last Sync</p>
              <p className="text-sm font-semibold text-gray-900">
                {summary.lastSync.date
                  ? new Date(summary.lastSync.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                  : '—'}
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {canCreate && (
            <button
              onClick={onNewInitiative}
              className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              + New
            </button>
          )}
          {canRunMeeting && (
            <button
              onClick={onStartSync}
              className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors"
            >
              Start Sync
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
