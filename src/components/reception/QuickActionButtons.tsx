'use client';

import { Plus, ArrowLeftRight, Wallet } from 'lucide-react';
import { useTranslation } from '@/contexts/LanguageContext';

interface QuickActionButtonsProps {
  onAction: (action: 'new-transaction' | 'new-expense') => void;
}

export function QuickActionButtons({ onAction }: QuickActionButtonsProps) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <button
        onClick={() => onAction('new-transaction')}
        className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-xl shadow-sm transition-colors"
      >
        <Plus className="w-5 h-5" />
        <ArrowLeftRight className="w-5 h-5" />
        <span>{t.reception.newTransaction}</span>
      </button>
      <button
        onClick={() => onAction('new-expense')}
        className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-white hover:bg-gray-50 text-gray-700 font-semibold rounded-xl border-2 border-gray-200 hover:border-gray-300 shadow-sm transition-colors"
      >
        <Plus className="w-5 h-5" />
        <Wallet className="w-5 h-5" />
        <span>{t.reception.newExpense}</span>
      </button>
    </div>
  );
}
