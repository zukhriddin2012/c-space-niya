'use client';

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { PageGuard } from '@/components/auth';
import { PERMISSIONS } from '@/lib/permissions';
import ProfitDealTable from '@/components/settings/ProfitDealTable';

export default function ProfitDealsPage() {
  return (
    <PageGuard permission={PERMISSIONS.FINANCES_VIEW}>
      <div className="max-w-5xl mx-auto">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1 text-sm text-gray-500 mb-4">
          <Link href="/settings" className="text-purple-600 hover:text-purple-800 transition-colors">
            Settings
          </Link>
          <ChevronRight size={14} />
          <span className="text-gray-700">Profit Sharing Deals</span>
        </nav>

        <ProfitDealTable />
      </div>
    </PageGuard>
  );
}
