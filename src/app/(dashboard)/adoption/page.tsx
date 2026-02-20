'use client';

import { useState, useEffect, useCallback } from 'react';
import { Activity, Users, CheckCircle, LayoutGrid } from 'lucide-react';
import { ScoreCard } from '@/components/adoption/ScoreCard';
import { AdoptionOverview } from '@/components/adoption/AdoptionOverview';
import { ScoreTrend } from '@/components/adoption/ScoreTrend';
import { ModuleScoreList } from '@/components/adoption/ModuleScoreList';
import { TopUsersTable } from '@/components/adoption/TopUsersTable';
import { BranchComparison } from '@/components/adoption/BranchComparison';

type Period = '7d' | '30d' | '90d';

interface OverviewData {
  score: number;
  breadth: number;
  depth: number;
  frequency: number;
  activeUsers: number;
  totalUsers: number;
  actionsToday: number;
  activeModules: number;
  totalModules: number;
  trend: { scoreDelta: number; usersDelta: number; actionsDeltaPct: number };
  trendData?: Array<{ date: string; score: number }>;
  modules: Array<{ module: string; label: string; score: number; userCount: number; actionCount: number }>;
  topUsers: Array<{
    userId: string; name: string; role: string; score: number;
    modulesUsed: number; modulesAvailable: number; totalActions: number;
  }>;
}

interface BranchData {
  branchId: string;
  branchName: string;
  score: number;
  userCount: number;
  actionCount: number;
}

export default function AdoptionPage() {
  const [period, setPeriod] = useState<Period>('7d');
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [branches, setBranches] = useState<BranchData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [overviewRes, branchesRes] = await Promise.all([
        fetch(`/api/adoption/overview?period=${period}`),
        fetch(`/api/adoption/branches?period=${period}`),
      ]);

      if (!overviewRes.ok) {
        if (overviewRes.status === 403) {
          setError('You do not have permission to view adoption data.');
          return;
        }
        throw new Error('Failed to fetch overview');
      }

      const overviewData = await overviewRes.json();
      setOverview(overviewData);

      if (branchesRes.ok) {
        const branchesData = await branchesRes.json();
        setBranches(branchesData.branches || []);
      }
    } catch (err) {
      console.error('Error fetching adoption data:', err);
      setError('Failed to load adoption data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div className="p-6 max-w-[1400px]">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
            <Activity size={22} className="text-purple-600" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">System Adoption</h1>
            <p className="text-sm text-gray-500">Platform usage overview across all modules and users</p>
          </div>
        </div>
        <div className="flex bg-white border border-gray-200 rounded-lg overflow-hidden">
          {(['7d', '30d', '90d'] as const).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-1.5 text-sm font-medium border-r border-gray-200 last:border-r-0 transition-colors ${
                period === p
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              {p === '7d' ? '7 days' : p === '30d' ? '30 days' : '90 days'}
            </button>
          ))}
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-600 mb-6">
          {error}
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
            <span className="text-sm text-gray-500">Loading adoption data...</span>
          </div>
        </div>
      )}

      {/* Data */}
      {!loading && !error && overview && (
        <>
          {/* Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <ScoreCard
              label="Overall Score"
              value={overview.score}
              icon={Activity}
              iconBg="bg-purple-50"
              iconColor="text-purple-600"
              trend={{
                value: overview.trend.scoreDelta >= 0 ? `+${overview.trend.scoreDelta} from last period` : `${overview.trend.scoreDelta} from last period`,
                direction: overview.trend.scoreDelta > 0 ? 'up' : overview.trend.scoreDelta < 0 ? 'down' : 'neutral',
              }}
            />
            <ScoreCard
              label="Active Users"
              value={`${overview.activeUsers} / ${overview.totalUsers}`}
              subtitle={`${overview.totalUsers > 0 ? Math.round((overview.activeUsers / overview.totalUsers) * 100) : 0}% of workforce`}
              icon={Users}
              iconBg="bg-green-50"
              iconColor="text-green-600"
              trend={{
                value: overview.trend.usersDelta >= 0 ? `+${overview.trend.usersDelta} users` : `${overview.trend.usersDelta} users`,
                direction: overview.trend.usersDelta > 0 ? 'up' : overview.trend.usersDelta < 0 ? 'down' : 'neutral',
              }}
            />
            <ScoreCard
              label="Actions Today"
              value={overview.actionsToday}
              subtitle={overview.activeUsers > 0 ? `Avg ${(overview.actionsToday / overview.activeUsers).toFixed(1)} per user` : ''}
              icon={CheckCircle}
              iconBg="bg-blue-50"
              iconColor="text-blue-600"
              trend={{
                value: overview.trend.actionsDeltaPct !== 0 ? `${overview.trend.actionsDeltaPct > 0 ? '+' : ''}${overview.trend.actionsDeltaPct}% vs last period` : 'Same as last period',
                direction: overview.trend.actionsDeltaPct > 0 ? 'up' : overview.trend.actionsDeltaPct < 0 ? 'down' : 'neutral',
              }}
            />
            <ScoreCard
              label="Modules Active"
              value={`${overview.activeModules} / ${overview.totalModules}`}
              subtitle={`${overview.totalModules > 0 ? Math.round((overview.activeModules / overview.totalModules) * 100) : 0}% coverage`}
              icon={LayoutGrid}
              iconBg="bg-orange-50"
              iconColor="text-orange-600"
              trend={{
                value: 'All tracked',
                direction: 'neutral',
              }}
            />
          </div>

          {/* Score Breakdown + Trend */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
            <AdoptionOverview
              score={overview.score}
              breadth={overview.breadth}
              depth={overview.depth}
              frequency={overview.frequency}
              activeUsers={overview.activeUsers}
              totalUsers={overview.totalUsers}
            />
            <ScoreTrend
              trend={overview.trend}
              breadth={overview.breadth}
              depth={overview.depth}
              frequency={overview.frequency}
              dataPoints={overview.trendData}
            />
          </div>

          {/* Module Adoption */}
          <div className="mb-6">
            <ModuleScoreList modules={overview.modules} />
          </div>

          {/* Top Users + Branch Comparison */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <TopUsersTable users={overview.topUsers} totalCount={overview.activeUsers} />
            <BranchComparison branches={branches} />
          </div>
        </>
      )}

      {/* Empty State */}
      {!loading && !error && overview && overview.activeUsers === 0 && (
        <div className="text-center py-20">
          <Activity size={40} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">No usage data yet. Activity will appear as users interact with the platform.</p>
        </div>
      )}
    </div>
  );
}
