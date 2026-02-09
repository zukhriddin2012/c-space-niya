'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, CheckCircle, Circle, AlertCircle } from 'lucide-react';
import FunctionBadge from './FunctionBadge';
import PriorityIndicator from './PriorityIndicator';
import type { MetronomeInitiativeRow, MetronomeActionItemRow } from '@/lib/db/metronome';

interface InitiativeCardProps {
  initiative: MetronomeInitiativeRow;
  actionItems: MetronomeActionItemRow[];
  onToggleAction?: (id: string) => void;
}

export default function InitiativeCard({ initiative, actionItems, onToggleAction }: InitiativeCardProps) {
  const [expanded, setExpanded] = useState(false);

  const doneCount = actionItems.filter(a => a.status === 'done').length;
  const totalCount = actionItems.length;
  const progressPercent = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

  const overdueItems = actionItems.filter(
    a => a.status !== 'done' && a.deadline && new Date(a.deadline) < new Date()
  );
  const hasOverdue = overdueItems.length > 0;

  const visibleActions = expanded ? actionItems : actionItems.slice(0, 3);

  return (
    <div className={`bg-white border rounded-lg p-3 ${hasOverdue ? 'border-red-200' : 'border-gray-200'}`}>
      {/* Header row: Function badge + title */}
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <FunctionBadge tag={initiative.function_tag} />
            <PriorityIndicator priority={initiative.priority} />
          </div>
          <p className="text-sm font-medium text-gray-900 leading-tight">{initiative.title}</p>
        </div>
      </div>

      {/* Progress bar */}
      {totalCount > 0 && (
        <div className="mt-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-gray-500">{doneCount}/{totalCount} tasks</span>
            <span className="text-[10px] font-medium text-gray-600">{progressPercent}%</span>
          </div>
          <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                progressPercent === 100 ? 'bg-green-500' : hasOverdue ? 'bg-red-400' : 'bg-purple-500'
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* Status + lead row */}
      <div className="flex items-center justify-between mt-2">
        <div className="flex items-center gap-2">
          {initiative.status_label && (
            <span className="text-[10px] text-gray-500">{initiative.status_label}</span>
          )}
          {hasOverdue && (
            <span className="inline-flex items-center gap-0.5 text-[10px] text-red-600 font-medium">
              <AlertCircle size={10} />
              {overdueItems.length} overdue
            </span>
          )}
        </div>
        {initiative.owner_label && (
          <span className="text-[10px] text-gray-500">
            Lead: {initiative.owner_label}
          </span>
        )}
      </div>

      {/* Action items */}
      {totalCount > 0 && (
        <div className="mt-2 border-t border-gray-100 pt-2">
          <div className="space-y-1">
            {visibleActions.map(item => {
              const isDone = item.status === 'done';
              const itemOverdue = !isDone && item.deadline && new Date(item.deadline) < new Date();

              return onToggleAction ? (
                <button
                  key={item.id}
                  onClick={() => onToggleAction(item.id)}
                  className="flex items-center gap-2 w-full text-left group"
                >
                  {isDone ? (
                    <CheckCircle size={14} className="text-green-500 shrink-0" />
                  ) : (
                    <Circle size={14} className="text-gray-300 group-hover:text-purple-400 shrink-0" />
                  )}
                  <span className={`text-xs truncate ${isDone ? 'line-through text-gray-400' : itemOverdue ? 'text-red-600' : 'text-gray-700'}`}>
                    {item.title}
                  </span>
                </button>
              ) : (
                <div
                  key={item.id}
                  className="flex items-center gap-2 w-full"
                >
                  {isDone ? (
                    <CheckCircle size={14} className="text-green-500 shrink-0" />
                  ) : (
                    <Circle size={14} className="text-gray-300 shrink-0" />
                  )}
                  <span className={`text-xs truncate ${isDone ? 'line-through text-gray-400' : itemOverdue ? 'text-red-600' : 'text-gray-700'}`}>
                    {item.title}
                  </span>
                </div>
              );
            })}
          </div>

          {totalCount > 3 && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1 mt-1.5 text-[10px] text-purple-600 hover:text-purple-700 font-medium"
            >
              {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              {expanded ? 'Hide actions' : `Show all ${totalCount} actions`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
