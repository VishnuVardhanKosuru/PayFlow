'use client';

interface MonthPickerProps {
  value: string; // YYYY-MM
  onChange: (month: string) => void;
}

function monthToLabel(month: string): string {
  const [year, mon] = month.split('-');
  const date = new Date(parseInt(year), parseInt(mon) - 1, 1);
  return date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

function addMonths(month: string, delta: number): string {
  const [year, mon] = month.split('-').map(Number);
  const date = new Date(year, mon - 1 + delta, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export default function MonthPicker({ value, onChange }: MonthPickerProps) {
  const currentMonth = new Date();
  const currentYM = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}`;
  const isCurrentMonth = value === currentYM;

  return (
    <div className="month-picker">
      <button
        className="month-picker-btn"
        onClick={() => onChange(addMonths(value, -1))}
        aria-label="Previous month"
      >
        ‹
      </button>
      <span className="month-picker-label">{monthToLabel(value)}</span>
      <button
        className="month-picker-btn"
        onClick={() => onChange(addMonths(value, 1))}
        disabled={isCurrentMonth}
        aria-label="Next month"
        style={{ opacity: isCurrentMonth ? 0.3 : 1 }}
      >
        ›
      </button>
    </div>
  );
}
