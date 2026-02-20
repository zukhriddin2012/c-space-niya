'use client';

interface DataPoint {
  date: string;
  score: number;
}

interface ScoreTrendProps {
  trend: {
    scoreDelta: number;
    usersDelta: number;
    actionsDeltaPct: number;
  };
  breadth: number;
  depth: number;
  frequency: number;
  dataPoints?: DataPoint[];
}

export function ScoreTrend({ trend, breadth, depth, frequency, dataPoints }: ScoreTrendProps) {
  const hasData = dataPoints && dataPoints.length >= 2;

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2">
            <path d="M3 3v18h18" /><path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3" />
          </svg>
          <span className="text-base font-semibold text-gray-900">Score Trend</span>
        </div>
      </div>
      <div className="p-5">
        <div className="w-full">
          <svg viewBox="0 0 600 100" preserveAspectRatio="none" className="w-full h-24">
            <line x1="0" y1="25" x2="600" y2="25" stroke="#f3f4f6" strokeWidth="1" />
            <line x1="0" y1="50" x2="600" y2="50" stroke="#f3f4f6" strokeWidth="1" />
            <line x1="0" y1="75" x2="600" y2="75" stroke="#f3f4f6" strokeWidth="1" />
            <defs>
              <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.15" />
                <stop offset="100%" stopColor="#7c3aed" stopOpacity="0.01" />
              </linearGradient>
            </defs>

            {hasData ? (
              <RealTrendLine dataPoints={dataPoints} />
            ) : (
              <>
                <path d="M0,60 L100,55 L200,50 L300,45 L400,40 L500,35 L600,30 L600,100 L0,100 Z" fill="url(#areaGrad)" />
                <polyline points="0,60 100,55 200,50 300,45 400,40 500,35 600,30"
                  fill="none" stroke="#7c3aed" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="600" cy="30" r="4" fill="#7c3aed" stroke="#7c3aed" strokeWidth="2" />
              </>
            )}
          </svg>
          <div className="flex justify-between px-0 text-xs text-gray-400 mt-1">
            <span>{hasData ? formatDateLabel(dataPoints[0].date) : '7 days ago'}</span>
            <span className="text-purple-600 font-semibold">Today</span>
          </div>
        </div>

        {/* Dimension summary */}
        <div className="flex gap-5 mt-4 pt-4 border-t border-gray-100">
          <TrendDimension label="Breadth" value={breadth} color="text-purple-600" delta={trend.usersDelta > 0 ? `+${trend.usersDelta}` : `${trend.usersDelta}`} up={trend.usersDelta >= 0} />
          <TrendDimension label="Depth" value={depth} color="text-blue-600" delta="" up={true} />
          <TrendDimension label="Frequency" value={frequency} color="text-green-600"
            delta={trend.actionsDeltaPct !== 0 ? `${trend.actionsDeltaPct > 0 ? '+' : ''}${trend.actionsDeltaPct}%` : ''} up={trend.actionsDeltaPct >= 0} />
        </div>
      </div>
    </div>
  );
}

// ── Real trend line from snapshot data points ──

function RealTrendLine({ dataPoints }: { dataPoints: DataPoint[] }) {
  const svgW = 600;
  const svgH = 100;
  const pad = 5;

  const points = dataPoints.map((p, i) => {
    const x = dataPoints.length === 1 ? svgW / 2 : (i / (dataPoints.length - 1)) * svgW;
    const y = svgH - pad - ((p.score / 100) * (svgH - pad * 2));
    return { x, y };
  });

  const polylineStr = points.map(p => `${p.x},${p.y}`).join(' ');
  const last = points[points.length - 1];

  // Area fill: polyline path closed to bottom-right and bottom-left
  const areaPath =
    `M${points[0].x},${points[0].y} ` +
    points.slice(1).map(p => `L${p.x},${p.y}`).join(' ') +
    ` L${svgW},${svgH} L0,${svgH} Z`;

  return (
    <>
      <path d={areaPath} fill="url(#areaGrad)" />
      <polyline
        points={polylineStr}
        fill="none"
        stroke="#7c3aed"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={last.x} cy={last.y} r="4" fill="#7c3aed" />
    </>
  );
}

function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ── Dimension summary card ──

function TrendDimension({ label, value, color, delta, up }: {
  label: string; value: number; color: string; delta: string; up: boolean;
}) {
  return (
    <div className="flex-1 text-center">
      <div className="text-[11px] text-gray-400 mb-1">{label}</div>
      <div className={`text-lg font-semibold ${color}`}>{value}</div>
      {delta && (
        <div className={`text-xs mt-0.5 ${up ? 'text-green-600' : 'text-red-600'}`}>
          {delta}
        </div>
      )}
    </div>
  );
}
