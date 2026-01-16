import { getSession } from '@/lib/auth-server';
import { hasPermission } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Plus, Search, Filter, MoreVertical, Mail, Phone } from 'lucide-react';
import Link from 'next/link';

// Demo employee data
const demoEmployees = [
  {
    id: '1',
    employeeId: 'EMP-001',
    fullName: 'Aziz Karimov',
    email: 'aziz.karimov@cspace.uz',
    phone: '+998 90 123 4567',
    position: 'Branch Manager',
    department: 'Operations',
    branch: 'C-Space Airport',
    status: 'active',
    startDate: '2023-06-15',
  },
  {
    id: '2',
    employeeId: 'EMP-002',
    fullName: 'Dilnoza Rustamova',
    email: 'dilnoza.r@cspace.uz',
    phone: '+998 91 234 5678',
    position: 'HR Specialist',
    department: 'Human Resources',
    branch: 'C-Space Beruniy',
    status: 'active',
    startDate: '2023-08-20',
  },
  {
    id: '3',
    employeeId: 'EMP-003',
    fullName: 'Bobur Aliyev',
    email: 'bobur.a@cspace.uz',
    phone: '+998 93 345 6789',
    position: 'Community Manager',
    department: 'Operations',
    branch: 'C-Space Labzak',
    status: 'active',
    startDate: '2024-01-10',
  },
  {
    id: '4',
    employeeId: 'EMP-004',
    fullName: 'Madina Tosheva',
    email: 'madina.t@cspace.uz',
    phone: '+998 94 456 7890',
    position: 'Receptionist',
    department: 'Operations',
    branch: 'C-Space Muqumiy',
    status: 'active',
    startDate: '2024-03-05',
  },
  {
    id: '5',
    employeeId: 'EMP-005',
    fullName: 'Jasur Normatov',
    email: 'jasur.n@cspace.uz',
    phone: '+998 95 567 8901',
    position: 'Maintenance',
    department: 'Facilities',
    branch: 'C-Space Chust',
    status: 'active',
    startDate: '2024-02-15',
  },
  {
    id: '6',
    employeeId: 'EMP-006',
    fullName: 'Gulnora Ibragimova',
    email: 'gulnora.i@cspace.uz',
    phone: '+998 97 678 9012',
    position: 'Marketing Specialist',
    department: 'Marketing',
    branch: 'C-Space Airport',
    status: 'active',
    startDate: '2023-11-01',
  },
  {
    id: '7',
    employeeId: 'EMP-007',
    fullName: 'Sardor Yusupov',
    email: 'sardor.y@cspace.uz',
    phone: '+998 99 789 0123',
    position: 'IT Support',
    department: 'IT',
    branch: 'C-Space Yunusabad',
    status: 'inactive',
    startDate: '2023-09-20',
  },
];

function EmployeeStatusBadge({ status }: { status: string }) {
  const statusStyles = {
    active: 'bg-green-50 text-green-700',
    inactive: 'bg-gray-50 text-gray-700',
    terminated: 'bg-red-50 text-red-700',
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
        statusStyles[status as keyof typeof statusStyles] || statusStyles.inactive
      }`}
    >
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

export default async function EmployeesPage() {
  const user = await getSession();

  if (!user) {
    redirect('/login');
  }

  // Check permission
  if (!hasPermission(user.role, 'view_all_employees')) {
    redirect('/dashboard');
  }

  const canCreateEmployee = hasPermission(user.role, 'create_employee');
  const canEditEmployee = hasPermission(user.role, 'edit_employee');

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Employees</h1>
          <p className="text-gray-500 mt-1">
            Manage your workforce across all branches
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
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search
                size={20}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                placeholder="Search employees..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
              />
            </div>
          </div>
          <select className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none">
            <option value="">All Branches</option>
            <option value="airport">C-Space Airport</option>
            <option value="beruniy">C-Space Beruniy</option>
            <option value="chust">C-Space Chust</option>
            <option value="labzak">C-Space Labzak</option>
            <option value="muqumiy">C-Space Muqumiy</option>
            <option value="yunusabad">C-Space Yunusabad</option>
            <option value="elbek">C-Space Elbek</option>
          </select>
          <select className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none">
            <option value="">All Departments</option>
            <option value="operations">Operations</option>
            <option value="hr">Human Resources</option>
            <option value="marketing">Marketing</option>
            <option value="it">IT</option>
            <option value="facilities">Facilities</option>
          </select>
          <select className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none">
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="terminated">Terminated</option>
          </select>
          <button className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            <Filter size={18} />
            More Filters
          </button>
        </div>
      </div>

      {/* Employee List */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Employee
              </th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Position
              </th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Branch
              </th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Contact
              </th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              {canEditEmployee && (
                <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {demoEmployees.map((employee) => (
              <tr key={employee.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                      <span className="text-purple-700 font-medium">
                        {employee.fullName.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{employee.fullName}</p>
                      <p className="text-sm text-gray-500">{employee.employeeId}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <p className="text-gray-900">{employee.position}</p>
                  <p className="text-sm text-gray-500">{employee.department}</p>
                </td>
                <td className="px-6 py-4">
                  <p className="text-gray-900">{employee.branch}</p>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-col gap-1">
                    <a
                      href={`mailto:${employee.email}`}
                      className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-purple-600"
                    >
                      <Mail size={14} />
                      {employee.email}
                    </a>
                    <a
                      href={`tel:${employee.phone}`}
                      className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-purple-600"
                    >
                      <Phone size={14} />
                      {employee.phone}
                    </a>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <EmployeeStatusBadge status={employee.status} />
                </td>
                {canEditEmployee && (
                  <td className="px-6 py-4 text-right">
                    <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                      <MoreVertical size={18} />
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50">
          <p className="text-sm text-gray-500">
            Showing <span className="font-medium">1</span> to{' '}
            <span className="font-medium">{demoEmployees.length}</span> of{' '}
            <span className="font-medium">{demoEmployees.length}</span> employees
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
