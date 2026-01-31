'use client';

import { useState, lazy, Suspense } from 'react';
import { useReceptionMode } from '@/contexts/ReceptionModeContext';
import { ReceptionHeader, ReceptionTab } from './ReceptionHeader';
import { BranchSwitchModal } from '@/components/reception/BranchSwitchModal';

// Lazy load reception components to keep bundle small
const ReceptionDashboard = lazy(() => import('@/components/reception/ReceptionDashboard'));
const ReceptionTransactions = lazy(() => import('@/components/reception/ReceptionTransactions'));
const ReceptionExpenses = lazy(() => import('@/components/reception/ReceptionExpenses'));
const ReceptionSettings = lazy(() => import('@/components/reception/ReceptionSettings'));

interface DashboardContentProps {
  children: React.ReactNode;
}

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin w-8 h-8 border-3 border-purple-600 border-t-transparent rounded-full" />
    </div>
  );
}

export function DashboardContent({ children }: DashboardContentProps) {
  const { isReceptionMode } = useReceptionMode();
  const [activeTab, setActiveTab] = useState<ReceptionTab>('dashboard');

  if (isReceptionMode) {
    return (
      <div className="fixed inset-0 z-50 bg-gray-100 flex flex-col overflow-hidden">
        {/* Reception Header with Tabs */}
        <ReceptionHeader activeTab={activeTab} onTabChange={setActiveTab} />

        {/* Main Content Area */}
        <main className="flex-1 overflow-auto">
          <div className="max-w-7xl mx-auto p-4 sm:p-6">
            <Suspense fallback={<LoadingSpinner />}>
              {activeTab === 'dashboard' && <ReceptionDashboard />}
              {activeTab === 'transactions' && <ReceptionTransactions />}
              {activeTab === 'expenses' && <ReceptionExpenses />}
              {activeTab === 'settings' && <ReceptionSettings />}
            </Suspense>
          </div>
        </main>

        {/* Footer */}
        <footer className="bg-white border-t border-gray-200 px-4 py-2 text-center text-xs text-gray-500">
          C-Space HR Platform • Reception Mode • {new Date().toLocaleDateString()}
        </footer>

        {/* Branch Switch Confirmation Modal */}
        <BranchSwitchModal />
      </div>
    );
  }

  return <>{children}</>;
}
