import { getSession } from '@/lib/auth-server';
import { hasPermission } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Plus, Search, Briefcase, MapPin, Clock, Eye } from 'lucide-react';
import Link from 'next/link';
import { getEmployees, getBranches } from '@/lib/db';

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
  hire_date: string;
  branches?: { name: string };
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

export default async function EmployeesPage({
  searchParams,
}: {
  searchParams: Promise<{ branch?: string; level?: string; status?: string; search?: string }>;
}) {
  const user = await getSession();

  if (!user) {
    redirect('/login');
  }

  // Check permission
  if (!hasPermission(user.role, 'view_all_employees')) {
    redirect('/dashboard');
  }

  const canCreateEmployee = hasPermission(user.role, 'create_employee');
  const canViewSalary = user.role === 'general_manager' || user.role === 'ceo';

  // Get filter params
  const params = await searchParams;
  const selectedBranch = params.branch || '';
  const selectedLevel = params.level || '';
  const selectedStatus = params.status || 'active';
  const searchQuery = params.search || '';

  // Fetch real data from Supabase
  const [employees, branches] = await Promise.all([
    getEmployees(),
    getBranches(),
  ]);

  // Create branch map
  const branchMap = new Map(branches.map(b => [b.id, b.name]));

  // Apply filters
  let filteredEmployees = employees.filter((emp: Employee) => {
    // Status filter (default to active)
    if (selectedStatus && emp.status !== selectedStatus) return false;

    // Branch filter
    if (selectedBranch && emp.branch_id !== selectedBranch) return false;

    // Level filter
    if (selectedLevel && emp.level !== selectedLevel) return false;

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        emp.full_name.toLowerCase().includes(query) ||
        emp.employee_id.toLowerCase().includes(query) ||
        emp.position.toLowerCase().includes(query)
      );
    }

    return true;
  });

  // Calculate totals
  const totalEmployees = employees.filter((e: Employee) => e.status === 'active').length;
  const totalBudget = employees
    .filter((e: Employee) => e.status === 'active')
    .reduce((sum: number, e: Employee) => sum + (e.salary || 0), 0);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Employees</h1>
          <p className="text-gray-500 mt-1">
            {totalEmployees} active employees
            {canViewSalary && ` • Total budget: ${formatSalary(totalBudget)}/month`}
          </p>
        </div>
        {canCreateEmployee && (
          <Link
            href="/employees/new"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors"
          >
            <Plus size={20} />
            Add Employee
          </Link>
        )}
      </div>

      {/* Filters */}
      <form className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-medium text-gray-500 mb-1">Search</label>
            <div className="relative">
              <Search
                size={20}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                name="search"
                defaultValue={searchQuery}
                placeholder="Search by name, ID, or position..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Branch</label>
            <select
              name="branch"
              defaultValue={selectedBranch}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none min-w-[160px]"
            >
              <option value="">All Branches</option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>{branch.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Level</label>
            <select
              name="level"
              defaultValue={selectedLevel}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
            >
              <option value="">All Levels</option>
              <option value="junior">Junior</option>
              <option value="middle">Middle</option>
              <option value="senior">Senior</option>
              <option value="executive">Executive</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
            <select
              name="status"
              defaultValue={selectedStatus}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="probation">Probation</option>
              <option value="inactive">Inactive</option>
              <option value="terminated">Terminated</option>
            </select>
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
            >
              <Search size={16} />
              Apply
            </button>
            <Link
              href="/employees"
              className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Reset
            </Link>
          </div>
        </div>
      </form>

      {/* Employee List */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
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
                Status
              </th>
              <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredEmployees.map((employee: Employee) => (
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
                    <span className="font-medium text-gray-900">{formatSalary(employee.salary)}</span>
                  </td>
                )}
                <td className="px-6 py-4">
                  <EmployeeStatusBadge status={employee.status} />
                </td>
                <td className="px-6 py-4 text-right">
                  <Link
                    href={`/employees/${employee.id}`}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-purple-600 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
                  >
                    <Eye size={14} />
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredEmployees.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No employees found matching your filters.</p>
          </div>
        )}

        {/* Pagination */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50">
          <p className="text-sm text-gray-500">
            Showing <span className="font-medium">1</span> to{' '}
            <span className="font-medium">{filteredEmployees.length}</span> of{' '}
            <span className="font-medium">{filteredEmployees.length}</span> employees
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
    </div>
  );
}
