'use client';

import { useState } from 'react';
import { Briefcase, MapPin, Clock, Pencil, Trash2, Plus, AlertTriangle } from 'lucide-react';
import EditEmployeeModal from './EditEmployeeModal';
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

// Delete Confirmation Modal
function DeleteConfirmModal({
  employee,
  onConfirm,
  onCancel,
  deleting,
}: {
  employee: Employee;
  onConfirm: () => void;
  onCancel: () => void;
  deleting: boolean;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
            <AlertTriangle size={24} className="text-red-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Delete Employee</h3>
            <p className="text-sm text-gray-500">This action cannot be undone</p>
          </div>
        </div>

        <p className="text-gray-600 mb-6">
          Are you sure you want to delete <strong>{employee.full_name}</strong> ({employee.employee_id})?
          All associated wage entries will also be deleted.
        </p>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={deleting}
            className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={deleting}
            className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50"
          >
            {deleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
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
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [deletingEmployee, setDeletingEmployee] = useState<Employee | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleSave = (updatedEmployee: Employee) => {
    setEmployees(employees.map(emp =>
      emp.id === updatedEmployee.id ? updatedEmployee : emp
    ));
    setEditingEmployee(null);
  };

  const handleAdd = (newEmployee: Employee) => {
    setEmployees([...employees, newEmployee]);
    setShowAddModal(false);
  };

  const handleDelete = async () => {
    if (!deletingEmployee) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/employees/${deletingEmployee.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setEmployees(employees.filter(emp => emp.id !== deletingEmployee.id));
        setDeletingEmployee(null);
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to delete employee');
      }
    } catch (error) {
      console.error('Error deleting employee:', error);
      alert('Failed to delete employee');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {/* Add Employee Button inside table header */}
        {canCreateEmployee && (
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-end">
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors text-sm"
            >
              <Plus size={16} />
              Add Employee
            </button>
          </div>
        )}

        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Employee
              </th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Position / Level
              </th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Branch
              </th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Hire Date
              </th>
              {canViewSalary && (
                <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Salary
                </th>
              )}
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Type
              </th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {employees.map((employee) => (
              <tr key={employee.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                      <span className="text-purple-700 font-medium">
                        {employee.full_name.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{employee.full_name}</p>
                      <p className="text-sm text-gray-500">{employee.employee_id}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <Briefcase size={14} className="text-gray-400" />
                    <span className="text-gray-900">{employee.position}</span>
                  </div>
                  <div className="mt-1">
                    <LevelBadge level={employee.level || 'junior'} />
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <MapPin size={14} className="text-gray-400" />
                    <span className="text-gray-900">
                      {employee.branches?.name || branchMap.get(employee.branch_id || '') || '-'}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <Clock size={14} className="text-gray-400" />
                    <span className="text-gray-900 text-sm">
                      {formatDate(employee.hire_date)}
                    </span>
                  </div>
                </td>
                {canViewSalary && (
                  <td className="px-6 py-4 text-right">
                    <span className="font-medium text-gray-900">{formatSalary(employee.salary ?? 0)}</span>
                  </td>
                )}
                <td className="px-6 py-4">
                  <EmploymentTypeBadge type={employee.employment_type || 'full-time'} />
                </td>
                <td className="px-6 py-4">
                  <EmployeeStatusBadge status={employee.status} />
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    {canEditEmployee && (
                      <button
                        onClick={() => setEditingEmployee(employee)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-purple-600 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
                      >
                        <Pencil size={14} />
                        Edit
                      </button>
                    )}
                    {canEditEmployee && (
                      <button
                        onClick={() => setDeletingEmployee(employee)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

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

        {/* Pagination */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50">
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

      {/* Add Modal */}
      {showAddModal && (
        <AddEmployeeModal
          branches={branches}
          onClose={() => setShowAddModal(false)}
          onAdd={handleAdd}
          canAssignRoles={canAssignRoles}
        />
      )}

      {/* Edit Modal */}
      {editingEmployee && (
        <EditEmployeeModal
          employee={editingEmployee}
          branches={branches}
          onClose={() => setEditingEmployee(null)}
          onSave={handleSave}
          canEditSalary={canEditSalary}
          canAssignRoles={canAssignRoles}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deletingEmployee && (
        <DeleteConfirmModal
          employee={deletingEmployee}
          onConfirm={handleDelete}
          onCancel={() => setDeletingEmployee(null)}
          deleting={isDeleting}
        />
      )}
    </>
  );
}
