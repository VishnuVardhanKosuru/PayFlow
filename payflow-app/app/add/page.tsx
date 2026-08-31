'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import BottomNav from '@/components/layout/BottomNav';
import Header from '@/components/layout/Header';
import { Category, Trip } from '@/lib/types';

const PRESET_ICONS = ['🍔','🛒','🚗','💊','🛍️','🎬','💡','✈️','💪','🏠','👨‍👩‍👧','📌','☕','🚕','🍕','🎮','📱','⛽','🏋️','🍜','🛺','🎵','📚','🧴','🌿','🐾','💇','🏥'];

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
        if (data.amount)     setAmount(String(data.amount));
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
      setTimeout(() => router.push('/'), 1200);
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

      <main className="page-content">
        {success ? (
          <div className="empty-state" style={{ minHeight: '60vh' }}>
            <div style={{ fontSize: 56 }}>✅</div>
            <div className="empty-state-title">Transaction saved!</div>
            <div className="empty-state-desc">Redirecting to dashboard…</div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>

            {/* Type Toggle */}
            <div className="tab-group">
              <button type="button" className={`tab-option ${type === 'expense' ? 'active' : ''}`} onClick={() => setType('expense')}>
                💸 Expense
              </button>
              <button type="button" className={`tab-option ${type === 'income' ? 'active' : ''}`} onClick={() => setType('income')}>
                💰 Income
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
                step="0.01"
                inputMode="decimal"
                autoFocus
              />
            </div>

            {/* Voice Parse */}
            <div className="glass-card" style={{ padding: 'var(--space-sm) var(--space-md)' }}>
              <div className="input-label" style={{ marginBottom: 8 }}>Quick Voice Entry (e.g. "₹450 protein")</div>
              <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                <input
                  id="voice-input"
                  className="input-field"
                  type="text"
                  placeholder="Type or paste voice text…"
                  value={voiceText}
                  onChange={e => setVoiceText(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleVoiceParse())}
                  style={{ flex: 1, marginBottom: 0 }}
                />
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={handleVoiceParse}
                  disabled={voiceLoading || !voiceText}
                  id="voice-parse-btn"
                >
                  {voiceLoading ? '…' : 'Parse'}
                </button>
              </div>
              {voiceResult && (
                <div style={{ fontSize: 12, marginTop: 6, color: voiceResult.startsWith('✓') ? 'var(--color-success)' : 'var(--color-warning)', fontWeight: 600 }}>
                  {voiceResult}
                </div>
              )}
            </div>

            {/* Description */}
            <div className="input-group">
              <label className="input-label" htmlFor="description">Description</label>
              <input
                id="description"
                className="input-field"
                type="text"
                placeholder="What was this for?"
                value={description}
                onChange={e => setDescription(e.target.value)}
              />
            </div>

            {/* Category */}
            <div className="input-group">
              <label className="input-label">Category</label>
              <div className="category-grid">
                {filteredCats.map(cat => (
                  <button
                    key={cat.id}
                    type="button"
                    className={`category-pill ${categoryId === cat.id ? 'selected' : ''}`}
                    onClick={() => setCategoryId(cat.id === categoryId ? '' : cat.id)}
                    style={{ borderColor: categoryId === cat.id ? cat.color : 'transparent' }}
                  >
                    <span className="category-pill-icon">{cat.icon}</span>
                    <span className="category-pill-name">{cat.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Trip — expense only */}
            {type === 'expense' && trips.length > 0 && (
              <div className="input-group">
                <label className="input-label" htmlFor="trip-select">Trip / Event (optional)</label>
                <select id="trip-select" className="input-field" value={tripId} onChange={e => setTripId(e.target.value)}>
                  <option value="">No trip</option>
                  {trips.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Date/Time */}
            <div className="input-group">
              <label className="input-label" htmlFor="occurred-at">Date & Time</label>
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

            <button
              id="save-expense-btn"
              type="submit"
              className="btn btn-primary btn-full btn-lg"
              disabled={saving || !amount}
            >
              {saving ? <><span className="loading-spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> Saving…</> : `Save ${type === 'expense' ? 'Expense' : 'Income'}`}
            </button>
          </form>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
