'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Plus, Search, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Badge from '@/components/ui/Badge';
import { useReceptionMode, getOperatorHeaders } from '@/contexts/ReceptionModeContext';
import type { LegalRequest } from '@/modules/legal/types';
import { LEGAL_REQUEST_TYPE_LABELS, LEGAL_STATUS_LABELS } from '@/modules/legal/types';

const STATUS_COLORS: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple'> = {
  submitted: 'info',
  under_review: 'warning',
  in_progress: 'purple',
  ready: 'success',
  completed: 'default',
  rejected: 'danger',
};

const LEGAL_REQUEST_TYPES = Object.entries(LEGAL_REQUEST_TYPE_LABELS).map(([key, label]) => ({
  value: key,
  label,
}));

interface LegalRequestsResponse {
  requests: LegalRequest[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export default function LegalRequestsPage() {
  const { selectedBranchId, currentOperator } = useReceptionMode();

  // Data states
  const [requests, setRequests] = useState<LegalRequest[]>([]);

  // UI states
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [selectedRequestType, setSelectedRequestType] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 20;

  const statusOptions = [
    { value: '', label: 'All' },
    { value: 'submitted', label: 'Submitted' },
    { value: 'under_review', label: 'Under Review' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'ready', label: 'Ready' },
    { value: 'completed', label: 'Completed' },
    { value: 'rejected', label: 'Rejected' },
  ];

  // Fetch legal requests
  const fetchRequests = useCallback(async () => {
    if (!selectedBranchId) return;

    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('pageSize', pageSize.toString());
      params.append('branchId', selectedBranchId);

      if (searchQuery) params.append('search', searchQuery);
      if (selectedStatus) params.append('status', selectedStatus);
      if (selectedRequestType) params.append('requestType', selectedRequestType);

      const headers = {
        ...getOperatorHeaders(currentOperator, 'user-id'),
      };

      const response = await fetch(`/api/reception/legal-requests?${params}`, {
        headers,
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch legal requests: ${response.status}`);
      }

      const data: LegalRequestsResponse = await response.json();
      setRequests(data.requests);
      setTotalPages(data.totalPages || 1);
      setTotalCount(data.total || 0);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load legal requests';
      setError(errorMessage);
      console.error('Error fetching legal requests:', err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedBranchId, page, searchQuery, selectedStatus, selectedRequestType, currentOperator]);

  // Fetch on mount and when filters change
  useEffect(() => {
    if (selectedBranchId) {
      fetchRequests();
    }
  }, [selectedBranchId, fetchRequests]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [searchQuery, selectedStatus, selectedRequestType]);

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedStatus('');
    setSelectedRequestType('');
    setPage(1);
  };

  const hasActiveFilters = searchQuery || selectedStatus || selectedRequestType;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Legal Requests</h1>
          <p className="text-gray-500 mt-2">
            Manage contract preparations, agreements, and registrations
          </p>
        </div>
        <Link href="/reception/requests/legal/new">
          <Button variant="primary" leftIcon={<Plus className="w-4 h-4" />}>
            New Legal Request
          </Button>
        </Link>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center gap-4 flex-wrap">
        <Input
          placeholder="Search by request number or description..."
          leftIcon={<Search className="w-4 h-4" />}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 min-w-xs"
        />
        <Button
          variant="secondary"
          size="md"
          leftIcon={<Filter className="w-4 h-4" />}
          onClick={() => setShowFilters(!showFilters)}
          className={showFilters ? 'bg-purple-50 border-purple-300' : ''}
        >
          Filters
        </Button>
      </div>

      {/* Advanced Filters */}
      {showFilters && (
        <Card>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                value={selectedStatus}
                onChange={(e) => {
                  setSelectedStatus(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
              >
                {statusOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Request Type Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Request Type
              </label>
              <select
                value={selectedRequestType}
                onChange={(e) => {
                  setSelectedRequestType(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
              >
                <option value="">All Types</option>
                {LEGAL_REQUEST_TYPES.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Reset Filters Button */}
            <div className="flex items-end">
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleResetFilters}
                  className="w-full"
                >
                  Reset Filters
                </Button>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Results Count */}
      {!isLoading && (
        <div className="text-sm text-gray-600">
          Showing {requests.length > 0 ? (page - 1) * pageSize + 1 : 0} to{' '}
          {Math.min(page * pageSize, totalCount)} of {totalCount} requests
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full"></div>
        </div>
      )}

      {/* Error State */}
      {error && !isLoading && (
        <Card className="bg-red-50 border-red-200">
          <div className="flex items-start gap-4">
            <div className="flex-1">
              <h3 className="font-medium text-red-900">Error loading requests</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
            <Button variant="danger" size="sm" onClick={fetchRequests}>
              Retry
            </Button>
          </div>
        </Card>
      )}

      {/* Requests Table */}
      {!isLoading && !error && requests.length > 0 && (
        <>
          <Card noPadding>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Request Number
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Submitted
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Assigned To
                    </th>
                    <th className="px-6 py-3 text-center text-sm font-semibold text-gray-900">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {requests.map(request => (
                    <tr key={request.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 text-sm font-medium text-purple-600">
                        <Link
                          href={`/reception/requests/legal/${request.id}`}
                          className="hover:underline"
                        >
                          {request.requestNumber}
                        </Link>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {LEGAL_REQUEST_TYPE_LABELS[request.requestType]}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <Badge variant={STATUS_COLORS[request.status] || 'default'}>
                          {LEGAL_STATUS_LABELS[request.status]}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {new Date(request.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {request.assignedToName || 'Unassigned'}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <Link
                          href={`/reception/requests/legal/${request.id}`}
                          className="text-purple-600 hover:text-purple-700 text-sm font-medium"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                leftIcon={<ChevronLeft className="w-4 h-4" />}
              >
                Previous
              </Button>

              <div className="flex items-center gap-2">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNum => (
                  <button
                    key={pageNum}
                    onClick={() => setPage(pageNum)}
                    className={`
                      px-3 py-1 rounded-lg text-sm font-medium transition-colors
                      ${
                        pageNum === page
                          ? 'bg-purple-600 text-white'
                          : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                      }
                    `}
                  >
                    {pageNum}
                  </button>
                ))}
              </div>

              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                rightIcon={<ChevronRight className="w-4 h-4" />}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}

      {/* Empty State */}
      {!isLoading && !error && requests.length === 0 && (
        <Card className="text-center py-12">
          <p className="text-gray-500 mb-4">No legal requests found</p>
          {hasActiveFilters && (
            <Button variant="secondary" size="sm" onClick={handleResetFilters}>
              Reset Filters
            </Button>
          )}
        </Card>
      )}
    </div>
  );
}
