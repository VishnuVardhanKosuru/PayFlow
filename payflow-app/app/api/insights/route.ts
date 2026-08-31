import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/insights?month=YYYY-MM
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const month = new URL(request.url).searchParams.get('month');
  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json({ error: 'month param required (YYYY-MM)' }, { status: 400 });
  }

  const [year, mon] = month.split('-').map(Number);
  const lastDay  = new Date(year, mon, 0).getDate();
  const startDate = `${month}-01T00:00:00+05:30`;
  const endDate   = `${month}-${String(lastDay).padStart(2,'0')}T23:59:59+05:30`;

  // Previous month
  const prevDate = new Date(year, mon - 2, 1);
  const prevMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
  const prevLastDay = new Date(prevDate.getFullYear(), prevDate.getMonth() + 1, 0).getDate();
  const prevStart = `${prevMonth}-01T00:00:00+05:30`;
  const prevEnd   = `${prevMonth}-${String(prevLastDay).padStart(2,'0')}T23:59:59+05:30`;

  const [currentTxns, prevTxns, incomeRes] = await Promise.all([
    supabase
      .from('transactions')
      .select('amount, category_id, category:categories(id,name,icon,color)')
      .eq('user_id', user.id)
      .eq('type', 'expense')
      .gte('occurred_at', startDate)
      .lte('occurred_at', endDate),
    supabase
      .from('transactions')
      .select('amount, category_id, category:categories(id,name,icon,color)')
      .eq('user_id', user.id)
      .eq('type', 'expense')
      .gte('occurred_at', prevStart)
      .lte('occurred_at', prevEnd),
    supabase
      .from('monthly_income')
      .select('amount')
      .eq('user_id', user.id)
      .eq('month', month),
  ]);

  const currentData = currentTxns.data || [];
  const prevData    = prevTxns.data    || [];
  const totalIncome = (incomeRes.data  || []).reduce((s, i) => s + (i.amount || 0), 0);
  const totalExpenses = currentData.reduce((s, t) => s + (t.amount || 0), 0);
  const remaining   = totalIncome - totalExpenses;
  const savingsRate = totalIncome > 0 ? (remaining / totalIncome) * 100 : 0;

  // Category breakdown — current month
  const catMap: Record<string, { name: string; icon: string; color: string; total: number; count: number }> = {};
  for (const tx of currentData) {
    const cat = Array.isArray(tx.category) ? tx.category[0] : tx.category;
    const key = tx.category_id || 'uncategorized';
    if (!catMap[key]) {
      catMap[key] = { name: cat?.name || 'Uncategorized', icon: cat?.icon || '📌', color: cat?.color || '#868e96', total: 0, count: 0 };
    }
    catMap[key].total += tx.amount || 0;
    catMap[key].count += 1;
  }

  const categoryBreakdown = Object.entries(catMap)
    .map(([id, c]) => ({
      category_id:    id,
      category_name:  c.name,
      category_icon:  c.icon,
      category_color: c.color,
      total:          Math.round(c.total * 100) / 100,
      percentage:     totalExpenses > 0 ? Math.round((c.total / totalExpenses) * 1000) / 10 : 0,
      transaction_count: c.count,
    }))
    .sort((a, b) => b.total - a.total);

  // Previous month map
  const prevCatMap: Record<string, number> = {};
  for (const tx of prevData) {
    const key = tx.category_id || 'uncategorized';
    prevCatMap[key] = (prevCatMap[key] || 0) + (tx.amount || 0);
  }

  // Month-over-month
  const monthOverMonth = categoryBreakdown.map(curr => {
    const prevTotal = prevCatMap[curr.category_id] || 0;
    let changePercentage: number | null = null;
    let direction: 'up' | 'down' | 'new' | 'same' = 'same';

    if (prevTotal === 0 && curr.total > 0) {
      direction = 'new';
    } else if (prevTotal > 0) {
      changePercentage = Math.round(((curr.total - prevTotal) / prevTotal) * 1000) / 10;
      direction = changePercentage > 0 ? 'up' : changePercentage < 0 ? 'down' : 'same';
    }

    return {
      category_id:           curr.category_id,
      category_name:         curr.category_name,
      category_icon:         curr.category_icon,
      category_color:        curr.category_color,
      current_month_total:   curr.total,
      previous_month_total:  Math.round(prevTotal * 100) / 100,
      change_percentage:     changePercentage,
      change_direction:      direction,
    };
  });

  // Alerts
  const alerts = [];
  if (totalIncome > 0) {
    if (savingsRate < 0) {
      alerts.push({ type: 'savings_low', message: `You've overspent by ₹${Math.abs(remaining).toLocaleString('en-IN')} this month!`, severity: 'danger' });
    } else if (savingsRate < 10) {
      alerts.push({ type: 'savings_low', message: `Savings rate is ${savingsRate.toFixed(1)}% — consider cutting discretionary spend.`, severity: 'warning' });
    }
    for (const cat of categoryBreakdown) {
      if (cat.percentage > 40) {
        alerts.push({ type: 'category_high', message: `${cat.category_icon} ${cat.category_name} is ${cat.percentage}% of total spend this month.`, severity: 'info' });
        break;
      }
    }
  }

  return NextResponse.json({
    data: {
      month,
      summary: {
        total_income:      Math.round(totalIncome   * 100) / 100,
        total_expenses:    Math.round(totalExpenses * 100) / 100,
        remaining:         Math.round(remaining     * 100) / 100,
        savings_rate:      Math.round(savingsRate   * 10)  / 10,
        transaction_count: currentData.length,
      },
      category_breakdown: categoryBreakdown,
      month_over_month:   monthOverMonth,
      top_category:       categoryBreakdown[0] || null,
      alerts,
    }
  });
}
