'use client';

import { Scale, Wrench, Calculator, ChevronRight, AlertTriangle } from 'lucide-react';
import { useTranslation } from '@/contexts/LanguageContext';

interface RequestStatusCardsProps {
  data: {
    legal: Record<string, number> | null;
    maintenance: (Record<string, number> & { slaBreached: number }) | null;
    accounting: Record<string, number> | null;
  } | null;
  isLoading: boolean;
  onNavigate: (subTab?: string) => void;
}

// Status badge color mappings
const legalStatusColors: Record<string, string> = {
  submitted: 'bg-blue-50 text-blue-700',
  under_review: 'bg-yellow-50 text-yellow-700',
  in_progress: 'bg-purple-50 text-purple-700',
  ready: 'bg-green-50 text-green-700',
  completed: 'bg-gray-50 text-gray-500',
  rejected: 'bg-red-50 text-red-700',
};

const maintenanceStatusColors: Record<string, string> = {
  open: 'bg-blue-50 text-blue-700',
  in_progress: 'bg-yellow-50 text-yellow-700',
  resolved: 'bg-green-50 text-green-700',
};

const accountingStatusColors: Record<string, string> = {
  pending: 'bg-blue-50 text-blue-700',
  in_progress: 'bg-yellow-50 text-yellow-700',
  needs_info: 'bg-orange-50 text-orange-700',
  pending_approval: 'bg-purple-50 text-purple-700',
  approved: 'bg-green-50 text-green-700',
  completed: 'bg-gray-50 text-gray-500',
  rejected: 'bg-red-50 text-red-700',
  cancelled: 'bg-gray-50 text-gray-400',
};

const statusLabels: Record<string, string> = {
  submitted: 'Submitted',
  under_review: 'Under Review',
  in_progress: 'In Progress',
  ready: 'Ready',
  completed: 'Completed',
  rejected: 'Rejected',
  open: 'Open',
  resolved: 'Resolved',
  pending: 'Pending',
  needs_info: 'Needs Info',
  pending_approval: 'Pending Approval',
  approved: 'Approved',
  cancelled: 'Cancelled',
};

function StatusBadge({ status, count, colorClass }: { status: string; count: number; colorClass: string }) {
  if (count === 0) return null;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${colorClass}`}>
      {statusLabels[status] || status} {count}
    </span>
  );
}

function SkeletonCard() {
  return (
    <div className="flex items-center gap-4 p-4 rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="w-11 h-11 rounded-[10px] bg-gray-100 animate-pulse" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-24 bg-gray-100 rounded animate-pulse" />
        <div className="h-6 w-16 bg-gray-100 rounded animate-pulse" />
        <div className="flex gap-1">
          <div className="h-5 w-16 bg-gray-100 rounded-full animate-pulse" />
          <div className="h-5 w-20 bg-gray-100 rounded-full animate-pulse" />
        </div>
      </div>
    </div>
  );
}

export function RequestStatusCards({ data, isLoading, onNavigate }: RequestStatusCardsProps) {
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <div className="space-y-3">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          {t.reception.dashboard?.requestsTitle || 'Requests'}
        </h3>
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  if (!data) return null;

  const cards = [
    {
      key: 'legal',
      title: t.legalRequests?.title || 'Legal Requests',
      icon: Scale,
      iconBg: 'bg-blue-50',
      iconColor: 'text-blue-600',
      countColor: 'text-blue-700',
      data: data.legal,
      activeStatuses: ['submitted', 'under_review', 'in_progress', 'ready'],
      colors: legalStatusColors,
      subTab: 'legal',
    },
    {
      key: 'maintenance',
      title: t.maintenanceIssues?.title || 'Maintenance Issues',
      icon: Wrench,
      iconBg: 'bg-orange-50',
      iconColor: 'text-orange-600',
      countColor: 'text-orange-700',
      data: data.maintenance ? { ...data.maintenance } : null,
      activeStatuses: ['open', 'in_progress'],
      colors: maintenanceStatusColors,
      slaBreached: data.maintenance?.slaBreached || 0,
      subTab: 'maintenance',
    },
    {
      key: 'accounting',
      title: t.reception.dashboard?.accounting || 'Accounting Requests',
      icon: Calculator,
      iconBg: 'bg-purple-50',
      iconColor: 'text-purple-600',
      countColor: 'text-purple-700',
      data: data.accounting,
      activeStatuses: ['pending', 'in_progress', 'needs_info', 'pending_approval'],
      colors: accountingStatusColors,
      subTab: 'accounting',
    },
  ];

  return (
    <div className="space-y-3">
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
        {t.reception.dashboard?.requestsTitle || 'Requests'}
      </h3>
      {cards.map((card) => {
        if (!card.data) return null;
        const Icon = card.icon;
        const activeCount = card.activeStatuses.reduce(
          (sum, s) => sum + ((card.data as Record<string, number>)?.[s] || 0),
          0
        );

        return (
          <button
            key={card.key}
            onClick={() => onNavigate(card.subTab)}
            className="w-full flex items-center gap-4 p-4 rounded-xl border border-gray-200 bg-white shadow-sm cursor-pointer hover:shadow-md hover:border-gray-300 transition-all text-left"
          >
            <div className={`w-11 h-11 rounded-[10px] ${card.iconBg} ${card.iconColor} flex items-center justify-center flex-shrink-0`}>
              <Icon className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-600">{card.title}</p>
              <div className="flex items-baseline gap-2">
                <span className={`text-[22px] font-bold ${card.countColor}`}>{activeCount}</span>
                <span className="text-sm text-gray-400">{t.reception.active?.toLowerCase() || 'active'}</span>
              </div>
              <div className="flex flex-wrap gap-1 mt-1">
                {Object.entries(card.data as Record<string, number>).map(([status, count]) => {
                  if (status === 'slaBreached') return null;
                  return (
                    <StatusBadge
                      key={status}
                      status={status}
                      count={count as number}
                      colorClass={card.colors[status] || 'bg-gray-50 text-gray-500'}
                    />
                  );
                })}
              </div>
              {'slaBreached' in card && (card as any).slaBreached > 0 && (
                <div className="mt-1.5">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-red-50 text-red-700 border border-red-100 animate-pulse">
                    <AlertTriangle className="w-3 h-3" />
                    {(card as any).slaBreached} {t.reception.dashboard?.slaBreached || 'SLA Breached'}
                  </span>
                </div>
              )}
            </div>
            <ChevronRight className="w-5 h-5 text-gray-300 flex-shrink-0" />
          </button>
        );
      })}
    </div>
  );
}
