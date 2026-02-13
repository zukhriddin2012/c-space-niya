'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Shield,
  Building2,
  Bell,
  Key,
  ChevronRight,
  Check,
  X,
  Globe,
  LayoutGrid,
} from 'lucide-react';
import ReceptionAdminSettings from '@/components/settings/ReceptionAdminSettings';
import { RoleGuard, PageGuard } from '@/components/auth';
import { PERMISSIONS } from '@/lib/permissions';
import type { UserRole } from '@/types';
import {
  getAllRoles,
  getRoleLabel,
  getRoleBadgeColor,
  ROLE_PERMISSIONS,
  PERMISSION_GROUPS,
} from '@/lib/permissions';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { languages, type Language } from '@/lib/i18n';

type SettingsTab = 'roles' | 'branches' | 'notifications' | 'security' | 'language' | 'reception';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('language');
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const { language, setLanguage, t } = useLanguage();
  const { user } = useAuth();

  // ServiceHub tab: GM-only access (CSN-028)
  const isGM = user?.role === 'general_manager';

  const tabs = [
    { id: 'language' as const, name: t.settings.language, icon: Globe, permission: PERMISSIONS.SETTINGS_VIEW, visible: true },
    { id: 'roles' as const, name: t.settings.rolesPermissions, icon: Shield, permission: PERMISSIONS.USERS_ASSIGN_ROLES, visible: true },
    { id: 'branches' as const, name: t.settings.branchSettings, icon: Building2, permission: PERMISSIONS.BRANCHES_EDIT, visible: true },
    { id: 'notifications' as const, name: t.settings.notifications, icon: Bell, permission: PERMISSIONS.SETTINGS_VIEW, visible: true },
    { id: 'security' as const, name: t.settings.security, icon: Key, permission: PERMISSIONS.SETTINGS_EDIT, visible: true },
    { id: 'reception' as const, name: 'ServiceHub', icon: LayoutGrid, permission: PERMISSIONS.RECEPTION_ADMIN, visible: isGM },
  ];

  return (
    <PageGuard permission={PERMISSIONS.SETTINGS_VIEW}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-4 lg:mb-8">
          <h1 className="text-xl lg:text-2xl font-bold text-gray-900">{t.settings.title}</h1>
          <p className="text-sm lg:text-base text-gray-600 mt-1">
            <span className="hidden sm:inline">
              {t.settings.subtitle}
            </span>
            <span className="sm:hidden">
              {t.settings.subtitleShort}
            </span>
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
          {/* Tabs - Horizontal scroll on mobile, sidebar on desktop */}
          <div className="lg:w-64 lg:flex-shrink-0">
            <nav className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              {/* Mobile: Horizontal scroll tabs */}
              <div className="lg:hidden flex overflow-x-auto">
                {tabs.filter(tab => tab.visible).map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;

                  return (
                    <RoleGuard key={tab.id} permission={tab.permission}>
                      <button
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${
                          isActive
                            ? 'text-purple-700 border-purple-600 bg-purple-50'
                            : 'text-gray-600 border-transparent hover:bg-gray-50'
                        }`}
                      >
                        <Icon size={18} className={isActive ? 'text-purple-600' : 'text-gray-400'} />
                        <span className="hidden sm:inline">{tab.name}</span>
                        <span className="sm:hidden">{tab.name.split(' ')[0]}</span>
                      </button>
                    </RoleGuard>
                  );
                })}
              </div>
              {/* Desktop: Vertical sidebar */}
              <div className="hidden lg:block">
                {tabs.filter(tab => tab.visible).map((tab) => {
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
                        {tab.id === 'reception' && (
                          <span className="ml-1 px-1.5 py-0.5 text-[10px] font-bold uppercase rounded-full bg-blue-100 text-blue-700 leading-none">GM Only</span>
                        )}
                        <ChevronRight
                          size={16}
                          className={`ml-auto ${isActive ? 'text-purple-600' : 'text-gray-300'}`}
                        />
                      </button>
                    </RoleGuard>
                  );
                })}
              </div>
            </nav>
          </div>

          {/* Content Area */}
          <div className="flex-1">
            {activeTab === 'language' && (
              <div className="bg-white rounded-xl border border-gray-200 p-4 lg:p-6">
                <h2 className="text-base lg:text-lg font-semibold text-gray-900 mb-2">{t.settings.language}</h2>
                <p className="text-sm text-gray-500 mb-4 lg:mb-6">{t.settings.selectLanguage}</p>

                <div className="space-y-3">
                  {languages.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => setLanguage(lang.code)}
                      className={`w-full flex items-center justify-between p-4 border rounded-xl transition-all ${
                        language === lang.code
                          ? 'border-purple-500 bg-purple-50 ring-2 ring-purple-100'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <span className="text-2xl">{lang.flag}</span>
                        <div className="text-left">
                          <p className={`font-medium ${language === lang.code ? 'text-purple-700' : 'text-gray-900'}`}>
                            {lang.nativeName}
                          </p>
                          <p className="text-sm text-gray-500">{lang.name}</p>
                        </div>
                      </div>
                      {language === lang.code && (
                        <div className="w-6 h-6 bg-purple-600 rounded-full flex items-center justify-center">
                          <Check size={14} className="text-white" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>

                <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">
                    <Globe size={16} className="inline mr-2" />
                    {t.settings.languageSavedNotice}
                  </p>
                </div>
              </div>
            )}

            {activeTab === 'roles' && (
              <div className="space-y-4 lg:space-y-6">
                {/* Role Cards */}
                <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-2 gap-3 lg:gap-4">
                  {getAllRoles().map((role) => (
                    <button
                      key={role}
                      onClick={() => setSelectedRole(selectedRole === role ? null : role)}
                      className={`p-3 lg:p-4 bg-white rounded-xl border text-left transition-all ${
                        selectedRole === role
                          ? 'border-purple-500 ring-2 ring-purple-100'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span
                          className={`inline-flex items-center px-2 lg:px-2.5 py-0.5 rounded-full text-xs font-medium border ${getRoleBadgeColor(
                            role
                          )}`}
                        >
                          {getRoleLabel(role)}
                        </span>
                        <Shield
                          size={18}
                          className={`hidden sm:block ${selectedRole === role ? 'text-purple-600' : 'text-gray-400'}`}
                        />
                      </div>
                      <p className="text-xs lg:text-sm text-gray-500">
                        {ROLE_PERMISSIONS[role].length} {t.settings.permissions}
                      </p>
                    </button>
                  ))}
                </div>

                {/* Permission Details */}
                {selectedRole && (
                  <div className="bg-white rounded-xl border border-gray-200 p-4 lg:p-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 lg:mb-6">
                      <div>
                        <h3 className="text-base lg:text-lg font-semibold text-gray-900">
                          {getRoleLabel(selectedRole)} Permissions
                        </h3>
                        <p className="text-xs lg:text-sm text-gray-500">
                          {t.settings.viewPermissions}
                        </p>
                      </div>
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-xs lg:text-sm font-medium border self-start sm:self-auto ${getRoleBadgeColor(
                          selectedRole
                        )}`}
                      >
                        {ROLE_PERMISSIONS[selectedRole].length} {t.settings.total}
                      </span>
                    </div>

                    <div className="space-y-4 lg:space-y-6">
                      {Object.entries(PERMISSION_GROUPS).map(([group, permissions]) => {
                        const rolePerms = ROLE_PERMISSIONS[selectedRole];
                        const hasAny = permissions.some((p) => rolePerms.includes(p.key));

                        if (!hasAny) return null;

                        return (
                          <div key={group}>
                            <h4 className="text-xs lg:text-sm font-medium text-gray-700 mb-2 lg:mb-3">{group}</h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                              {permissions.map((perm) => {
                                const hasPermission = rolePerms.includes(perm.key);
                                return (
                                  <div
                                    key={perm.key}
                                    className={`flex items-center gap-2 px-2 lg:px-3 py-1.5 lg:py-2 rounded-lg text-xs lg:text-sm ${
                                      hasPermission
                                        ? 'bg-green-50 text-green-700'
                                        : 'bg-gray-50 text-gray-400'
                                    }`}
                                  >
                                    {hasPermission ? (
                                      <Check size={14} className="text-green-600 flex-shrink-0" />
                                    ) : (
                                      <X size={14} className="text-gray-300 flex-shrink-0" />
                                    )}
                                    <span className="truncate">{perm.label}</span>
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
              <div className="bg-white rounded-xl border border-gray-200 p-4 lg:p-6">
                <h2 className="text-base lg:text-lg font-semibold text-gray-900 mb-2">{t.settings.branchSettings}</h2>
                <p className="text-sm text-gray-500 mb-4 lg:mb-6">
                  {t.settings.branchSettingsDesc}
                </p>
                <div className="text-center py-8 lg:py-12 text-gray-500">
                  <Building2 size={40} className="mx-auto mb-4 text-gray-300 lg:w-12 lg:h-12" />
                  <p className="text-sm lg:text-base">{t.settings.branchSettingsManagedElsewhere}</p>
                  <Link href="/branches" className="text-purple-600 hover:underline mt-2 inline-block text-sm lg:text-base">
                    {t.settings.goToBranches}
                  </Link>
                </div>
              </div>
            )}

            {activeTab === 'notifications' && (
              <div className="bg-white rounded-xl border border-gray-200 p-4 lg:p-6">
                <h2 className="text-base lg:text-lg font-semibold text-gray-900 mb-2">{t.settings.notificationSettings}</h2>
                <p className="text-sm text-gray-500 mb-4 lg:mb-6">{t.settings.notificationSettingsDesc}</p>

                <div className="space-y-3 lg:space-y-4">
                  {[
                    { label: t.settings.lateArrivalAlerts, description: t.settings.lateArrivalAlertsDesc },
                    { label: t.settings.leaveRequests, description: t.settings.leaveRequestsDesc },
                    { label: t.settings.payrollReminders, description: t.settings.payrollRemindersDesc },
                    { label: t.settings.weeklyReports, description: t.settings.weeklyReportsDesc },
                  ].map((setting, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-3 lg:p-4 border border-gray-200 rounded-lg gap-3"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-gray-900 text-sm lg:text-base">{setting.label}</p>
                        <p className="text-xs lg:text-sm text-gray-500 truncate">{setting.description}</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                        <input type="checkbox" className="sr-only peer" defaultChecked={i < 2} />
                        <div className="w-10 lg:w-11 h-5 lg:h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 lg:after:h-5 after:w-4 lg:after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'security' && (
              <div className="bg-white rounded-xl border border-gray-200 p-4 lg:p-6">
                <h2 className="text-base lg:text-lg font-semibold text-gray-900 mb-2">{t.settings.securitySettings}</h2>
                <p className="text-sm text-gray-500 mb-4 lg:mb-6">{t.settings.securitySettingsDesc}</p>

                <div className="space-y-4 lg:space-y-6">
                  <div className="p-3 lg:p-4 border border-gray-200 rounded-lg">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                      <h3 className="font-medium text-gray-900 text-sm lg:text-base">{t.settings.twoFactorAuth}</h3>
                      <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-full self-start sm:self-auto">
                        {t.settings.comingSoon}
                      </span>
                    </div>
                    <p className="text-xs lg:text-sm text-gray-500">
                      {t.settings.twoFactorAuthDesc}
                    </p>
                  </div>

                  <div className="p-3 lg:p-4 border border-gray-200 rounded-lg">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                      <h3 className="font-medium text-gray-900 text-sm lg:text-base">{t.settings.sessionTimeout}</h3>
                      <select className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm w-full sm:w-auto">
                        <option>{t.settings.thirtyMinutes}</option>
                        <option>{t.settings.oneHour}</option>
                        <option>{t.settings.fourHours}</option>
                        <option>{t.settings.eightHours}</option>
                      </select>
                    </div>
                    <p className="text-xs lg:text-sm text-gray-500">
                      {t.settings.sessionTimeoutDesc}
                    </p>
                  </div>

                  <div className="p-3 lg:p-4 border border-gray-200 rounded-lg">
                    <h3 className="font-medium text-gray-900 text-sm lg:text-base mb-2">{t.settings.passwordRequirements}</h3>
                    <div className="space-y-2 text-xs lg:text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <Check size={14} className="text-green-600 flex-shrink-0" />
                        {t.settings.minEightChars}
                      </div>
                      <div className="flex items-center gap-2">
                        <Check size={14} className="text-green-600 flex-shrink-0" />
                        {t.settings.atLeastOneUppercase}
                      </div>
                      <div className="flex items-center gap-2">
                        <Check size={14} className="text-green-600 flex-shrink-0" />
                        {t.settings.atLeastOneNumber}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'reception' && (
              <div className="bg-white rounded-xl border border-gray-200 p-4 lg:p-6">
                <h2 className="text-base lg:text-lg font-semibold text-gray-900 mb-2">ServiceHub Configuration</h2>
                <p className="text-sm text-gray-500 mb-4 lg:mb-6">
                  Manage service types, expenses, payment methods, operator PINs, and kiosk access.
                </p>
                <ReceptionAdminSettings />
              </div>
            )}
          </div>
        </div>
      </div>
    </PageGuard>
  );
}
