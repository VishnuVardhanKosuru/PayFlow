import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// Force dynamic rendering — never cache this route on Vercel edge
export const dynamic = 'force-dynamic';

// GET /api/summary?month=YYYY-MM
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const month = new URL(request.url).searchParams.get('month');
  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json({ error: 'month param required (YYYY-MM)' }, { status: 400 });
  }

  const [year, mon] = month.split('-').map(Number);
  const lastDay = new Date(year, mon, 0).getDate();
  const startDate = `${month}-01T00:00:00+05:30`;
  const endDate   = `${month}-${String(lastDay).padStart(2,'0')}T23:59:59+05:30`;

  const [expensesRes, incomeFromTableRes, incomeFromTxnsRes] = await Promise.all([
    // Expenses — from transactions table
    supabase
      .from('transactions')
      .select('amount')
      .eq('user_id', user.id)
      .eq('type', 'expense')
      .gte('occurred_at', startDate)
      .lte('occurred_at', endDate),
    // Income — from monthly_income table (added via /income page)
    supabase
      .from('monthly_income')
      .select('amount')
      .eq('user_id', user.id)
      .eq('month', month),
    // Income — from transactions table (added via /add page with type=income)
    supabase
      .from('transactions')
      .select('amount')
      .eq('user_id', user.id)
      .eq('type', 'income')
      .gte('occurred_at', startDate)
      .lte('occurred_at', endDate),
  ]);

  if (expensesRes.error)        return NextResponse.json({ error: expensesRes.error.message },        { status: 500 });
  if (incomeFromTableRes.error) return NextResponse.json({ error: incomeFromTableRes.error.message }, { status: 500 });
  if (incomeFromTxnsRes.error)  return NextResponse.json({ error: incomeFromTxnsRes.error.message },  { status: 500 });

  const totalExpenses    = (expensesRes.data        || []).reduce((s, t) => s + (t.amount || 0), 0);
  const incomeFromTable  = (incomeFromTableRes.data  || []).reduce((s, i) => s + (i.amount || 0), 0);
  const incomeFromTxns   = (incomeFromTxnsRes.data   || []).reduce((s, t) => s + (t.amount || 0), 0);
  // Combine both income sources so /add (💰 Income) and /income page both count
  const totalIncome      = incomeFromTable + incomeFromTxns;
  const remaining        = totalIncome - totalExpenses;
  const savingsRate      = totalIncome > 0 ? (remaining / totalIncome) * 100 : 0;

  return NextResponse.json({
    data: {
      month,
      total_income:      Math.round(totalIncome   * 100) / 100,
      total_expenses:    Math.round(totalExpenses * 100) / 100,
      remaining:         Math.round(remaining     * 100) / 100,
      savings_rate:      Math.round(savingsRate   * 10)  / 10,
      transaction_count: (expensesRes.data || []).length,
    }
  });
}
