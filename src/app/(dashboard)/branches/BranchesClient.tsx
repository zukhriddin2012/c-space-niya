'use client';

import { useState } from 'react';
import { Plus, MapPin, Users, CheckCircle, Clock, Wallet, Edit, Circle, LayoutGrid, List } from 'lucide-react';
import Link from 'next/link';
import BranchMap from '@/components/BranchMap';
import type { BranchWithStats } from './page';

function formatSalary(amount: number): string {
  if (amount === 0) return '-';
  return new Intl.NumberFormat('uz-UZ').format(amount) + ' UZS';
}

function BranchCard({
  branch,
  canManage,
  showSalary,
}: {
  branch: BranchWithStats;
  canManage: boolean;
  showSalary: boolean;
}) {
  const presencePercentage = branch.totalEmployees > 0
    ? Math.round((branch.presentToday / branch.totalEmployees) * 100)
    : 0;

  const hasGeofence = branch.latitude && branch.longitude;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
            <MapPin size={24} className="text-purple-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{branch.name}</h3>
            <p className="text-sm text-gray-500">{branch.address || 'No address'}</p>
          </div>
        </div>
        {branch.isActive ? (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-green-50 text-green-700 rounded-full text-xs font-medium">
            <CheckCircle size={12} />
            Active
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-50 text-gray-600 rounded-full text-xs font-medium">
            No Staff
          </span>
        )}
      </div>

      {/* Stats */}
      <div className={`grid ${showSalary ? 'grid-cols-3' : 'grid-cols-2'} gap-3 mb-4`}>
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
        {showSalary && (
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
              <Wallet size={16} />
              <span>Budget</span>
            </div>
            <p className="text-sm font-semibold text-gray-900">
              {formatSalary(branch.salaryBudget)}
            </p>
          </div>
        )}
      </div>

      {/* Presence Bar */}
      {branch.totalEmployees > 0 && (
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
      )}

      {/* Geofence Info */}
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
        <Circle size={14} className={hasGeofence ? 'text-green-500' : 'text-gray-300'} />
        {hasGeofence ? (
          <span>Geofence: {branch.geofence_radius}m radius</span>
        ) : (
          <span className="text-orange-500">No geofence configured</span>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Link
          href={`/branches/${branch.id}`}
          className="flex-1 px-4 py-2 text-center text-sm font-medium text-purple-600 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
        >
          {canManage ? 'Edit Settings' : 'View Details'}
        </Link>
        {canManage && (
          <Link
            href={`/branches/${branch.id}`}
            className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
          >
            <Edit size={18} />
          </Link>
        )}
      </div>
    </div>
  );
}

function BranchRow({
  branch,
  canManage,
  showSalary,
}: {
  branch: BranchWithStats;
  canManage: boolean;
  showSalary: boolean;
}) {
  const presencePercentage = branch.totalEmployees > 0
    ? Math.round((branch.presentToday / branch.totalEmployees) * 100)
    : 0;

  const hasGeofence = branch.latitude && branch.longitude;

  return (
    <>
      {/* Desktop List Row */}
      <div className="hidden md:flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-purple-200 hover:bg-purple-50/30 transition-all">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
            <MapPin size={20} className="text-purple-600" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-medium text-gray-900">{branch.name}</h3>
              {branch.isActive ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-50 text-green-700 rounded-full text-xs font-medium">
                  Active
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-50 text-gray-600 rounded-full text-xs font-medium">
                  No Staff
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500">{branch.address || 'No address'}</p>
          </div>
        </div>

        <div className="flex items-center gap-6 lg:gap-8">
          <div className="text-right">
            <p className="font-medium text-gray-900">{branch.totalEmployees}</p>
            <p className="text-xs text-gray-500">Staff</p>
          </div>
          <div className="text-right">
            <p className="font-medium text-gray-900">{branch.presentToday}</p>
            <p className="text-xs text-gray-500">Present</p>
          </div>
          <div className="text-right w-16 lg:w-20">
            <p className={`font-medium ${
              presencePercentage >= 80 ? 'text-green-600' :
              presencePercentage >= 50 ? 'text-yellow-600' : 'text-red-600'
            }`}>
              {presencePercentage}%
            </p>
            <p className="text-xs text-gray-500">Attendance</p>
          </div>
          {showSalary && (
            <div className="text-right hidden lg:block">
              <p className="font-medium text-gray-900">{formatSalary(branch.salaryBudget)}</p>
              <p className="text-xs text-gray-500">Budget</p>
            </div>
          )}
          <div className="hidden lg:flex items-center gap-1">
            <Circle size={10} className={hasGeofence ? 'text-green-500' : 'text-gray-300'} />
            <span className="text-xs text-gray-500">{hasGeofence ? 'Geofenced' : 'No fence'}</span>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={`/branches/${branch.id}`}
              className="px-3 py-1.5 text-sm font-medium text-purple-600 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
            >
              {canManage ? 'Edit' : 'View'}
            </Link>
          </div>
        </div>
      </div>

      {/* Mobile List Card */}
      <div className="md:hidden p-4 border border-gray-200 rounded-lg">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <MapPin size={18} className="text-purple-600" />
            </div>
            <div className="min-w-0">
              <h3 className="font-medium text-gray-900">{branch.name}</h3>
              <p className="text-xs text-gray-500 truncate">{branch.address || 'No address'}</p>
            </div>
          </div>
          {branch.isActive ? (
            <span className="inline-flex items-center px-2 py-0.5 bg-green-50 text-green-700 rounded-full text-xs font-medium flex-shrink-0">
              Active
            </span>
          ) : (
            <span className="inline-flex items-center px-2 py-0.5 bg-gray-50 text-gray-600 rounded-full text-xs font-medium flex-shrink-0">
              No Staff
            </span>
          )}
        </div>

        <div className="grid grid-cols-3 gap-3 text-center bg-gray-50 rounded-lg p-3 mb-3">
          <div>
            <p className="text-xs text-gray-500">Staff</p>
            <p className="font-medium text-gray-900">{branch.totalEmployees}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Present</p>
            <p className="font-medium text-gray-900">{branch.presentToday}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Rate</p>
            <p className={`font-medium ${
              presencePercentage >= 80 ? 'text-green-600' :
              presencePercentage >= 50 ? 'text-yellow-600' : 'text-red-600'
            }`}>
              {presencePercentage}%
            </p>
          </div>
        </div>

        <Link
          href={`/branches/${branch.id}`}
          className="block w-full px-4 py-2 text-center text-sm font-medium text-purple-600 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
        >
          {canManage ? 'Edit Settings' : 'View Details'}
        </Link>
      </div>
    </>
  );
}

export default function BranchesClient({
  branches,
  canManageBranches,
  canViewSalaries,
}: {
  branches: BranchWithStats[];
  canManageBranches: boolean;
  canViewSalaries: boolean;
}) {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const activeBranches = branches.filter(b => b.totalEmployees > 0);
  const totalEmployees = branches.reduce((sum, b) => sum + b.totalEmployees, 0);
  const totalPresent = branches.reduce((sum, b) => sum + b.presentToday, 0);
  const totalSalaryBudget = branches.reduce((sum, b) => sum + b.salaryBudget, 0);

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 lg:mb-6">
        <div>
          <h1 className="text-xl lg:text-2xl font-semibold text-gray-900">Branches</h1>
          <p className="text-sm lg:text-base text-gray-500 mt-1 hidden sm:block">
            Manage C-Space coworking locations and geofencing settings
          </p>
        </div>
        {canManageBranches && (
          <Link
            href="/branches/new"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors text-sm lg:text-base"
          >
            <Plus size={20} />
            Add Branch
          </Link>
        )}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 lg:gap-4 mb-4 lg:mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-3 lg:p-4">
          <p className="text-xs lg:text-sm text-gray-500">Total Branches</p>
          <p className="text-lg lg:text-2xl font-semibold text-gray-900 mt-0.5 lg:mt-1">{branches.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-3 lg:p-4">
          <p className="text-xs lg:text-sm text-gray-500">With Staff</p>
          <p className="text-lg lg:text-2xl font-semibold text-gray-900 mt-0.5 lg:mt-1">
            {activeBranches.length}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-3 lg:p-4">
          <p className="text-xs lg:text-sm text-gray-500">Total Staff</p>
          <p className="text-lg lg:text-2xl font-semibold text-gray-900 mt-0.5 lg:mt-1">{totalEmployees}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-3 lg:p-4">
          <p className="text-xs lg:text-sm text-gray-500">Present Now</p>
          <p className="text-lg lg:text-2xl font-semibold text-green-600 mt-0.5 lg:mt-1">{totalPresent}</p>
        </div>
        {canViewSalaries && (
          <div className="bg-white rounded-xl border border-gray-200 p-3 lg:p-4 col-span-2 lg:col-span-1">
            <p className="text-xs lg:text-sm text-gray-500">Monthly Budget</p>
            <p className="text-base lg:text-lg font-semibold text-gray-900 mt-0.5 lg:mt-1">{formatSalary(totalSalaryBudget)}</p>
          </div>
        )}
      </div>

      {/* Interactive Map - Hidden on mobile for performance */}
      <div className="hidden sm:block mb-4 lg:mb-6">
        <BranchMap
          branches={branches.map(b => ({
            id: b.id,
            name: b.name,
            address: b.address,
            latitude: b.latitude,
            longitude: b.longitude,
            geofence_radius: b.geofence_radius,
            totalEmployees: b.totalEmployees,
            presentToday: b.presentToday,
          }))}
          height="350px"
        />
      </div>

      {/* View Toggle & Branch List */}
      <div className="bg-white rounded-xl border border-gray-200 mb-4 lg:mb-6">
        <div className="p-3 lg:p-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-sm lg:text-base font-semibold text-gray-900">All Branches</h2>
          <div className="flex items-center border border-gray-300 rounded-lg p-0.5 lg:p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 lg:p-2 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-purple-50 text-purple-600' : 'text-gray-400 hover:text-gray-600'}`}
              title="Grid view"
            >
              <LayoutGrid size={16} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 lg:p-2 rounded-md transition-colors ${viewMode === 'list' ? 'bg-purple-50 text-purple-600' : 'text-gray-400 hover:text-gray-600'}`}
              title="List view"
            >
              <List size={16} />
            </button>
          </div>
        </div>

        <div className="p-3 lg:p-4">
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
              {branches.map((branch) => (
                <BranchCard
                  key={branch.id}
                  branch={branch}
                  canManage={canManageBranches}
                  showSalary={canViewSalaries}
                />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {branches.map((branch) => (
                <BranchRow
                  key={branch.id}
                  branch={branch}
                  canManage={canManageBranches}
                  showSalary={canViewSalaries}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {branches.length === 0 && (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <MapPin size={48} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No branches yet</h3>
          <p className="text-gray-500 mb-4">Get started by adding your first branch location.</p>
          {canManageBranches && (
            <Link
              href="/branches/new"
              className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors"
            >
              <Plus size={20} />
              Add Branch
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
