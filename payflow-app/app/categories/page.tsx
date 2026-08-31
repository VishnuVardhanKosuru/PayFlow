'use client';

import { useEffect, useState } from 'react';
import BottomNav from '@/components/layout/BottomNav';
import Header from '@/components/layout/Header';
import { Category } from '@/lib/types';

const PRESET_ICONS = ['🍔','🛒','🚗','💊','🛍️','🎬','💡','✈️','💪','🏠','👨‍👩‍👧','📌','☕','🚕','🍕','🎮','📱','⛽','🏋️','🍜','🛺','🎵','📚','🧴','🌿','🐾','💇','🏥','🎓','🏦','🧘'];
const PRESET_COLORS = ['#ff6b6b','#ffa94d','#ffd43b','#a9e34b','#69db7c','#22d3a5','#00d4ff','#4facfe','#74c0fc','#4dabf7','#339af0','#7b2fff','#da77f2','#f783ac','#ff8787','#868e96','#63e6be','#a9e34b'];

function EditModal({ category, onSave, onClose }: {
  category: Category;
  onSave: (id: string, data: Partial<Category>) => Promise<void>;
  onClose: () => void;
}) {
  const [name, setName]   = useState(category.name);
  const [icon, setIcon]   = useState(category.icon);
  const [color, setColor] = useState(category.color);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true);
    await onSave(category.id, { name: name.trim(), icon, color });
    setSaving(false);
    onClose();
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="bottom-sheet" onClick={e => e.stopPropagation()}>
        <div className="sheet-handle" />
        <h2 style={{ fontSize: 17, fontWeight: 700, marginBottom: 'var(--space-md)' }}>Edit Category</h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          <div className="input-group">
            <label className="input-label">Name</label>
            <input className="input-field" type="text" value={name} onChange={e => setName(e.target.value)} />
          </div>

          <div className="input-group">
            <label className="input-label">Icon</label>
            <div className="icon-grid">
              {PRESET_ICONS.map(ic => (
                <button key={ic} type="button" className={`icon-option ${icon === ic ? 'selected' : ''}`} onClick={() => setIcon(ic)}>
                  {ic}
                </button>
              ))}
            </div>
          </div>

          <div className="input-group">
            <label className="input-label">Color</label>
            <div className="color-swatch-grid">
              {PRESET_COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  className={`color-swatch ${color === c ? 'selected' : ''}`}
                  style={{ background: c }}
                  onClick={() => setColor(c)}
                />
              ))}
            </div>
          </div>

          <button className="btn btn-primary btn-full" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

function AddModal({ type, onAdd, onClose }: {
  type: 'expense' | 'income';
  onAdd: (cat: Partial<Category>) => Promise<void>;
  onClose: () => void;
}) {
  const [name, setName]   = useState('');
  const [icon, setIcon]   = useState('📌');
  const [color, setColor] = useState('#868e96');
  const [saving, setSaving] = useState(false);

  async function handleAdd() {
    if (!name.trim()) return;
    setSaving(true);
    await onAdd({ name: name.trim(), icon, color, type });
    setSaving(false);
    onClose();
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="bottom-sheet" onClick={e => e.stopPropagation()}>
        <div className="sheet-handle" />
        <h2 style={{ fontSize: 17, fontWeight: 700, marginBottom: 'var(--space-md)' }}>New {type === 'expense' ? 'Expense' : 'Income'} Category</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          <div className="input-group">
            <label className="input-label">Name</label>
            <input className="input-field" type="text" placeholder="e.g. Protein, Mom Needs…" value={name} onChange={e => setName(e.target.value)} autoFocus />
          </div>
          <div className="input-group">
            <label className="input-label">Icon</label>
            <div className="icon-grid">
              {PRESET_ICONS.map(ic => (
                <button key={ic} type="button" className={`icon-option ${icon === ic ? 'selected' : ''}`} onClick={() => setIcon(ic)}>{ic}</button>
              ))}
            </div>
          </div>
          <div className="input-group">
            <label className="input-label">Color</label>
            <div className="color-swatch-grid">
              {PRESET_COLORS.map(c => (
                <button key={c} type="button" className={`color-swatch ${color === c ? 'selected' : ''}`} style={{ background: c }} onClick={() => setColor(c)} />
              ))}
            </div>
          </div>
          <button className="btn btn-primary btn-full" onClick={handleAdd} disabled={saving || !name.trim()} id="add-category-btn">
            {saving ? 'Adding…' : 'Add Category'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading]       = useState(true);
  const [editing, setEditing]       = useState<Category | null>(null);
  const [adding, setAdding]         = useState<'expense' | 'income' | null>(null);
  const [typeTab, setTypeTab]       = useState<'expense' | 'income'>('expense');

  async function loadCategories() {
    const res = await fetch('/api/categories');
    if (res.ok) { const { data } = await res.json(); setCategories(data || []); }
    setLoading(false);
  }

  useEffect(() => { loadCategories(); }, []);

  async function handleSave(id: string, data: Partial<Category>) {
    await fetch('/api/categories', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...data }),
    });
    await loadCategories();
  }

  async function handleArchive(id: string) {
    await fetch('/api/categories', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, is_active: false }),
    });
    setCategories(prev => prev.filter(c => c.id !== id));
  }

  async function handleAdd(cat: Partial<Category>) {
    await fetch('/api/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cat),
    });
    await loadCategories();
  }

  const filtered = categories.filter(c => c.type === typeTab);

  return (
    <div className="app-container">
      <Header
        title="Categories"
        action={
          <button
            id="add-category-open-btn"
            className="btn btn-primary btn-sm"
            onClick={() => setAdding(typeTab)}
          >
            + Add
          </button>
        }
      />

      <main className="page-content">
        <div className="tab-group">
          <button className={`tab-option ${typeTab === 'expense' ? 'active' : ''}`} onClick={() => setTypeTab('expense')}>💸 Expense</button>
          <button className={`tab-option ${typeTab === 'income' ? 'active' : ''}`} onClick={() => setTypeTab('income')}>💰 Income</button>
        </div>

        {loading ? (
          <div className="loading-container"><div className="loading-spinner" /></div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📂</div>
            <div className="empty-state-title">No categories yet</div>
            <div className="empty-state-desc">Tap "+ Add" to create your first {typeTab} category.</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {filtered.map((cat, i) => (
              <div
                key={cat.id}
                className="transaction-item"
                style={{ animationDelay: `${i * 0.03}s` }}
              >
                <div className="transaction-item-icon" style={{ background: `${cat.color}22` }}>
                  {cat.icon}
                </div>
                <div className="transaction-item-info">
                  <div className="transaction-item-title">{cat.name}</div>
                  <div className="transaction-item-subtitle" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: cat.color, display: 'inline-block' }} />
                    {cat.color}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                  <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setEditing(cat)} aria-label="Edit">✏️</button>
                  <button className="btn btn-ghost btn-sm btn-icon" onClick={() => handleArchive(cat.id)} aria-label="Archive">🗃️</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {editing && <EditModal category={editing} onSave={handleSave} onClose={() => setEditing(null)} />}
      {adding  && <AddModal  type={adding}     onAdd={handleAdd}   onClose={() => setAdding(null)} />}

      <BottomNav />
    </div>
  );
}
