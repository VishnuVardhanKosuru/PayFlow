'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import BottomNav from '@/components/layout/BottomNav';
import Header from '@/components/layout/Header';
import { createClient } from '@/lib/supabase/client';
import { Profile } from '@/lib/types';

const CURRENCIES = [
  { code: 'INR', label: '₹ Indian Rupee' },
  { code: 'USD', label: '$ US Dollar' },
  { code: 'EUR', label: '€ Euro' },
  { code: 'GBP', label: '£ British Pound' },
  { code: 'SGD', label: 'S$ Singapore Dollar' },
  { code: 'AED', label: 'د.إ UAE Dirham' },
];

const TIMEZONES = [
  'Asia/Kolkata',
  'Asia/Dubai',
  'Asia/Singapore',
  'America/New_York',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Berlin',
  'Australia/Sydney',
];

export default function SettingsPage() {
  const [profile, setProfile]         = useState<Profile | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [currency, setCurrency]       = useState('INR');
  const [timezone, setTimezone]       = useState('Asia/Kolkata');
  const [saving, setSaving]           = useState(false);
  const [saved, setSaved]             = useState(false);
  const [email, setEmail]             = useState('');

  const supabase = createClient();
  const router   = useRouter();

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setEmail(user.email || '');

      const { data } = await supabase.from('profiles').select('*').single();
      if (data) {
        setProfile(data);
        setDisplayName(data.display_name || '');
        setCurrency(data.currency || 'INR');
        setTimezone(data.timezone || 'Asia/Kolkata');
      }
    }
    load();
  }, []);

  async function handleSave() {
    setSaving(true);
    await supabase
      .from('profiles')
      .update({ display_name: displayName.trim() || null, currency, timezone, updated_at: new Date().toISOString() })
      .eq('id', profile?.id ?? '');
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  async function handleSeedCategories() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    // Call the seed function via Supabase RPC
    await supabase.rpc('seed_default_categories', { p_user_id: user.id });
    alert('Default categories seeded! Check your Categories page.');
  }

  return (
    <div className="app-container">
      <Header title="Settings" />

      <main className="page-content">
        {/* Profile Section */}
        <div className="section-header">
          <span className="section-title">Profile</span>
        </div>
        <div className="glass-card" style={{ marginBottom: 'var(--space-md)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
            <div className="input-group">
              <label className="input-label">Display Name</label>
              <input
                id="display-name-input"
                className="input-field"
                type="text"
                placeholder="Your name"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
              />
            </div>
            <div className="input-group">
              <label className="input-label">Email</label>
              <div className="input-field" style={{ color: 'var(--text-muted)' }}>{email || '—'}</div>
            </div>
          </div>
        </div>

        {/* Preferences */}
        <div className="section-header">
          <span className="section-title">Preferences</span>
        </div>
        <div className="glass-card" style={{ marginBottom: 'var(--space-md)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
            <div className="input-group">
              <label className="input-label" htmlFor="currency-select">Currency</label>
              <select id="currency-select" className="input-field" value={currency} onChange={e => setCurrency(e.target.value)}>
                {CURRENCIES.map(c => (
                  <option key={c.code} value={c.code}>{c.label}</option>
                ))}
              </select>
            </div>
            <div className="input-group">
              <label className="input-label" htmlFor="timezone-select">Timezone</label>
              <select id="timezone-select" className="input-field" value={timezone} onChange={e => setTimezone(e.target.value)}>
                {TIMEZONES.map(tz => (
                  <option key={tz} value={tz}>{tz}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {saved && (
          <div className="alert-banner info" style={{ marginBottom: 'var(--space-md)' }}>
            <span>✓</span><span>Profile saved successfully!</span>
          </div>
        )}

        <button id="save-settings-btn" className="btn btn-primary btn-full" onClick={handleSave} disabled={saving} style={{ marginBottom: 'var(--space-md)' }}>
          {saving ? 'Saving…' : 'Save Profile'}
        </button>

        {/* App section */}
        <div className="section-header">
          <span className="section-title">App</span>
        </div>
        <div style={{ marginBottom: 'var(--space-md)' }}>
          <div className="settings-row" onClick={handleSeedCategories}>
            <span className="settings-row-label">🌱 Seed Default Categories</span>
            <span className="settings-row-value">→</span>
          </div>
          <div className="settings-row" onClick={() => window.open('https://payflow.app/shortcuts', '_blank')}>
            <span className="settings-row-label">📱 iOS Shortcuts Setup</span>
            <span className="settings-row-value">→</span>
          </div>
        </div>

        {/* API Info for Shortcuts */}
        <div className="glass-card" style={{ marginBottom: 'var(--space-md)' }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
            iOS Shortcut API Endpoint
          </div>
          <div style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--accent-start)', wordBreak: 'break-all', lineHeight: 1.6 }}>
            POST /api/transactions
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6, lineHeight: 1.5 }}>
            Use the Supabase session cookie (or Bearer token) for auth. Voice text parsing: POST /api/voice-parse with {'{ "text": "₹450 protein" }'}.
          </div>
        </div>

        {/* About */}
        <div className="glass-card" style={{ marginBottom: 'var(--space-xl)' }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.8 }}>
            <div style={{ fontWeight: 700, fontSize: 16, background: 'var(--gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: 4 }}>PayFlow</div>
            MVP v1.0 · Mobile-first salary & expense intelligence<br />
            Know where every rupee goes.
          </div>
        </div>

        {/* Sign Out */}
        <button id="sign-out-btn" className="btn btn-danger btn-full btn-lg" onClick={handleSignOut}>
          Sign Out
        </button>
      </main>

      <BottomNav />
    </div>
  );
}
