'use client';

import { useEffect, useState, useCallback } from 'react';
import BottomNav from '@/components/layout/BottomNav';
import Header from '@/components/layout/Header';
import DonutChart from '@/components/charts/DonutChart';
import MonthPicker from '@/components/ui/MonthPicker';
import { InsightsData } from '@/lib/types';
import { BarChart2, AlertCircle, AlertTriangle, Info, ArrowUp, ArrowDown, ArrowRight } from 'lucide-react';

function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function formatINR(amount: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
}

function SavingsRing({ rate }: { rate: number }) {
  const clampedRate = Math.max(0, Math.min(100, rate));
  const r = 40;
  const circumference = 2 * Math.PI * r;
  const fill = (clampedRate / 100) * circumference;
  const color = rate < 0 ? 'var(--color-danger)' : rate < 15 ? 'var(--color-warning)' : 'var(--color-success)';

  return (
    <div style={{ position: 'relative', width: 100, height: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width={100} height={100} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={50} cy={50} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={10} />
        <circle
          cx={50} cy={50} r={r} fill="none" stroke={color} strokeWidth={10}
          strokeDasharray={`${fill} ${circumference}`}
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 0.8s cubic-bezier(0.16,1,0.3,1)' }}
        />
      </svg>
      <div style={{ position: 'absolute', textAlign: 'center' }}>
        <div style={{ fontSize: 18, fontWeight: 900, color, letterSpacing: '-0.5px' }}>{Math.floor(rate)}%</div>
        <div style={{ fontSize: 10, color: 'var(--ink-4)', fontWeight: 600 }}>SAVED</div>
      </div>
    </div>
  );
}

export default function InsightsPage() {
  const [month, setMonth]         = useState(getCurrentMonth);
  const [insights, setInsights]   = useState<InsightsData | null>(null);
  const [loading, setLoading]     = useState(true);

  const loadInsights = useCallback(async () => {
    setLoading(true);
    try {
      // cache: 'no-store' — prevents Vercel from serving stale cached insights
      const res = await fetch(`/api/insights?month=${month}`, { cache: 'no-store' });
      if (res.ok) {
        const { data } = await res.json();
        setInsights(data);
      }
    } finally {
      setLoading(false);
    }
  }, [month]);

  useEffect(() => { loadInsights(); }, [loadInsights]);

  // Auto-refresh when tab becomes visible (e.g. after adding an expense)
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') loadInsights();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [loadInsights]);


  const summary    = insights?.summary;
  const breakdown  = insights?.category_breakdown || [];
  const mom        = insights?.month_over_month    || [];
  const alerts     = insights?.alerts              || [];

  return (
    <div className="app-container">
      <Header title="Insights" />

      <main className="page-content">
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 'var(--space-md)' }}>
          <MonthPicker value={month} onChange={setMonth} />
        </div>

        {loading ? (
          <div className="loading-container" style={{ minHeight: '60vh' }}>
            <div className="loading-spinner" />
            <span>Crunching numbers…</span>
          </div>
        ) : !summary || summary.transaction_count === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">
              <BarChart2 size={24} strokeWidth={1.5} />
            </div>
            <div className="empty-state-title">No data for this month</div>
            <div className="empty-state-desc">Add some expenses to see your spending insights.</div>
          </div>
        ) : (
          <>
            {/* Alerts */}
            {alerts.map((a, i) => (
              <div key={i} className={`alert-banner ${a.severity}`}>
                <span>
                  {a.severity === 'danger' ? <AlertCircle size={16} /> : 
                   a.severity === 'warning' ? <AlertTriangle size={16} /> : 
                   <Info size={16} />}
                </span>
                <span>{a.message}</span>
              </div>
            ))}

            {/* Summary + savings ring */}
            <div className="glass-card" style={{ marginBottom: 'var(--space-md)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-lg)' }}>
                <SavingsRing rate={summary.savings_rate} />
                <div style={{ flex: 1 }}>
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 2 }}>INCOME</div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--color-success)' }}>{formatINR(summary.total_income)}</div>
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 2 }}>SPENT</div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--color-danger)' }}>{formatINR(summary.total_expenses)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 2 }}>REMAINING</div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: summary.remaining >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>
                      {formatINR(summary.remaining)}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Category Breakdown */}
            {breakdown.length > 0 && (
              <>
                <div className="section-header">
                  <span className="section-title">Category Breakdown</span>
                </div>
                <div className="glass-card" style={{ marginBottom: 'var(--space-md)' }}>
                  <div style={{ display: 'flex', gap: 'var(--space-lg)', alignItems: 'flex-start' }}>
                    <DonutChart
                      data={breakdown}
                      size={120}
                      centerValue={`${breakdown.length}`}
                      centerLabel="categories"
                    />
                    <div style={{ flex: 1 }}>
                      {breakdown.map((cat) => (
                        <div key={cat.category_id} className="bar-chart-row">
                          <span style={{ fontSize: 14, minWidth: 24 }}>{cat.category_icon}</span>
                          <span className="bar-chart-label">{cat.category_name}</span>
                          <div className="bar-track">
                            <div className="bar-fill" style={{ width: `${cat.percentage}%`, background: cat.category_color }} />
                          </div>
                          <span className="bar-chart-value">{cat.percentage}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Detailed list */}
                {breakdown.map((cat) => (
                  <div key={cat.category_id} className="glass-card" style={{ marginBottom: 4, padding: '12px var(--space-md)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 38, height: 38, borderRadius: 'var(--radius-md)', background: `${cat.category_color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
                        {cat.category_icon}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600 }}>{cat.category_name}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{cat.transaction_count} transaction{cat.transaction_count !== 1 ? 's' : ''}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 800, fontSize: 16 }}>{formatINR(cat.total)}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{cat.percentage}%</div>
                      </div>
                    </div>
                  </div>
                ))}
              </>
            )}

            {/* Month-over-Month */}
            {mom.length > 0 && (
              <>
                <div className="section-header" style={{ marginTop: 'var(--space-xl)' }}>
                  <span className="section-title">Month-over-Month</span>
                </div>
                {mom.map((item, i) => (
                  <div key={item.category_id} className="mom-item" style={{ animationDelay: `${i * 0.04}s` }}>
                    <div style={{ fontSize: 20 }}>{item.category_icon}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{item.category_name}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        {formatINR(item.current_month_total)}
                        {item.previous_month_total > 0 && ` vs ${formatINR(item.previous_month_total)}`}
                      </div>
                    </div>
                    <div className={`mom-change-badge ${item.change_direction}`}>
                      {item.change_direction === 'new' ? 'New' :
                       item.change_direction === 'up' ? `↑ ${item.change_percentage?.toFixed(0)}%` :
                       item.change_direction === 'down' ? `↓ ${Math.abs(item.change_percentage || 0).toFixed(0)}%` :
                       '→ Same'}
                    </div>
                  </div>
                ))}
              </>
            )}
          </>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
