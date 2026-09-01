'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import BottomNav from '@/components/layout/BottomNav';
import Header from '@/components/layout/Header';
import { Category, Trip } from '@/lib/types';
import { TrendingDown, TrendingUp, Sparkles, Check, Plus, Tag, FileText, Calendar, MapPin } from 'lucide-react';

function getCurrentDate(): string {
  const now = new Date();
  // Offset to IST
  const ist = new Date(now.getTime() + (5.5 * 60 * 60 * 1000));
  return ist.toISOString().slice(0, 16);
}

export default function AddExpensePage() {
  const router = useRouter();
  const [type, setType]               = useState<'expense' | 'income'>('expense');
  const [amount, setAmount]           = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId]   = useState('');
  const [tripId, setTripId]           = useState('');
  const [occurredAt, setOccurredAt]   = useState(getCurrentDate);
  const [categories, setCategories]   = useState<Category[]>([]);
  const [trips, setTrips]             = useState<Trip[]>([]);
  const [saving, setSaving]           = useState(false);
  const [error, setError]             = useState('');
  const [success, setSuccess]         = useState(false);

  // Voice parse state
  const [voiceText, setVoiceText]     = useState('');
  const [voiceLoading, setVoiceLoading] = useState(false);
  const [voiceResult, setVoiceResult] = useState('');

  useEffect(() => {
    Promise.all([
      fetch('/api/categories').then(r => r.json()),
      fetch('/api/trips').then(r => r.json()),
    ]).then(([catData, tripData]) => {
      setCategories(catData.data || []);
      setTrips(tripData.data || []);
    });
  }, []);

  async function handleVoiceParse() {
    if (!voiceText.trim()) return;
    setVoiceLoading(true);
    setVoiceResult('');
    try {
      const res = await fetch('/api/voice-parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: voiceText }),
      });
      const { data } = await res.json();
      if (data.success) {
        if (data.amount)      setAmount(String(data.amount));
        if (data.description) setDescription(data.description);
        if (data.category_id) setCategoryId(data.category_id);
        if (data.trip_id)     setTripId(data.trip_id);
        setVoiceResult(`✓ Parsed: ₹${data.amount}${data.category_name ? ` · ${data.category_name}` : ''}${data.trip_name ? ` · ${data.trip_name}` : ''}`);
      } else {
        setVoiceResult(`⚠ ${data.error || 'Could not parse. Fill in manually.'}`);
      }
    } catch {
      setVoiceResult('⚠ Parse failed. Fill in manually.');
    } finally {
      setVoiceLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      setError('Please enter a valid amount.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          amount:      parsedAmount,
          description: description.trim() || null,
          category_id: categoryId || null,
          trip_id:     type === 'expense' ? (tripId || null) : null,
          occurred_at: new Date(occurredAt).toISOString(),
          source:      'WEB',
          idempotency_key: `web-${Date.now()}-${Math.random()}`,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error);

      setSuccess(true);
      setTimeout(() => router.push('/'), 1000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save. Try again.');
    } finally {
      setSaving(false);
    }
  }

  const filteredCats = categories.filter(c => c.type === type && c.is_active);

  return (
    <div className="app-container">
      <Header title="Add Transaction" showBack />

      <main className="page-content" style={{ paddingBottom: 'calc(var(--nav-height) + 24px)' }}>
        {success ? (
          <div className="empty-state" style={{ minHeight: '60vh' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--green-bg)', border: '1px solid var(--green-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--green)', marginBottom: 12 }}>
              <Check size={32} strokeWidth={2.5} />
            </div>
            <div className="empty-state-title">Transaction saved!</div>
            <div className="empty-state-desc">Updating your balance and redirecting…</div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>

            {/* Type Toggle */}
            <div className="tab-group">
              <button
                type="button"
                className={`tab-option ${type === 'expense' ? 'active' : ''}`}
                onClick={() => { setType('expense'); setCategoryId(''); }}
              >
                <TrendingDown size={15} strokeWidth={2.2} /> Expense
              </button>
              <button
                type="button"
                className={`tab-option ${type === 'income' ? 'active' : ''}`}
                onClick={() => { setType('income'); setCategoryId(''); }}
              >
                <TrendingUp size={15} strokeWidth={2.2} /> Income
              </button>
            </div>

            {/* Amount */}
            <div className="amount-input-wrapper">
              <span className="amount-currency">₹</span>
              <input
                id="amount-input"
                className="amount-input"
                type="number"
                placeholder="0"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                min="0.01"
                step="any"
                inputMode="decimal"
                autoFocus
              />
            </div>

            {/* Quick Voice / Text Parser */}
            <div className="card" style={{ padding: '12px 14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, fontSize: 11, fontWeight: 700, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                <Sparkles size={13} color="var(--ink)" /> Quick Voice / Smart Entry
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  id="voice-input"
                  className="input-field"
                  type="text"
                  placeholder="e.g. ₹450 protein or 120 coffee"
                  value={voiceText}
                  onChange={e => setVoiceText(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleVoiceParse())}
                  style={{ flex: 1, padding: '9px 12px', fontSize: 13 }}
                />
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={handleVoiceParse}
                  disabled={voiceLoading || !voiceText}
                  id="voice-parse-btn"
                  style={{ height: 38, padding: '0 14px' }}
                >
                  {voiceLoading ? '…' : 'Parse'}
                </button>
              </div>
              {voiceResult && (
                <div style={{ fontSize: 12, marginTop: 8, color: voiceResult.startsWith('✓') ? 'var(--green)' : 'var(--amber)', fontWeight: 600 }}>
                  {voiceResult}
                </div>
              )}
            </div>

            {/* Category Section */}
            <div className="input-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <Tag size={12} /> Select Category
                </label>
                <Link href="/categories" style={{ fontSize: 11, color: 'var(--ink-4)', fontWeight: 600 }}>
                  Edit Categories →
                </Link>
              </div>

              {filteredCats.length > 0 ? (
                <div className="category-grid">
                  {filteredCats.map(cat => (
                    <button
                      key={cat.id}
                      type="button"
                      className={`category-pill ${categoryId === cat.id ? 'selected' : ''}`}
                      onClick={() => setCategoryId(cat.id === categoryId ? '' : cat.id)}
                    >
                      <span className="category-pill-icon">{cat.icon}</span>
                      <span className="category-pill-name">{cat.name}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="card" style={{ padding: '14px', textAlign: 'center' }}>
                  <span style={{ fontSize: 13, color: 'var(--ink-3)' }}>No {type} categories found. </span>
                  <Link href="/categories" style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>+ Add category</Link>
                </div>
              )}
            </div>

            {/* Description */}
            <div className="input-group">
              <label className="input-label" htmlFor="description" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <FileText size={12} /> Description (optional)
              </label>
              <input
                id="description"
                className="input-field"
                type="text"
                placeholder="What was this for?"
                value={description}
                onChange={e => setDescription(e.target.value)}
              />
            </div>

            {/* Trip / Event — expense only */}
            {type === 'expense' && trips.length > 0 && (
              <div className="input-group">
                <label className="input-label" htmlFor="trip-select" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <MapPin size={12} /> Trip / Event (optional)
                </label>
                <select id="trip-select" className="input-field" value={tripId} onChange={e => setTripId(e.target.value)}>
                  <option value="">No trip</option>
                  {trips.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Date & Time */}
            <div className="input-group">
              <label className="input-label" htmlFor="occurred-at" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <Calendar size={12} /> Date & Time
              </label>
              <input
                id="occurred-at"
                className="input-field"
                type="datetime-local"
                value={occurredAt}
                onChange={e => setOccurredAt(e.target.value)}
              />
            </div>

            {error && (
              <div className="alert-banner danger" role="alert">
                <span>⚠️</span><span>{error}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              id="save-expense-btn"
              type="submit"
              className="btn btn-primary btn-full btn-lg"
              disabled={saving || !amount}
              style={{ marginTop: 'var(--space-xs)' }}
            >
              {saving ? (
                <><span className="loading-spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> Saving…</>
              ) : (
                `Save ${type === 'expense' ? 'Expense' : 'Income'}`
              )}
            </button>
          </form>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
