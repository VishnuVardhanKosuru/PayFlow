'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, ArrowUpDown, Plus, BarChart2, Settings } from 'lucide-react';

const navItems = [
  { href: '/',             icon: LayoutDashboard, label: 'Home'     },
  { href: '/transactions', icon: ArrowUpDown,     label: 'Txns'     },
  { href: '/add',          icon: Plus,            label: 'Add',      isAdd: true },
  { href: '/insights',     icon: BarChart2,       label: 'Insights'  },
  { href: '/settings',     icon: Settings,        label: 'Settings'  },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="bottom-nav">
      {navItems.map((item) => {
        const Icon = item.icon;

        if (item.isAdd) {
          return (
            <Link key={item.href} href={item.href} className="nav-add-btn" aria-label="Add expense">
              <Icon size={20} strokeWidth={2.5} color="white" />
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
            <span className="nav-item-icon">
              <Icon size={20} strokeWidth={isActive ? 2.2 : 1.8} />
            </span>
            <span className="nav-item-label">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
