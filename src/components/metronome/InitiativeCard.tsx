'use client';

import { useState, useMemo } from 'react';
import {
  ChevronDown, ChevronRight, CheckCircle, CheckCircle2, Circle, CircleDot,
  AlertCircle, AlertTriangle, MoreVertical, Plus, X, Check, Trash2,
} from 'lucide-react';
import FunctionBadge from './FunctionBadge';
import PriorityIndicator from './PriorityIndicator';
import type { MetronomeInitiativeRow, MetronomeActionItemRow, MetronomeActionPriority } from '@/lib/db/metronome';

interface InitiativeCardProps {
  initiative: MetronomeInitiativeRow;
  actionItems: MetronomeActionItemRow[];
  onToggleAction?: (id: string) => void;
  onResolve?: (id: string) => void;
  onRestore?: (id: string) => void;
  onDeleteAction?: (id: string) => void;
  onAddAction?: (initiativeId: string, title: string, deadline?: string) => void;
  onUpdateAction?: (id: string, updates: Record<string, unknown>) => void;
  canEdit?: boolean;
  isResolved?: boolean;
}

const PRIORITY_WEIGHT: Record<string, number> = { urgent: 0, important: 1, normal: 2 };

function DeadlineLabel({ deadline, status }: { deadline: string | null; status: string }) {
  if (!deadline) return <span className="text-xs text-gray-300">—</span>;

  const d = new Date(deadline);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const endOfWeek = new Date(today);
  endOfWeek.setDate(endOfWeek.getDate() + (7 - endOfWeek.getDay()));

  const isDone = status === 'done';
  const isOverdue = d < today && !isDone;
  const isToday = d.toDateString() === today.toDateString() && !isDone;

  const formatted = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  if (isDone) return <span className="text-xs text-gray-300 line-through">{formatted}</span>;
  if (isOverdue) {
    return (
      <span className="text-xs text-red-600 font-medium flex items-center gap-0.5">
        <AlertTriangle className="h-3 w-3" /> {formatted}
      </span>
    );
  }
  if (isToday) return <span className="text-xs text-amber-600 font-medium">{formatted}</span>;
  return <span className="text-xs text-gray-500">{formatted}</span>;
}

export default function InitiativeCard({
  initiative,
  actionItems,
  onToggleAction,
  onResolve,
  onRestore,
  onDeleteAction,
  onAddAction,
  onUpdateAction,
  canEdit = false,
  isResolved = false,
}: InitiativeCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showConfirmResolve, setShowConfirmResolve] = useState(false);
  const [showAddTask, setShowAddTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDeadline, setNewTaskDeadline] = useState('');
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [editingDeadlineId, setEditingDeadlineId] = useState<string | null>(null);

  // Priority-based sorting (AT-16)
  const sortedItems = useMemo(() => {
    return [...actionItems].sort((a, b) => {
      // Group by status: pending/in_progress first, then done
      const aActive = a.status !== 'done' ? 0 : 1;
      const bActive = b.status !== 'done' ? 0 : 1;
      if (aActive !== bActive) return aActive - bActive;
      // Within active items: sort by priority
      const aPri = PRIORITY_WEIGHT[a.priority] ?? 2;
      const bPri = PRIORITY_WEIGHT[b.priority] ?? 2;
      if (aPri !== bPri) return aPri - bPri;
      // Within same priority: sort by sort_order
      return a.sort_order - b.sort_order;
    });
  }, [actionItems]);

  const doneCount = sortedItems.filter(a => a.status === 'done').length;
  const totalCount = sortedItems.length;
  const progressPercent = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

  const overdueItems = sortedItems.filter(
    a => a.status !== 'done' && a.deadline && new Date(a.deadline) < new Date()
  );
  const hasOverdue = overdueItems.length > 0;

  const visibleActions = expanded ? sortedItems : sortedItems.slice(0, 3);

  const handleStatusCycle = (item: MetronomeActionItemRow) => {
    const nextStatus: Record<string, string> = {
      pending: 'in_progress',
      in_progress: 'done',
      done: 'pending',
    };
    const newStatus = nextStatus[item.status] || 'pending';
    onUpdateAction?.(item.id, { status: newStatus });
  };

  return (
    <div
      data-onboarding="initiative-card"
      className={`bg-white border rounded-lg p-3 ${
        isResolved ? 'opacity-60 border-gray-200' : hasOverdue ? 'border-red-200' : 'border-gray-200'
      }`}
    >
      {/* Header row: Function badge + title + dropdown */}
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <FunctionBadge tag={initiative.function_tag} />
            <PriorityIndicator priority={initiative.priority} />
          </div>
          <p className="text-sm font-medium text-gray-900 leading-tight">{initiative.title}</p>
        </div>
        {canEdit && (
          <div className="relative">
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <MoreVertical className="h-4 w-4 text-gray-400" />
            </button>
            {showDropdown && (
              <div className="absolute right-0 top-8 bg-white border rounded-lg shadow-lg py-1 z-10 min-w-[180px]">
                {isResolved ? (
                  <button
                    onClick={() => {
                      onRestore?.(initiative.id);
                      setShowDropdown(false);
                    }}
                    className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    Restore to Active
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setShowConfirmResolve(true);
                      setShowDropdown(false);
                    }}
                    className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    Move to Resolved
                  </button>
                )}
              </div>
            )}
          </div>
        )}
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
          <span className="text-[10px] text-gray-500">Lead: {initiative.owner_label}</span>
        )}
      </div>

      {/* Action items */}
      {totalCount > 0 && (
        <div data-onboarding="action-items" className="mt-2 border-t border-gray-100 pt-2">
          <div className="space-y-1">
            {visibleActions.map(item => {
              const isDone = item.status === 'done';
              const itemOverdue = !isDone && item.deadline && new Date(item.deadline) < new Date();

              return (
                <div key={item.id} className="flex items-center gap-2 w-full group relative">
                  {/* Status icon - 3-state cycle */}
                  <button
                    onClick={() => (canEdit ? handleStatusCycle(item) : onToggleAction?.(item.id))}
                    className="shrink-0"
                    disabled={!canEdit && !onToggleAction}
                  >
                    {item.status === 'done' ? (
                      <CheckCircle2 size={14} className="text-green-500" />
                    ) : item.status === 'in_progress' ? (
                      <CircleDot size={14} className="text-purple-600" />
                    ) : (
                      <Circle size={14} className="text-gray-300 group-hover:text-purple-400" />
                    )}
                  </button>

                  {/* Priority dot */}
                  {item.priority === 'urgent' && (
                    <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                  )}
                  {item.priority === 'important' && (
                    <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                  )}

                  {/* Title - inline edit */}
                  {editingItemId === item.id ? (
                    <input
                      autoFocus
                      value={editingTitle}
                      onChange={(e) => setEditingTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && editingTitle.trim()) {
                          onUpdateAction?.(item.id, { title: editingTitle.trim() });
                          setEditingItemId(null);
                        }
                        if (e.key === 'Escape') setEditingItemId(null);
                      }}
                      onBlur={() => {
                        if (editingTitle.trim() && editingTitle !== item.title) {
                          onUpdateAction?.(item.id, { title: editingTitle.trim() });
                        }
                        setEditingItemId(null);
                      }}
                      className="flex-1 px-2 py-0.5 border-2 border-purple-400 bg-purple-50 rounded text-xs"
                    />
                  ) : (
                    <span
                      onClick={() =>
                        canEdit
                          ? (() => {
                              setEditingItemId(item.id);
                              setEditingTitle(item.title);
                            })()
                          : undefined
                      }
                      className={`flex-1 text-xs truncate ${canEdit ? 'cursor-text' : ''} ${
                        item.status === 'done'
                          ? 'line-through text-gray-400'
                          : !isDone && itemOverdue
                            ? 'text-red-600'
                            : 'text-gray-700'
                      }`}
                    >
                      {item.title}
                    </span>
                  )}

                  {/* Deadline (AT-13, AT-14) */}
                  {canEdit ? (
                    editingDeadlineId === item.id ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="date"
                          autoFocus
                          value={item.deadline || ''}
                          onChange={(e) => {
                            const val = e.target.value || null;
                            onUpdateAction?.(item.id, { deadline: val });
                            setEditingDeadlineId(null);
                          }}
                          onBlur={() => setEditingDeadlineId(null)}
                          onKeyDown={(e) => {
                            if (e.key === 'Escape') setEditingDeadlineId(null);
                          }}
                          className="text-xs border border-purple-400 rounded px-1 py-0.5 w-28"
                        />
                        {item.deadline && (
                          <button
                            onClick={() => {
                              onUpdateAction?.(item.id, { deadline: null });
                              setEditingDeadlineId(null);
                            }}
                            className="text-xs text-gray-400 hover:text-red-500"
                            title="Remove deadline"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    ) : (
                      <button
                        onClick={() => setEditingDeadlineId(item.id)}
                        className="cursor-pointer hover:bg-gray-50 rounded px-1"
                      >
                        <DeadlineLabel deadline={item.deadline} status={item.status} />
                      </button>
                    )
                  ) : (
                    <DeadlineLabel deadline={item.deadline} status={item.status} />
                  )}

                  {/* Delete button */}
                  {canEdit && onDeleteAction && (
                    <div className="relative">
                      <button
                        onClick={() =>
                          setDeleteConfirmId(deleteConfirmId === item.id ? null : item.id)
                        }
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-300 hover:text-red-500"
                      >
                        <Trash2 size={12} />
                      </button>
                      {deleteConfirmId === item.id && (
                        <div className="absolute right-0 top-full mt-1 bg-white border rounded-lg shadow-lg p-3 z-10">
                          <p className="text-xs text-gray-600 mb-2">Delete this task?</p>
                          <div className="flex gap-2">
                            <button
                              onClick={() => setDeleteConfirmId(null)}
                              className="text-xs text-gray-500"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => {
                                onDeleteAction(item.id);
                                setDeleteConfirmId(null);
                              }}
                              className="text-xs text-red-600 font-medium"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
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

          {/* Add task inline form (AT-09) */}
          {canEdit && onAddAction && (
            showAddTask ? (
              <div className="flex items-center gap-2 mt-2">
                <input
                  autoFocus
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newTaskTitle.trim()) {
                      onAddAction(
                        initiative.id,
                        newTaskTitle.trim(),
                        newTaskDeadline || undefined
                      );
                      setNewTaskTitle('');
                      setNewTaskDeadline('');
                    }
                    if (e.key === 'Escape') {
                      setShowAddTask(false);
                      setNewTaskTitle('');
                      setNewTaskDeadline('');
                    }
                  }}
                  placeholder="New task..."
                  className="flex-1 px-2 py-1 border border-gray-300 rounded text-xs"
                />
                <input
                  type="date"
                  value={newTaskDeadline}
                  onChange={(e) => setNewTaskDeadline(e.target.value)}
                  className="px-2 py-1 border border-gray-300 rounded text-xs w-28"
                />
                <button
                  onClick={() => {
                    if (newTaskTitle.trim()) {
                      onAddAction(
                        initiative.id,
                        newTaskTitle.trim(),
                        newTaskDeadline || undefined
                      );
                      setNewTaskTitle('');
                      setNewTaskDeadline('');
                    }
                  }}
                >
                  <Check className="h-4 w-4 text-green-600" />
                </button>
                <button
                  onClick={() => {
                    setShowAddTask(false);
                    setNewTaskTitle('');
                    setNewTaskDeadline('');
                  }}
                >
                  <X className="h-4 w-4 text-gray-400" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowAddTask(true)}
                className="flex items-center gap-1 mt-2 text-[10px] text-purple-600 hover:text-purple-700 font-medium"
              >
                <Plus size={12} />
                Add task
              </button>
            )
          )}
        </div>
      )}

      {/* Confirmation dialog for resolve */}
      {showConfirmResolve && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm">
            <p className="text-sm text-gray-700">
              Move &quot;{initiative.title}&quot; to Resolved?
            </p>
            <div className="flex gap-2 mt-4 justify-end">
              <button
                onClick={() => setShowConfirmResolve(false)}
                className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onResolve?.(initiative.id);
                  setShowConfirmResolve(false);
                }}
                className="px-3 py-1.5 text-sm bg-purple-600 text-white rounded hover:bg-purple-700"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
