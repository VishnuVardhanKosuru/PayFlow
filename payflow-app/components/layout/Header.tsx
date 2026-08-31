'use client';

import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';

interface HeaderProps {
  title: string;
  showBack?: boolean;
  action?: React.ReactNode;
}

export default function Header({ title, showBack = false, action }: HeaderProps) {
  const router = useRouter();

  return (
    <header className="app-header">
      <div className="flex items-center gap-sm">
        {showBack && (
          <button
            onClick={() => router.back()}
            className="btn-icon btn-ghost"
            aria-label="Go back"
            style={{ color: 'var(--ink-2)' }}
          >
            <ChevronLeft size={20} strokeWidth={2} />
          </button>
        )}
        {!showBack && <span className="header-logo">PayFlow</span>}
        {showBack && <h1 className="header-title">{title}</h1>}
      </div>

      {!showBack && (
        <h1 className="header-title" style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)' }}>
          {title}
        </h1>
      )}

      {action && <div>{action}</div>}
    </header>
  );
}
