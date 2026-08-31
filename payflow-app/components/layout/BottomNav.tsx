'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { href: '/',             icon: '⊞', label: 'Home'    },
  { href: '/transactions', icon: '↕', label: 'Txns'    },
  { href: '/add',          icon: '+', label: 'Add',     isAdd: true },
  { href: '/insights',     icon: '◎', label: 'Insights' },
  { href: '/settings',     icon: '⊙', label: 'Settings' },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="bottom-nav">
      {navItems.map((item) => {
        if (item.isAdd) {
          return (
            <Link key={item.href} href={item.href} className="nav-add-btn" aria-label="Add expense">
              +
            </Link>
          );
        }

        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`nav-item ${isActive ? 'active' : ''}`}
            aria-current={isActive ? 'page' : undefined}
          >
            <span className="nav-item-icon">{item.icon}</span>
            <span className="nav-item-label">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
