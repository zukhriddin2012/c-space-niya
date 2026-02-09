'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import type { MetronomeFunctionTag, MetronomePriority } from '@/lib/db/metronome';

interface NewInitiativeModalProps {
  onSave: (data: {
    title: string;
    description: string | null;
    function_tag: MetronomeFunctionTag;
    priority: MetronomePriority;
    owner_label: string | null;
    status_label: string | null;
    deadline: string | null;
    deadline_label: string | null;
  }) => void;
  onClose: () => void;
}

const FUNCTION_TAGS: { value: MetronomeFunctionTag; label: string }[] = [
  { value: 'bd', label: 'Business Development' },
  { value: 'construction', label: 'Construction' },
  { value: 'hr', label: 'HR' },
  { value: 'finance', label: 'Finance' },
  { value: 'legal', label: 'Legal' },
  { value: 'strategy', label: 'Strategy' },
  { value: 'service', label: 'Service' },
];

const PRIORITIES: { value: MetronomePriority; label: string; color: string }[] = [
  { value: 'critical', label: 'Critical', color: 'bg-red-100 text-red-700 border-red-200' },
  { value: 'high', label: 'High', color: 'bg-orange-100 text-orange-700 border-orange-200' },
  { value: 'strategic', label: 'Strategic', color: 'bg-blue-100 text-blue-700 border-blue-200' },
];

export default function NewInitiativeModal({ onSave, onClose }: NewInitiativeModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [functionTag, setFunctionTag] = useState<MetronomeFunctionTag>('strategy');
  const [priority, setPriority] = useState<MetronomePriority>('high');
  const [ownerLabel, setOwnerLabel] = useState('');
  const [statusLabel, setStatusLabel] = useState('');
  const [deadline, setDeadline] = useState('');
  const [deadlineLabel, setDeadlineLabel] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Title is required');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      onSave({
        title: title.trim(),
        description: description.trim() || null,
        function_tag: functionTag,
        priority,
        owner_label: ownerLabel.trim() || null,
        status_label: statusLabel.trim() || null,
        deadline: deadline || null,
        deadline_label: deadlineLabel.trim() || null,
      });
    } catch {
      setError('Failed to save initiative');
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">New Initiative</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X size={18} className="text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Launch employee onboarding portal"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent"
              autoFocus
            />
          </div>

          {/* Function + Priority row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Function</label>
              <select
                value={functionTag}
                onChange={(e) => setFunctionTag(e.target.value as MetronomeFunctionTag)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent bg-white"
              >
                {FUNCTION_TAGS.map(ft => (
                  <option key={ft.value} value={ft.value}>{ft.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
              <div className="flex gap-1.5">
                {PRIORITIES.map(p => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setPriority(p.value)}
                    className={`flex-1 text-xs font-medium py-2 rounded-lg border transition-colors ${
                      priority === p.value
                        ? p.color
                        : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Owner + Status row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Owner</label>
              <input
                type="text"
                value={ownerLabel}
                onChange={(e) => setOwnerLabel(e.target.value)}
                placeholder="e.g. Dilfuza"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <input
                type="text"
                value={statusLabel}
                onChange={(e) => setStatusLabel(e.target.value)}
                placeholder="e.g. On track for Q1"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent"
              />
            </div>
          </div>

          {/* Deadline row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Deadline</label>
              <input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Deadline Label</label>
              <input
                type="text"
                value={deadlineLabel}
                onChange={(e) => setDeadlineLabel(e.target.value)}
                placeholder="e.g. Q1 target"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of the initiative..."
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !title.trim()}
              className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? 'Creating...' : 'Create Initiative'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
