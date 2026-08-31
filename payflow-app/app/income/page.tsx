'use client';

import { useEffect, useState } from 'react';
import BottomNav from '@/components/layout/BottomNav';
import Header from '@/components/layout/Header';
import { MonthlyIncome } from '@/lib/types';

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
  const [month, setMonth]       = useState(getCurrentMonth);
  const [amount, setAmount]     = useState('');
  const [source, setSource]     = useState('Salary');
  const [notes, setNotes]       = useState('');
  const [incomeList, setIncomeList] = useState<MonthlyIncome[]>([]);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');
  const [success, setSuccess]   = useState('');

  async function loadIncome() {
    const res = await fetch(`/api/income?month=${month}`);
    if (res.ok) { const { data } = await res.json(); setIncomeList(data || []); }
  }

  useEffect(() => { loadIncome(); }, [month]);

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
      await loadIncome();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    await fetch(`/api/income?id=${id}`, { method: 'DELETE' });
    await loadIncome();
  }

  const totalIncome = incomeList.reduce((s, i) => s + i.amount, 0);

  return (
    <div className="app-container">
      <Header title="Income" showBack />

      <main className="page-content">
        {/* Month selector */}
        <div className="input-group" style={{ marginBottom: 'var(--space-md)' }}>
          <label className="input-label">Month</label>
          <input
            id="income-month"
            className="input-field"
            type="month"
            value={month}
            onChange={e => setMonth(e.target.value)}
          />
        </div>

        {/* Current month summary */}
        {incomeList.length > 0 && (
          <div className="hero-card" style={{ marginBottom: 'var(--space-md)' }}>
            <div className="hero-card-label">Total Income — {monthToLabel(month)}</div>
            <div className="hero-card-value">{formatINR(totalIncome)}</div>
            <div className="hero-card-sub">{incomeList.length} source{incomeList.length !== 1 ? 's' : ''}</div>
          </div>
        )}

        {/* Existing income entries */}
        {incomeList.map(inc => (
          <div key={inc.id} className="glass-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-sm)' }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16 }}>💰 {formatINR(inc.amount)}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{inc.source}{inc.notes ? ` · ${inc.notes}` : ''}</div>
            </div>
            <button
              className="btn btn-danger btn-sm"
              onClick={() => handleDelete(inc.id)}
            >
              🗑
            </button>
          </div>
        ))}

        <div className="divider" />
        <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 'var(--space-md)' }}>
          Add Income Source
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
            <input id="income-notes" className="input-field" type="text" placeholder="E.g. August salary" value={notes} onChange={e => setNotes(e.target.value)} />
          </div>

          {error   && <div className="alert-banner danger"><span>⚠️</span><span>{error}</span></div>}
          {success && <div className="alert-banner info"><span>✓</span><span>{success}</span></div>}

          <button id="save-income-btn" type="submit" className="btn btn-primary btn-full btn-lg" disabled={saving || !amount}>
            {saving ? 'Saving…' : 'Save Income'}
          </button>
        </form>
      </main>

      <BottomNav />
    </div>
  );
}
