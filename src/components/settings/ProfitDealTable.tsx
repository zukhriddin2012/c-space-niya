'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, RefreshCw } from 'lucide-react';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import ProfitDealModal from './ProfitDealModal';
import type { BranchProfitDeal } from '@/modules/finance-dashboard/types';

interface Branch {
  id: string;
  name: string;
}

export default function ProfitDealTable() {
  const [deals, setDeals] = useState<BranchProfitDeal[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  const fetchDeals = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/branch-profit-deals');
      if (res.ok) {
        const data = await res.json();
        setDeals(data);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDeals();
    // Fetch branches for the modal dropdown
    async function fetchBranches() {
      try {
        const res = await fetch('/api/branches');
        if (res.ok) {
          const data = await res.json();
          setBranches(Array.isArray(data) ? data : data.data || []);
        }
      } catch {
        // silent
      }
    }
    fetchBranches();
  }, [fetchDeals]);

  async function handleCreateDeal(data: {
    branchId: string;
    investorName: string;
    cspacePercentage: number;
    investorPercentage: number;
    effectiveFrom: string;
    notes?: string;
  }) {
    const res = await fetch('/api/branch-profit-deals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to create deal');
    }
    await fetchDeals();
  }

  async function handleRenegotiate(dealId: string) {
    // Close the current deal (effective_until = yesterday) then open modal for new deal
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const effectiveUntil = yesterday.toISOString().split('T')[0];

    const res = await fetch(`/api/branch-profit-deals/${dealId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ effectiveUntil }),
    });
    if (res.ok) {
      await fetchDeals();
      setModalOpen(true);
    }
  }

  // Sort: active deals first, then by effective_from desc
  const sortedDeals = [...deals].sort((a, b) => {
    const aActive = !a.effectiveUntil;
    const bActive = !b.effectiveUntil;
    if (aActive !== bActive) return aActive ? -1 : 1;
    return new Date(b.effectiveFrom).getTime() - new Date(a.effectiveFrom).getTime();
  });

  function formatDate(dateStr: string) {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    });
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-gray-900">Profit Sharing Deals</h1>
          <p className="text-sm text-gray-500 mt-1">Manage profit-sharing agreements between C-Space and branch investors</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={fetchDeals} leftIcon={<RefreshCw size={14} />}>
            Refresh
          </Button>
          <Button size="sm" onClick={() => setModalOpen(true)} leftIcon={<Plus size={14} />}>
            New Deal
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading deals...</div>
        ) : sortedDeals.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <p className="font-medium">No deals found</p>
            <p className="text-sm mt-1">Create a profit-sharing deal to get started</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Branch</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Investor</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Split</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Effective</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedDeals.map((deal) => {
                  const isActive = !deal.effectiveUntil;
                  return (
                    <tr
                      key={deal.id}
                      className={`border-b border-gray-100 last:border-b-0 hover:bg-purple-50/30 transition-colors ${!isActive ? 'opacity-55' : ''}`}
                    >
                      <td className="px-4 py-3.5">
                        <span className="font-semibold text-sm text-gray-900">{deal.branchName || deal.branchId}</span>
                      </td>
                      <td className="px-4 py-3.5 text-sm text-gray-700">{deal.investorName}</td>
                      <td className="px-4 py-3.5">
                        {/* Visual percentage bar */}
                        <div className="flex h-2 rounded-full overflow-hidden w-28">
                          <div className="bg-purple-600" style={{ width: `${deal.cspacePercentage}%` }} />
                          <div className="bg-blue-500" style={{ width: `${deal.investorPercentage}%` }} />
                        </div>
                        <div className="flex gap-2 mt-1 text-[11px]">
                          <span className="text-purple-600">C-Space {deal.cspacePercentage}%</span>
                          <span className="text-blue-600">Investor {deal.investorPercentage}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-sm text-gray-600 hidden md:table-cell">
                        <span className={`inline-block w-2 h-2 rounded-full mr-1.5 ${isActive ? 'bg-green-500' : 'bg-gray-300'}`} />
                        {formatDate(deal.effectiveFrom)} → {isActive ? 'Present' : formatDate(deal.effectiveUntil!)}
                      </td>
                      <td className="px-4 py-3.5">
                        <Badge variant={isActive ? 'success' : 'default'}>
                          {isActive ? 'Active' : 'Ended'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3.5">
                        {isActive && (
                          <button
                            onClick={() => handleRenegotiate(deal.id)}
                            className="text-xs font-medium text-purple-600 hover:text-purple-800 hover:bg-purple-50 px-2 py-1 rounded transition-colors"
                          >
                            Renegotiate
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ProfitDealModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleCreateDeal}
        branches={branches}
      />
    </div>
  );
}
