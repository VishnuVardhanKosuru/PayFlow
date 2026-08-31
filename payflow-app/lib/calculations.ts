// PayFlow — Business logic calculations
// All metrics derived from DB queries via Supabase client

import { createClient } from './supabase/client';
import type {
  MonthlySummary,
  CategoryBreakdown,
  MonthOverMonthChange,
  InsightsData,
  SpendingAlert,
  TripSummary,
} from './types';

// ─── Monthly Summary ──────────────────────────────────────────────────────────

export async function getMonthlySummary(month: string): Promise<MonthlySummary> {
  const supabase = createClient();

  const startDate = `${month}-01T00:00:00+05:30`;
  const [year, mon] = month.split('-').map(Number);
  const lastDay = new Date(year, mon, 0).getDate();
  const endDate = `${month}-${lastDay}T23:59:59+05:30`;

  // Expenses from transactions table
  const { data: expenseData, error: expErr } = await supabase
    .from('transactions')
    .select('amount')
    .eq('type', 'expense')
    .gte('occurred_at', startDate)
    .lte('occurred_at', endDate);

  if (expErr) throw expErr;

  // Income from monthly_income table
  const { data: incomeData, error: incErr } = await supabase
    .from('monthly_income')
    .select('amount')
    .eq('month', month);

  if (incErr) throw incErr;

  const totalExpenses = (expenseData || []).reduce((sum, t) => sum + (t.amount || 0), 0);
  const totalIncome = (incomeData || []).reduce((sum, i) => sum + (i.amount || 0), 0);
  const remaining = totalIncome - totalExpenses;
  const savingsRate = totalIncome > 0 ? (remaining / totalIncome) * 100 : 0;
  const transactionCount = (expenseData || []).length;

  return {
    month,
    total_income: totalIncome,
    total_expenses: totalExpenses,
    remaining,
    savings_rate: Math.round(savingsRate * 10) / 10,
    transaction_count: transactionCount,
  };
}

// ─── Category Breakdown ───────────────────────────────────────────────────────

export async function getCategoryBreakdown(month: string): Promise<CategoryBreakdown[]> {
  const supabase = createClient();

  const startDate = `${month}-01T00:00:00+05:30`;
  const [year, mon] = month.split('-').map(Number);
  const lastDay = new Date(year, mon, 0).getDate();
  const endDate = `${month}-${lastDay}T23:59:59+05:30`;

  const { data, error } = await supabase
    .from('transactions')
    .select('amount, category_id, category:categories(id, name, icon, color)')
    .eq('type', 'expense')
    .gte('occurred_at', startDate)
    .lte('occurred_at', endDate);

  if (error) throw error;

  // Group by category
  const grouped: Record<string, {
    category_id: string;
    category_name: string;
    category_icon: string;
    category_color: string;
    total: number;
    count: number;
  }> = {};

  const totalExpenses = (data || []).reduce((sum, t) => sum + (t.amount || 0), 0);

  for (const tx of data || []) {
    const catId = tx.category_id || 'uncategorized';
    const cat = Array.isArray(tx.category) ? tx.category[0] : tx.category;
    if (!grouped[catId]) {
      grouped[catId] = {
        category_id: catId,
        category_name: cat?.name || 'Uncategorized',
        category_icon: cat?.icon || '📌',
        category_color: cat?.color || '#868e96',
        total: 0,
        count: 0,
      };
    }
    grouped[catId].total += tx.amount || 0;
    grouped[catId].count += 1;
  }

  return Object.values(grouped)
    .map(g => ({
      category_id: g.category_id,
      category_name: g.category_name,
      category_icon: g.category_icon,
      category_color: g.category_color,
      total: Math.round(g.total * 100) / 100,
      percentage: totalExpenses > 0 ? Math.round((g.total / totalExpenses) * 1000) / 10 : 0,
      transaction_count: g.count,
    }))
    .sort((a, b) => b.total - a.total);
}

// ─── Month-over-Month ─────────────────────────────────────────────────────────

export async function getMonthOverMonth(
  currentMonth: string,
  previousMonth: string
): Promise<MonthOverMonthChange[]> {
  const [currentBreakdown, previousBreakdown] = await Promise.all([
    getCategoryBreakdown(currentMonth),
    getCategoryBreakdown(previousMonth),
  ]);

  const prevMap = new Map(previousBreakdown.map(c => [c.category_id, c]));
  const result: MonthOverMonthChange[] = [];

  for (const curr of currentBreakdown) {
    const prev = prevMap.get(curr.category_id);
    const prevTotal = prev?.total || 0;
    let changePercentage: number | null = null;
    let direction: 'up' | 'down' | 'new' | 'same' = 'same';

    if (prevTotal === 0 && curr.total > 0) {
      direction = 'new';
    } else if (prevTotal > 0) {
      changePercentage = Math.round(((curr.total - prevTotal) / prevTotal) * 1000) / 10;
      direction = changePercentage > 0 ? 'up' : changePercentage < 0 ? 'down' : 'same';
    }

    result.push({
      category_id: curr.category_id,
      category_name: curr.category_name,
      category_icon: curr.category_icon,
      category_color: curr.category_color,
      current_month_total: curr.total,
      previous_month_total: prevTotal,
      change_percentage: changePercentage,
      change_direction: direction,
    });
  }

  return result.sort((a, b) => Math.abs(b.change_percentage || 0) - Math.abs(a.change_percentage || 0));
}

// ─── Spending Alerts ──────────────────────────────────────────────────────────

export function generateAlerts(
  summary: MonthlySummary,
  breakdown: CategoryBreakdown[]
): SpendingAlert[] {
  const alerts: SpendingAlert[] = [];

  if (summary.total_income > 0) {
    // Savings rate alert
    if (summary.savings_rate < 10 && summary.savings_rate >= 0) {
      alerts.push({
        type: 'savings_low',
        message: `Savings rate is ${summary.savings_rate.toFixed(1)}%. Consider reducing discretionary spending.`,
        severity: 'warning',
      });
    }
    if (summary.savings_rate < 0) {
      alerts.push({
        type: 'savings_low',
        message: `You've spent ₹${Math.abs(summary.remaining).toLocaleString('en-IN')} more than your income this month!`,
        severity: 'danger',
      });
    }

    // Category concentration alert
    for (const cat of breakdown) {
      if (cat.percentage > 40) {
        alerts.push({
          type: 'category_high',
          message: `${cat.category_icon} ${cat.category_name} is ${cat.percentage}% of your total spend.`,
          severity: 'info',
        });
      }
    }
  }

  return alerts;
}

// ─── Full Insights ────────────────────────────────────────────────────────────

export async function getInsights(
  currentMonth: string,
  previousMonth: string
): Promise<InsightsData> {
  const [summary, categoryBreakdown, monthOverMonth] = await Promise.all([
    getMonthlySummary(currentMonth),
    getCategoryBreakdown(currentMonth),
    getMonthOverMonth(currentMonth, previousMonth),
  ]);

  const alerts = generateAlerts(summary, categoryBreakdown);

  return {
    month: currentMonth,
    summary,
    category_breakdown: categoryBreakdown,
    month_over_month: monthOverMonth,
    top_category: categoryBreakdown[0] || null,
    alerts,
  };
}

// ─── Trip Summary ─────────────────────────────────────────────────────────────

export async function getTripSummary(tripId: string): Promise<TripSummary | null> {
  const supabase = createClient();

  const { data: trip, error: tripErr } = await supabase
    .from('trips')
    .select('*')
    .eq('id', tripId)
    .single();

  if (tripErr || !trip) return null;

  const { data: txns, error: txErr } = await supabase
    .from('transactions')
    .select('amount, category_id, category:categories(id, name, icon, color)')
    .eq('trip_id', tripId)
    .eq('type', 'expense');

  if (txErr) throw txErr;

  const totalExpenses = (txns || []).reduce((sum, t) => sum + (t.amount || 0), 0);

  // Category grouping
  const grouped: Record<string, CategoryBreakdown> = {};
  for (const tx of txns || []) {
    const catId = tx.category_id || 'uncategorized';
    const cat = Array.isArray(tx.category) ? tx.category[0] : tx.category;
    if (!grouped[catId]) {
      grouped[catId] = {
        category_id: catId,
        category_name: cat?.name || 'Uncategorized',
        category_icon: cat?.icon || '📌',
        category_color: cat?.color || '#868e96',
        total: 0,
        percentage: 0,
        transaction_count: 0,
      };
    }
    grouped[catId].total += tx.amount || 0;
    grouped[catId].transaction_count += 1;
  }

  const catBreakdown = Object.values(grouped).map(c => ({
    ...c,
    percentage: totalExpenses > 0 ? Math.round((c.total / totalExpenses) * 1000) / 10 : 0,
  }));

  return {
    trip,
    total_expenses: totalExpenses,
    transaction_count: (txns || []).length,
    category_breakdown: catBreakdown,
  };
}
