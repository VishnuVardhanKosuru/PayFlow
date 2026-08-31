import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { CreateTransactionPayload } from '@/lib/types';

// Force dynamic rendering — never cache this route on Vercel edge
export const dynamic = 'force-dynamic';

// GET /api/transactions — list with optional filters
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const month    = searchParams.get('month');
  const category = searchParams.get('category_id');
  const trip     = searchParams.get('trip_id');
  const type     = searchParams.get('type');
  const search   = searchParams.get('search');
  const limit    = parseInt(searchParams.get('limit') || '50');
  const offset   = parseInt(searchParams.get('offset') || '0');

  let query = supabase
    .from('transactions')
    .select('*, category:categories(id,name,icon,color), trip:trips(id,name)')
    .eq('user_id', user.id)
    .order('occurred_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (month) {
    const [year, mon] = month.split('-').map(Number);
    const lastDay = new Date(year, mon, 0).getDate();
    query = query
      .gte('occurred_at', `${month}-01T00:00:00+05:30`)
      .lte('occurred_at', `${month}-${lastDay}T23:59:59+05:30`);
  }
  if (category) query = query.eq('category_id', category);
  if (trip)     query = query.eq('trip_id', trip);
  if (type)     query = query.eq('type', type);
  if (search)   query = query.ilike('description', `%${search}%`);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data });
}

// POST /api/transactions — create
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body: CreateTransactionPayload = await request.json();

  // Validate required fields
  if (!body.amount || body.amount <= 0) {
    return NextResponse.json({ error: 'A valid positive amount is required' }, { status: 400 });
  }
  if (!body.type || !['income', 'expense'].includes(body.type)) {
    return NextResponse.json({ error: 'Type must be income or expense' }, { status: 400 });
  }

  // Idempotency check
  if (body.idempotency_key) {
    const { data: existing } = await supabase
      .from('transactions')
      .select('id')
      .eq('user_id', user.id)
      .eq('idempotency_key', body.idempotency_key)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ data: existing, idempotent: true }, { status: 200 });
    }
  }

  const { data, error } = await supabase
    .from('transactions')
    .insert({
      user_id:         user.id,
      type:            body.type,
      amount:          body.amount,
      description:     body.description || null,
      category_id:     body.category_id || null,
      trip_id:         body.trip_id || null,
      merchant:        body.merchant || null,
      occurred_at:     body.occurred_at || new Date().toISOString(),
      source:          body.source || 'WEB',
      idempotency_key: body.idempotency_key || null,
    })
    .select('*, category:categories(id,name,icon,color), trip:trips(id,name)')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data }, { status: 201 });
}
