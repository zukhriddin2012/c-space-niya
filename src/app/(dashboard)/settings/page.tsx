'use client';

import { useState } from 'react';
import {
  Users,
  Shield,
  Building2,
  Bell,
  Key,
  ChevronRight,
  Check,
  X,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { RoleGuard, PageGuard } from '@/components/RoleGuard';
import { PERMISSIONS } from '@/lib/permissions';
import type { UserRole } from '@/types';
import {
  getAllRoles,
  getRoleLabel,
  getRoleBadgeColor,
  ROLE_PERMISSIONS,
  PERMISSION_GROUPS,
} from '@/lib/permissions';

type SettingsTab = 'roles' | 'branches' | 'notifications' | 'security';

export default function SettingsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<SettingsTab>('roles');
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);

  const tabs = [
    { id: 'roles' as const, name: 'Roles & Permissions', icon: Shield, permission: PERMISSIONS.USERS_ASSIGN_ROLES },
    { id: 'branches' as const, name: 'Branch Settings', icon: Building2, permission: PERMISSIONS.BRANCHES_EDIT },
    { id: 'notifications' as const, name: 'Notifications', icon: Bell, permission: PERMISSIONS.SETTINGS_VIEW },
    { id: 'security' as const, name: 'Security', icon: Key, permission: PERMISSIONS.SETTINGS_EDIT },
  ];

  return (
    <PageGuard permission={PERMISSIONS.SETTINGS_VIEW}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600 mt-1">Manage roles, permissions, and system configuration</p>
        </div>

        <div className="flex gap-6">
          {/* Sidebar Tabs */}
          <div className="w-64 flex-shrink-0">
            <nav className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;

                return (
                  <RoleGuard key={tab.id} permission={tab.permission}>
                    <button
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-left text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-purple-50 text-purple-700 border-r-2 border-purple-600'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <Icon size={20} className={isActive ? 'text-purple-600' : 'text-gray-400'} />
                      {tab.name}
                      <ChevronRight
                        size={16}
                        className={`ml-auto ${isActive ? 'text-purple-600' : 'text-gray-300'}`}
                      />
                    </button>
                  </RoleGuard>
                );
              })}
            </nav>
          </div>

          {/* Content Area */}
          <div className="flex-1">
            {activeTab === 'roles' && (
              <div className="space-y-6">
                {/* Role Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {getAllRoles().map((role) => (
                    <button
                      key={role}
                      onClick={() => setSelectedRole(selectedRole === role ? null : role)}
                      className={`p-4 bg-white rounded-xl border text-left transition-all ${
                        selectedRole === role
                          ? 'border-purple-500 ring-2 ring-purple-100'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getRoleBadgeColor(
                            role
                          )}`}
                        >
                          {getRoleLabel(role)}
                        </span>
                        <Shield
                          size={20}
                          className={selectedRole === role ? 'text-purple-600' : 'text-gray-400'}
                        />
                      </div>
                      <p className="text-sm text-gray-500">
                        {ROLE_PERMISSIONS[role].length} permissions
                      </p>
                    </button>
                  ))}
                </div>

                {/* Permission Details */}
                {selectedRole && (
                  <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {getRoleLabel(selectedRole)} Permissions
                        </h3>
                        <p className="text-sm text-gray-500">
                          View permissions assigned to this role
                        </p>
                      </div>
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getRoleBadgeColor(
                          selectedRole
                        )}`}
                      >
                        {ROLE_PERMISSIONS[selectedRole].length} total
                      </span>
                    </div>

                    <div className="space-y-6">
                      {Object.entries(PERMISSION_GROUPS).map(([group, permissions]) => {
                        const rolePerms = ROLE_PERMISSIONS[selectedRole];
                        const hasAny = permissions.some((p) => rolePerms.includes(p.key));

                        if (!hasAny) return null;

                        return (
                          <div key={group}>
                            <h4 className="text-sm font-medium text-gray-700 mb-3">{group}</h4>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                              {permissions.map((perm) => {
                                const hasPermission = rolePerms.includes(perm.key);
                                return (
                                  <div
                                    key={perm.key}
                                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
                                      hasPermission
                                        ? 'bg-green-50 text-green-700'
                                        : 'bg-gray-50 text-gray-400'
                                    }`}
                                  >
                                    {hasPermission ? (
                                      <Check size={16} className="text-green-600" />
                                    ) : (
                                      <X size={16} className="text-gray-300" />
                                    )}
                                    {perm.label}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'branches' && (
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-2">Branch Settings</h2>
                <p className="text-gray-500 mb-6">
                  Configure branch-specific settings and geofencing options.
                </p>
                <div className="text-center py-12 text-gray-500">
                  <Building2 size={48} className="mx-auto mb-4 text-gray-300" />
                  <p>Branch settings are managed in the Branches section.</p>
                  <a href="/branches" className="text-purple-600 hover:underline mt-2 inline-block">
                    Go to Branches →
                  </a>
                </div>
              </div>
            )}

            {activeTab === 'notifications' && (
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-2">Notification Settings</h2>
                <p className="text-gray-500 mb-6">Configure how and when you receive notifications.</p>

                <div className="space-y-4">
                  {[
                    { label: 'Late arrival alerts', description: 'Get notified when employees arrive late' },
                    { label: 'Leave requests', description: 'Notifications for new leave requests' },
                    { label: 'Payroll reminders', description: 'Monthly payroll processing reminders' },
                    { label: 'Weekly reports', description: 'Automated weekly attendance summary' },
                  ].map((setting, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
                    >
                      <div>
                        <p className="font-medium text-gray-900">{setting.label}</p>
                        <p className="text-sm text-gray-500">{setting.description}</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" defaultChecked={i < 2} />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'security' && (
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-2">Security Settings</h2>
                <p className="text-gray-500 mb-6">Configure security and authentication options.</p>

                <div className="space-y-6">
                  <div className="p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium text-gray-900">Two-Factor Authentication</h3>
                      <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-full">
                        Coming Soon
                      </span>
                    </div>
                    <p className="text-sm text-gray-500">
                      Add an extra layer of security to your account
                    </p>
                  </div>

                  <div className="p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium text-gray-900">Session Timeout</h3>
                      <select className="border border-gray-200 rounded-lg px-3 py-1 text-sm">
                        <option>30 minutes</option>
                        <option>1 hour</option>
                        <option>4 hours</option>
                        <option>8 hours</option>
                      </select>
                    </div>
                    <p className="text-sm text-gray-500">
                      Automatically log out after period of inactivity
                    </p>
                  </div>

                  <div className="p-4 border border-gray-200 rounded-lg">
                    <h3 className="font-medium text-gray-900 mb-2">Password Requirements</h3>
                    <div className="space-y-2 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <Check size={16} className="text-green-600" />
                        Minimum 8 characters
                      </div>
                      <div className="flex items-center gap-2">
                        <Check size={16} className="text-green-600" />
                        At least one uppercase letter
                      </div>
                      <div className="flex items-center gap-2">
                        <Check size={16} className="text-green-600" />
                        At least one number
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </PageGuard>
  );
}
