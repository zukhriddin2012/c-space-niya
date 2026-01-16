'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  MapPin,
  Clock,
  Wallet,
  ClipboardList,
  Settings,
  LogOut,
  Building2,
  UserPlus,
  BarChart3,
} from 'lucide-react';
import type { User, UserRole } from '@/types';
import { getRoleLabel } from '@/lib/auth';

interface SidebarProps {
  user: User;
}

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  roles: UserRole[];
}

const navItems: NavItem[] = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    roles: ['general_manager', 'ceo', 'hr', 'recruiter', 'employee'],
  },
  {
    name: 'Employees',
    href: '/employees',
    icon: Users,
    roles: ['general_manager', 'ceo', 'hr'],
  },
  {
    name: 'Branches',
    href: '/branches',
    icon: MapPin,
    roles: ['general_manager', 'hr'],
  },
  {
    name: 'Attendance',
    href: '/attendance',
    icon: Clock,
    roles: ['general_manager', 'ceo', 'hr', 'employee'],
  },
  {
    name: 'Payroll',
    href: '/payroll',
    icon: Wallet,
    roles: ['general_manager', 'ceo', 'hr'],
  },
  {
    name: 'Tasks',
    href: '/tasks',
    icon: ClipboardList,
    roles: ['general_manager', 'hr', 'employee'],
  },
  {
    name: 'Recruitment',
    href: '/recruitment',
    icon: UserPlus,
    roles: ['general_manager', 'hr', 'recruiter'],
  },
  {
    name: 'Reports',
    href: '/reports',
    icon: BarChart3,
    roles: ['general_manager', 'ceo'],
  },
  {
    name: 'Departments',
    href: '/departments',
    icon: Building2,
    roles: ['general_manager', 'hr'],
  },
  {
    name: 'Settings',
    href: '/settings',
    icon: Settings,
    roles: ['general_manager'],
  },
];

export default function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const filteredNavItems = navItems.filter((item) =>
    item.roles.includes(user.role)
  );

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
      router.refresh();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col h-screen sticky top-0">
      {/* Logo */}
      <div className="p-4 border-b border-gray-200">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center">
            <span className="text-white text-lg font-bold">C</span>
          </div>
          <div>
            <h1 className="font-semibold text-gray-900">C-Space HR</h1>
            <p className="text-xs text-gray-500">Human Resources</p>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 overflow-y-auto">
        <ul className="space-y-1">
          {filteredNavItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            const Icon = item.icon;

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-purple-50 text-purple-700'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <Icon size={20} className={isActive ? 'text-purple-600' : 'text-gray-400'} />
                  {item.name}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User Section */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
            <span className="text-purple-700 font-medium">
              {user.name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{user.name}</p>
            <p className="text-xs text-gray-500 truncate">{getRoleLabel(user.role)}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
        >
          <LogOut size={18} />
          Sign out
        </button>
      </div>
    </aside>
  );
}
