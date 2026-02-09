'use client';

import { useState } from 'react';
import { Clock, CheckCircle, ArrowRight } from 'lucide-react';
import FunctionBadge from './FunctionBadge';
import type { MetronomeDecisionRow } from '@/lib/db/metronome';

interface DecisionCardProps {
  decision: MetronomeDecisionRow;
  onDecide?: (id: string, decisionText: string) => void;
  onDefer?: (id: string) => void;
}

export default function DecisionCard({ decision, onDecide, onDefer }: DecisionCardProps) {
  const [showInput, setShowInput] = useState(false);
  const [decisionText, setDecisionText] = useState('');

  const isOverdue = decision.deadline && new Date(decision.deadline) < new Date();
  const deadlineLabel = decision.deadline
    ? new Date(decision.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : null;

  const handleDecide = () => {
    if (decisionText.trim() && onDecide) {
      onDecide(decision.id, decisionText.trim());
      setShowInput(false);
      setDecisionText('');
    }
  };

  if (decision.status === 'decided') {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-3 opacity-70">
        <div className="flex items-start gap-2">
          <CheckCircle size={16} className="text-green-500 mt-0.5 shrink-0" />
          <div className="min-w-0">
            <p className="text-sm text-gray-700 line-through">{decision.question}</p>
            <p className="text-xs text-green-700 mt-1 font-medium">{decision.decision_text}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white border rounded-lg p-3 ${isOverdue ? 'border-red-300 bg-red-50/30' : 'border-gray-200'}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-gray-900">{decision.question}</p>
          <div className="flex items-center gap-2 mt-1.5">
            {decision.function_tag && (
              <FunctionBadge tag={decision.function_tag} />
            )}
            {deadlineLabel && (
              <span className={`inline-flex items-center gap-1 text-[10px] ${isOverdue ? 'text-red-600 font-semibold' : 'text-gray-500'}`}>
                <Clock size={10} />
                {isOverdue ? 'OVERDUE' : deadlineLabel}
              </span>
            )}
          </div>
        </div>
      </div>

      {(onDecide || onDefer) && (
        showInput ? (
          <div className="mt-3">
            <textarea
              value={decisionText}
              onChange={(e) => setDecisionText(e.target.value)}
              placeholder="What was decided?"
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none resize-none"
              rows={2}
              autoFocus
            />
            <div className="flex items-center gap-2 mt-2">
              <button
                onClick={handleDecide}
                disabled={!decisionText.trim()}
                className="px-3 py-1.5 text-xs font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Confirm
              </button>
              <button
                onClick={() => { setShowInput(false); setDecisionText(''); }}
                className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 mt-3">
            {onDecide && (
              <button
                onClick={() => setShowInput(true)}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors"
              >
                <CheckCircle size={12} />
                Decide
              </button>
            )}
            {onDefer && (
              <button
                onClick={() => onDefer(decision.id)}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <ArrowRight size={12} />
                Defer
              </button>
            )}
          </div>
        )
      )}
    </div>
  );
}
