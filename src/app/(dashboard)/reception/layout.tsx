'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Receipt, Wallet, FileText, Calendar, UserCog } from 'lucide-react';
import { useReceptionMode } from '@/contexts/ReceptionModeContext';
import { PinSwitchOverlay } from '@/components/reception/PinSwitchOverlay';

interface ReceptionLayoutProps {
  children: React.ReactNode;
}

const navItems = [
  { href: '/reception', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/reception/transactions', label: 'Transactions', icon: Receipt },
  { href: '/reception/expenses', label: 'Expenses', icon: Wallet },
  { href: '/reception/requests', label: 'Requests', icon: FileText },
  { href: '/reception/shifts', label: 'Shifts', icon: Calendar },
];

export default function ReceptionLayout({ children }: ReceptionLayoutProps) {
  const pathname = usePathname();
  const { currentOperator, isOperatorSwitched } = useReceptionMode();
  const [showPinOverlay, setShowPinOverlay] = useState(false);

  const isActive = (href: string, exact?: boolean) => {
    if (exact) {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Reception Header */}
      <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                <Receipt className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-lg font-bold">Reception Mode <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-bold uppercase rounded-full bg-amber-400/30 text-amber-100 leading-none align-middle">Beta</span></h1>
                <p className="text-xs text-purple-200">Record transactions & manage requests</p>
              </div>
            </div>

            {/* Operator Switch Button */}
            <button
              onClick={() => setShowPinOverlay(true)}
              className="flex items-center gap-2 px-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors text-sm"
            >
              <UserCog size={18} />
              <span className="hidden sm:inline">
                {isOperatorSwitched && currentOperator
                  ? currentOperator.name
                  : 'Switch Operator'
                }
              </span>
              {isOperatorSwitched && (
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              )}
            </button>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex gap-1 -mb-px overflow-x-auto">
            {navItems.map((item) => {
              const active = isActive(item.href, item.exact);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`
                    flex items-center gap-2 px-4 py-3 text-sm font-medium rounded-t-lg transition-colors whitespace-nowrap
                    ${active
                      ? 'bg-gray-50 text-purple-700'
                      : 'text-purple-100 hover:text-white hover:bg-white/10'
                    }
                  `}
                >
                  <item.icon size={18} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>

      {/* PIN Switch Overlay */}
      <PinSwitchOverlay isOpen={showPinOverlay} onClose={() => setShowPinOverlay(false)} />
    </div>
  );
}
