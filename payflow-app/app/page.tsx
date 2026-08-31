'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import BottomNav from '@/components/layout/BottomNav';
import MonthPicker from '@/components/ui/MonthPicker';
import DonutChart from '@/components/charts/DonutChart';
import TransactionItem from '@/components/transactions/TransactionItem';
import { MonthlySummary, CategoryBreakdown, Transaction } from '@/lib/types';
import { createClient } from '@/lib/supabase/client';

function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function DashboardPage() {
  const [month, setMonth]                     = useState(getCurrentMonth);
  const [summary, setSummary]                 = useState<MonthlySummary | null>(null);
  const [breakdown, setBreakdown]             = useState<CategoryBreakdown[]>([]);
  const [recentTxns, setRecentTxns]           = useState<Transaction[]>([]);
  const [loading, setLoading]                 = useState(true);
  const [displayName, setDisplayName]         = useState<string>('');

  const supabase = createClient();

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [summaryRes, insightsRes, txnsRes, profileRes] = await Promise.all([
        fetch(`/api/summary?month=${month}`),
        fetch(`/api/insights?month=${month}`),
        fetch(`/api/transactions?month=${month}&limit=5`),
        supabase.from('profiles').select('display_name').single(),
      ]);

      if (summaryRes.ok) {
        const { data } = await summaryRes.json();
        setSummary(data);
      }
      if (insightsRes.ok) {
        const { data } = await insightsRes.json();
        setBreakdown(data.category_breakdown || []);
      }
      if (txnsRes.ok) {
        const { data } = await txnsRes.json();
        setRecentTxns(data || []);
      }
      if (!profileRes.error && profileRes.data) {
        setDisplayName(profileRes.data.display_name || '');
      }
    } finally {
      setLoading(false);
    }
  }, [month]);

  useEffect(() => { loadData(); }, [loadData]);

  return (
    <div className="app-container">
      {/* Header */}
      <header className="app-header">
        <div>
          <span className="header-logo">PayFlow</span>
        </div>
        <MonthPicker value={month} onChange={setMonth} />
        <div style={{ width: 70, textAlign: 'right' }}>
          {displayName && (
            <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 600 }}>
              Hi, {displayName.split(' ')[0]} 👋
            </span>
          )}
        </div>
      </header>

      <main className="page-content">
        {loading ? (
          <div className="loading-container" style={{ minHeight: '60vh' }}>
            <div className="loading-spinner" />
            <span>Loading your finances…</span>
          </div>
        ) : (
          <>
            {/* Hero — Remaining Balance */}
            <div className="hero-card">
              <div className="hero-card-label">Remaining Balance</div>
              <div className="hero-card-value">
                {summary ? formatINR(summary.remaining) : '₹0'}
              </div>
              <div className="hero-card-sub">
                {summary && summary.total_income > 0
                  ? `${summary.savings_rate.toFixed(1)}% savings rate · ${summary.transaction_count} transactions`
                  : 'No income recorded this month'}
              </div>
            </div>

            {/* Summary Cards */}
            <div className="summary-grid">
              <div className="summary-card">
                <div className="summary-card-icon">💰</div>
                <div className="summary-card-label">Income</div>
                <div className="summary-card-value" style={{ color: 'var(--color-success)' }}>
                  {summary ? formatINR(summary.total_income) : '₹0'}
                </div>
              </div>

              <div className="summary-card">
                <div className="summary-card-icon">💸</div>
                <div className="summary-card-label">Spent</div>
                <div className="summary-card-value" style={{ color: 'var(--color-danger)' }}>
                  {summary ? formatINR(summary.total_expenses) : '₹0'}
                </div>
              </div>

              <div className="summary-card summary-card-wide">
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-lg)' }}>
                  <DonutChart
                    data={breakdown}
                    size={110}
                    centerValue={summary ? `${summary.savings_rate.toFixed(0)}%` : '—'}
                    centerLabel="saved"
                  />
                  <div style={{ flex: 1 }}>
                    <div className="summary-card-label" style={{ marginBottom: 12 }}>Top Categories</div>
                    {breakdown.slice(0, 4).map(cat => (
                      <div key={cat.category_id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                        <span style={{ fontSize: 14 }}>{cat.category_icon}</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>
                            {cat.category_name}
                          </div>
                          <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 99, marginTop: 3, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${cat.percentage}%`, background: cat.category_color, borderRadius: 99, transition: 'width 0.8s cubic-bezier(0.16,1,0.3,1)' }} />
                          </div>
                        </div>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, minWidth: 36, textAlign: 'right' }}>
                          {cat.percentage}%
                        </span>
                      </div>
                    ))}
                    {breakdown.length === 0 && (
                      <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>No expenses yet</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="section-header" style={{ marginTop: 'var(--space-lg)' }}>
              <span className="section-title">Quick Actions</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-sm)' }}>
              <Link href="/add" className="glass-card-interactive" style={{ textAlign: 'center', padding: '16px 8px', textDecoration: 'none' }}>
                <div style={{ fontSize: 24, marginBottom: 6 }}>➕</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Add Expense</div>
              </Link>
              <Link href="/income" className="glass-card-interactive" style={{ textAlign: 'center', padding: '16px 8px', textDecoration: 'none' }}>
                <div style={{ fontSize: 24, marginBottom: 6 }}>💰</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Add Income</div>
              </Link>
              <Link href="/insights" className="glass-card-interactive" style={{ textAlign: 'center', padding: '16px 8px', textDecoration: 'none' }}>
                <div style={{ fontSize: 24, marginBottom: 6 }}>📊</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Insights</div>
              </Link>
            </div>

            {/* Recent Transactions */}
            <div className="section-header">
              <span className="section-title">Recent</span>
              <Link href="/transactions" className="section-action">See all →</Link>
            </div>

            {recentTxns.length > 0 ? (
              <div className="transaction-list">
                {recentTxns.map((tx, i) => (
                  <div key={tx.id} style={{ animationDelay: `${i * 0.05}s` }}>
                    <TransactionItem
                      transaction={tx}
                      onClick={() => window.location.href = `/transactions?edit=${tx.id}`}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-state-icon">🧾</div>
                <div className="empty-state-title">No transactions yet</div>
                <div className="empty-state-desc">Tap the + button to record your first expense.</div>
              </div>
            )}
          </>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
