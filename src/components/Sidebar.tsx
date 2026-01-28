'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  MapPin,
  Clock,
  Wallet,
  Settings,
  LogOut,
  Building2,
  UserPlus,
  BarChart3,
  UserCircle,
  MessageSquare,
  Inbox,
  ChevronDown,
  ChevronRight,
  Table,
  Kanban,
  Calculator,
  FileText,
  ClipboardCheck,
  ListTodo,
  Code2,
  Bot,
} from 'lucide-react';
import type { User, UserRole } from '@/types';
import { getRoleLabel } from '@/lib/auth';
import { useSidebar } from '@/contexts/SidebarContext';
import { useTranslation } from '@/contexts/LanguageContext';

interface SidebarProps {
  user: User;
}

interface NavItem {
  nameKey: string;
  href: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  roles: UserRole[];
  children?: NavItem[];
}

const navItems: NavItem[] = [
  {
    nameKey: 'dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    roles: ['general_manager', 'ceo', 'hr', 'recruiter', 'branch_manager', 'employee', 'accountant', 'chief_accountant', 'legal_manager'],
  },
  {
    nameKey: 'myPortal',
    href: '/my-portal',
    icon: UserCircle,
    roles: ['general_manager', 'ceo', 'hr', 'recruiter', 'branch_manager', 'employee', 'accountant', 'chief_accountant', 'legal_manager'],
  },
  // People Management group
  {
    nameKey: 'peopleManagement',
    href: '/employees',
    icon: Users,
    roles: ['general_manager', 'ceo', 'hr', 'branch_manager'],
    children: [
      {
        nameKey: 'employees',
        href: '/employees',
        icon: Users,
        roles: ['general_manager', 'ceo', 'hr', 'branch_manager'],
      },
      {
        nameKey: 'attendance',
        href: '/attendance',
        icon: Clock,
        roles: ['general_manager', 'ceo', 'hr', 'branch_manager'],
      },
      {
        nameKey: 'payroll',
        href: '/payroll',
        icon: Wallet,
        roles: ['general_manager', 'ceo', 'hr'],
      },
      {
        nameKey: 'departments',
        href: '/departments',
        icon: Building2,
        roles: ['general_manager', 'hr'],
      },
    ],
  },
  // Recruitment group
  {
    nameKey: 'recruitment',
    href: '/recruitment',
    icon: UserPlus,
    roles: ['general_manager', 'hr', 'recruiter'],
    children: [
      {
        nameKey: 'tableView',
        href: '/recruitment',
        icon: Table,
        roles: ['general_manager', 'hr', 'recruiter'],
      },
      {
        nameKey: 'boardView',
        href: '/recruitment/board',
        icon: Kanban,
        roles: ['general_manager', 'hr', 'recruiter'],
      },
    ],
  },
  // Accounting group
  {
    nameKey: 'accounting',
    href: '/accounting',
    icon: Calculator,
    roles: ['general_manager', 'ceo', 'chief_accountant', 'accountant', 'branch_manager', 'legal_manager', 'hr', 'employee', 'recruiter'],
    children: [
      {
        nameKey: 'myRequests',
        href: '/accounting/my-requests',
        icon: FileText,
        roles: ['general_manager', 'ceo', 'branch_manager', 'legal_manager', 'hr', 'employee', 'recruiter', 'accountant', 'chief_accountant'],
      },
      {
        nameKey: 'allRequests',
        href: '/accounting/requests',
        icon: ListTodo,
        roles: ['general_manager', 'ceo', 'chief_accountant', 'accountant'],
      },
    ],
  },
  {
    nameKey: 'branches',
    href: '/branches',
    icon: MapPin,
    roles: ['general_manager', 'hr'],
  },
  {
    nameKey: 'reports',
    href: '/reports',
    icon: BarChart3,
    roles: ['general_manager', 'ceo'],
  },
  {
    nameKey: 'feedback',
    href: '/feedback',
    icon: MessageSquare,
    roles: ['employee', 'branch_manager', 'recruiter', 'hr', 'accountant', 'chief_accountant', 'legal_manager'],
  },
  {
    nameKey: 'feedbackInbox',
    href: '/feedback/review',
    icon: Inbox,
    roles: ['general_manager', 'ceo'],
  },
  {
    nameKey: 'settings',
    href: '/settings',
    icon: Settings,
    roles: ['general_manager'],
  },
  {
    nameKey: 'devBoard',
    href: '/dev-board',
    icon: Code2,
    roles: ['general_manager'],
  },
  {
    nameKey: 'telegramBot',
    href: '/telegram-bot',
    icon: Bot,
    roles: ['general_manager'],
  },
];

export default function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();
  const { isCollapsed } = useSidebar();
  const { t } = useTranslation();
  const [expandedItems, setExpandedItems] = useState<string[]>(() => {
    // Auto-expand if we're on a child route
    const expanded: string[] = [];
    navItems.forEach(item => {
      if (item.children && pathname.startsWith(item.href)) {
        expanded.push(item.href);
      }
    });
    return expanded;
  });

  // Translation helper for nav items
  const getNavLabel = (key: string): string => {
    const labels: Record<string, string> = {
      dashboard: t.nav.dashboard,
      myPortal: t.nav.myPortal,
      peopleManagement: t.nav.peopleManagement || 'People Management',
      employees: t.nav.employees,
      branches: t.nav.branches,
      attendance: t.nav.attendance,
      payroll: t.nav.payroll,
      recruitment: t.nav.recruitment,
      tableView: t.nav.tableView,
      boardView: t.nav.boardView,
      reports: t.nav.reports,
      accounting: t.nav.accounting,
      myRequests: t.nav.myRequests,
      allRequests: t.nav.allRequests,
      approvals: t.nav.approvals,
      departments: t.nav.departments,
      feedback: t.nav.feedback,
      feedbackInbox: t.nav.feedbackInbox,
      settings: t.nav.settings,
      devBoard: 'Dev Board',
      telegramBot: 'Telegram Bot',
    };
    return labels[key] || key;
  };

  const filteredNavItems = navItems.filter((item) =>
    item.roles.includes(user.role)
  );

  const toggleExpand = (href: string) => {
    setExpandedItems(prev =>
      prev.includes(href)
        ? prev.filter(h => h !== href)
        : [...prev, href]
    );
  };

  const handleLogout = async () => {
    try {
      const response = await fetch('/api/auth/logout', { method: 'POST' });
      if (response.ok) {
        // Use window.location for a full page reload to clear all state
        window.location.href = '/login';
      } else {
        console.error('Logout failed');
      }
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const renderNavItem = (item: NavItem, isChild = false) => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems.includes(item.href);
    const isActive = pathname === item.href ||
      (hasChildren && pathname.startsWith(item.href + '/')) ||
      (!hasChildren && pathname.startsWith(item.href + '/'));
    const isChildActive = hasChildren && item.children?.some(child => pathname === child.href);
    const Icon = item.icon;
    const itemName = getNavLabel(item.nameKey);

    if (hasChildren && item.children) {
      // Don't show expandable items when collapsed
      if (isCollapsed) {
        return (
          <li key={item.href}>
            <Link
              href={item.children[0]?.href || item.href}
              className={`flex items-center justify-center p-2.5 rounded-xl transition-all duration-200 ${
                isActive || isChildActive
                  ? 'bg-purple-100 text-purple-700 shadow-sm'
                  : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
              }`}
              title={itemName}
            >
              <Icon size={20} className={isActive || isChildActive ? 'text-purple-600' : ''} />
            </Link>
          </li>
        );
      }

      return (
        <li key={item.href}>
          <button
            onClick={() => toggleExpand(item.href)}
            className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 ${
              isActive || isChildActive
                ? 'bg-purple-100 text-purple-700 shadow-sm font-semibold'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-800'
            }`}
          >
            <div className="flex items-center gap-3">
              <Icon size={20} className={isActive || isChildActive ? 'text-purple-600' : 'text-gray-400'} />
              <span className="text-[15px] tracking-tight">{itemName}</span>
            </div>
            {isExpanded ? (
              <ChevronDown size={16} className={isActive || isChildActive ? 'text-purple-500' : 'text-gray-400'} />
            ) : (
              <ChevronRight size={16} className={isActive || isChildActive ? 'text-purple-500' : 'text-gray-400'} />
            )}
          </button>
          {isExpanded && (
            <ul className="mt-1.5 ml-7 space-y-1 border-l-2 border-purple-100 pl-3">
              {item.children
                ?.filter(child => child.roles.includes(user.role))
                .map(child => renderNavItem(child, true))}
            </ul>
          )}
        </li>
      );
    }

    if (isCollapsed) {
      return (
        <li key={item.href}>
          <Link
            href={item.href}
            className={`flex items-center justify-center p-2.5 rounded-xl transition-all duration-200 ${
              pathname === item.href
                ? 'bg-purple-100 text-purple-700 shadow-sm'
                : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
            }`}
            title={itemName}
          >
            <Icon size={20} className={pathname === item.href ? 'text-purple-600' : ''} />
          </Link>
        </li>
      );
    }

    return (
      <li key={item.href}>
        <Link
          href={item.href}
          className={`flex items-center gap-3 px-3 rounded-xl transition-all duration-200 ${
            isChild ? 'py-2' : 'py-2.5'
          } ${
            pathname === item.href
              ? 'bg-purple-100 text-purple-700 shadow-sm font-semibold'
              : 'text-gray-600 hover:bg-gray-100 hover:text-gray-800'
          }`}
        >
          <Icon size={isChild ? 16 : 20} className={pathname === item.href ? 'text-purple-600' : 'text-gray-400'} />
          <span className={`${isChild ? 'text-[14px]' : 'text-[15px]'} tracking-tight`}>{itemName}</span>
        </Link>
      </li>
    );
  };

  return (
    <aside className={`${isCollapsed ? 'w-16' : 'w-60 xl:w-64'} bg-white border-r border-gray-100 flex flex-col h-screen sticky top-0 transition-all duration-300`}>
      {/* Logo */}
      <div className={`p-4 border-b border-gray-100 ${isCollapsed ? 'flex justify-center' : ''}`}>
        <Link href="/dashboard" className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'}`}>
          <Image
            src="/logo-icon.svg"
            alt="C-Space Logo"
            width={40}
            height={44}
            className="flex-shrink-0"
          />
          {!isCollapsed && (
            <div>
              <h1 className="font-bold text-gray-900 text-base tracking-tight">C-Space People</h1>
              <p className="text-xs text-gray-400 font-medium">People Management</p>
            </div>
          )}
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 overflow-y-auto">
        <ul className="space-y-1">
          {filteredNavItems.map((item) => renderNavItem(item))}
        </ul>
      </nav>

      {/* User Section */}
      <div className={`p-4 border-t border-gray-100 ${isCollapsed ? 'flex flex-col items-center' : ''}`}>
        {!isCollapsed && (
          <Link
            href="/my-portal/profile"
            className="flex items-center gap-3 mb-3 p-2 -m-2 rounded-xl hover:bg-purple-50 transition-all duration-200 cursor-pointer group"
          >
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center shadow-sm group-hover:shadow-md transition-all duration-200">
              <span className="text-white font-semibold text-sm">
                {user.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[15px] font-semibold text-gray-800 truncate group-hover:text-purple-700 transition-colors tracking-tight">{user.name}</p>
              <p className="text-xs text-gray-400 truncate font-medium">{user.position || getRoleLabel(user.role)}</p>
            </div>
          </Link>
        )}
        {isCollapsed ? (
          <div className="flex flex-col items-center gap-2">
            <Link
              href="/my-portal/profile"
              className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center shadow-sm hover:shadow-md transition-all duration-200"
              title={user.name}
            >
              <span className="text-white font-semibold text-sm">
                {user.name.charAt(0).toUpperCase()}
              </span>
            </Link>
            <button
              onClick={handleLogout}
              className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all duration-200"
              title={t.nav.logout}
            >
              <LogOut size={20} />
            </button>
          </div>
        ) : (
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 text-[15px] font-medium text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all duration-200 tracking-tight"
          >
            <LogOut size={18} />
            {t.nav.logout}
          </button>
        )}
      </div>
    </aside>
  );
}
