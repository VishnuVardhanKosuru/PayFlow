'use client';

import Link from 'next/link';

interface HeaderProps {
  title: string;
  showBack?: boolean;
  action?: React.ReactNode;
}

export default function Header({ title, showBack = false, action }: HeaderProps) {
  return (
    <header className="app-header">
      <div className="flex items-center gap-sm">
        {showBack && (
          <Link
            href="javascript:history.back()"
            className="btn-icon btn-ghost"
            style={{ fontSize: 20, color: 'var(--text-secondary)' }}
            aria-label="Go back"
          >
            ‹
          </Link>
        )}
        {!showBack && (
          <span className="header-logo">PayFlow</span>
        )}
        {showBack && (
          <h1 className="header-title">{title}</h1>
        )}
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
