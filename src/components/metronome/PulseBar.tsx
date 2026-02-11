'use client';

import { useState } from 'react';
import { Activity, Calendar, AlertTriangle, CheckCircle, TrendingUp, Check, X, Loader2, HelpCircle } from 'lucide-react';
import type { MetronomeSummary } from '@/lib/db/metronome';

interface PulseBarProps {
  summary: MetronomeSummary;
  canRunMeeting: boolean;
  canCreate: boolean;
  onStartSync: () => void;
  onNewInitiative: () => void;
  onUpdateNextSync?: (date: string, focus: string) => void;
  onShowOnboarding?: () => void;
  latestSyncId?: string;
}

export default function PulseBar({
  summary,
  canRunMeeting,
  canCreate,
  onStartSync,
  onNewInitiative,
  onUpdateNextSync,
  onShowOnboarding,
  latestSyncId: _latestSyncId,
}: PulseBarProps) {
  const overdueTotal = summary.overdueActionItems + summary.overdueDecisions;

  // AT-17: Editable next sync state
  const [isEditingSync, setIsEditingSync] = useState(false);
  const [editDate, setEditDate] = useState('');
  const [editFocus, setEditFocus] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleStartEdit = () => {
    setEditDate(summary.nextSync.date || '');
    setEditFocus('');
    setIsEditingSync(true);
  };

  const handleSaveSync = async () => {
    if (!onUpdateNextSync) return;
    if (!editDate && !editFocus) return;

    setIsSaving(true);
    try {
      await onUpdateNextSync(editDate, editFocus);
      setIsEditingSync(false);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center justify-between">
        {/* Metrics */}
        <div className="flex items-center gap-6">
          {/* Days to Sync — editable (AT-17) */}
          {isEditingSync ? (
            <div className="flex items-center gap-2 bg-purple-50 px-3 py-2 rounded-lg">
              <input
                type="date"
                value={editDate}
                onChange={(e) => setEditDate(e.target.value)}
                className="text-sm border border-gray-300 rounded px-2 py-1"
              />
              <input
                value={editFocus}
                onChange={(e) => setEditFocus(e.target.value)}
                placeholder="Focus topics..."
                className="text-sm border border-gray-300 rounded px-2 py-1 flex-1 min-w-[140px]"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveSync();
                  if (e.key === 'Escape') setIsEditingSync(false);
                }}
              />
              <button
                onClick={handleSaveSync}
                disabled={isSaving || (!editDate && !editFocus)}
                className="p-1 text-green-600 hover:text-green-700 disabled:text-gray-300"
              >
                {isSaving ? <Loader2 className="animate-spin h-4 w-4" /> : <Check className="h-4 w-4" />}
              </button>
              <button
                onClick={() => setIsEditingSync(false)}
                className="p-1 text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div
              data-onboarding="next-sync"
              onClick={onUpdateNextSync ? handleStartEdit : undefined}
              className={`flex items-center gap-2 ${onUpdateNextSync ? 'cursor-pointer hover:bg-gray-50 rounded-lg px-2 py-1 -mx-2 -my-1' : ''}`}
              title={onUpdateNextSync ? 'Click to edit next sync date' : undefined}
            >
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
          )}

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
          {/* How it Works button (AT-20) */}
          {onShowOnboarding && (
            <button
              onClick={onShowOnboarding}
              className="px-3 py-2 text-xs text-purple-600 border border-purple-300 rounded-lg hover:bg-purple-50 transition-colors flex items-center gap-1"
            >
              <HelpCircle size={14} />
              How it Works
            </button>
          )}
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
