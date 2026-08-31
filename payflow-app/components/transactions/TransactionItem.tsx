'use client';

import { Transaction } from '@/lib/types';

interface TransactionItemProps {
  transaction: Transaction;
  onClick?: () => void;
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function formatAmount(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function TransactionItem({ transaction, onClick }: TransactionItemProps) {
  const isIncome = transaction.type === 'income';
  const category = transaction.category;

  const iconBg = category?.color
    ? `${category.color}22`
    : isIncome
    ? 'rgba(34, 211, 165, 0.15)'
    : 'rgba(255,255,255,0.06)';

  return (
    <div className="transaction-item" onClick={onClick} role={onClick ? 'button' : undefined}>
      {/* Icon */}
      <div className="transaction-item-icon" style={{ background: iconBg }}>
        {category?.icon || (isIncome ? '💰' : '💳')}
      </div>

      {/* Info */}
      <div className="transaction-item-info">
        <div className="transaction-item-title">
          {transaction.description || category?.name || (isIncome ? 'Income' : 'Expense')}
        </div>
        <div className="transaction-item-subtitle">
          {category?.name && transaction.description ? `${category.name} · ` : ''}
          {formatDate(transaction.occurred_at)} · {formatTime(transaction.occurred_at)}
          {transaction.trip?.name ? ` · 🗺️ ${transaction.trip.name}` : ''}
        </div>
      </div>

      {/* Amount */}
      <div className={`transaction-item-amount ${transaction.type}`}>
        {isIncome ? '+' : '-'}{formatAmount(transaction.amount)}
      </div>
    </div>
  );
}
