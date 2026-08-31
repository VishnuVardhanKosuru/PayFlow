'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import BottomNav from '@/components/layout/BottomNav';
import Header from '@/components/layout/Header';
import TransactionItem from '@/components/transactions/TransactionItem';
import MonthPicker from '@/components/ui/MonthPicker';
import { Transaction, Category, Trip } from '@/lib/types';

function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function formatINR(amount: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
}

function EditModal({ transaction, categories, trips, onSave, onDelete, onClose }: {
  transaction: Transaction;
  categories: Category[];
  trips: Trip[];
  onSave: (id: string, data: Partial<Transaction>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onClose: () => void;
}) {
  const [amount, setAmount] = useState(String(transaction.amount));
  const [description, setDescription] = useState(transaction.description || '');
  const [categoryId, setCategoryId] = useState(transaction.category_id || '');
  const [tripId, setTripId] = useState(transaction.trip_id || '');
  const [occurredAt, setOccurredAt] = useState(transaction.occurred_at.slice(0, 16));
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState(false);

  async function handleSave() {
    setSaving(true);
    await onSave(transaction.id, {
      amount: parseFloat(amount),
      description: description || null,
      category_id: categoryId || null,
      trip_id: tripId || null,
      occurred_at: new Date(occurredAt).toISOString(),
    } as Partial<Transaction>);
    setSaving(false);
    onClose();
  }

  async function handleDelete() {
    if (!confirm) { setConfirm(true); return; }
    setSaving(true);
    await onDelete(transaction.id);
    setSaving(false);
    onClose();
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="bottom-sheet" onClick={e => e.stopPropagation()}>
        <div className="sheet-handle" />
        <h2 style={{ fontSize: 17, fontWeight: 700, marginBottom: 'var(--space-lg)' }}>Edit Transaction</h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          <div className="input-group">
            <label className="input-label">Amount (₹)</label>
            <input className="input-field" type="number" value={amount} onChange={e => setAmount(e.target.value)} min="0.01" step="0.01" />
          </div>

          <div className="input-group">
            <label className="input-label">Description</label>
            <input className="input-field" type="text" value={description} onChange={e => setDescription(e.target.value)} placeholder="What was this for?" />
          </div>

          <div className="input-group">
            <label className="input-label">Category</label>
            <select className="input-field" value={categoryId} onChange={e => setCategoryId(e.target.value)}>
              <option value="">No category</option>
              {categories.filter(c => c.type === transaction.type).map(c => (
                <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
              ))}
            </select>
          </div>

          {transaction.type === 'expense' && (
            <div className="input-group">
              <label className="input-label">Trip / Event</label>
              <select className="input-field" value={tripId} onChange={e => setTripId(e.target.value)}>
                <option value="">No trip</option>
                {trips.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
          )}

          <div className="input-group">
            <label className="input-label">Date & Time</label>
            <input className="input-field" type="datetime-local" value={occurredAt} onChange={e => setOccurredAt(e.target.value)} />
          </div>

          <button id="save-edit-btn" className="btn btn-primary btn-full" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save Changes'}
          </button>

          <button
            id="delete-txn-btn"
            className={`btn btn-full ${confirm ? 'btn-danger' : 'btn-ghost'}`}
            onClick={handleDelete}
            disabled={saving}
          >
            {confirm ? '⚠️ Confirm Delete' : '🗑 Delete Transaction'}
          </button>
        </div>
      </div>
    </div>
  );
}

function TransactionsContent() {
  const searchParams = useSearchParams();
  const [month, setMonth]               = useState(getCurrentMonth);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories]     = useState<Category[]>([]);
  const [trips, setTrips]               = useState<Trip[]>([]);
  const [search, setSearch]             = useState('');
  const [typeFilter, setTypeFilter]     = useState<'all' | 'income' | 'expense'>('all');
  const [loading, setLoading]           = useState(true);
  const [editingTx, setEditingTx]       = useState<Transaction | null>(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ month, limit: '100' });
    if (typeFilter !== 'all') params.set('type', typeFilter);
    if (search) params.set('search', search);

    const [txRes, catRes, tripRes] = await Promise.all([
      fetch(`/api/transactions?${params}`),
      fetch('/api/categories'),
      fetch('/api/trips'),
    ]);

    if (txRes.ok)   { const { data } = await txRes.json();   setTransactions(data || []); }
    if (catRes.ok)  { const { data } = await catRes.json();  setCategories(data || []); }
    if (tripRes.ok) { const { data } = await tripRes.json(); setTrips(data || []); }

    setLoading(false);
  }, [month, typeFilter, search]);

  useEffect(() => { loadAll(); }, [loadAll]);

  // If edit param in URL, open edit modal
  useEffect(() => {
    const editId = searchParams.get('edit');
    if (editId && transactions.length > 0) {
      const tx = transactions.find(t => t.id === editId);
      if (tx) setEditingTx(tx);
    }
  }, [searchParams, transactions]);

  async function handleSave(id: string, data: Partial<Transaction>) {
    await fetch(`/api/transactions/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    await loadAll();
  }

  async function handleDelete(id: string) {
    await fetch(`/api/transactions/${id}`, { method: 'DELETE' });
    setTransactions(prev => prev.filter(t => t.id !== id));
  }

  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const totalIncome  = transactions.filter(t => t.type === 'income' ).reduce((s, t) => s + t.amount, 0);

  return (
    <div className="app-container">
      <Header title="Transactions" />

      <main className="page-content">
        <MonthPicker value={month} onChange={setMonth} />

        {/* Summary strip */}
        <div style={{ display: 'flex', gap: 'var(--space-sm)', marginBottom: 'var(--space-md)', marginTop: 'var(--space-sm)' }}>
          <div className="glass-card" style={{ flex: 1, padding: '10px 14px' }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>INCOME</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-success)' }}>{formatINR(totalIncome)}</div>
          </div>
          <div className="glass-card" style={{ flex: 1, padding: '10px 14px' }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>SPENT</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-danger)' }}>{formatINR(totalExpense)}</div>
          </div>
          <div className="glass-card" style={{ flex: 1, padding: '10px 14px' }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>COUNT</div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>{transactions.length}</div>
          </div>
        </div>

        {/* Search */}
        <div className="search-bar">
          <span className="search-icon">🔍</span>
          <input
            id="txn-search"
            className="search-input"
            type="search"
            placeholder="Search transactions…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button onClick={() => setSearch('')} style={{ color: 'var(--text-muted)', fontSize: 18 }}>✕</button>
          )}
        </div>

        {/* Filter tabs */}
        <div className="tab-group">
          {(['all', 'expense', 'income'] as const).map(t => (
            <button
              key={t}
              className={`tab-option ${typeFilter === t ? 'active' : ''}`}
              onClick={() => setTypeFilter(t)}
            >
              {t === 'all' ? 'All' : t === 'expense' ? '💸 Expenses' : '💰 Income'}
            </button>
          ))}
        </div>

        {/* List */}
        {loading ? (
          <div className="loading-container"><div className="loading-spinner" /></div>
        ) : transactions.length > 0 ? (
          <div className="transaction-list">
            {transactions.map((tx, i) => (
              <div key={tx.id} style={{ animationDelay: `${i * 0.03}s` }}>
                <TransactionItem transaction={tx} onClick={() => setEditingTx(tx)} />
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-state-icon">🧾</div>
            <div className="empty-state-title">No transactions</div>
            <div className="empty-state-desc">{search ? 'Try a different search term.' : 'No transactions found for this period.'}</div>
          </div>
        )}
      </main>

      {editingTx && (
        <EditModal
          transaction={editingTx}
          categories={categories}
          trips={trips}
          onSave={handleSave}
          onDelete={handleDelete}
          onClose={() => setEditingTx(null)}
        />
      )}

      <BottomNav />
    </div>
  );
}

export default function TransactionsPage() {
  return (
    <Suspense fallback={<div className="loading-container" style={{minHeight:'100vh'}}><div className="loading-spinner" /></div>}>
      <TransactionsContent />
    </Suspense>
  );
}
