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
  PanelLeftClose,
  PanelLeft,
} from 'lucide-react';
import type { User, UserRole } from '@/types';
import { getRoleLabel } from '@/lib/auth';
import { useSidebar } from '@/contexts/SidebarContext';

interface SidebarProps {
  user: User;
}

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  roles: UserRole[];
  children?: NavItem[];
}

const navItems: NavItem[] = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    roles: ['general_manager', 'ceo', 'hr', 'recruiter', 'branch_manager', 'employee'],
  },
  {
    name: 'My Portal',
    href: '/my-portal',
    icon: UserCircle,
    roles: ['general_manager', 'ceo', 'hr', 'recruiter', 'branch_manager', 'employee'],
  },
  {
    name: 'Employees',
    href: '/employees',
    icon: Users,
    roles: ['general_manager', 'ceo', 'hr', 'branch_manager'],
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
    roles: ['general_manager', 'ceo', 'hr', 'branch_manager'],
  },
  {
    name: 'Payroll',
    href: '/payroll',
    icon: Wallet,
    roles: ['general_manager', 'ceo', 'hr'],
  },
  {
    name: 'Recruitment',
    href: '/recruitment',
    icon: UserPlus,
    roles: ['general_manager', 'hr', 'recruiter'],
    children: [
      {
        name: 'Table View',
        href: '/recruitment/table',
        icon: Table,
        roles: ['general_manager', 'hr', 'recruiter'],
      },
      {
        name: 'Board View',
        href: '/recruitment/board',
        icon: Kanban,
        roles: ['general_manager', 'hr', 'recruiter'],
      },
    ],
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
    name: 'Feedback',
    href: '/feedback',
    icon: MessageSquare,
    roles: ['employee', 'branch_manager', 'recruiter', 'hr'],
  },
  {
    name: 'Feedback Inbox',
    href: '/feedback/review',
    icon: Inbox,
    roles: ['general_manager', 'ceo'],
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
  const { isCollapsed, toggleSidebar } = useSidebar();
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
              title={item.name}
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
              {item.name}
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
            title={item.name}
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
          {item.name}
        </Link>
      </li>
    );
  };

  return (
    <aside className={`${isCollapsed ? 'w-16' : 'w-64'} bg-white border-r border-gray-200 flex flex-col h-screen sticky top-0 transition-all duration-300`}>
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
              <h1 className="font-semibold text-gray-900">C-Space People</h1>
              <p className="text-xs text-gray-500">People Management</p>
            </div>
          )}
        </Link>
      </div>

      {/* Toggle Button */}
      <div className={`px-2 py-2 border-b border-gray-100 ${isCollapsed ? 'flex justify-center' : ''}`}>
        <button
          onClick={toggleSidebar}
          className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? <PanelLeft size={20} /> : <PanelLeftClose size={20} />}
        </button>
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
        )}
        {isCollapsed ? (
          <button
            onClick={handleLogout}
            className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="Sign out"
          >
            <LogOut size={20} />
          </button>
        ) : (
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut size={18} />
            Sign out
          </button>
        )}
      </div>
    </aside>
  );
}
