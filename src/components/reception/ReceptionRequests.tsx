'use client';

import React, { useState, useEffect } from 'react';
import { useReceptionMode, getOperatorHeaders } from '@/contexts/ReceptionModeContext';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { Scale, Wrench, Calculator, Plus, ArrowLeft, Loader2 } from 'lucide-react';
import HowItWorksButton from './HowItWorksButton';

type RequestSubView = 'hub' | 'accounting' | 'legal' | 'maintenance';

interface RequestCount {
  accounting: number;
  legal: number;
  maintenance: number;
}

// Lazy-import the actual sub-page components
const AccountingRequestsPage = React.lazy(
  () => import('@/app/(dashboard)/reception/requests/accounting/page')
);
const LegalRequestsPage = React.lazy(
  () => import('@/app/(dashboard)/reception/requests/legal/page')
);
const MaintenanceIssuesPage = React.lazy(
  () => import('@/app/(dashboard)/reception/requests/maintenance/page')
);

export default function ReceptionRequests() {
  const { selectedBranchId, currentOperator } = useReceptionMode();
  const [subView, setSubView] = useState<RequestSubView>('hub');
  const [counts, setCounts] = useState<RequestCount>({ accounting: 0, legal: 0, maintenance: 0 });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!selectedBranchId) return;

    const fetchCounts = async () => {
      setIsLoading(true);
      try {
        const headers = getOperatorHeaders(currentOperator, 'self');

        const [accountingRes, legalRes, maintenanceRes] = await Promise.allSettled([
          fetch(`/api/reception/accounting-requests?branchId=${selectedBranchId}&pageSize=1`, { headers }),
          fetch(`/api/reception/legal-requests?branchId=${selectedBranchId}&pageSize=1`, { headers }),
          fetch(`/api/reception/maintenance-issues?branchId=${selectedBranchId}&pageSize=1`, { headers }),
        ]);

        const extractCount = async (res: PromiseSettledResult<Response>): Promise<number> => {
          if (res.status !== 'fulfilled' || !res.value.ok) return 0;
          try {
            const json = await res.value.json();
            return json.pagination?.total ?? json.total ?? 0;
          } catch { return 0; }
        };

        const accountingCount = await extractCount(accountingRes);
        const legalCount = await extractCount(legalRes);
        const maintenanceCount = await extractCount(maintenanceRes);

        setCounts({ accounting: accountingCount, legal: legalCount, maintenance: maintenanceCount });
      } catch (error) {
        console.error('Failed to fetch request counts:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCounts();
  }, [selectedBranchId, currentOperator]);

  // Show sub-pages with a back button
  if (subView !== 'hub') {
    return (
      <div className="space-y-4">
        <button
          onClick={() => setSubView('hub')}
          className="flex items-center gap-2 text-purple-600 hover:text-purple-700 font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Requests
        </button>
        <React.Suspense fallback={
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
          </div>
        }>
          {subView === 'accounting' && <AccountingRequestsPage />}
          {subView === 'legal' && <LegalRequestsPage />}
          {subView === 'maintenance' && <MaintenanceIssuesPage />}
        </React.Suspense>
      </div>
    );
  }

  const hubCards = [
    {
      id: 'accounting' as const,
      title: 'Accounting Requests',
      description: 'Reconciliations, payments, confirmations',
      icon: <Calculator className="w-6 h-6" />,
      bgColor: 'bg-purple-100 text-purple-700',
      count: counts.accounting,
    },
    {
      id: 'legal' as const,
      title: 'Legal Requests',
      description: 'Contracts, agreements, registrations',
      icon: <Scale className="w-6 h-6" />,
      bgColor: 'bg-indigo-100 text-indigo-700',
      count: counts.legal,
    },
    {
      id: 'maintenance' as const,
      title: 'Maintenance Issues',
      description: 'Repairs, HVAC, electrical, cleaning',
      icon: <Wrench className="w-6 h-6" />,
      bgColor: 'bg-orange-100 text-orange-700',
      count: counts.maintenance,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Requests Hub</h1>
          <p className="text-sm text-gray-500 mt-1">
            Access all request management systems
          </p>
        </div>
        <HowItWorksButton moduleKey="requests-hub" />
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {hubCards.map(card => (
          <button
            key={card.id}
            onClick={() => setSubView(card.id)}
            className="text-left"
          >
            <Card className="h-full hover:border-purple-300 hover:shadow-lg transition-all cursor-pointer">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className={`w-12 h-12 rounded-full ${card.bgColor} flex items-center justify-center mb-4`}>
                    {card.icon}
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-1">
                    {card.title}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {card.description}
                  </p>
                </div>
                <div className="ml-4 flex-shrink-0">
                  {isLoading ? (
                    <div className="w-6 h-6 border-2 border-gray-300 border-t-purple-600 rounded-full animate-spin" />
                  ) : (
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">
                        {card.count}
                      </div>
                      <p className="text-xs text-gray-400">
                        {card.count === 1 ? 'item' : 'items'}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </button>
        ))}
      </div>
    </div>
  );
}
