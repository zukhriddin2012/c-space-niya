import { getSession } from '@/lib/auth-server';
import { hasPermission } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Plus, MapPin, Users, Settings, CheckCircle, Clock } from 'lucide-react';
import Link from 'next/link';

// Demo branch data
const demoBranches = [
  {
    id: '1',
    name: 'C-Space Airport',
    address: 'Tashkent International Airport, Terminal 2',
    latitude: 41.2574,
    longitude: 69.2814,
    geofenceRadius: 100,
    totalEmployees: 10,
    presentToday: 8,
    isActive: true,
  },
  {
    id: '2',
    name: 'C-Space Beruniy',
    address: '15 Beruniy Street, Tashkent',
    latitude: 41.3123,
    longitude: 69.2796,
    geofenceRadius: 80,
    totalEmployees: 7,
    presentToday: 6,
    isActive: true,
  },
  {
    id: '3',
    name: 'C-Space Chust',
    address: '23 Chust Street, Tashkent',
    latitude: 41.2989,
    longitude: 69.2432,
    geofenceRadius: 75,
    totalEmployees: 6,
    presentToday: 5,
    isActive: true,
  },
  {
    id: '4',
    name: 'C-Space Labzak',
    address: '45 Labzak Street, Mirzo Ulugbek',
    latitude: 41.3456,
    longitude: 69.3012,
    geofenceRadius: 80,
    totalEmployees: 5,
    presentToday: 4,
    isActive: true,
  },
  {
    id: '5',
    name: 'C-Space Muqumiy',
    address: '78 Muqumiy Street, Yunusabad',
    latitude: 41.3567,
    longitude: 69.2845,
    geofenceRadius: 90,
    totalEmployees: 8,
    presentToday: 7,
    isActive: true,
  },
  {
    id: '6',
    name: 'C-Space Yunusabad',
    address: '12 Yunusabad District, Block C',
    latitude: 41.3678,
    longitude: 69.2956,
    geofenceRadius: 85,
    totalEmployees: 6,
    presentToday: 5,
    isActive: true,
  },
  {
    id: '7',
    name: 'C-Space Elbek',
    address: '34 Elbek Street, Yakkasaray',
    latitude: 41.2876,
    longitude: 69.2654,
    geofenceRadius: 70,
    totalEmployees: 5,
    presentToday: 3,
    isActive: true,
  },
];

function BranchCard({
  branch,
  canManage,
}: {
  branch: (typeof demoBranches)[0];
  canManage: boolean;
}) {
  const presencePercentage = Math.round(
    (branch.presentToday / branch.totalEmployees) * 100
  );

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
            <MapPin size={24} className="text-purple-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{branch.name}</h3>
            <p className="text-sm text-gray-500">{branch.address}</p>
          </div>
        </div>
        {branch.isActive ? (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-green-50 text-green-700 rounded-full text-xs font-medium">
            <CheckCircle size={12} />
            Active
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-50 text-gray-600 rounded-full text-xs font-medium">
            Inactive
          </span>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
            <Users size={16} />
            <span>Staff</span>
          </div>
          <p className="text-lg font-semibold text-gray-900">
            {branch.totalEmployees}
          </p>
        </div>
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
            <Clock size={16} />
            <span>Present</span>
          </div>
          <p className="text-lg font-semibold text-gray-900">
            {branch.presentToday}
          </p>
        </div>
      </div>

      {/* Presence Bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-sm mb-1">
          <span className="text-gray-500">Today&apos;s Presence</span>
          <span className="font-medium text-gray-900">{presencePercentage}%</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              presencePercentage >= 80
                ? 'bg-green-500'
                : presencePercentage >= 50
                ? 'bg-yellow-500'
                : 'bg-red-500'
            }`}
            style={{ width: `${presencePercentage}%` }}
          />
        </div>
      </div>

      {/* Geofence Info */}
      <div className="text-sm text-gray-500 mb-4">
        <span>Geofence: {branch.geofenceRadius}m radius</span>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Link
          href={`/branches/${branch.id}`}
          className="flex-1 px-4 py-2 text-center text-sm font-medium text-purple-600 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
        >
          View Details
        </Link>
        {canManage && (
          <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            <Settings size={18} />
          </button>
        )}
      </div>
    </div>
  );
}

export default async function BranchesPage() {
  const user = await getSession();

  if (!user) {
    redirect('/login');
  }

  // Check permission
  if (!hasPermission(user.role, 'manage_branches') && !hasPermission(user.role, 'view_presence')) {
    redirect('/dashboard');
  }

  const canManageBranches = hasPermission(user.role, 'manage_branches');

  const totalEmployees = demoBranches.reduce((sum, b) => sum + b.totalEmployees, 0);
  const totalPresent = demoBranches.reduce((sum, b) => sum + b.presentToday, 0);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Branches</h1>
          <p className="text-gray-500 mt-1">
            Manage C-Space coworking locations and track presence
          </p>
        </div>
        {canManageBranches && (
          <Link
            href="/branches/new"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors"
          >
            <Plus size={20} />
            Add Branch
          </Link>
        )}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Total Branches</p>
          <p className="text-2xl font-semibold text-gray-900 mt-1">{demoBranches.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Active Branches</p>
          <p className="text-2xl font-semibold text-gray-900 mt-1">
            {demoBranches.filter((b) => b.isActive).length}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Total Staff</p>
          <p className="text-2xl font-semibold text-gray-900 mt-1">{totalEmployees}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Present Now</p>
          <p className="text-2xl font-semibold text-green-600 mt-1">{totalPresent}</p>
        </div>
      </div>

      {/* Branch Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {demoBranches.map((branch) => (
          <BranchCard key={branch.id} branch={branch} canManage={canManageBranches} />
        ))}
      </div>
    </div>
  );
}
