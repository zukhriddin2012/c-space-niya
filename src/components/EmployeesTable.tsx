'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Briefcase, MapPin, Clock, Pencil, Plus, MessageCircle } from 'lucide-react';
import AddEmployeeModal from './AddEmployeeModal';

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

function EmployeeStatusBadge({ status }: { status: string }) {
  const statusStyles: Record<string, string> = {
    active: 'bg-green-50 text-green-700',
    inactive: 'bg-gray-50 text-gray-700',
    terminated: 'bg-red-50 text-red-700',
    probation: 'bg-yellow-50 text-yellow-700',
  };

  const statusLabels: Record<string, string> = {
    active: 'Active',
    inactive: 'Inactive',
    terminated: 'Terminated',
    probation: 'Probation',
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
        statusStyles[status] || statusStyles.inactive
      }`}
    >
      {statusLabels[status] || status}
    </span>
  );
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

function TelegramBadge({ connected }: { connected: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
        connected ? 'bg-blue-50 text-blue-700' : 'bg-gray-50 text-gray-400'
      }`}
      title={connected ? 'Connected to Telegram Bot' : 'Not connected to Telegram'}
    >
      <MessageCircle size={12} />
      {connected ? 'Bot' : '-'}
    </span>
  );
}

function formatSalary(amount: number): string {
  if (!amount || amount === 0) return '-';
  return new Intl.NumberFormat('uz-UZ').format(amount) + ' UZS';
}

function formatDate(dateString: string | null): string {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
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
  const [employees, setEmployees] = useState(initialEmployees);
  const [showAddModal, setShowAddModal] = useState(false);

  const handleAdd = (newEmployee: Employee) => {
    setEmployees([...employees, newEmployee]);
    setShowAddModal(false);
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
            Add Employee
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
                  Employee
                </th>
                <th className="text-left px-4 lg:px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Position / Level
                </th>
                <th className="text-left px-4 lg:px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Branch
                </th>
                <th className="text-left px-4 lg:px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Hire Date
                </th>
                {canViewSalary && (
                  <th className="text-right px-4 lg:px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Salary
                  </th>
                )}
                <th className="text-left px-4 lg:px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="text-center px-4 lg:px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Bot
                </th>
                <th className="text-left px-4 lg:px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="text-right px-4 lg:px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {employees.map((employee) => (
                <tr key={employee.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 lg:px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-purple-700 font-medium">
                          {employee.full_name.charAt(0)}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 truncate">{employee.full_name}</p>
                        <p className="text-sm text-gray-500">{employee.employee_id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 lg:px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Briefcase size={14} className="text-gray-400 flex-shrink-0" />
                      <span className="text-gray-900 truncate">{employee.position}</span>
                    </div>
                    <div className="mt-1">
                      <LevelBadge level={employee.level || 'junior'} />
                    </div>
                  </td>
                  <td className="px-4 lg:px-6 py-4">
                    <div className="flex items-center gap-2">
                      <MapPin size={14} className="text-gray-400 flex-shrink-0" />
                      <span className="text-gray-900 truncate">
                        {employee.branches?.name || branchMap.get(employee.branch_id || '') || '-'}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 lg:px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Clock size={14} className="text-gray-400 flex-shrink-0" />
                      <span className="text-gray-900 text-sm">
                        {formatDate(employee.hire_date)}
                      </span>
                    </div>
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
                    <TelegramBadge connected={!!employee.telegram_id} />
                  </td>
                  <td className="px-4 lg:px-6 py-4">
                    <EmployeeStatusBadge status={employee.status} />
                  </td>
                  <td className="px-4 lg:px-6 py-4 text-right">
                    {canEditEmployee && (
                      <Link
                        href={`/employees/${employee.id}/edit`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-purple-600 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
                      >
                        <Pencil size={14} />
                        Edit
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {employees.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No employees found matching your filters.</p>
            {canCreateEmployee && (
              <button
                onClick={() => setShowAddModal(true)}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors text-sm"
              >
                <Plus size={16} />
                Add First Employee
              </button>
            )}
          </div>
        )}

        {/* Desktop Pagination */}
        <div className="flex items-center justify-between px-4 lg:px-6 py-4 border-t border-gray-200 bg-gray-50">
          <p className="text-sm text-gray-500">
            Showing <span className="font-medium">1</span> to{' '}
            <span className="font-medium">{employees.length}</span> of{' '}
            <span className="font-medium">{employees.length}</span> employees
          </p>
          <div className="flex gap-2">
            <button
              disabled
              className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-400 cursor-not-allowed"
            >
              Previous
            </button>
            <button
              disabled
              className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-400 cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-3">
        {employees.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
            <p className="text-gray-500">No employees found matching your filters.</p>
            {canCreateEmployee && (
              <button
                onClick={() => setShowAddModal(true)}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors text-sm"
              >
                <Plus size={16} />
                Add First Employee
              </button>
            )}
          </div>
        ) : (
          employees.map((employee) => (
            <div key={employee.id} className="bg-white rounded-xl border border-gray-200 p-4">
              {/* Header - Avatar, Name, Status */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-purple-700 font-medium">
                      {employee.full_name.charAt(0)}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900">{employee.full_name}</p>
                    <p className="text-xs text-gray-500">{employee.employee_id}</p>
                  </div>
                </div>
                <EmployeeStatusBadge status={employee.status} />
              </div>

              {/* Position & Branch */}
              <div className="space-y-2 mb-3">
                <div className="flex items-center gap-2 text-sm">
                  <Briefcase size={14} className="text-gray-400 flex-shrink-0" />
                  <span className="text-gray-700">{employee.position}</span>
                  <LevelBadge level={employee.level || 'junior'} />
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <MapPin size={14} className="flex-shrink-0" />
                  <span>{employee.branches?.name || branchMap.get(employee.branch_id || '') || '-'}</span>
                </div>
              </div>

              {/* Stats Grid */}
              <div className={`grid ${canViewSalary ? 'grid-cols-4' : 'grid-cols-3'} gap-3 text-center bg-gray-50 rounded-lg p-3 mb-3`}>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Type</p>
                  <EmploymentTypeBadge type={employee.employment_type || 'full-time'} />
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Bot</p>
                  <TelegramBadge connected={!!employee.telegram_id} />
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Hired</p>
                  <p className="text-sm font-medium text-gray-900">{formatDate(employee.hire_date)}</p>
                </div>
                {canViewSalary && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Salary</p>
                    <p className="text-sm font-medium text-gray-900">{formatSalary(employee.salary ?? 0)}</p>
                  </div>
                )}
              </div>

              {/* Actions */}
              {canEditEmployee && (
                <Link
                  href={`/employees/${employee.id}/edit`}
                  className="w-full inline-flex items-center justify-center gap-1 px-3 py-2 text-sm text-purple-600 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
                >
                  <Pencil size={14} />
                  Edit
                </Link>
              )}
            </div>
          ))
        )}

        {/* Mobile Pagination */}
        {employees.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-sm text-gray-500 text-center">
              Showing {employees.length} employees
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
