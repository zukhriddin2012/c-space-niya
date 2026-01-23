'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Check, Minus } from 'lucide-react';
import AddEmployeeModal from './AddEmployeeModal';
import { useTranslation } from '@/contexts/LanguageContext';

interface Employee {
  id: string;
  employee_id: string;
  full_name: string;
  position: string;
  level: string;
  branch_id: string | null;
  salary: number | null;
  phone: string | null;
  email: string | null;
  status: string;
  employment_type?: string;
  hire_date: string;
  date_of_birth?: string | null;
  gender?: string | null;
  notes?: string | null;
  telegram_id?: string | null;
  branches?: { name: string };
}

interface Branch {
  id: string;
  name: string;
}

interface EmployeesTableProps {
  employees: Employee[];
  branches: Branch[];
  branchMap: Map<string, string>;
  canViewSalary: boolean;
  canEditEmployee: boolean;
  canEditSalary: boolean;
  canCreateEmployee?: boolean;
  canAssignRoles?: boolean;
}

function LevelBadge({ level }: { level: string }) {
  const levelStyles: Record<string, string> = {
    junior: 'bg-blue-50 text-blue-700',
    middle: 'bg-purple-50 text-purple-700',
    senior: 'bg-indigo-50 text-indigo-700',
    executive: 'bg-pink-50 text-pink-700',
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
        levelStyles[level] || levelStyles.junior
      }`}
    >
      {level.charAt(0).toUpperCase() + level.slice(1)}
    </span>
  );
}

function EmploymentTypeBadge({ type }: { type: string }) {
  const typeStyles: Record<string, string> = {
    'full-time': 'bg-emerald-50 text-emerald-700',
    'part-time': 'bg-orange-50 text-orange-700',
    'internship': 'bg-cyan-50 text-cyan-700',
    'probation': 'bg-amber-50 text-amber-700',
  };

  const typeLabels: Record<string, string> = {
    'full-time': 'Full-time',
    'part-time': 'Part-time',
    'internship': 'Internship',
    'probation': 'Probation',
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
        typeStyles[type] || typeStyles['full-time']
      }`}
    >
      {typeLabels[type] || type}
    </span>
  );
}

function formatSalary(amount: number): string {
  if (!amount || amount === 0) return '-';
  return new Intl.NumberFormat('uz-UZ').format(amount) + ' UZS';
}

function formatDate(dateString: string | null): string {
  if (!dateString) return '-';
  const date = new Date(dateString);
  const day = date.getDate();
  const month = date.toLocaleDateString('en-US', { month: 'short' });
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
}

export default function EmployeesTable({
  employees: initialEmployees,
  branches,
  branchMap,
  canViewSalary,
  canEditEmployee,
  canEditSalary,
  canCreateEmployee = false,
  canAssignRoles = false,
}: EmployeesTableProps) {
  const { t } = useTranslation();
  const [employees, setEmployees] = useState(initialEmployees);
  const [showAddModal, setShowAddModal] = useState(false);
  const router = useRouter();

  const handleAdd = (newEmployee: Employee) => {
    setEmployees([...employees, newEmployee]);
    setShowAddModal(false);
  };

  const handleRowClick = (employeeId: string) => {
    if (canEditEmployee) {
      router.push(`/employees/${employeeId}`);
    }
  };

  // Status color for the dot indicator
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'probation': return 'bg-yellow-500';
      case 'inactive': return 'bg-gray-400';
      case 'terminated': return 'bg-red-500';
      default: return 'bg-gray-400';
    }
  };

  const getStatusTooltip = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  return (
    <>
      {/* Add Employee Button - shown above list on mobile */}
      {canCreateEmployee && (
        <div className="mb-4 flex justify-end">
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors text-sm"
          >
            <Plus size={16} />
            {t.employees.addEmployee}
          </button>
        </div>
      )}

      {/* Desktop Table View */}
      <div className="hidden md:block bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-4 lg:px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t.nav.employees}
                </th>
                <th className="text-left px-4 lg:px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t.employees.position}
                </th>
                <th className="text-left px-4 lg:px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t.employees.branch}
                </th>
                <th className="text-left px-4 lg:px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t.employees.hireDate}
                </th>
                {canViewSalary && (
                  <th className="text-right px-4 lg:px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t.employees.salary}
                  </th>
                )}
                <th className="text-left px-4 lg:px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t.common.status}
                </th>
                <th className="text-center px-4 lg:px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Bot
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {employees.map((employee) => {
                const isInactive = employee.status === 'inactive' || employee.status === 'terminated';
                return (
                  <tr
                    key={employee.id}
                    onClick={() => handleRowClick(employee.id)}
                    className={`group transition-colors ${
                      canEditEmployee ? 'hover:bg-purple-50 cursor-pointer' : 'hover:bg-gray-50'
                    } ${isInactive ? 'opacity-60' : ''}`}
                  >
                    <td className="px-4 lg:px-6 py-4">
                      <div className="flex items-center gap-3">
                        {/* Avatar with status dot */}
                        <div className="relative">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                            isInactive ? 'bg-gray-100' : 'bg-purple-100'
                          }`}>
                            <span className={`font-medium ${isInactive ? 'text-gray-500' : 'text-purple-700'}`}>
                              {employee.full_name.charAt(0)}
                            </span>
                          </div>
                          {/* Status indicator dot */}
                          <div
                            className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${getStatusColor(employee.status)}`}
                            title={getStatusTooltip(employee.status)}
                          />
                        </div>
                        <div className="min-w-0">
                          <p className={`font-medium truncate transition-colors ${
                            canEditEmployee ? 'group-hover:text-purple-600' : ''
                          } text-gray-900`}>
                            {employee.full_name}
                          </p>
                          <p className="text-sm text-gray-500">{employee.employee_id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 lg:px-6 py-4">
                      <div className="font-medium text-gray-900">{employee.position}</div>
                      <div className="mt-1">
                        <LevelBadge level={employee.level || 'junior'} />
                      </div>
                    </td>
                    <td className="px-4 lg:px-6 py-4 text-gray-700">
                      {employee.branches?.name || branchMap.get(employee.branch_id || '') || '-'}
                    </td>
                    <td className="px-4 lg:px-6 py-4 text-gray-600">
                      {formatDate(employee.hire_date)}
                    </td>
                    {canViewSalary && (
                      <td className="px-4 lg:px-6 py-4 text-right">
                        <span className="font-medium text-gray-900">{formatSalary(employee.salary ?? 0)}</span>
                      </td>
                    )}
                    <td className="px-4 lg:px-6 py-4">
                      <EmploymentTypeBadge type={employee.employment_type || 'full-time'} />
                    </td>
                    <td className="px-4 lg:px-6 py-4 text-center">
                      {employee.telegram_id ? (
                        <span
                          className="inline-flex items-center justify-center w-6 h-6 bg-purple-100 rounded-full"
                          title="Bot Connected"
                        >
                          <Check size={14} className="text-purple-600" />
                        </span>
                      ) : (
                        <span
                          className="inline-flex items-center justify-center w-6 h-6 bg-gray-100 rounded-full"
                          title="Not Connected"
                        >
                          <Minus size={14} className="text-gray-400" />
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {employees.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">{t.common.noData}</p>
            {canCreateEmployee && (
              <button
                onClick={() => setShowAddModal(true)}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors text-sm"
              >
                <Plus size={16} />
                {t.employees.addEmployee}
              </button>
            )}
          </div>
        )}

        {/* Desktop Pagination */}
        <div className="flex items-center justify-between px-4 lg:px-6 py-4 border-t border-gray-200 bg-gray-50">
          <p className="text-sm text-gray-500">
            {t.common.showing} <span className="font-medium">1</span> - {' '}
            <span className="font-medium">{employees.length}</span> {t.common.of}{' '}
            <span className="font-medium">{employees.length}</span> {t.common.results}
          </p>
          <div className="flex gap-2">
            <button
              disabled
              className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-400 cursor-not-allowed"
            >
              {t.common.previous}
            </button>
            <button
              disabled
              className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-400 cursor-not-allowed"
            >
              {t.common.next}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-3">
        {employees.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
            <p className="text-gray-500">{t.common.noData}</p>
            {canCreateEmployee && (
              <button
                onClick={() => setShowAddModal(true)}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors text-sm"
              >
                <Plus size={16} />
                {t.employees.addEmployee}
              </button>
            )}
          </div>
        ) : (
          employees.map((employee) => {
            const isInactive = employee.status === 'inactive' || employee.status === 'terminated';
            return (
              <div
                key={employee.id}
                onClick={() => handleRowClick(employee.id)}
                className={`bg-white rounded-xl border border-gray-200 p-4 transition-colors ${
                  canEditEmployee ? 'hover:border-purple-300 cursor-pointer active:bg-purple-50' : ''
                } ${isInactive ? 'opacity-60' : ''}`}
              >
                {/* Header - Avatar with status dot, Name */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                        isInactive ? 'bg-gray-100' : 'bg-purple-100'
                      }`}>
                        <span className={`font-medium ${isInactive ? 'text-gray-500' : 'text-purple-700'}`}>
                          {employee.full_name.charAt(0)}
                        </span>
                      </div>
                      {/* Status indicator dot */}
                      <div
                        className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${getStatusColor(employee.status)}`}
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900">{employee.full_name}</p>
                      <p className="text-xs text-gray-500">{employee.employee_id}</p>
                    </div>
                  </div>
                  {/* Bot indicator */}
                  {employee.telegram_id ? (
                    <span className="inline-flex items-center justify-center w-6 h-6 bg-purple-100 rounded-full">
                      <Check size={14} className="text-purple-600" />
                    </span>
                  ) : (
                    <span className="inline-flex items-center justify-center w-6 h-6 bg-gray-100 rounded-full">
                      <Minus size={14} className="text-gray-400" />
                    </span>
                  )}
                </div>

                {/* Position & Branch */}
                <div className="space-y-1.5 mb-3">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium text-gray-900">{employee.position}</span>
                    <LevelBadge level={employee.level || 'junior'} />
                  </div>
                  <p className="text-sm text-gray-500">
                    {employee.branches?.name || branchMap.get(employee.branch_id || '') || '-'}
                  </p>
                </div>

                {/* Stats Row */}
                <div className={`flex items-center justify-between text-sm bg-gray-50 rounded-lg px-3 py-2`}>
                  <div>
                    <EmploymentTypeBadge type={employee.employment_type || 'full-time'} />
                  </div>
                  <div className="text-gray-600">
                    {formatDate(employee.hire_date)}
                  </div>
                  {canViewSalary && (
                    <div className="font-medium text-gray-900">
                      {formatSalary(employee.salary ?? 0)}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}

        {/* Mobile Pagination */}
        {employees.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-sm text-gray-500 text-center">
              {t.common.showing} {employees.length} {t.common.results}
            </p>
          </div>
        )}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <AddEmployeeModal
          branches={branches}
          onClose={() => setShowAddModal(false)}
          onAdd={handleAdd}
          canAssignRoles={canAssignRoles}
        />
      )}
    </>
  );
}
