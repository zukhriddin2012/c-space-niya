'use client';

import type { BreakdownItem, PaymentMethodBreakdown } from '@/modules/finance-dashboard/types';

const barColors = [
  'bg-purple-600', 'bg-blue-500', 'bg-green-500', 'bg-amber-500',
  'bg-pink-500', 'bg-gray-400', 'bg-red-500', 'bg-cyan-500', 'bg-orange-500',
];

const stackedColors = [
  { bg: 'bg-purple-600', text: 'text-purple-600', dot: 'bg-purple-600' },
  { bg: 'bg-blue-500', text: 'text-blue-500', dot: 'bg-blue-500' },
  { bg: 'bg-green-500', text: 'text-green-500', dot: 'bg-green-500' },
  { bg: 'bg-amber-500', text: 'text-amber-500', dot: 'bg-amber-500' },
  { bg: 'bg-pink-500', text: 'text-pink-500', dot: 'bg-pink-500' },
  { bg: 'bg-gray-400', text: 'text-gray-400', dot: 'bg-gray-400' },
];

function formatAmount(amount: number): string {
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(0)}K`;
  return amount.toLocaleString();
}

// Horizontal bar chart for breakdowns
function HorizontalBarChart({ items, title }: { items: BreakdownItem[]; title: string }) {
  const maxAmount = Math.max(...items.map(i => i.amount), 1);

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 lg:p-5">
      <h3 className="text-sm font-semibold text-gray-900 mb-4">{title}</h3>
      {items.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-4">No data</p>
      ) : (
        <div className="space-y-3">
          {items.map((item, idx) => (
            <div key={item.id} className="flex items-center gap-2.5">
              <div className="w-20 text-right text-xs text-gray-600 truncate flex-shrink-0">
                {item.icon && <span className="mr-1">{item.icon}</span>}
                {item.name}
              </div>
              <div className="flex-1 h-5 bg-gray-100 rounded overflow-hidden relative">
                <div
                  className={`h-full ${barColors[idx % barColors.length]} rounded transition-all duration-500 flex items-center px-2`}
                  style={{ width: `${Math.max((item.amount / maxAmount) * 100, 2)}%` }}
                >
                  {item.percentage >= 10 && (
                    <span className="text-[10px] font-semibold text-white whitespace-nowrap">
                      {item.percentage}%
                    </span>
                  )}
                </div>
              </div>
              <div className="w-16 text-right text-xs font-medium text-gray-700 flex-shrink-0">
                {formatAmount(item.amount)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Stacked bar chart for payment methods by branch
function PaymentMethodsChart({ data }: { data: PaymentMethodBreakdown[] }) {
  // Collect all unique method names
  const allMethods = Array.from(
    new Set(data.flatMap(b => b.methods.map(m => m.name)))
  );

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 lg:p-5">
      <h3 className="text-sm font-semibold text-gray-900 mb-4">Payment Methods by Branch</h3>
      {data.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-4">No data</p>
      ) : (
        <>
          <div className="space-y-3.5">
            {data.map((branch) => (
              <div key={branch.branchId}>
                <div className="text-xs text-gray-600 mb-1">{branch.branchName}</div>
                <div className="flex h-7 rounded-md overflow-hidden">
                  {branch.methods.map((method, idx) => (
                    <div
                      key={method.id}
                      className={`${stackedColors[idx % stackedColors.length].bg} flex items-center justify-center transition-all duration-300`}
                      style={{ width: `${method.percentage}%`, minWidth: method.percentage > 0 ? '24px' : '0' }}
                      title={`${method.name}: ${formatAmount(method.amount)} (${method.percentage}%)`}
                    >
                      {method.percentage >= 12 && (
                        <span className="text-[10px] font-semibold text-white whitespace-nowrap">
                          {method.percentage}%
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          {/* Legend */}
          <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-4">
            {allMethods.map((name, idx) => (
              <div key={name} className="flex items-center gap-1.5 text-xs text-gray-600">
                <div className={`w-2.5 h-2.5 rounded-sm ${stackedColors[idx % stackedColors.length].dot}`} />
                {name}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

interface BreakdownChartsProps {
  revenueByServiceType: BreakdownItem[];
  expensesByCategory: BreakdownItem[];
  revenueByPaymentMethod: BreakdownItem[];
  paymentMethodsByBranch: PaymentMethodBreakdown[];
}

export default function BreakdownCharts({
  revenueByServiceType,
  expensesByCategory,
  revenueByPaymentMethod,
  paymentMethodsByBranch,
}: BreakdownChartsProps) {
  return (
    <div>
      <h2 className="text-base lg:text-lg font-semibold text-gray-900 mb-4">Breakdowns</h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <HorizontalBarChart items={revenueByServiceType} title="Revenue by Service Type" />
        <HorizontalBarChart items={expensesByCategory} title="Expenses by Category" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <HorizontalBarChart items={revenueByPaymentMethod} title="Revenue by Payment Method" />
        <PaymentMethodsChart data={paymentMethodsByBranch} />
      </div>
    </div>
  );
}
