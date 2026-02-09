'use client';

import { useState } from 'react';
import { X, CheckCircle, MessageSquare, ListChecks, Users } from 'lucide-react';

interface EndMeetingModalProps {
  duration: number; // seconds
  itemsDiscussed: number;
  decisionsMade: number;
  actionItemsDone: number;
  onSave: (data: {
    notes: string;
    nextSyncDate: string;
    nextSyncFocus: string;
  }) => void;
  onClose: () => void;
}

export default function EndMeetingModal({
  duration,
  itemsDiscussed,
  decisionsMade,
  actionItemsDone,
  onSave,
  onClose,
}: EndMeetingModalProps) {
  const [notes, setNotes] = useState('');
  const [nextSyncDate, setNextSyncDate] = useState('');
  const [nextSyncFocus, setNextSyncFocus] = useState('');

  const formatDuration = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  const handleSave = () => {
    onSave({ notes, nextSyncDate, nextSyncFocus });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl w-full max-w-lg mx-4 shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Meeting Summary</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-3 p-6 bg-gray-50">
          <div className="text-center">
            <p className="text-2xl font-bold text-purple-600">{formatDuration(duration)}</p>
            <p className="text-xs text-gray-500 mt-1">Duration</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-600">{itemsDiscussed}</p>
            <p className="text-xs text-gray-500 mt-1">Discussed</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-amber-600">{decisionsMade}</p>
            <p className="text-xs text-gray-500 mt-1">Decisions</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">{actionItemsDone}</p>
            <p className="text-xs text-gray-500 mt-1">Actions Done</p>
          </div>
        </div>

        {/* Form */}
        <div className="p-6 space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Meeting Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Key discussion points..."
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none resize-none"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Next Sync Date</label>
              <input
                type="date"
                value={nextSyncDate}
                onChange={(e) => setNextSyncDate(e.target.value)}
                className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Next Focus</label>
              <input
                type="text"
                value={nextSyncFocus}
                onChange={(e) => setNextSyncFocus(e.target.value)}
                placeholder="Next meeting focus..."
                className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700"
          >
            Save & Close
          </button>
        </div>
      </div>
    </div>
  );
}
