'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Table, LayoutDashboard } from 'lucide-react';

export default function AttendanceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const tabs = [
    { name: 'Sheet', href: '/attendance/sheet', icon: Table },
    { name: 'Dashboard', href: '/attendance/dashboard', icon: LayoutDashboard },
  ];

  const isActive = (href: string) => pathname === href;

  return (
    <div>
      {/* Header with Tabs */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Attendance</h1>
          <p className="text-gray-500 mt-1">Monitor and manage employee attendance</p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-lg w-fit mb-6">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                isActive(tab.href)
                  ? 'bg-white text-purple-700 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Icon size={18} />
              {tab.name}
            </Link>
          );
        })}
      </div>

      {/* Page Content */}
      {children}
    </div>
  );
}
