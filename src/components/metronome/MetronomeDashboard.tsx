'use client';

import { useState, useEffect, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';
import PulseBar from './PulseBar';
import MonthCalendar from './MonthCalendar';
import DecisionCard from './DecisionCard';
import InitiativeCard from './InitiativeCard';
import MeetingMode from './MeetingMode';
import NewInitiativeModal from './NewInitiativeModal';
import type {
  MetronomeSummary,
  MetronomeInitiativeRow,
  MetronomeActionItemRow,
  MetronomeDecisionRow,
  MetronomeKeyDateRow,
} from '@/lib/db/metronome';
import type { UserRole } from '@/types';

interface MetronomeDashboardProps {
  userId: string;
  userRole: UserRole;
  canEdit: boolean;
  canCreate: boolean;
  canRunMeeting: boolean;
  canManageDates: boolean;
}

export default function MetronomeDashboard({
  userId,
  userRole: _userRole,
  canEdit,
  canCreate,
  canRunMeeting,
  canManageDates: _canManageDates,
}: MetronomeDashboardProps) {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<MetronomeSummary | null>(null);
  const [initiatives, setInitiatives] = useState<MetronomeInitiativeRow[]>([]);
  const [decisions, setDecisions] = useState<MetronomeDecisionRow[]>([]);
  const [keyDates, setKeyDates] = useState<MetronomeKeyDateRow[]>([]);
  const [actionItemsMap, setActionItemsMap] = useState<Record<string, MetronomeActionItemRow[]>>({});
  const [showMeeting, setShowMeeting] = useState(false);
  const [showNewForm, setShowNewForm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Current month for calendar
  const now = new Date();
  const [calYear, setCalYear] = useState(now.getFullYear());
  const [calMonth, setCalMonth] = useState(now.getMonth());

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const monthStart = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-01`;
      const lastDay = new Date(calYear, calMonth + 1, 0).getDate();
      const monthEnd = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${lastDay}`;

      // SEC-H3: Fetch all action items in a single request instead of N+1
      const [summaryRes, initRes, decRes, datesRes, allItemsRes] = await Promise.all([
        fetch('/api/metronome/syncs/summary'),
        fetch('/api/metronome/initiatives?archived=false'),
        fetch('/api/metronome/decisions?status=open'),
        fetch(`/api/metronome/key-dates?from=${monthStart}&to=${monthEnd}`),
        fetch('/api/metronome/action-items'),
      ]);

      if (summaryRes.ok) {
        const { data } = await summaryRes.json();
        setSummary(data);
      }

      if (initRes.ok) {
        const { data } = await initRes.json();
        setInitiatives(data || []);
      }

      // SEC-H3: Group all action items by initiative_id client-side
      if (allItemsRes.ok) {
        const { data: allItems } = await allItemsRes.json();
        const itemsMap: Record<string, MetronomeActionItemRow[]> = {};
        for (const item of (allItems || [])) {
          if (!itemsMap[item.initiative_id]) {
            itemsMap[item.initiative_id] = [];
          }
          itemsMap[item.initiative_id].push(item);
        }
        setActionItemsMap(itemsMap);
      }

      if (decRes.ok) {
        const { data } = await decRes.json();
        setDecisions(data || []);
      }

      if (datesRes.ok) {
        const { data } = await datesRes.json();
        setKeyDates(data || []);
      }
    } catch (err) {
      console.error('Error fetching metronome data:', err);
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [calYear, calMonth]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleMonthChange = (year: number, month: number) => {
    setCalYear(year);
    setCalMonth(month);
  };

  // SEC-H2: Action handlers with optimistic updates + rollback on failure
  const handleToggleAction = async (actionId: string) => {
    // Save previous state for rollback
    const prevMap = { ...actionItemsMap };

    // Optimistic update
    setActionItemsMap(prev => {
      const updated = { ...prev };
      for (const initId of Object.keys(updated)) {
        updated[initId] = updated[initId].map(item => {
          if (item.id === actionId) {
            return {
              ...item,
              status: item.status === 'done' ? 'pending' as const : 'done' as const,
              completed_at: item.status === 'done' ? null : new Date().toISOString(),
            };
          }
          return item;
        });
      }
      return updated;
    });

    try {
      const res = await fetch('/api/metronome/action-items', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle', id: actionId }),
      });
      if (!res.ok) {
        setActionItemsMap(prevMap);
        setError('Failed to toggle action item');
        setTimeout(() => setError(null), 3000);
      }
    } catch {
      setActionItemsMap(prevMap);
      setError('Network error — changes reverted');
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleDecide = async (decisionId: string, decisionText: string) => {
    const prevDecisions = [...decisions];

    setDecisions(prev =>
      prev.map(d => d.id === decisionId ? { ...d, status: 'decided' as const, decision_text: decisionText } : d)
    );

    try {
      const res = await fetch('/api/metronome/decisions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'decide', id: decisionId, decision_text: decisionText }),
      });
      if (!res.ok) {
        setDecisions(prevDecisions);
        setError('Failed to save decision');
        setTimeout(() => setError(null), 3000);
      }
    } catch {
      setDecisions(prevDecisions);
      setError('Network error — decision reverted');
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleDefer = async (decisionId: string) => {
    const prevDecisions = [...decisions];

    setDecisions(prev => prev.filter(d => d.id !== decisionId));

    try {
      const res = await fetch('/api/metronome/decisions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'defer', id: decisionId }),
      });
      if (!res.ok) {
        setDecisions(prevDecisions);
        setError('Failed to defer decision');
        setTimeout(() => setError(null), 3000);
      }
    } catch {
      setDecisions(prevDecisions);
      setError('Network error — decision reverted');
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleEndMeeting = async (data: {
    notes: string;
    nextSyncDate: string;
    nextSyncFocus: string;
    duration: number;
    itemsDiscussed: number;
    decisionsMade: number;
    actionItemsDone: number;
  }) => {
    try {
      const res = await fetch('/api/metronome/syncs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sync_date: new Date().toISOString().split('T')[0],
          title: 'Leadership Sync',
          notes: data.notes || null,
          attendee_ids: [],
          started_at: new Date(Date.now() - data.duration * 1000).toISOString(),
          ended_at: new Date().toISOString(),
          duration_seconds: data.duration,
          next_sync_date: data.nextSyncDate || null,
          next_sync_focus: data.nextSyncFocus || null,
          focus_areas: [],
          items_discussed: data.itemsDiscussed,
          decisions_made: data.decisionsMade,
          action_items_completed: data.actionItemsDone,
        }),
      });

      if (!res.ok) {
        setError('Failed to save meeting record — please try again');
        setTimeout(() => setError(null), 5000);
        return;
      }

      setShowMeeting(false);
      fetchData();
    } catch {
      setError('Network error — meeting record not saved');
      setTimeout(() => setError(null), 5000);
    }
  };

  const handleCreateInitiative = async (data: {
    title: string;
    description: string | null;
    function_tag: string;
    priority: string;
    owner_label: string | null;
    status_label: string | null;
    deadline: string | null;
    deadline_label: string | null;
  }) => {
    try {
      const res = await fetch('/api/metronome/initiatives', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Failed to create initiative' }));
        setError(err.error || 'Failed to create initiative');
        setTimeout(() => setError(null), 5000);
        return;
      }

      setShowNewForm(false);
      fetchData();
    } catch {
      setError('Network error — initiative not created');
      setTimeout(() => setError(null), 5000);
    }
  };

  // Categorize initiatives
  const needsAttention = initiatives.filter(i => {
    const items = actionItemsMap[i.id] || [];
    const hasOverdue = items.some(
      a => a.status !== 'done' && a.deadline && new Date(a.deadline) < new Date()
    );
    return hasOverdue || i.priority === 'critical';
  });

  const inProgress = initiatives.filter(i => !needsAttention.includes(i));

  // Open decisions only
  const openDecisions = decisions.filter(d => d.status === 'open');

  // SEC-L1: Determine if user can mutate (decide/defer/toggle)
  const canMutate = canEdit || canRunMeeting;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw size={24} className="animate-spin text-purple-500" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* SEC-H2: Error toast */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Metronome Sync</h1>
        <p className="text-sm text-gray-500">Leadership Initiative Tracker</p>
      </div>

      {/* Pulse Bar */}
      {summary && (
        <PulseBar
          summary={summary}
          canRunMeeting={canRunMeeting}
          canCreate={canCreate}
          onStartSync={() => setShowMeeting(true)}
          onNewInitiative={() => setShowNewForm(true)}
        />
      )}

      {/* Calendar */}
      <MonthCalendar
        keyDates={keyDates}
        onMonthChange={handleMonthChange}
      />

      {/* Three-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* DECIDE Column */}
        <div>
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3">
            Decide ({openDecisions.length})
          </h2>
          {openDecisions.length === 0 ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
              <p className="text-sm text-green-700">All decisions resolved</p>
            </div>
          ) : (
            <div className="space-y-3">
              {openDecisions.map(dec => (
                <DecisionCard
                  key={dec.id}
                  decision={dec}
                  onDecide={canMutate ? handleDecide : undefined}
                  onDefer={canMutate ? handleDefer : undefined}
                />
              ))}
            </div>
          )}
        </div>

        {/* TRACK Column */}
        <div>
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3">
            Track ({initiatives.length})
          </h2>

          {needsAttention.length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-medium text-red-600 uppercase mb-2">Needs Attention</p>
              <div className="space-y-3">
                {needsAttention.map(init => (
                  <InitiativeCard
                    key={init.id}
                    initiative={init}
                    actionItems={actionItemsMap[init.id] || []}
                    onToggleAction={canMutate ? handleToggleAction : undefined}
                  />
                ))}
              </div>
            </div>
          )}

          {inProgress.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase mb-2">In Progress</p>
              <div className="space-y-3">
                {inProgress.map(init => (
                  <InitiativeCard
                    key={init.id}
                    initiative={init}
                    actionItems={actionItemsMap[init.id] || []}
                    onToggleAction={canMutate ? handleToggleAction : undefined}
                  />
                ))}
              </div>
            </div>
          )}

          {initiatives.length === 0 && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
              <p className="text-sm text-gray-500">No initiatives yet</p>
            </div>
          )}
        </div>

        {/* PLAN Column */}
        <div>
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3">
            Plan
          </h2>

          {/* Upcoming key dates */}
          <div className="bg-white border border-gray-200 rounded-lg p-3 mb-3">
            <p className="text-xs font-medium text-gray-500 uppercase mb-2">Upcoming</p>
            {keyDates.filter(kd => new Date(kd.date) >= new Date()).slice(0, 5).length > 0 ? (
              <div className="space-y-2">
                {keyDates
                  .filter(kd => new Date(kd.date) >= new Date())
                  .slice(0, 5)
                  .map(kd => (
                    <div key={kd.id} className="flex items-center gap-2 text-sm">
                      <span className="text-xs text-gray-400 w-12">
                        {new Date(kd.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                      <span className="text-gray-700">{kd.emoji || ''} {kd.title}</span>
                    </div>
                  ))}
              </div>
            ) : (
              <p className="text-xs text-gray-400">No upcoming dates</p>
            )}
          </div>

          {/* This week's focus (from last sync) */}
          {summary?.nextSync.date && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 mb-3">
              <p className="text-xs font-medium text-purple-600 uppercase mb-1">Next Sync</p>
              <p className="text-sm font-medium text-purple-800">
                {new Date(summary.nextSync.date).toLocaleDateString('en-US', {
                  weekday: 'short', month: 'short', day: 'numeric'
                })}
              </p>
              {summary.nextSync.daysUntil !== null && (
                <p className="text-xs text-purple-600 mt-0.5">
                  {summary.nextSync.daysUntil === 0 ? 'Today' :
                   summary.nextSync.daysUntil === 1 ? 'Tomorrow' :
                   `In ${summary.nextSync.daysUntil} days`}
                </p>
              )}
            </div>
          )}

          {/* Resolved count */}
          {summary && (
            <div className="bg-white border border-gray-200 rounded-lg p-3">
              <p className="text-xs font-medium text-gray-500 uppercase mb-1">Summary</p>
              <div className="grid grid-cols-2 gap-2 text-center">
                <div>
                  <p className="text-lg font-bold text-purple-600">{summary.totalActive}</p>
                  <p className="text-[10px] text-gray-500">Active</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-green-600">{summary.onTrackPercentage}%</p>
                  <p className="text-[10px] text-gray-500">On Track</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Meeting Mode Overlay */}
      {showMeeting && (
        <MeetingMode
          initiatives={initiatives}
          actionItems={actionItemsMap}
          decisions={decisions}
          userId={userId}
          onEnd={handleEndMeeting}
          onClose={() => setShowMeeting(false)}
          onToggleAction={handleToggleAction}
          onDecide={handleDecide}
        />
      )}

      {/* New Initiative Modal */}
      {showNewForm && (
        <NewInitiativeModal
          onSave={handleCreateInitiative}
          onClose={() => setShowNewForm(false)}
        />
      )}
    </div>
  );
}
