'use client';

import { useState, useEffect, useRef, useCallback, lazy, Suspense } from 'react';
import {
  LayoutGrid,
  LayoutDashboard,
  ArrowLeftRight,
  Wallet,
  Settings,
  LogOut,
  UserCog,
  User,
  FileText,
  Calendar,
  Clock,
  Banknote,
  Activity,
} from 'lucide-react';
import { AuthProvider } from '@/contexts/AuthContext';
import { ServiceHubProvider, useServiceHub } from '@/contexts/ServiceHubContext';
import { PinSwitchOverlay } from '@/components/reception/PinSwitchOverlay';
import { BranchSwitchModal } from '@/components/reception/BranchSwitchModal';
import { BranchAlertBanner } from '@/components/reception/BranchAlertBanner';
import { RamadanBanner } from '@/components/ramadan';
import { BranchBriefingPanel } from '@/components/reception/BranchBriefingPanel';
import { BranchSelector } from '@/components/reception/BranchSelector';
import type { User as UserType } from '@/types';

// Lazy load reception components
const ReceptionDashboard = lazy(() => import('@/components/reception/ReceptionDashboard'));
const ReceptionTransactions = lazy(() => import('@/components/reception/ReceptionTransactions'));
const ReceptionExpenses = lazy(() => import('@/components/reception/ReceptionExpenses'));
const ReceptionSettings = lazy(() => import('@/components/reception/ReceptionSettings'));
const ReceptionRequests = lazy(() => import('@/components/reception/ReceptionRequests'));
const ReceptionShifts = lazy(() => import('@/components/reception/ReceptionShifts'));
const CashManagementDashboard = lazy(() => import('@/components/reception/CashManagementDashboard'));

type KioskTab = 'dashboard' | 'transactions' | 'expenses' | 'cash-management' | 'requests' | 'shifts' | 'settings';

const tabs = [
  { id: 'dashboard' as const, label: 'Dashboard', icon: LayoutDashboard },
  { id: 'transactions' as const, label: 'Transactions', icon: ArrowLeftRight },
  { id: 'expenses' as const, label: 'Expenses', icon: Wallet },
  { id: 'cash-management' as const, label: 'Cash', icon: Banknote },
  { id: 'requests' as const, label: 'Requests', icon: FileText },
  { id: 'shifts' as const, label: 'Shifts', icon: Calendar },
  { id: 'settings' as const, label: 'Settings', icon: Settings },
];

interface StandaloneReceptionUIProps {
  branchId: string;
  branchName: string;
  expiresAt: string;
  onLogout: () => void;
}

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin w-8 h-8 border-3 border-sky-600 border-t-transparent rounded-full" />
    </div>
  );
}

function calculateRemainingTime(expiresAt: string): string {
  const remaining = new Date(expiresAt).getTime() - Date.now();
  if (remaining <= 0) return 'Expired';
  const hours = Math.floor(remaining / (1000 * 60 * 60));
  const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

// Inner component that uses the reception contexts
function KioskInner({ branchId, branchName, expiresAt, onLogout }: StandaloneReceptionUIProps) {
  const [activeTab, setActiveTab] = useState<KioskTab>('dashboard');
  const [showOperatorSwitch, setShowOperatorSwitch] = useState(false);
  const [remainingTime, setRemainingTime] = useState(() => calculateRemainingTime(expiresAt));
  const [pendingQuickAction, setPendingQuickAction] = useState<'new-transaction' | 'new-expense' | null>(null);
  // BUG-2 FIX: Track pending request sub-tab for navigation from dashboard cards
  const [pendingRequestSubTab, setPendingRequestSubTab] = useState<string | null>(null);
  // CSN-029: Branch briefing panel visibility for non-home branches
  const [showBriefing, setShowBriefing] = useState(true);

  const { currentOperator, setSelectedBranch, selectedBranchId, accessibleBranches } = useServiceHub();

  // CSN-029: Determine if operating at a non-home branch
  const isNonHomeBranch = selectedBranchId
    ? accessibleBranches.some(b => b.id === selectedBranchId && !b.isAllBranches && (b.isFromAssignment || b.isGranted) && !b.isAssigned)
    : false;

  // CSN-030: Quick action handler — switches tab and signals auto-open
  const handleQuickAction = useCallback((action: 'new-transaction' | 'new-expense') => {
    setPendingQuickAction(action);
    setActiveTab(action === 'new-transaction' ? 'transactions' : 'expenses');
  }, []);

  // CSN-030: Dashboard tab change handler
  // BUG-2 FIX: Accept optional subTab for request card navigation
  const handleDashboardTabChange = useCallback((tab: string, subTab?: string) => {
    if (subTab) setPendingRequestSubTab(subTab);
    setActiveTab(tab as KioskTab);
  }, []);

  // CSN-030: Clear pending action once consumed by child
  const handleAutoOpenConsumed = useCallback(() => {
    setPendingQuickAction(null);
  }, []);

  // Set branch on mount
  const initializedRef = useRef(false);
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    if (branchId) {
      setSelectedBranch(branchId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Show PIN overlay when no operator is set (only after initialization)
  useEffect(() => {
    if (!currentOperator && initializedRef.current) {
      setShowOperatorSwitch(true);
    }
  }, [currentOperator]);

  // Update remaining time every minute
  useEffect(() => {
    const interval = setInterval(() => {
      const newTime = calculateRemainingTime(expiresAt);
      setRemainingTime(newTime);
      if (newTime === 'Expired') {
        onLogout();
      }
    }, 60000);
    return () => clearInterval(interval);
  }, [expiresAt, onLogout]);

  const displayName = currentOperator?.name || 'No operator';

  return (
    <div className="fixed inset-0 z-50 bg-gray-100 flex flex-col overflow-hidden">
      {/* ServiceHub Header */}
      <header className="bg-gradient-to-r from-sky-700 to-sky-900 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          {/* Top Bar */}
          <div className="flex items-center justify-between h-16">
            {/* Logo & Branch Name */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                  <LayoutGrid className="w-6 h-6" />
                </div>
                <div className="hidden sm:block">
                  <h1 className="text-xl font-bold">ServiceHub <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-bold uppercase rounded-full bg-green-400/30 text-green-100 leading-none align-middle">v1</span></h1>
                  <BranchSelector />
                </div>
              </div>
            </div>

            {/* Operator & Actions */}
            <div className="flex items-center gap-3">
              {/* CSN-029: Branch Info Toggle (non-home branches only) */}
              {isNonHomeBranch && (
                <button
                  onClick={() => setShowBriefing(prev => !prev)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors text-sm ${
                    showBriefing
                      ? 'bg-amber-500/30 hover:bg-amber-500/50 text-amber-100'
                      : 'bg-white/10 hover:bg-white/20'
                  }`}
                  title={showBriefing ? 'Hide Branch Info' : 'Show Branch Info'}
                >
                  <Activity className="w-4 h-4" />
                  <span className="hidden md:inline">Branch Info</span>
                </button>
              )}

              {/* Operator Switch Button */}
              <button
                onClick={() => setShowOperatorSwitch(true)}
                className="flex items-center gap-2 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg transition-colors text-sm"
                title="Switch Operator"
              >
                <UserCog className="w-4 h-4" />
                <span className="hidden md:inline">Switch</span>
              </button>

              {/* Current Operator */}
              <div className="hidden md:flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-lg">
                <User className="w-4 h-4" />
                <span className="text-sm font-medium">{displayName}</span>
                {currentOperator && (
                  <span className="text-xs bg-yellow-500/30 text-yellow-100 px-1.5 py-0.5 rounded">
                    Operator
                  </span>
                )}
              </div>

              {/* Exit Button */}
              <button
                onClick={onLogout}
                className="flex items-center gap-2 px-3 py-1.5 bg-red-500/30 hover:bg-red-500/50 rounded-lg transition-colors text-sm"
                title="Exit"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Exit</span>
              </button>
            </div>
          </div>

          {/* Tab Navigation */}
          <nav className="flex gap-1 -mb-px overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                    isActive
                      ? 'border-white text-white bg-white/10'
                      : 'border-transparent text-sky-200 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-4">
          {/* CSN-174: Ramadan banner */}
          <RamadanBanner variant="kiosk" />
          {/* CSN-029: Non-home branch alert */}
          <BranchAlertBanner />
          {/* CSN-029: Branch briefing panel for non-home branches */}
          {isNonHomeBranch && showBriefing && selectedBranchId && (
            <BranchBriefingPanel branchId={selectedBranchId} />
          )}
          <Suspense fallback={<LoadingSpinner />}>
            {activeTab === 'dashboard' && (
              <ReceptionDashboard
                onTabChange={handleDashboardTabChange}
                onQuickAction={handleQuickAction}
              />
            )}
            {activeTab === 'transactions' && (
              <ReceptionTransactions
                autoOpenCreate={pendingQuickAction === 'new-transaction'}
                onAutoOpenConsumed={handleAutoOpenConsumed}
              />
            )}
            {activeTab === 'expenses' && (
              <ReceptionExpenses
                autoOpenCreate={pendingQuickAction === 'new-expense'}
                onAutoOpenConsumed={handleAutoOpenConsumed}
              />
            )}
            {activeTab === 'cash-management' && <CashManagementDashboard />}
            {activeTab === 'requests' && (
              <ReceptionRequests
                defaultSubView={pendingRequestSubTab as 'legal' | 'maintenance' | 'accounting' | undefined}
                onSubViewConsumed={() => setPendingRequestSubTab(null)}
              />
            )}
            {activeTab === 'shifts' && <ReceptionShifts />}
            {activeTab === 'settings' && <ReceptionSettings />}
          </Suspense>
        </div>
      </main>

      {/* Footer with Session Timer */}
      <footer className="bg-white border-t border-gray-200 px-4 py-2 flex items-center justify-between text-xs text-gray-500">
        <span>C-Space Niya • ServiceHub • {branchName}</span>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Session: {remainingTime}
          </span>
          <button
            onClick={onLogout}
            className="px-2 py-1 bg-red-50 text-red-600 rounded hover:bg-red-100 transition-colors font-medium"
          >
            Exit
          </button>
        </div>
      </footer>

      {/* Branch Switch Modal (for context compatibility) */}
      <BranchSwitchModal />

      {/* Operator PIN Switch Overlay */}
      <PinSwitchOverlay
        isOpen={showOperatorSwitch}
        onClose={() => setShowOperatorSwitch(false)}
      />
    </div>
  );
}

// Outer wrapper: provides the Auth and Reception contexts
export function StandaloneReceptionUI(props: StandaloneReceptionUIProps) {
  // Create a synthetic kiosk user for the AuthProvider
  const kioskUser: UserType = {
    id: `kiosk:${props.branchId}`,
    email: '',
    name: 'ServiceHub Kiosk',
    role: 'reception_kiosk',
    branchId: props.branchId,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  return (
    <AuthProvider initialUser={kioskUser}>
      <ServiceHubProvider>
        <KioskInner {...props} />
      </ServiceHubProvider>
    </AuthProvider>
  );
}
