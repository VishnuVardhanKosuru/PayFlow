import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { UpdateTransactionPayload } from '@/lib/types';

// PATCH /api/transactions/[id]
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const body: UpdateTransactionPayload = await request.json();

  // Validate amount if provided
  if (body.amount !== undefined && body.amount <= 0) {
    return NextResponse.json({ error: 'Amount must be positive' }, { status: 400 });
  }

  const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.amount !== undefined)      updateData.amount      = body.amount;
  if (body.description !== undefined) updateData.description = body.description;
  if (body.category_id !== undefined) updateData.category_id = body.category_id;
  if (body.trip_id !== undefined)     updateData.trip_id     = body.trip_id;
  if (body.merchant !== undefined)    updateData.merchant    = body.merchant;
  if (body.occurred_at !== undefined) updateData.occurred_at = body.occurred_at;

  const { data, error } = await supabase
    .from('transactions')
    .update(updateData)
    .eq('id', id)
    .eq('user_id', user.id)
    .select('*, category:categories(id,name,icon,color), trip:trips(id,name)')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });

  return NextResponse.json({ data });
}

// DELETE /api/transactions/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  const { error } = await supabase
    .from('transactions')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
