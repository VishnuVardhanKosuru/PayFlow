import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { parseVoiceInput } from '@/lib/voice-parser';

// POST /api/voice-parse — deterministic NLP parser
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const text = (body.text || '').trim();

  if (!text) {
    return NextResponse.json({ error: 'text is required' }, { status: 400 });
  }

  // Fetch user categories and active trips for context
  const [catsRes, tripsRes] = await Promise.all([
    supabase.from('categories').select('*').eq('user_id', user.id).eq('is_active', true),
    supabase.from('trips').select('*').eq('user_id', user.id).eq('is_active', true),
  ]);

  const categories = catsRes.data || [];
  const trips      = tripsRes.data || [];

  const result = parseVoiceInput(text, categories, trips);

  return NextResponse.json({ data: result });
}
