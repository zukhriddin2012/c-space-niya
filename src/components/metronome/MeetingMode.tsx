'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, CheckCircle, Circle, MessageSquare } from 'lucide-react';
import MeetingTimer from './MeetingTimer';
import EndMeetingModal from './EndMeetingModal';
import FunctionBadge from './FunctionBadge';
import type { MetronomeInitiativeRow, MetronomeActionItemRow, MetronomeDecisionRow } from '@/lib/db/metronome';

interface MeetingModeProps {
  initiatives: MetronomeInitiativeRow[];
  actionItems: Record<string, MetronomeActionItemRow[]>;
  decisions: MetronomeDecisionRow[];
  userId: string;
  onEnd: (data: {
    notes: string;
    nextSyncDate: string;
    nextSyncFocus: string;
    duration: number;
    itemsDiscussed: number;
    decisionsMade: number;
    actionItemsDone: number;
  }) => void;
  onClose: () => void;
  onToggleAction: (id: string) => void;
  onDecide: (id: string, text: string) => void;
}

export default function MeetingMode({
  initiatives,
  actionItems,
  decisions,
  userId,
  onEnd,
  onClose,
  onToggleAction,
  onDecide,
}: MeetingModeProps) {
  const [startTime] = useState(new Date());
  const [currentIdx, setCurrentIdx] = useState(0);
  const [discussed, setDiscussed] = useState<Set<string>>(new Set());
  const [showEndModal, setShowEndModal] = useState(false);
  const [quickDecisionText, setQuickDecisionText] = useState('');
  const [decisionsMadeCount, setDecisionsMadeCount] = useState(0);

  // Warn on accidental close
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, []);

  const currentInitiative = initiatives[currentIdx];
  const currentActions = currentInitiative ? (actionItems[currentInitiative.id] || []) : [];
  const actionItemsDone = Object.values(actionItems).flat().filter(a => a.status === 'done').length;

  const markDiscussed = () => {
    if (currentInitiative) {
      setDiscussed(prev => new Set(prev).add(currentInitiative.id));
    }
  };

  const goNext = () => {
    markDiscussed();
    if (currentIdx < initiatives.length - 1) {
      setCurrentIdx(currentIdx + 1);
    }
  };

  const handleEndMeeting = () => {
    setShowEndModal(true);
  };

  const handleSaveEnd = (data: { notes: string; nextSyncDate: string; nextSyncFocus: string }) => {
    const duration = Math.floor((Date.now() - startTime.getTime()) / 1000);
    onEnd({
      ...data,
      duration,
      itemsDiscussed: discussed.size,
      decisionsMade: decisionsMadeCount,
      actionItemsDone,
    });
  };

  const handleQuickDecide = (decisionId: string) => {
    if (quickDecisionText.trim()) {
      onDecide(decisionId, quickDecisionText.trim());
      setQuickDecisionText('');
      setDecisionsMadeCount(prev => prev + 1);
    }
  };

  return (
    <div className="fixed inset-0 z-40 bg-white flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-semibold text-gray-900">Leadership Sync</h1>
          <MeetingTimer startTime={startTime} />
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">
            {discussed.size}/{initiatives.length} discussed
          </span>
          <button
            onClick={handleEndMeeting}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700"
          >
            End Meeting
          </button>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-200">
            <X size={20} className="text-gray-500" />
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Agenda sidebar */}
        <div className="w-72 border-r border-gray-200 bg-gray-50 overflow-y-auto p-3">
          <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">Agenda</h3>
          <div className="space-y-1">
            {initiatives.map((init, idx) => {
              const isDiscussed = discussed.has(init.id);
              const isCurrent = idx === currentIdx;

              return (
                <button
                  key={init.id}
                  onClick={() => setCurrentIdx(idx)}
                  className={`w-full text-left flex items-center gap-2 px-2 py-2 rounded-lg text-sm transition-colors ${
                    isCurrent
                      ? 'bg-purple-100 text-purple-800 font-medium'
                      : isDiscussed
                      ? 'text-gray-400 line-through'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {isDiscussed ? (
                    <CheckCircle size={14} className="text-green-500 shrink-0" />
                  ) : (
                    <Circle size={14} className="text-gray-300 shrink-0" />
                  )}
                  <span className="truncate">{init.title}</span>
                </button>
              );
            })}
          </div>

          {/* Quick Decisions */}
          {decisions.filter(d => d.status === 'open').length > 0 && (
            <div className="mt-6">
              <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">Quick Decisions</h3>
              <div className="space-y-2">
                {decisions.filter(d => d.status === 'open').map(dec => (
                  <div key={dec.id} className="bg-white border border-gray-200 rounded-lg p-2">
                    <p className="text-xs text-gray-700">{dec.question}</p>
                    <div className="flex items-center gap-1 mt-1.5">
                      <input
                        type="text"
                        placeholder="Decision..."
                        value={quickDecisionText}
                        onChange={(e) => setQuickDecisionText(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleQuickDecide(dec.id)}
                        className="flex-1 text-xs border border-gray-200 rounded px-2 py-1 outline-none focus:ring-1 focus:ring-purple-400"
                      />
                      <button
                        onClick={() => handleQuickDecide(dec.id)}
                        className="px-2 py-1 text-[10px] font-medium bg-green-600 text-white rounded hover:bg-green-700"
                      >
                        OK
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Main content area */}
        <div className="flex-1 overflow-y-auto p-6">
          {currentInitiative ? (
            <div className="max-w-2xl">
              {/* Current initiative header */}
              <div className="flex items-center gap-2 mb-4">
                <FunctionBadge tag={currentInitiative.function_tag} size="md" />
                <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                  discussed.has(currentInitiative.id) ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                }`}>
                  {discussed.has(currentInitiative.id) ? 'Discussed' : `Item ${currentIdx + 1} of ${initiatives.length}`}
                </span>
              </div>

              <h2 className="text-xl font-semibold text-gray-900 mb-2">{currentInitiative.title}</h2>
              {currentInitiative.description && (
                <p className="text-sm text-gray-600 mb-4">{currentInitiative.description}</p>
              )}

              {/* Owner & Status */}
              <div className="flex items-center gap-4 mb-6 text-sm text-gray-500">
                {currentInitiative.owner_label && <span>Lead: {currentInitiative.owner_label}</span>}
                {currentInitiative.status_label && <span>Status: {currentInitiative.status_label}</span>}
                {currentInitiative.deadline_label && <span>Deadline: {currentInitiative.deadline_label}</span>}
              </div>

              {/* Action Items */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Action Items</h3>
                {currentActions.length === 0 ? (
                  <p className="text-sm text-gray-400">No action items</p>
                ) : (
                  <div className="space-y-1">
                    {currentActions.map(item => (
                      <button
                        key={item.id}
                        onClick={() => onToggleAction(item.id)}
                        className="flex items-center gap-3 w-full text-left py-1.5 px-2 rounded hover:bg-gray-50 group"
                      >
                        {item.status === 'done' ? (
                          <CheckCircle size={18} className="text-green-500 shrink-0" />
                        ) : (
                          <Circle size={18} className="text-gray-300 group-hover:text-purple-400 shrink-0" />
                        )}
                        <span className={`text-sm ${item.status === 'done' ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                          {item.title}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Navigation */}
              <div className="flex items-center gap-3">
                {!discussed.has(currentInitiative.id) && (
                  <button
                    onClick={markDiscussed}
                    className="px-4 py-2 text-sm font-medium text-purple-700 bg-purple-100 rounded-lg hover:bg-purple-200"
                  >
                    Mark as Discussed
                  </button>
                )}
                {currentIdx < initiatives.length - 1 && (
                  <button
                    onClick={goNext}
                    className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700"
                  >
                    Next Item
                  </button>
                )}
              </div>
            </div>
          ) : (
            <p className="text-gray-500">No initiatives to discuss</p>
          )}
        </div>
      </div>

      {/* End Meeting Modal */}
      {showEndModal && (
        <EndMeetingModal
          duration={Math.floor((Date.now() - startTime.getTime()) / 1000)}
          itemsDiscussed={discussed.size}
          decisionsMade={decisionsMadeCount}
          actionItemsDone={actionItemsDone}
          onSave={handleSaveEnd}
          onClose={() => setShowEndModal(false)}
        />
      )}
    </div>
  );
}
