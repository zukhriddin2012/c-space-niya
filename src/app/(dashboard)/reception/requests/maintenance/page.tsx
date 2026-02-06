'use client';

import React, { useState, useEffect } from 'react';
import { useReceptionMode } from '@/contexts/ReceptionModeContext';
import type { MaintenanceIssue, MaintenanceStatus, MaintenanceCategory, MaintenanceUrgency } from '@/modules/maintenance/types';
import {
  MAINTENANCE_CATEGORY_LABELS,
  MAINTENANCE_URGENCY_LABELS,
  MAINTENANCE_STATUS_LABELS,
  URGENCY_COLORS,
  isSlaBreached,
  getSlaRemainingHours,
} from '@/modules/maintenance/types';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Tabs, { TabPanel } from '@/components/ui/Tabs';
import {
  Plus,
  AlertCircle,
  AlertTriangle,
  Clock,
  MapPin,
  ChevronRight,
  Loader2,
} from 'lucide-react';

interface MaintenanceResponse {
  issues: MaintenanceIssue[];
  total: number;
  page: number;
  pageSize: number;
}

interface UrgencyCounts {
  critical: number;
  high: number;
  medium: number;
  low: number;
}

// Category icon mapping
const CATEGORY_ICONS: Record<MaintenanceCategory, React.ReactNode> = {
  hvac: '❄️',
  plumbing: '🚿',
  electrical: '⚡',
  furniture: '🪑',
  cleaning: '🧹',
  building: '🏢',
  it_network: '💻',
  safety: '🔒',
  other: '📋',
};

export default function MaintenanceIssuesPage() {
  const { selectedBranchId } = useReceptionMode();
  const [activeTab, setActiveTab] = useState<MaintenanceStatus>('open');
  const [selectedCategory, setSelectedCategory] = useState<MaintenanceCategory | 'all'>('all');
  const [selectedUrgency, setSelectedUrgency] = useState<MaintenanceUrgency | 'all'>('all');
  const [issues, setIssues] = useState<MaintenanceIssue[]>([]);
  const [urgencyCounts, setUrgencyCounts] = useState<UrgencyCounts>({ critical: 0, high: 0, medium: 0, low: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    if (!selectedBranchId) return;
    fetchIssues();
  }, [selectedBranchId, activeTab, selectedCategory, selectedUrgency, page]);

  const fetchIssues = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const params = new URLSearchParams({
        branchId: selectedBranchId || '',
        page: page.toString(),
        pageSize: '10',
      });

      // Build status filter
      const statusFilters: MaintenanceStatus[] = activeTab !== 'open' ? [activeTab] : ['open', 'in_progress'];
      params.append('status', statusFilters.join(','));

      // Add category filter if not 'all'
      if (selectedCategory !== 'all') {
        params.append('category', selectedCategory);
      }

      // Add urgency filter if not 'all'
      if (selectedUrgency !== 'all') {
        params.append('urgency', selectedUrgency);
      }

      const response = await fetch(`/api/reception/maintenance-issues?${params.toString()}`);

      if (!response.ok) {
        throw new Error('Failed to fetch maintenance issues');
      }

      const data: MaintenanceResponse = await response.json();
      setIssues(data.issues);
      setTotalPages(Math.ceil(data.total / data.pageSize));

      // Calculate urgency counts
      const counts: UrgencyCounts = { critical: 0, high: 0, medium: 0, low: 0 };
      data.issues.forEach((issue) => {
        counts[issue.urgency]++;
      });
      setUrgencyCounts(counts);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load maintenance issues');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReportIssue = () => {
    // Navigate to report issue page - would be implemented with router
    window.location.href = '/reception/requests/maintenance/new';
  };

  const tabs = [
    { id: 'open' as const, label: 'Open Issues', badge: urgencyCounts.critical + urgencyCounts.high },
    { id: 'in_progress' as const, label: 'In Progress' },
    { id: 'resolved' as const, label: 'Resolved' },
  ];

  const categories = ['all', ...Object.keys(MAINTENANCE_CATEGORY_LABELS)] as const;

  const urgencies = ['all', 'critical', 'high', 'medium', 'low'] as const;

  const getSlaStatus = (issue: MaintenanceIssue) => {
    if (issue.status === 'resolved') return 'resolved';
    if (isSlaBreached(issue)) return 'breached';
    const remaining = getSlaRemainingHours(issue);
    if (remaining !== null && remaining < (24 * 7 / 4)) return 'warning'; // <25% time
    return 'ok';
  };

  const getSlaStatusColor = (status: string) => {
    switch (status) {
      case 'breached':
        return 'text-red-600 animate-pulse';
      case 'warning':
        return 'text-yellow-600';
      case 'ok':
        return 'text-green-600';
      default:
        return 'text-gray-600';
    }
  };

  if (!selectedBranchId) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 mb-4">Please select a branch first</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Report Button */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Maintenance Issues</h1>
          <p className="text-sm text-gray-500 mt-1">Track and manage facility maintenance requests</p>
        </div>
        <Button onClick={handleReportIssue} leftIcon={<Plus className="w-4 h-4" />}>
          Report Issue
        </Button>
      </div>

      {/* Urgency Badge Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <div className="text-center">
            <div className="inline-flex items-center gap-2 mb-2">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <span className="text-sm font-medium text-gray-600">Critical</span>
            </div>
            <p className="text-2xl font-bold text-red-600">{urgencyCounts.critical}</p>
          </div>
        </Card>

        <Card>
          <div className="text-center">
            <div className="inline-flex items-center gap-2 mb-2">
              <AlertTriangle className="w-5 h-5 text-orange-600" />
              <span className="text-sm font-medium text-gray-600">High</span>
            </div>
            <p className="text-2xl font-bold text-orange-600">{urgencyCounts.high}</p>
          </div>
        </Card>

        <Card>
          <div className="text-center">
            <div className="inline-flex items-center gap-2 mb-2">
              <Clock className="w-5 h-5 text-yellow-600" />
              <span className="text-sm font-medium text-gray-600">Medium</span>
            </div>
            <p className="text-2xl font-bold text-yellow-600">{urgencyCounts.medium}</p>
          </div>
        </Card>

        <Card>
          <div className="text-center">
            <div className="inline-flex items-center gap-2 mb-2">
              <Clock className="w-5 h-5 text-blue-600" />
              <span className="text-sm font-medium text-gray-600">Low</span>
            </div>
            <p className="text-2xl font-bold text-blue-600">{urgencyCounts.low}</p>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value as MaintenanceCategory | 'all');
                setPage(1);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="all">All Categories</option>
              {categories.filter((c) => c !== 'all').map((category) => (
                <option key={category} value={category}>
                  {MAINTENANCE_CATEGORY_LABELS[category as MaintenanceCategory]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Urgency</label>
            <select
              value={selectedUrgency}
              onChange={(e) => {
                setSelectedUrgency(e.target.value as MaintenanceUrgency | 'all');
                setPage(1);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="all">All Urgencies</option>
              {urgencies.filter((u) => u !== 'all').map((urgency) => (
                <option key={urgency} value={urgency}>
                  {MAINTENANCE_URGENCY_LABELS[urgency as MaintenanceUrgency]}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* Tabs */}
      <Tabs tabs={tabs} activeTab={activeTab} onChange={(tabId) => setActiveTab(tabId as MaintenanceStatus)} />

      {/* Issues List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
        </div>
      ) : error ? (
        <Card>
          <div className="text-center py-8">
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={() => fetchIssues()} variant="secondary">
              Retry
            </Button>
          </div>
        </Card>
      ) : issues.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">No maintenance issues found</p>
          </div>
        </Card>
      ) : (
        <>
          <div className="space-y-3">
            {issues.map((issue) => {
              const slaStatus = getSlaStatus(issue);
              const remaining = getSlaRemainingHours(issue);

              return (
                <Card key={issue.id}>
                  <div className="flex items-start gap-4">
                    {/* Category Icon */}
                    <div className="text-2xl flex-shrink-0 mt-1">
                      {CATEGORY_ICONS[issue.category]}
                    </div>

                    {/* Main Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-mono text-sm font-semibold text-gray-700">
                          #{issue.issueNumber}
                        </span>
                        <span className={`px-2 py-1 rounded-md text-xs font-medium border ${URGENCY_COLORS[issue.urgency]}`}>
                          {MAINTENANCE_URGENCY_LABELS[issue.urgency]}
                        </span>
                        <span className="px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-700">
                          {MAINTENANCE_STATUS_LABELS[issue.status]}
                        </span>
                      </div>

                      <p className="text-gray-900 font-medium mb-2 line-clamp-2">{issue.description}</p>

                      <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <MapPin className="w-4 h-4 text-gray-400" />
                          <span>{issue.locationDescription}</span>
                        </div>
                        {issue.assignedToName && (
                          <div className="flex items-center gap-1">
                            <span className="text-gray-400">Assigned to:</span>
                            <span className="font-medium">{issue.assignedToName}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* SLA Indicator and Arrow */}
                    <div className="flex flex-col items-end gap-3 flex-shrink-0">
                      <div className={`text-center ${getSlaStatusColor(slaStatus)}`}>
                        <Clock className="w-4 h-4 mx-auto mb-1" />
                        <div className="text-xs font-medium">
                          {slaStatus === 'breached' && 'OVERDUE'}
                          {slaStatus === 'warning' && remaining !== null && `${remaining}h left`}
                          {slaStatus === 'ok' && remaining !== null && `${remaining}h left`}
                          {slaStatus === 'resolved' && 'Resolved'}
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <Button
                variant="secondary"
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
              >
                Previous
              </Button>
              <span className="text-sm text-gray-600">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="secondary"
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
