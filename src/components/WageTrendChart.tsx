'use client';

import { useState, useEffect, useRef } from 'react';
import { TrendingUp, TrendingDown, Minus, Activity, AlertTriangle, CheckCircle } from 'lucide-react';

interface SalaryHistoryRecord {
  year: number;
  month: number;
  total: number;
}

interface SalaryStats {
  current: number;
  highest: number;
  average: number;
  growth: number;
}

interface WageSource {
  source_type: 'primary' | 'additional';
  source_id: string;
  source_name: string;
  wage_amount: number;
}

interface ReconciliationData {
  configuredMonthly: number;
  lastPaidMonthly: number;
  difference: number;
  status: 'synced' | 'underpaid' | 'overpaid' | 'no_history';
  warnings: string[];
}

interface UnifiedWageData {
  currentWages: {
    primary: WageSource[];
    additional: WageSource[];
    primaryTotal: number;
    additionalTotal: number;
    grandTotal: number;
  };
  history: {
    months: SalaryHistoryRecord[];
    stats: SalaryStats;
  };
  reconciliation: ReconciliationData;
}

interface WageTrendChartProps {
  employeeId: string;
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatCompact(amount: number): string {
  if (amount >= 1000000) {
    return (amount / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  }
  if (amount >= 1000) {
    return (amount / 1000).toFixed(0) + 'K';
  }
  return amount.toString();
}

function formatCurrency(amount: number): string {
  if (!amount) return '-';
  return new Intl.NumberFormat('uz-UZ').format(amount) + ' UZS';
}

export default function WageTrendChart({ employeeId }: WageTrendChartProps) {
  const [data, setData] = useState<UnifiedWageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [hoveredPoint, setHoveredPoint] = useState<number | null>(null);
  const [showReconciliation, setShowReconciliation] = useState(false);
  const chartRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        // Try unified API first, fallback to salary-history
        const response = await fetch(`/api/employees/${employeeId}/unified-wages`);
        if (response.ok) {
          const unifiedData = await response.json();
          setData(unifiedData);
        } else {
          // Fallback to old API
          const fallbackResponse = await fetch(`/api/employees/${employeeId}/salary-history`);
          if (fallbackResponse.ok) {
            const oldData = await fallbackResponse.json();
            // Convert to unified format
            setData({
              currentWages: {
                primary: [],
                additional: [],
                primaryTotal: 0,
                additionalTotal: 0,
                grandTotal: 0,
              },
              history: {
                months: oldData.history || [],
                stats: oldData.stats || { current: 0, highest: 0, average: 0, growth: 0 },
              },
              reconciliation: {
                configuredMonthly: 0,
                lastPaidMonthly: 0,
                difference: 0,
                status: 'no_history',
                warnings: [],
              },
            });
          }
        }
      } catch (err) {
        console.error('Error fetching wage data:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [employeeId]);

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-40 bg-gray-100 rounded"></div>
        </div>
      </div>
    );
  }

  if (!data || data.history.months.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Activity size={20} className="text-purple-600" />
          <h3 className="text-lg font-semibold text-gray-900">Wage Trend</h3>
        </div>
        <div className="text-center py-8 text-gray-400">
          <Activity size={40} className="mx-auto mb-2 text-gray-300" />
          <p>No salary history available</p>
        </div>
      </div>
    );
  }

  const { history: { months: history, stats }, currentWages, reconciliation } = data;

  // Chart dimensions
  const width = 600;
  const height = 160;
  const padding = { top: 20, right: 20, bottom: 30, left: 10 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Calculate scales
  const values = history.map(h => h.total);
  const minValue = Math.min(...values) * 0.9;
  const maxValue = Math.max(...values) * 1.1;
  const valueRange = maxValue - minValue || 1;

  // Generate points
  const points = history.map((record, i) => {
    const x = padding.left + (i / (history.length - 1 || 1)) * chartWidth;
    const y = padding.top + chartHeight - ((record.total - minValue) / valueRange) * chartHeight;
    return { x, y, record };
  });

  // Generate path
  const linePath = points.map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`)).join(' ');

  // Generate gradient area path
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${height - padding.bottom} L ${points[0].x} ${height - padding.bottom} Z`;

  // Growth icon
  const GrowthIcon = stats.growth > 0 ? TrendingUp : stats.growth < 0 ? TrendingDown : Minus;
  const growthColor = stats.growth > 0 ? 'text-green-600' : stats.growth < 0 ? 'text-red-600' : 'text-gray-500';
  const growthBg = stats.growth > 0 ? 'bg-green-50' : stats.growth < 0 ? 'bg-red-50' : 'bg-gray-50';

  // Reconciliation status
  const hasWarnings = reconciliation.warnings.length > 0;
  const reconcileStatusColor = reconciliation.status === 'synced' ? 'text-green-600' :
                               reconciliation.status === 'no_history' ? 'text-gray-400' : 'text-amber-600';

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
      {/* Header with inline stats */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Activity size={20} className="text-purple-600" />
          <h3 className="text-lg font-semibold text-gray-900">Wage Trend</h3>
          <span className="text-sm text-gray-500">(Last 12 months)</span>
          {/* Reconciliation indicator */}
          {reconciliation.status !== 'no_history' && (
            <button
              onClick={() => setShowReconciliation(!showReconciliation)}
              className={`ml-2 p-1 rounded-full transition-colors ${hasWarnings ? 'bg-amber-50 hover:bg-amber-100' : 'bg-green-50 hover:bg-green-100'}`}
              title={hasWarnings ? 'Data reconciliation warnings' : 'Data synced'}
            >
              {hasWarnings ? (
                <AlertTriangle size={14} className="text-amber-500" />
              ) : (
                <CheckCircle size={14} className="text-green-500" />
              )}
            </button>
          )}
        </div>

        {/* Inline Stats */}
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Current</span>
            <span className="font-bold text-purple-700">{formatCompact(stats.current)}</span>
          </div>
          <div className="w-px h-4 bg-gray-200 hidden sm:block"></div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Highest</span>
            <span className="font-bold text-green-600">{formatCompact(stats.highest)}</span>
          </div>
          <div className="w-px h-4 bg-gray-200 hidden sm:block"></div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Avg</span>
            <span className="font-bold text-gray-700">{formatCompact(stats.average)}</span>
          </div>
          <div className="w-px h-4 bg-gray-200 hidden sm:block"></div>
          <div className={`flex items-center gap-1 px-2 py-1 rounded-full ${growthBg}`}>
            <GrowthIcon size={14} className={growthColor} />
            <span className={`font-bold text-sm ${growthColor}`}>
              {stats.growth > 0 ? '+' : ''}{stats.growth}%
            </span>
          </div>
        </div>
      </div>

      {/* Reconciliation details (collapsible) */}
      {showReconciliation && (
        <div className={`mb-4 p-4 rounded-lg ${hasWarnings ? 'bg-amber-50 border border-amber-200' : 'bg-green-50 border border-green-200'}`}>
          <div className="flex items-start justify-between mb-2">
            <h4 className={`text-sm font-semibold ${reconcileStatusColor}`}>
              Data Reconciliation
            </h4>
            <span className={`text-xs px-2 py-0.5 rounded-full ${
              reconciliation.status === 'synced' ? 'bg-green-100 text-green-700' :
              reconciliation.status === 'underpaid' ? 'bg-amber-100 text-amber-700' :
              reconciliation.status === 'overpaid' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
            }`}>
              {reconciliation.status === 'synced' ? 'Synced' :
               reconciliation.status === 'underpaid' ? 'Underpaid' :
               reconciliation.status === 'overpaid' ? 'Overpaid' : 'No History'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm mb-3">
            <div>
              <p className="text-gray-500 text-xs">Configured Monthly</p>
              <p className="font-semibold">{formatCurrency(reconciliation.configuredMonthly)}</p>
            </div>
            <div>
              <p className="text-gray-500 text-xs">Last Paid</p>
              <p className="font-semibold">{formatCurrency(reconciliation.lastPaidMonthly)}</p>
            </div>
          </div>

          {/* Current wage sources */}
          {(currentWages.primary.length > 0 || currentWages.additional.length > 0) && (
            <div className="border-t border-gray-200 pt-3 mt-3">
              <p className="text-xs text-gray-500 mb-2">Configured Wage Sources:</p>
              <div className="flex flex-wrap gap-2">
                {currentWages.primary.map((w, i) => (
                  <span key={i} className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
                    {w.source_name}: {formatCompact(w.wage_amount)}
                  </span>
                ))}
                {currentWages.additional.map((w, i) => (
                  <span key={i} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                    {w.source_name}: {formatCompact(w.wage_amount)}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Warnings */}
          {hasWarnings && (
            <div className="mt-3 border-t border-amber-200 pt-3">
              <p className="text-xs text-amber-700 font-medium mb-1">Warnings:</p>
              <ul className="text-xs text-amber-600 space-y-1">
                {reconciliation.warnings.map((warning, i) => (
                  <li key={i}>• {warning}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Chart */}
      <div className="relative">
        <svg
          ref={chartRef}
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto"
          style={{ maxHeight: '180px' }}
        >
          {/* Gradient definition */}
          <defs>
            <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#9333ea" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#9333ea" stopOpacity="0.02" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => (
            <line
              key={i}
              x1={padding.left}
              y1={padding.top + chartHeight * ratio}
              x2={width - padding.right}
              y2={padding.top + chartHeight * ratio}
              stroke="#f3f4f6"
              strokeWidth="1"
            />
          ))}

          {/* Area under the line */}
          <path d={areaPath} fill="url(#areaGradient)" />

          {/* Main line */}
          <path
            d={linePath}
            fill="none"
            stroke="#9333ea"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Data points */}
          {points.map((point, i) => (
            <g key={i}>
              {/* Outer circle (white border) */}
              <circle
                cx={point.x}
                cy={point.y}
                r={hoveredPoint === i ? 8 : 5}
                fill="white"
                stroke="#9333ea"
                strokeWidth="2"
                className="transition-all duration-150 cursor-pointer"
                onMouseEnter={() => setHoveredPoint(i)}
                onMouseLeave={() => setHoveredPoint(null)}
              />
              {/* Inner circle */}
              <circle
                cx={point.x}
                cy={point.y}
                r={hoveredPoint === i ? 4 : 2}
                fill="#9333ea"
                className="transition-all duration-150 pointer-events-none"
              />
            </g>
          ))}

          {/* X-axis labels */}
          {points.map((point, i) => (
            <text
              key={i}
              x={point.x}
              y={height - 8}
              textAnchor="middle"
              className="text-[10px] fill-gray-400"
            >
              {MONTH_NAMES[point.record.month - 1]}
            </text>
          ))}

          {/* Tooltip */}
          {hoveredPoint !== null && (
            <g>
              <rect
                x={points[hoveredPoint].x - 45}
                y={points[hoveredPoint].y - 45}
                width="90"
                height="32"
                rx="6"
                fill="#1f2937"
                className="drop-shadow-lg"
              />
              <text
                x={points[hoveredPoint].x}
                y={points[hoveredPoint].y - 32}
                textAnchor="middle"
                className="text-[10px] fill-gray-300"
              >
                {MONTH_NAMES[history[hoveredPoint].month - 1]} {history[hoveredPoint].year}
              </text>
              <text
                x={points[hoveredPoint].x}
                y={points[hoveredPoint].y - 20}
                textAnchor="middle"
                className="text-[11px] fill-white font-semibold"
              >
                {formatCompact(history[hoveredPoint].total)} UZS
              </text>
            </g>
          )}
        </svg>
      </div>
    </div>
  );
}
