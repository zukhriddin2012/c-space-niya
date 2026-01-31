'use client';

import { Receipt, LayoutDashboard, ArrowLeftRight, Wallet, Settings, X, User } from 'lucide-react';
import { useReceptionMode } from '@/contexts/ReceptionModeContext';
import { useAuth } from '@/contexts/AuthContext';
import { BranchSelector } from '@/components/reception/BranchSelector';

export type ReceptionTab = 'dashboard' | 'transactions' | 'expenses' | 'settings';

interface ReceptionHeaderProps {
  activeTab: ReceptionTab;
  onTabChange: (tab: ReceptionTab) => void;
}

const tabs = [
  { id: 'dashboard' as const, label: 'Dashboard', icon: LayoutDashboard },
  { id: 'transactions' as const, label: 'Transactions', icon: ArrowLeftRight },
  { id: 'expenses' as const, label: 'Expenses', icon: Wallet },
  { id: 'settings' as const, label: 'Settings', icon: Settings },
];

export function ReceptionHeader({ activeTab, onTabChange }: ReceptionHeaderProps) {
  const { setReceptionMode, selectedBranch } = useReceptionMode();
  const { user } = useAuth();

  return (
    <header className={`shadow-lg ${
      selectedBranch?.isAllBranches
        ? 'bg-gradient-to-r from-red-700 to-red-900'
        : 'bg-gradient-to-r from-purple-700 to-purple-900'
    } text-white`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Top Bar */}
        <div className="flex items-center justify-between h-16">
          {/* Logo & Title & Branch */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <Receipt className="w-6 h-6" />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-xl font-bold">Reception Mode</h1>
                <p className="text-purple-200 text-xs">C-Space Coworking</p>
              </div>
            </div>

            {/* Branch Selector - Positioned next to logo */}
            <div className="h-8 w-px bg-white/20 hidden sm:block" />
            <BranchSelector />
          </div>

          {/* User & Exit */}
          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-lg">
              <User className="w-4 h-4" />
              <span className="text-sm font-medium">{user?.name || 'User'}</span>
            </div>
            <button
              onClick={() => setReceptionMode(false)}
              className="flex items-center gap-2 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg transition-colors text-sm"
              title="Exit Reception Mode"
            >
              <X className="w-4 h-4" />
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
                onClick={() => onTabChange(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  isActive
                    ? 'border-white text-white bg-white/10'
                    : 'border-transparent text-purple-200 hover:text-white hover:bg-white/5'
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
  );
}
