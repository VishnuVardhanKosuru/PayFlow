'use client';

import { CategoryBreakdown } from '@/lib/types';

interface DonutChartProps {
  data: CategoryBreakdown[];
  size?: number;
  centerLabel?: string;
  centerValue?: string;
}

// Monochrome stepped palette — crisp black-to-light-gray segments
const MONO_PALETTE = [
  '#0a0a0a', '#2a2a2a', '#4a4a4a', '#6a6a6a', '#8a8a8a', '#b0b0b0',
];

export default function DonutChart({
  data,
  size = 160,
  centerLabel,
  centerValue,
}: DonutChartProps) {
  const radius      = 50;
  const circumference = 2 * Math.PI * radius;
  const strokeWidth = 12;
  const center      = size / 2;
  const gap         = 3; // gap between segments in px

  if (!data || data.length === 0) {
    return (
      <div className="donut-wrapper" style={{ width: size, height: size }}>
        <svg width={size} height={size}>
          <circle
            cx={center} cy={center} r={radius}
            fill="none" stroke="var(--bg-muted)" strokeWidth={strokeWidth}
          />
        </svg>
        <div className="donut-center" style={{ gap: 2 }}>
          {centerValue ? (
            <>
              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.5px' }}>
                {centerValue}
              </span>
              {centerLabel && (
                <span style={{ fontSize: 10, color: 'var(--ink-4)', textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  {centerLabel}
                </span>
              )}
            </>
          ) : (
            <span style={{ fontSize: 11, color: 'var(--ink-4)' }}>No data</span>
          )}
        </div>
      </div>
    );
  }

  let cumulativePercent = 0;
  const gapAngle = (gap / (2 * Math.PI * radius)) * 360;
  const segments = data.slice(0, 6).map((item, idx) => {
    const percent = item.percentage / 100;
    const arcLength = percent * circumference - (gap * 2);
    const strokeDasharray = `${Math.max(0, arcLength)} ${circumference}`;
    const rotation = cumulativePercent * 360 - 90 + gapAngle;
    cumulativePercent += percent;
    return { item, strokeDasharray, rotation, color: MONO_PALETTE[idx] || '#d0d0d0' };
  });

  return (
    <div className="donut-wrapper" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        {/* Track */}
        <circle
          cx={center} cy={center} r={radius}
          fill="none" stroke="var(--bg-muted)" strokeWidth={strokeWidth}
        />
        {/* Segments */}
        {segments.map(({ item, strokeDasharray, rotation, color }, idx) => (
          <circle
            key={item.category_id}
            cx={center} cy={center} r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={strokeDasharray}
            strokeDashoffset={0}
            strokeLinecap="butt"
            style={{
              transform: `rotate(${rotation}deg)`,
              transformOrigin: `${center}px ${center}px`,
              transition: `stroke-dasharray 0.7s cubic-bezier(0.16,1,0.3,1) ${idx * 0.05}s`,
            }}
          />
        ))}
      </svg>
      {(centerLabel || centerValue) && (
        <div className="donut-center" style={{ gap: 2 }}>
          {centerValue && (
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.5px' }}>
              {centerValue}
            </span>
          )}
          {centerLabel && (
            <span style={{ fontSize: 10, color: 'var(--ink-4)', textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {centerLabel}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
