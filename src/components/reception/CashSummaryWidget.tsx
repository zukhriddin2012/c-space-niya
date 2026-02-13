'use client';

import { Banknote, AlertTriangle, ChevronRight, Truck } from 'lucide-react';
import { useTranslation } from '@/contexts/LanguageContext';
import { formatCurrency } from '@/modules/reception/lib/constants';

interface CashSummaryWidgetProps {
  data: {
    totalBalance: number;
    inkassoPendingCount: number;
    inkassoPendingAmount: number;
    transferThreshold: number;
    isOverThreshold: boolean;
  } | null;
  isLoading: boolean;
  onNavigate: () => void;
}

function SkeletonCash() {
  return (
    <div className="space-y-3">
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
        Cash Summary
      </h3>
      <div className="p-4 rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-11 h-11 rounded-[10px] bg-gray-100 animate-pulse" />
          <div className="h-8 w-32 bg-gray-100 rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="h-16 bg-gray-50 rounded-lg animate-pulse" />
          <div className="h-16 bg-gray-50 rounded-lg animate-pulse" />
        </div>
      </div>
    </div>
  );
}

export function CashSummaryWidget({ data, isLoading, onNavigate }: CashSummaryWidgetProps) {
  const { t } = useTranslation();

  if (isLoading) return <SkeletonCash />;
  if (!data) return null;

  return (
    <div className="space-y-3">
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
        {t.reception.dashboard?.cashTitle || 'Cash Summary'}
      </h3>
      <button
        onClick={onNavigate}
        className="w-full p-4 rounded-xl border border-gray-200 bg-white shadow-sm cursor-pointer hover:shadow-md hover:border-gray-300 transition-all text-left"
      >
        {/* Balance */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-[10px] bg-green-50 text-green-600 flex items-center justify-center flex-shrink-0">
              <Banknote className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm text-gray-500">{t.reception.dashboard?.balance || 'Cash on Hand'}</p>
              <p className="text-[28px] font-bold text-gray-900">{formatCurrency(data.totalBalance)}</p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-300 flex-shrink-0" />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-lg bg-gray-50">
            <div className="flex items-center gap-2 mb-1">
              <Truck className="w-3.5 h-3.5 text-gray-400" />
              <span className="text-xs text-gray-500">{t.reception.dashboard?.inkassoPending || 'Inkasso Pending'}</span>
            </div>
            <p className="text-lg font-semibold text-gray-900">{data.inkassoPendingCount}</p>
            <p className="text-xs text-gray-400">{formatCurrency(data.inkassoPendingAmount)}</p>
          </div>
          <div className="p-3 rounded-lg bg-gray-50">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs text-gray-500">{t.reception.dashboard?.threshold || 'Threshold'}</span>
            </div>
            <p className="text-lg font-semibold text-gray-900">{formatCurrency(data.transferThreshold)}</p>
          </div>
        </div>

        {/* Threshold Alert */}
        {data.isOverThreshold && (
          <div className="flex items-center gap-2.5 p-3 mt-3 rounded-[10px] bg-amber-50 border border-amber-200">
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span className="text-sm font-medium text-amber-700">
              {t.reception.dashboard?.overThreshold || 'Cash exceeds transfer threshold'}
            </span>
          </div>
        )}
      </button>
    </div>
  );
}
