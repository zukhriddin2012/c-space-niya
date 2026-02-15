'use client';

import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, ArrowLeftRight, Wallet, Users, Wrench, Activity } from 'lucide-react';
import type { BranchBriefing } from '@/modules/reception/types';

interface BranchBriefingPanelProps {
  branchId: string;
}

export function BranchBriefingPanel({ branchId }: BranchBriefingPanelProps) {
  const [briefing, setBriefing] = useState<BranchBriefing | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function fetchBriefing() {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/reception/branch-briefing?branchId=${branchId}`);
        if (response.ok && !cancelled) {
          const data = await response.json();
          setBriefing(data.briefing);
        }
      } catch {
        console.error('Failed to fetch branch briefing');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    fetchBriefing();
    return () => { cancelled = true; };
  }, [branchId]);

  if (isLoading) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-4 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/3 mb-3" />
        <div className="grid grid-cols-3 gap-4">
          <div className="h-20 bg-gray-100 rounded-lg" />
          <div className="h-20 bg-gray-100 rounded-lg" />
          <div className="h-20 bg-gray-100 rounded-lg" />
        </div>
      </div>
    );
  }

  if (!briefing) return null;

  const fmt = (n: number) => n.toLocaleString();

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-purple-600" />
          <h3 className="text-sm font-semibold text-gray-900">
            {briefing.branchName} — Today&apos;s Briefing
          </h3>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-gray-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-400" />
        )}
      </button>

      {isExpanded && (
        <div className="p-4 space-y-4">
          {/* 3-column summary */}
          <div className="grid grid-cols-3 gap-4">
            {/* Transactions */}
            <div className="bg-green-50 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <ArrowLeftRight className="w-4 h-4 text-green-600" />
                <span className="text-xs font-medium text-green-700 uppercase">Transactions</span>
              </div>
              <p className="text-xl font-bold text-green-900">{fmt(briefing.todaySummary.transactionTotal)}</p>
              <p className="text-xs text-green-600">{briefing.todaySummary.transactionCount} today</p>
            </div>

            {/* Expenses */}
            <div className="bg-red-50 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <Wallet className="w-4 h-4 text-red-600" />
                <span className="text-xs font-medium text-red-700 uppercase">Expenses</span>
              </div>
              <p className="text-xl font-bold text-red-900">{fmt(briefing.todaySummary.expenseTotal)}</p>
              <p className="text-xs text-red-600">{briefing.todaySummary.expenseCount} today</p>
            </div>

            {/* Active Operators */}
            <div className="bg-purple-50 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <Users className="w-4 h-4 text-purple-600" />
                <span className="text-xs font-medium text-purple-700 uppercase">Operators</span>
              </div>
              <p className="text-xl font-bold text-purple-900">{briefing.activeOperators.length}</p>
              <p className="text-xs text-purple-600">
                {briefing.activeOperators.filter(o => o.isCrossBranch).length} cross-branch
              </p>
            </div>
          </div>

          {/* Settings overview */}
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <Wrench className="w-3.5 h-3.5 text-gray-400" />
            <span>{briefing.branchSettings.serviceTypeCount} services</span>
            <span className="text-gray-300">|</span>
            <span>{briefing.branchSettings.expenseTypeCount} expense types</span>
            <span className="text-gray-300">|</span>
            <span>{briefing.branchSettings.paymentMethodCount} payment methods</span>
          </div>

          {/* Recent Activity */}
          {briefing.recentActivity.length > 0 && (
            <div>
              <h4 className="text-xs font-medium text-gray-500 uppercase mb-2">Recent Activity</h4>
              <div className="space-y-1">
                {briefing.recentActivity.map((item) => (
                  <div key={item.id} className="flex items-center justify-between text-sm py-1">
                    <div className="flex items-center gap-2">
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        item.type === 'transaction' ? 'bg-green-500' : 'bg-red-500'
                      }`} />
                      <span className="text-gray-700 truncate max-w-[200px]">{item.description}</span>
                    </div>
                    <span className={`font-medium ${item.amount >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                      {item.amount >= 0 ? '+' : ''}{fmt(item.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
