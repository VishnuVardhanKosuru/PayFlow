'use client';

import { useEffect, useState } from 'react';

export default function SplashScreen() {
  const [phase, setPhase] = useState<'in' | 'hold' | 'out' | 'gone'>('in');

  useEffect(() => {
    // Only show once per browser session
    if (typeof window !== 'undefined' && sessionStorage.getItem('pf_splash_done')) {
      setPhase('gone');
      return;
    }

    // Animate in → hold → fade out → gone
    const t1 = setTimeout(() => setPhase('hold'), 100);
    const t2 = setTimeout(() => setPhase('out'),  2000);
    const t3 = setTimeout(() => {
      setPhase('gone');
      sessionStorage.setItem('pf_splash_done', '1');
    }, 2600);

    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  if (phase === 'gone') return null;

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        background: '#0a0a0a',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        gap: 0,
        opacity:   phase === 'in' ? 0 : phase === 'out' ? 0 : 1,
        transform: phase === 'in' ? 'scale(0.97)' : 'scale(1)',
        transition: phase === 'in'
          ? 'opacity 0.4s ease, transform 0.4s ease'
          : phase === 'out'
          ? 'opacity 0.5s ease'
          : 'none',
      }}
    >
      {/* Logo mark */}
      <div style={{ marginBottom: 22, width: 64, height: 64, borderRadius: 16, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.12)', boxShadow: '0 8px 30px rgba(0,0,0,0.6)' }}>
        <img src="/apple-touch-icon.png" alt="PayFlow" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </div>

      {/* Wordmark */}
      <div
        style={{
          fontSize: 38,
          fontWeight: 800,
          color: '#ffffff',
          letterSpacing: '-2px',
          fontFamily: "'Inter', sans-serif",
          lineHeight: 1,
        }}
      >
        PayFlow
      </div>

      {/* Tagline */}
      <div
        style={{
          marginTop: 12,
          fontSize: 14,
          fontWeight: 400,
          color: 'rgba(255,255,255,0.45)',
          letterSpacing: '0.2px',
          fontFamily: "'Inter', sans-serif",
        }}
      >
        Every rupee, working for you.
      </div>

      {/* Subtle bottom loading line */}
      <div
        style={{
          position: 'absolute',
          bottom: 48,
          width: 40,
          height: 2,
          background: 'rgba(255,255,255,0.15)',
          borderRadius: 2,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            background: 'rgba(255,255,255,0.7)',
            borderRadius: 2,
            animation: 'splashBar 1.8s ease-out forwards',
          }}
        />
      </div>

      <style>{`
        @keyframes splashBar {
          from { width: 0%; }
          to   { width: 100%; }
        }
      `}</style>
    </div>
  );
}
