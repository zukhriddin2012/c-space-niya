'use client';

import { useEffect, useState } from 'react';
import {
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle,
  Users,
  MapPin,
} from 'lucide-react';
import AttendanceMap from '@/components/AttendanceMap';
import WeeklyChart from './WeeklyChart';

interface DashboardData {
  stats: {
    total: number;
    present: number;
    late: number;
    absent: number;
    earlyLeave: number;
  };
  branchData: {
    id: string;
    name: string;
    address: string | null;
    latitude: number | null;
    longitude: number | null;
    present: number;
    late: number;
    absent: number;
    earlyLeave: number;
    total: number;
  }[];
  activeBranches: {
    id: string;
    name: string;
    present: number;
    total: number;
    percentage: number;
  }[];
  selectedDate: string;
}

function StatCardSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-3 xl:p-4 animate-pulse">
      <div className="flex items-center gap-1.5 xl:gap-2 mb-1.5 xl:mb-2">
        <div className="w-5 h-5 bg-gray-200 rounded" />
        <div className="w-16 h-4 bg-gray-200 rounded" />
      </div>
      <div className="w-12 h-8 bg-gray-200 rounded mb-1" />
      <div className="w-14 h-3 bg-gray-200 rounded" />
    </div>
  );
}

function BranchCardSkeleton() {
  return (
    <div className="bg-gray-50 rounded-lg p-3 animate-pulse">
      <div className="flex items-center justify-between mb-2">
        <div className="w-24 h-4 bg-gray-200 rounded" />
        <div className="w-8 h-4 bg-gray-200 rounded" />
      </div>
      <div className="h-2 bg-gray-200 rounded-full" />
    </div>
  );
}

export default function DashboardContent() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch('/api/attendance/dashboard');
        if (res.ok) {
          const dashboardData = await res.json();
          setData(dashboardData);
        }
      } catch (error) {
        console.error('Error fetching dashboard:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="space-y-4 xl:space-y-6">
        {/* Stats Skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 xl:gap-4">
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
        </div>

        {/* Map and Branch Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 xl:gap-6">
          <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 h-[300px] animate-pulse">
            <div className="w-full h-full bg-gray-100 rounded-xl" />
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 xl:p-5" style={{ height: '300px' }}>
            <div className="flex items-center gap-2 mb-3 xl:mb-4">
              <div className="w-5 h-5 bg-gray-200 rounded" />
              <div className="w-28 h-5 bg-gray-200 rounded" />
            </div>
            <div className="space-y-2.5 xl:space-y-3">
              <BranchCardSkeleton />
              <BranchCardSkeleton />
              <BranchCardSkeleton />
              <BranchCardSkeleton />
            </div>
          </div>
        </div>

        {/* Weekly Chart Skeleton */}
        <WeeklyChart />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12 text-gray-500">
        Failed to load dashboard data
      </div>
    );
  }

  const { stats, branchData, activeBranches, selectedDate } = data;

  return (
    <div className="space-y-4 xl:space-y-6">
      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 xl:gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-3 xl:p-4">
          <div className="flex items-center gap-1.5 xl:gap-2 text-purple-600 mb-1.5 xl:mb-2">
            <Users size={18} />
            <span className="text-xs xl:text-sm font-medium">Total</span>
          </div>
          <p className="text-xl xl:text-2xl font-semibold text-gray-900">{stats.total}</p>
          <p className="text-xs text-gray-500 mt-0.5 xl:mt-1">employees</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-3 xl:p-4">
          <div className="flex items-center gap-1.5 xl:gap-2 text-green-600 mb-1.5 xl:mb-2">
            <CheckCircle size={18} />
            <span className="text-xs xl:text-sm font-medium">Present Now</span>
          </div>
          <p className="text-xl xl:text-2xl font-semibold text-gray-900">{stats.present}</p>
          <p className="text-xs text-green-600 mt-0.5 xl:mt-1">in office</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-3 xl:p-4">
          <div className="flex items-center gap-1.5 xl:gap-2 text-orange-600 mb-1.5 xl:mb-2">
            <AlertCircle size={18} />
            <span className="text-xs xl:text-sm font-medium">Late</span>
          </div>
          <p className="text-xl xl:text-2xl font-semibold text-gray-900">{stats.late}</p>
          <p className="text-xs text-orange-600 mt-0.5 xl:mt-1">after 9 AM</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-3 xl:p-4">
          <div className="flex items-center gap-1.5 xl:gap-2 text-red-600 mb-1.5 xl:mb-2">
            <XCircle size={18} />
            <span className="text-xs xl:text-sm font-medium">Absent</span>
          </div>
          <p className="text-xl xl:text-2xl font-semibold text-gray-900">{stats.absent}</p>
          <p className="text-xs text-red-600 mt-0.5 xl:mt-1">not checked in</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-3 xl:p-4">
          <div className="flex items-center gap-1.5 xl:gap-2 text-yellow-600 mb-1.5 xl:mb-2">
            <Clock size={18} />
            <span className="text-xs xl:text-sm font-medium">Early Leave</span>
          </div>
          <p className="text-xl xl:text-2xl font-semibold text-gray-900">{stats.earlyLeave}</p>
          <p className="text-xs text-yellow-600 mt-0.5 xl:mt-1">left early</p>
        </div>
      </div>

      {/* Map and Branch Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 xl:gap-6">
        {branchData.length > 0 && (
          <div className="lg:col-span-2">
            <AttendanceMap
              branches={branchData}
              height="300px"
              selectedDate={selectedDate}
            />
          </div>
        )}

        {activeBranches.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-4 xl:p-5 flex flex-col" style={{ height: '300px' }}>
            <div className="flex items-center gap-2 mb-3 xl:mb-4 flex-shrink-0">
              <MapPin size={18} className="text-purple-600" />
              <h3 className="text-sm xl:text-base font-semibold text-gray-900">Branch Summary</h3>
            </div>
            <div className="space-y-2.5 xl:space-y-3 overflow-y-auto flex-1 pr-1">
              {activeBranches.map(branch => (
                <div key={branch.id} className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-900">{branch.name}</span>
                    <span className="text-xs text-gray-500">{branch.present}/{branch.total}</span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        branch.percentage >= 80 ? 'bg-green-500' : branch.percentage >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${branch.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Weekly Chart */}
      <WeeklyChart />
    </div>
  );
}
