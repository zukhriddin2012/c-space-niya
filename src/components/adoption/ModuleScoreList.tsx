'use client';

import {
  Clock, CreditCard, DollarSign, Calendar, Users, UserPlus,
  FileText, Scale, Wrench, Banknote, TrendingUp, Timer,
  Receipt, Briefcase
} from 'lucide-react';
import { getScoreColor } from './ScoreBadge';

const MODULE_ICONS: Record<string, { icon: typeof Clock; bgClass: string; colorClass: string }> = {
  attendance: { icon: Clock, bgClass: 'bg-green-50', colorClass: 'text-green-600' },
  servicehub_transactions: { icon: CreditCard, bgClass: 'bg-purple-50', colorClass: 'text-purple-600' },
  payroll: { icon: DollarSign, bgClass: 'bg-blue-50', colorClass: 'text-blue-600' },
  shifts: { icon: Calendar, bgClass: 'bg-orange-50', colorClass: 'text-orange-600' },
  servicehub_expenses: { icon: Receipt, bgClass: 'bg-amber-50', colorClass: 'text-amber-600' },
  accounting_requests: { icon: FileText, bgClass: 'bg-teal-50', colorClass: 'text-teal-600' },
  leave: { icon: Calendar, bgClass: 'bg-pink-50', colorClass: 'text-pink-600' },
  employees: { icon: Users, bgClass: 'bg-indigo-50', colorClass: 'text-indigo-600' },
  finance: { icon: TrendingUp, bgClass: 'bg-teal-50', colorClass: 'text-teal-600' },
  recruitment: { icon: UserPlus, bgClass: 'bg-green-50', colorClass: 'text-green-600' },
  maintenance: { icon: Wrench, bgClass: 'bg-orange-50', colorClass: 'text-orange-600' },
  legal_requests: { icon: Scale, bgClass: 'bg-indigo-50', colorClass: 'text-indigo-600' },
  cash_management: { icon: Banknote, bgClass: 'bg-amber-50', colorClass: 'text-amber-600' },
  metronome: { icon: Timer, bgClass: 'bg-pink-50', colorClass: 'text-pink-600' },
};

interface ModuleScore {
  module: string;
  label: string;
  score: number;
  userCount: number;
  actionCount: number;
}

interface ModuleScoreListProps {
  modules: ModuleScore[];
}

export function ModuleScoreList({ modules }: ModuleScoreListProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Briefcase size={18} className="text-purple-600" />
          <span className="text-base font-semibold text-gray-900">Module Adoption</span>
        </div>
        <span className="text-xs text-gray-400">Sorted by score</span>
      </div>
      <div className="p-5">
        <div className="flex flex-col gap-3">
          {modules.map((mod, i) => {
            const iconInfo = MODULE_ICONS[mod.module] || { icon: Briefcase, bgClass: 'bg-gray-50', colorClass: 'text-gray-600' };
            const { color, barColor } = getScoreColor(mod.score);
            const Icon = iconInfo.icon;

            return (
              <div key={mod.module} className="flex items-center gap-3 py-2.5 border-b border-gray-50 last:border-b-0">
                <div className="w-6 text-sm font-medium text-gray-400 text-center flex-shrink-0">{i + 1}</div>
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${iconInfo.bgClass}`}>
                  <Icon size={18} className={iconInfo.colorClass} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900">{mod.label}</div>
                  <div className="text-xs text-gray-400">{mod.userCount} users &middot; {mod.actionCount} actions</div>
                </div>
                <div className="flex-1 min-w-[120px] max-w-[200px]">
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${barColor}`} style={{ width: `${Math.min(mod.score, 100)}%` }} />
                  </div>
                </div>
                <div className={`w-12 text-right text-sm font-semibold ${color}`}>{mod.score}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
