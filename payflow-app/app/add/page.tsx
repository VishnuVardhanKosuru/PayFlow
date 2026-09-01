'use client';

import { Suspense, useEffect, useState, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import BottomNav from '@/components/layout/BottomNav';
import Header from '@/components/layout/Header';
import { Category, Trip } from '@/lib/types';
import { TrendingDown, TrendingUp, Sparkles, Check, Tag, FileText, Calendar, MapPin, Mic, MicOff } from 'lucide-react';

function getCurrentDate(): string {
  const now = new Date();
  // Offset to IST
  const ist = new Date(now.getTime() + (5.5 * 60 * 60 * 1000));
  return ist.toISOString().slice(0, 16);
}

function AddTransactionForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

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
  const [voiceText, setVoiceText]       = useState('');
  const [voiceLoading, setVoiceLoading] = useState(false);
  const [voiceResult, setVoiceResult]   = useState('');
  const [isListening, setIsListening]   = useState(false);
  const recognitionRef                  = useRef<any>(null);
  const hasAutoParsedRef                = useRef(false);

  useEffect(() => {
    Promise.all([
      fetch('/api/categories').then(r => r.json()),
      fetch('/api/trips').then(r => r.json()),
    ]).then(([catData, tripData]) => {
      setCategories(catData.data || []);
      setTrips(tripData.data || []);
    });
  }, []);

  const executeParse = useCallback(async (textToParse: string) => {
    if (!textToParse || !textToParse.trim()) return;
    setVoiceLoading(true);
    setVoiceResult('');

    try {
      const res = await fetch('/api/voice-parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: textToParse }),
      });
      const { data } = await res.json();
      if (data && data.success) {
        if (data.type)         setType(data.type);
        if (data.amount)       setAmount(String(data.amount));
        if (data.description)  setDescription(data.description);
        if (data.category_id)  setCategoryId(data.category_id);
        if (data.trip_id)      setTripId(data.trip_id);
        setVoiceResult(`✓ Parsed: ₹${data.amount}${data.category_name ? ` · ${data.category_name}` : ''}${data.trip_name ? ` · ${data.trip_name}` : ''}`);
      } else {
        setVoiceResult(`⚠ ${data?.error || 'Could not detect amount. Try "₹450 protein" or "Uber 250"'}`);
      }
    } catch {
      setVoiceResult('⚠ Parse failed. Fill in manually.');
    } finally {
      setVoiceLoading(false);
    }
  }, []);

  // Handle Siri / URL query parameter on initial load (e.g. /add?voice=450%20protein)
  useEffect(() => {
    if (hasAutoParsedRef.current) return;
    const initialVoice = searchParams.get('voice') || searchParams.get('text');
    if (initialVoice) {
      hasAutoParsedRef.current = true;
      setVoiceText(initialVoice);
      executeParse(initialVoice);
    }
  }, [searchParams, executeParse]);

  // Live in-browser Speech Recognition (Web Speech API)
  function toggleListening() {
    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
      return;
    }

    if (typeof window === 'undefined') return;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setVoiceResult('⚠ Live mic not supported on this browser. Type below or use Siri Shortcut.');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'en-IN';
      recognition.continuous = false;
      recognition.interimResults = false;
      recognitionRef.current = recognition;

      recognition.onstart = () => {
        setIsListening(true);
        setVoiceResult('🎙️ Listening... Speak now (e.g. "450 protein")');
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setVoiceText(transcript);
        setIsListening(false);
        executeParse(transcript);
      };

      recognition.onerror = (e: any) => {
        setIsListening(false);
        if (e.error !== 'no-speech') {
          setVoiceResult(`⚠ Mic notice: ${e.error || 'Please speak clearly'}`);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch (err) {
      setIsListening(false);
      setVoiceResult('⚠ Could not start microphone.');
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
          amount:          parsedAmount,
          description:     description.trim() || null,
          category_id:     categoryId || null,
          trip_id:         type === 'expense' ? (tripId || null) : null,
          occurred_at:     new Date(occurredAt).toISOString(),
          source:          voiceText ? 'VOICE' : 'WEB',
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

          {/* Quick Voice / Smart Speech Parser */}
          <div className="card" style={{ padding: '12px 14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                <Sparkles size={13} color="var(--ink)" /> Voice / Smart Entry
              </div>
              <span style={{ fontSize: 11, color: 'var(--ink-4)', fontWeight: 500 }}>
                Tap mic or type
              </span>
            </div>

            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button
                type="button"
                className={`btn ${isListening ? 'btn-primary' : 'btn-secondary'} btn-sm btn-icon`}
                onClick={toggleListening}
                title={isListening ? 'Stop listening' : 'Start voice input'}
                style={{
                  width: 40,
                  height: 40,
                  flexShrink: 0,
                  borderRadius: 'var(--r-md)',
                  background: isListening ? 'var(--red)' : undefined,
                  borderColor: isListening ? 'var(--red)' : undefined,
                  color: isListening ? '#ffffff' : undefined,
                  transition: 'all 0.2s ease',
                  animation: isListening ? 'pulse 1.2s infinite' : 'none',
                }}
              >
                {isListening ? <MicOff size={18} /> : <Mic size={18} />}
              </button>

              <input
                id="voice-input"
                className="input-field"
                type="text"
                placeholder='Speak or type (e.g. "450 protein", "Uber 250")'
                value={voiceText}
                onChange={e => setVoiceText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), executeParse(voiceText))}
                style={{ flex: 1, padding: '9px 12px', fontSize: 13, height: 40 }}
              />

              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => executeParse(voiceText)}
                disabled={voiceLoading || !voiceText}
                id="voice-parse-btn"
                style={{ height: 40, padding: '0 14px' }}
              >
                {voiceLoading ? '…' : 'Parse'}
              </button>
            </div>

            {voiceResult && (
              <div style={{ fontSize: 12, marginTop: 8, color: voiceResult.startsWith('✓') ? 'var(--green)' : voiceResult.startsWith('🎙️') ? 'var(--blue)' : 'var(--amber)', fontWeight: 600 }}>
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
  );
}

export default function AddExpensePage() {
  return (
    <div className="app-container">
      <Header title="Add Transaction" showBack />
      <Suspense fallback={<div className="loading-container"><div className="loading-spinner" /></div>}>
        <AddTransactionForm />
      </Suspense>
      <BottomNav />
    </div>
  );
}
