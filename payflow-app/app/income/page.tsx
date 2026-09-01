'use client';

import { useEffect, useState, useCallback } from 'react';
import BottomNav from '@/components/layout/BottomNav';
import Header from '@/components/layout/Header';
import { MonthlyIncome, MonthlySummary } from '@/lib/types';
import { Info, Calendar, Plus, Trash2, CheckCircle2, History } from 'lucide-react';

function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function monthToLabel(month: string): string {
  const [year, mon] = month.split('-');
  return new Date(parseInt(year), parseInt(mon) - 1, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

function formatINR(amount: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(amount);
}

export default function IncomePage() {
  const [month, setMonth]             = useState(getCurrentMonth);
  const [amount, setAmount]           = useState('');
  const [source, setSource]           = useState('Salary');
  const [notes, setNotes]             = useState('');
  const [incomeList, setIncomeList]   = useState<MonthlyIncome[]>([]);
  const [allIncome, setAllIncome]     = useState<MonthlyIncome[]>([]);
  const [viewMode, setViewMode]       = useState<'month' | 'all'>('month');
  const [summary, setSummary]         = useState<MonthlySummary | null>(null);
  const [saving, setSaving]           = useState(false);
  const [error, setError]             = useState('');
  const [success, setSuccess]         = useState('');

  const loadData = useCallback(async () => {
    const [monthRes, allRes, sumRes] = await Promise.all([
      fetch(`/api/income?month=${month}`, { cache: 'no-store' }),
      fetch('/api/income', { cache: 'no-store' }),
      fetch(`/api/summary?month=${month}`, { cache: 'no-store' }),
    ]);

    if (monthRes.ok) {
      const { data } = await monthRes.json();
      setIncomeList(data || []);
    }
    if (allRes.ok) {
      const { data } = await allRes.json();
      setAllIncome(data || []);
    }
    if (sumRes.ok) {
      const { data } = await sumRes.json();
      setSummary(data || null);
    }
  }, [month]);

  useEffect(() => { loadData(); }, [loadData]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (!parsedAmount || parsedAmount <= 0) { setError('Please enter a valid amount.'); return; }

    setSaving(true); setError(''); setSuccess('');
    try {
      const res = await fetch('/api/income', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month, amount: parsedAmount, source: source.trim() || 'Salary', notes: notes.trim() || null }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setSuccess(`✓ Income of ${formatINR(parsedAmount)} saved for ${monthToLabel(month)}`);
      setAmount(''); setNotes('');
      await loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    await fetch(`/api/income?id=${id}`, { method: 'DELETE' });
    await loadData();
  }

  const totalMonthIncome = incomeList.reduce((s, i) => s + i.amount, 0);
  const displayList = viewMode === 'month' ? incomeList : allIncome;

  return (
    <div className="app-container">
      <Header title="Income & Salary" showBack />

      <main className="page-content">
        {/* Month selector */}
        <div className="input-group" style={{ marginBottom: 'var(--space-md)' }}>
          <label className="input-label">Select Month</label>
          <input
            id="income-month"
            className="input-field"
            type="month"
            value={month}
            onChange={e => setMonth(e.target.value)}
          />
        </div>

        {/* Balance & Carryover Overview Hero Card */}
        <div className="hero-card" style={{ marginBottom: 'var(--space-md)' }}>
          <div className="hero-card-label">Total Available Funds — {monthToLabel(month)}</div>
          <div className="hero-card-value">
            {summary ? formatINR(summary.total_available) : formatINR(totalMonthIncome)}
          </div>
          <div className="hero-card-sub">
            {summary && summary.carried_over > 0 ? (
              `${formatINR(summary.carried_over)} carried over + ${formatINR(summary.total_income)} new income`
            ) : totalMonthIncome > 0 ? (
              `${incomeList.length} income source${incomeList.length !== 1 ? 's' : ''} in ${monthToLabel(month)}`
            ) : (
              'No new income added yet this month'
            )}
          </div>
        </div>

        {/* Helpful Rollover Info Tip */}
        <div className="glass-card" style={{ marginBottom: 'var(--space-md)', padding: '12px 14px', borderLeft: '3px solid var(--accent-start)' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <Info size={18} color="var(--accent-start)" style={{ flexShrink: 0, marginTop: 2 }} />
            <div style={{ fontSize: 12, lineHeight: 1.5, color: 'var(--text-secondary)' }}>
              <strong>Automatic Balance Carryover:</strong> Salaries credited on month-end (e.g. Aug 31) automatically roll over into your next month's available savings!
            </div>
          </div>
        </div>

        {/* View mode toggle */}
        <div className="tab-group" style={{ marginBottom: 'var(--space-md)' }}>
          <button
            type="button"
            className={`tab-option ${viewMode === 'month' ? 'active' : ''}`}
            onClick={() => setViewMode('month')}
          >
            <Calendar size={14} style={{ marginRight: 6 }} /> {monthToLabel(month)} ({incomeList.length})
          </button>
          <button
            type="button"
            className={`tab-option ${viewMode === 'all' ? 'active' : ''}`}
            onClick={() => setViewMode('all')}
          >
            <History size={14} style={{ marginRight: 6 }} /> All History ({allIncome.length})
          </button>
        </div>

        {/* Existing income entries */}
        {displayList.length > 0 ? (
          displayList.map(inc => (
            <div key={inc.id} className="glass-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-sm)' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 16 }}>💰 {formatINR(inc.amount)}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{monthToLabel(inc.month)}</span> · {inc.source}{inc.notes ? ` · ${inc.notes}` : ''}
                </div>
              </div>
              <button
                className="btn btn-danger btn-sm"
                onClick={() => handleDelete(inc.id)}
                title="Delete income"
                style={{ padding: '6px 10px' }}
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))
        ) : (
          <div className="empty-state" style={{ padding: '24px 16px', marginBottom: 'var(--space-md)' }}>
            <div className="empty-state-desc">No income entries found for this selection.</div>
          </div>
        )}

        <div className="divider" style={{ margin: 'var(--space-lg) 0' }} />

        <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 'var(--space-md)' }}>
          Add Income Source for {monthToLabel(month)}
        </h2>

        {/* Add form */}
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          <div className="amount-input-wrapper">
            <span className="amount-currency">₹</span>
            <input
              id="income-amount"
              className="amount-input"
              type="number"
              placeholder="0"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              min="1"
              step="1"
              inputMode="numeric"
            />
          </div>

          <div className="input-group">
            <label className="input-label">Source</label>
            <select id="income-source" className="input-field" value={source} onChange={e => setSource(e.target.value)}>
              <option>Salary</option>
              <option>Freelance</option>
              <option>Bonus</option>
              <option>Investment</option>
              <option>Gift</option>
              <option>Other</option>
            </select>
          </div>

          <div className="input-group">
            <label className="input-label" htmlFor="income-notes">Notes (optional)</label>
            <input id="income-notes" className="input-field" type="text" placeholder="E.g. August month-end salary" value={notes} onChange={e => setNotes(e.target.value)} />
          </div>

          {error   && <div className="alert-banner danger"><span>⚠️</span><span>{error}</span></div>}
          {success && <div className="alert-banner info"><span>✓</span><span>{success}</span></div>}

          <button id="save-income-btn" type="submit" className="btn btn-primary btn-full btn-lg" disabled={saving || !amount}>
            {saving ? 'Saving…' : `Save Income for ${monthToLabel(month)}`}
          </button>
        </form>
      </main>

      <BottomNav />
    </div>
  );
}
