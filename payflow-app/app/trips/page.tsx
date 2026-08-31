'use client';

import { useEffect, useState } from 'react';
import BottomNav from '@/components/layout/BottomNav';
import Header from '@/components/layout/Header';
import { Trip } from '@/lib/types';

function formatINR(amount: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(amount);
}

function formatDate(d: string | null) {
  if (!d) return null;
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

interface TripWithTotal extends Trip {
  total_expenses?: number;
  transaction_count?: number;
}

function AddTripModal({ onAdd, onClose }: {
  onAdd: (t: Partial<Trip>) => Promise<void>;
  onClose: () => void;
}) {
  const [name, setName]           = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate]     = useState('');
  const [notes, setNotes]         = useState('');
  const [saving, setSaving]       = useState(false);

  async function handleAdd() {
    if (!name.trim()) return;
    setSaving(true);
    await onAdd({ name: name.trim(), start_date: startDate || null, end_date: endDate || null, notes: notes.trim() || null });
    setSaving(false);
    onClose();
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="bottom-sheet" onClick={e => e.stopPropagation()}>
        <div className="sheet-handle" />
        <h2 style={{ fontSize: 17, fontWeight: 700, marginBottom: 'var(--space-md)' }}>New Trip / Event</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          <div className="input-group">
            <label className="input-label">Trip Name</label>
            <input className="input-field" type="text" placeholder="e.g. Bangalore Trip, Mom's Birthday…" value={name} onChange={e => setName(e.target.value)} autoFocus />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-sm)' }}>
            <div className="input-group">
              <label className="input-label">Start Date</label>
              <input className="input-field" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
            </div>
            <div className="input-group">
              <label className="input-label">End Date</label>
              <input className="input-field" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
            </div>
          </div>
          <div className="input-group">
            <label className="input-label">Notes</label>
            <input className="input-field" type="text" placeholder="Optional notes…" value={notes} onChange={e => setNotes(e.target.value)} />
          </div>
          <button id="save-trip-btn" className="btn btn-primary btn-full" onClick={handleAdd} disabled={saving || !name.trim()}>
            {saving ? 'Creating…' : 'Create Trip'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function TripsPage() {
  const [trips, setTrips]       = useState<TripWithTotal[]>([]);
  const [loading, setLoading]   = useState(true);
  const [adding, setAdding]     = useState(false);
  const [selected, setSelected] = useState<TripWithTotal | null>(null);

  async function loadTrips() {
    const res = await fetch('/api/trips?active=false'); // fetch all
    if (!res.ok) { setLoading(false); return; }
    const { data } = await res.json();

    // For each trip, fetch expense total
    const withTotals = await Promise.all((data || []).map(async (trip: Trip) => {
      const txRes = await fetch(`/api/transactions?trip_id=${trip.id}&limit=200`);
      if (!txRes.ok) return trip;
      const { data: txns } = await txRes.json();
      const total = (txns || []).filter((t: { type: string }) => t.type === 'expense').reduce((s: number, t: { amount: number }) => s + t.amount, 0);
      return { ...trip, total_expenses: total, transaction_count: (txns || []).length };
    }));

    setTrips(withTotals);
    setLoading(false);
  }

  useEffect(() => { loadTrips(); }, []);

  async function handleAdd(tripData: Partial<Trip>) {
    await fetch('/api/trips', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tripData),
    });
    await loadTrips();
  }

  async function handleArchive(id: string) {
    await fetch('/api/trips', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, is_active: false }),
    });
    setTrips(prev => prev.map(t => t.id === id ? { ...t, is_active: false } : t));
    setSelected(null);
  }

  const activeTrips   = trips.filter(t => t.is_active);
  const archivedTrips = trips.filter(t => !t.is_active);

  return (
    <div className="app-container">
      <Header
        title="Trips & Events"
        action={
          <button className="btn btn-primary btn-sm" id="add-trip-btn" onClick={() => setAdding(true)}>+ New Trip</button>
        }
      />

      <main className="page-content">
        {loading ? (
          <div className="loading-container"><div className="loading-spinner" /></div>
        ) : (
          <>
            {trips.length === 0 && (
              <div className="empty-state">
                <div className="empty-state-icon">🗺️</div>
                <div className="empty-state-title">No trips yet</div>
                <div className="empty-state-desc">Create a trip to group related expenses together — e.g. Bangalore Trip, Mom's Birthday.</div>
              </div>
            )}

            {activeTrips.length > 0 && (
              <>
                <div className="section-title" style={{ marginBottom: 'var(--space-md)' }}>Active</div>
                {activeTrips.map((trip, i) => (
                  <div
                    key={trip.id}
                    className="trip-card"
                    style={{ animationDelay: `${i * 0.05}s`, animation: 'cardEnter 0.3s ease both' }}
                    onClick={() => setSelected(selected?.id === trip.id ? null : trip)}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 16 }}>🗺️ {trip.name}</div>
                        {(trip.start_date || trip.end_date) && (
                          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>
                            {formatDate(trip.start_date)} {trip.end_date ? `→ ${formatDate(trip.end_date)}` : ''}
                          </div>
                        )}
                        {trip.notes && (
                          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{trip.notes}</div>
                        )}
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--color-danger)' }}>
                          {formatINR(trip.total_expenses || 0)}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                          {trip.transaction_count || 0} expense{trip.transaction_count !== 1 ? 's' : ''}
                        </div>
                      </div>
                    </div>

                    {selected?.id === trip.id && (
                      <div style={{ marginTop: 'var(--space-md)', display: 'flex', gap: 'var(--space-sm)' }}>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={e => { e.stopPropagation(); handleArchive(trip.id); }}
                        >
                          Archive Trip
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </>
            )}

            {archivedTrips.length > 0 && (
              <>
                <div className="section-title" style={{ marginTop: 'var(--space-xl)', marginBottom: 'var(--space-md)', opacity: 0.5 }}>Archived</div>
                {archivedTrips.map(trip => (
                  <div key={trip.id} className="trip-card" style={{ opacity: 0.5 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <div style={{ fontWeight: 600 }}>🗂️ {trip.name}</div>
                      <div style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>{formatINR(trip.total_expenses || 0)}</div>
                    </div>
                  </div>
                ))}
              </>
            )}
          </>
        )}
      </main>

      {adding && <AddTripModal onAdd={handleAdd} onClose={() => setAdding(false)} />}

      <BottomNav />
    </div>
  );
}
