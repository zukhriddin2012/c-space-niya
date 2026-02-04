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
  GitBranch,
  Upload,
  DollarSign,
  TrendingUp,
  Receipt,
  Calendar,
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
      {
        nameKey: 'orgChart',
        href: '/org-chart',
        icon: GitBranch,
        roles: ['general_manager', 'ceo', 'hr', 'branch_manager'],
      },
      {
        nameKey: 'salaryImport',
        href: '/admin/salary-import',
        icon: Upload,
        roles: ['general_manager', 'hr'],
      },
    ],
  },
  // Shift Planning
  {
    nameKey: 'shiftPlanning',
    href: '/shifts',
    icon: Calendar,
    roles: ['general_manager', 'hr', 'ceo', 'branch_manager'],
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
  // Approvals Hub (for managers)
  {
    nameKey: 'approvals',
    href: '/approvals',
    icon: ClipboardCheck,
    roles: ['general_manager', 'ceo', 'hr', 'chief_accountant'],
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
  // Finances group
  {
    nameKey: 'finances',
    href: '/finances',
    icon: DollarSign,
    roles: ['general_manager', 'ceo', 'branch_manager', 'reports_manager', 'chief_accountant', 'accountant'],
    children: [
      {
        nameKey: 'financesDashboard',
        href: '/finances',
        icon: TrendingUp,
        roles: ['general_manager', 'ceo', 'reports_manager', 'chief_accountant', 'accountant'],
      },
      {
        nameKey: 'myBranchFinances',
        href: '/finances/my-branch',
        icon: Building2,
        roles: ['branch_manager'],
      },
      {
        nameKey: 'financesTransactions',
        href: '/finances/transactions',
        icon: Receipt,
        roles: ['general_manager', 'ceo', 'branch_manager', 'reports_manager', 'chief_accountant', 'accountant'],
      },
    ],
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
      orgChart: t.nav.orgChart || 'Org Chart',
      accounting: t.nav.accounting,
      myRequests: t.nav.myRequests,
      allRequests: t.nav.allRequests,
      approvals: t.nav.approvals,
      departments: t.nav.departments,
      salaryImport: 'Salary Import',
      finances: 'Finances',
      financesDashboard: 'Dashboard',
      myBranchFinances: 'My Branch',
      financesTransactions: 'Transactions',
      feedback: t.nav.feedback,
      feedbackInbox: t.nav.feedbackInbox,
      settings: t.nav.settings,
      devBoard: 'Dev Board',
      telegramBot: 'Telegram Bot',
      shiftPlanning: t.nav.shiftPlanning || 'Shift Planning',
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
              className={`flex items-center justify-center p-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive || isChildActive
                  ? 'bg-purple-50 text-purple-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
              title={itemName}
            >
              <Icon size={20} className={isActive || isChildActive ? 'text-purple-600' : 'text-gray-400'} />
            </Link>
          </li>
        );
      }

      return (
        <li key={item.href}>
          <button
            onClick={() => toggleExpand(item.href)}
            className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              isActive || isChildActive
                ? 'bg-purple-50 text-purple-700'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center gap-3">
              <Icon size={20} className={isActive || isChildActive ? 'text-purple-600' : 'text-gray-400'} />
              {itemName}
            </div>
            {isExpanded ? (
              <ChevronDown size={16} className="text-gray-400" />
            ) : (
              <ChevronRight size={16} className="text-gray-400" />
            )}
          </button>
          {isExpanded && (
            <ul className="mt-1 ml-6 space-y-1 border-l border-gray-200 pl-3">
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
            className={`flex items-center justify-center p-2.5 rounded-lg text-sm font-medium transition-colors ${
              pathname === item.href
                ? 'bg-purple-50 text-purple-700'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`}
            title={itemName}
          >
            <Icon size={20} className={pathname === item.href ? 'text-purple-600' : 'text-gray-400'} />
          </Link>
        </li>
      );
    }

    return (
      <li key={item.href}>
        <Link
          href={item.href}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            isChild ? 'py-2' : ''
          } ${
            pathname === item.href
              ? 'bg-purple-50 text-purple-700'
              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
          }`}
        >
          <Icon size={isChild ? 16 : 20} className={pathname === item.href ? 'text-purple-600' : 'text-gray-400'} />
          {itemName}
        </Link>
      </li>
    );
  };

  return (
    <aside className={`${isCollapsed ? 'w-16' : 'w-56 xl:w-64'} bg-white border-r border-gray-200 flex flex-col h-screen sticky top-0 transition-all duration-300`}>
      {/* Logo */}
      <div className={`p-4 border-b border-gray-200 ${isCollapsed ? 'flex justify-center' : ''}`}>
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
              <h1 className="font-semibold text-gray-900">C-Space Niya</h1>
              <p className="text-xs text-gray-500">HR & Operations</p>
            </div>
          )}
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2 overflow-y-auto">
        <ul className="space-y-1">
          {filteredNavItems.map((item) => renderNavItem(item))}
        </ul>
      </nav>

      {/* User Section */}
      <div className={`p-4 border-t border-gray-200 ${isCollapsed ? 'flex flex-col items-center' : ''}`}>
        {!isCollapsed && (
          <Link
            href="/my-portal/profile"
            className="flex items-center gap-3 mb-3 p-2 -m-2 rounded-lg hover:bg-purple-50 transition-colors cursor-pointer group"
          >
            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center group-hover:bg-purple-200 transition-colors">
              <span className="text-purple-700 font-medium">
                {user.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate group-hover:text-purple-700 transition-colors">{user.name}</p>
              <p className="text-xs text-gray-500 truncate">{user.position || getRoleLabel(user.role)}</p>
            </div>
          </Link>
        )}
        {isCollapsed ? (
          <div className="flex flex-col items-center gap-2">
            <Link
              href="/my-portal/profile"
              className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center hover:bg-purple-200 transition-colors"
              title={user.name}
            >
              <span className="text-purple-700 font-medium">
                {user.name.charAt(0).toUpperCase()}
              </span>
            </Link>
            <button
              onClick={handleLogout}
              className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title={t.nav.logout}
            >
              <LogOut size={20} />
            </button>
          </div>
        ) : (
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut size={18} />
            {t.nav.logout}
          </button>
        )}
      </div>
    </aside>
  );
}
