'use client';

import { PageGuard } from '@/components/auth';
import { PERMISSIONS } from '@/lib/permissions';
import FinanceDashboardClient from '@/components/finance-dashboard/FinanceDashboardClient';

export default function FinancesPage() {
  return (
    <PageGuard permission={PERMISSIONS.FINANCES_VIEW}>
      <div className="max-w-7xl mx-auto">
        <FinanceDashboardClient />
      </div>
    </PageGuard>
  );
}
