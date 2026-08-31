'use client';

import { CategoryBreakdown } from '@/lib/types';

interface DonutChartProps {
  data: CategoryBreakdown[];
  size?: number;
  centerLabel?: string;
  centerValue?: string;
}

export default function DonutChart({
  data,
  size = 160,
  centerLabel,
  centerValue,
}: DonutChartProps) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const strokeWidth = 14;
  const center = size / 2;

  if (!data || data.length === 0) {
    return (
      <div className="donut-wrapper" style={{ width: size, height: size }}>
        <svg width={size} height={size}>
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth={strokeWidth}
          />
        </svg>
        <div className="donut-center" style={{ gap: 4 }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>No data</span>
        </div>
      </div>
    );
  }

  // Build segments
  let cumulativePercent = 0;
  const segments = data.slice(0, 6).map((item) => {
    const percent = item.percentage / 100;
    const strokeDasharray = `${percent * circumference} ${circumference}`;
    const rotation = cumulativePercent * 360 - 90;
    cumulativePercent += percent;
    return { item, strokeDasharray, rotation };
  });

  return (
    <div className="donut-wrapper" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        {/* Track */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.05)"
          strokeWidth={strokeWidth}
        />
        {/* Segments */}
        {segments.map(({ item, strokeDasharray, rotation }, idx) => (
          <circle
            key={item.category_id}
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={item.category_color}
            strokeWidth={strokeWidth}
            strokeDasharray={strokeDasharray}
            strokeDashoffset={0}
            strokeLinecap="butt"
            style={{
              transform: `rotate(${rotation}deg)`,
              transformOrigin: `${center}px ${center}px`,
              transition: `stroke-dasharray 0.8s cubic-bezier(0.16,1,0.3,1) ${idx * 0.05}s`,
            }}
          />
        ))}
      </svg>
      {(centerLabel || centerValue) && (
        <div className="donut-center" style={{ gap: 2 }}>
          {centerValue && (
            <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>
              {centerValue}
            </span>
          )}
          {centerLabel && (
            <span style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.2 }}>
              {centerLabel}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
