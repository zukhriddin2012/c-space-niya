'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useServiceHub, getOperatorHeaders } from '@/contexts/ServiceHubContext';
import type { AccountingRequest, AccountingRequestType, AccountingRequestStatus } from '@/modules/accounting/types';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { Calculator, Plus, Search, ChevronLeft, ChevronRight } from 'lucide-react';

type FilterStatus = AccountingRequestStatus | 'all';

interface PaginationData {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

interface ApiResponse {
  data: AccountingRequest[];
  pagination: PaginationData;
}

const statusConfig: Record<AccountingRequestStatus, { color: string; label: string }> = {
  pending: { color: 'bg-yellow-100 text-yellow-800', label: 'Pending' },
  in_progress: { color: 'bg-blue-100 text-blue-800', label: 'In Progress' },
  needs_info: { color: 'bg-orange-100 text-orange-800', label: 'Needs Info' },
  pending_approval: { color: 'bg-purple-100 text-purple-800', label: 'Pending Approval' },
  approved: { color: 'bg-indigo-100 text-indigo-800', label: 'Approved' },
  completed: { color: 'bg-green-100 text-green-800', label: 'Completed' },
  rejected: { color: 'bg-red-100 text-red-800', label: 'Rejected' },
  cancelled: { color: 'bg-gray-100 text-gray-800', label: 'Cancelled' },
};

const typeConfig: Record<AccountingRequestType, { label: string; color: string }> = {
  reconciliation: { label: 'Reconciliation', color: 'bg-purple-100 text-purple-800' },
  payment: { label: 'Payment', color: 'bg-blue-100 text-blue-800' },
  confirmation: { label: 'Confirmation', color: 'bg-green-100 text-green-800' },
};

export default function AccountingRequestsView() {
  const { selectedBranchId, currentOperator } = useServiceHub();
  const [requests, setRequests] = useState<AccountingRequest[]>([]);
  const [pagination, setPagination] = useState<PaginationData>({
    total: 0,
    page: 1,
    pageSize: 10,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all');
  const [typeFilter, setTypeFilter] = useState<AccountingRequestType | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showNewForm, setShowNewForm] = useState(false);

  const fetchRequests = useCallback(
    async (page: number = 1) => {
      if (!selectedBranchId) {
        setError('Branch ID not found');
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          page: page.toString(),
          limit: pagination.pageSize.toString(),
          ...(statusFilter !== 'all' && { status: statusFilter }),
          ...(typeFilter !== 'all' && { type: typeFilter }),
          ...(searchTerm && { search: searchTerm }),
        });

        const headers = getOperatorHeaders(currentOperator, 'self');
        const response = await fetch(
          `/api/reception/accounting-requests?${params.toString()}`,
          {
            method: 'GET',
            headers,
          }
        );

        if (!response.ok) {
          throw new Error('Failed to fetch accounting requests');
        }

        const data: ApiResponse = await response.json();
        setRequests(data.data);
        setPagination(data.pagination);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'An error occurred';
        setError(message);
        console.error('Error fetching requests:', err);
      } finally {
        setLoading(false);
      }
    },
    [selectedBranchId, currentOperator, statusFilter, typeFilter, searchTerm, pagination.pageSize]
  );

  useEffect(() => {
    fetchRequests(1);
  }, [statusFilter, typeFilter, searchTerm]);

  const handlePreviousPage = () => {
    if (pagination.page > 1) {
      fetchRequests(pagination.page - 1);
    }
  };

  const handleNextPage = () => {
    if (pagination.page < pagination.totalPages) {
      fetchRequests(pagination.page + 1);
    }
  };

  const formatCurrency = (amount: number | null | undefined): string => {
    if (!amount && amount !== 0) return '—';
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
    }).format(amount);
  };

  const formatDate = (date: string | Date): string => {
    return new Date(date).toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Calculator className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Accounting Requests</h1>
              <p className="text-gray-600">Manage reconciliation, payments, and invoices</p>
            </div>
          </div>
          <Button onClick={() => setShowNewForm(!showNewForm)} className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            New Request
          </Button>
        </div>

        {/* Status Tabs */}
        <Card className="mb-6 p-4">
          <div className="flex flex-wrap gap-2">
            {(['all', 'pending', 'in_progress', 'completed', 'rejected'] as const).map(
              (status) => (
                <button
                  key={status}
                  onClick={() => {
                    setStatusFilter(status);
                  }}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    statusFilter === status
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {status === 'all' ? 'All' : statusConfig[status as AccountingRequestStatus].label}
                </button>
              )
            )}
          </div>
        </Card>

        {/* Filters */}
        <Card className="mb-6 p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by request # or name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            {/* Type Filter */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as AccountingRequestType | 'all')}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="all">All Types</option>
              <option value="reconciliation">Reconciliation</option>
              <option value="payment">Payment</option>
              <option value="confirmation">Confirmation</option>
            </select>
          </div>
        </Card>

        {/* Error Message */}
        {error && (
          <Card className="mb-6 p-4 border-2 border-red-200 bg-red-50">
            <p className="text-red-700">{error}</p>
          </Card>
        )}

        {/* Loading State */}
        {loading && (
          <Card className="p-8 text-center">
            <div className="inline-block">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            </div>
            <p className="mt-4 text-gray-600">Loading requests...</p>
          </Card>
        )}

        {/* Table */}
        {!loading && requests.length > 0 && (
          <Card className="mb-6 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Request #</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Type</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
                    <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700">Amount</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Created</th>
                    <th className="px-6 py-3 text-center text-sm font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((request) => (
                    <tr key={request.id} className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">#{request.id.slice(-8)}</td>
                      <td className="px-6 py-4 text-sm">
                        <Badge className={typeConfig[request.requestType].color}>
                          {typeConfig[request.requestType].label}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <Badge className={statusConfig[request.status].color}>
                          {statusConfig[request.status].label}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-sm text-right text-gray-900 font-medium">
                        {formatCurrency(request.amount)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {formatDate(request.createdAt)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <Button variant="secondary" size="sm">
                          View
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between px-6 py-4 bg-gray-50 border-t border-gray-200">
              <div className="text-sm text-gray-600">
                Showing {requests.length > 0 ? (pagination.page - 1) * pagination.pageSize + 1 : 0} to{' '}
                {Math.min(pagination.page * pagination.pageSize, pagination.total)} of {pagination.total} requests
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handlePreviousPage}
                  disabled={pagination.page === 1 || loading}
                  className="p-2 border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <div className="flex items-center gap-2 px-3">
                  <span className="text-sm text-gray-700 font-medium">
                    {pagination.page} / {pagination.totalPages}
                  </span>
                </div>
                <button
                  onClick={handleNextPage}
                  disabled={pagination.page >= pagination.totalPages || loading}
                  className="p-2 border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </Card>
        )}

        {/* Empty State */}
        {!loading && requests.length === 0 && (
          <Card className="p-12 text-center">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-gray-100 rounded-full">
                <Calculator className="w-6 h-6 text-gray-400" />
              </div>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No requests found</h3>
            <p className="text-gray-600 mb-6">
              {searchTerm || statusFilter !== 'all' || typeFilter !== 'all'
                ? 'Try adjusting your filters or search term.'
                : 'Create your first accounting request to get started.'}
            </p>
            <Button onClick={() => setShowNewForm(!showNewForm)} className="flex items-center gap-2 mx-auto">
              <Plus className="w-4 h-4" />
              Create Request
            </Button>
          </Card>
        )}
      </div>
    </div>
  );
}
