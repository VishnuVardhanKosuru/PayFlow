import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { parseVoiceInput } from '@/lib/voice-parser';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const text = (searchParams.get('text') || searchParams.get('voice') || '').trim();

  if (!text) {
    return NextResponse.json({ error: 'text query parameter is required' }, { status: 400 });
  }

  return processParse(text);
}

// POST /api/voice-parse — deterministic NLP parser
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const text = (body.text || body.voice || '').trim();

  if (!text) {
    return NextResponse.json({ error: 'text is required' }, { status: 400 });
  }

  return processParse(text);
}

async function processParse(text: string) {
  let categories: any[] = [];
  let trips: any[] = [];

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      const [catsRes, tripsRes] = await Promise.all([
        supabase.from('categories').select('*').eq('user_id', user.id).eq('is_active', true),
        supabase.from('trips').select('*').eq('user_id', user.id).eq('is_active', true),
      ]);
      categories = catsRes.data || [];
      trips = tripsRes.data || [];
    }
  } catch {
    // If unauthenticated or offline, parser uses internal dictionary
  }

  const result = parseVoiceInput(text, categories, trips);
  return NextResponse.json({ data: result });
}
