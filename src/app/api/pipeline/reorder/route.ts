import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Batch update status + position after a drag-and-drop operation
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { updates } = body as {
    updates: Array<{ id: string; status: string; position: number }>;
  };

  if (!updates || !Array.isArray(updates)) {
    return NextResponse.json({ error: 'Invalid updates array' }, { status: 400 });
  }

  // Run all updates in parallel
  const promises = updates.map(({ id, status, position }) =>
    supabase.from('pipeline_cards').update({ status, position }).eq('id', id)
  );

  const results = await Promise.all(promises);
  const errors = results.filter((r) => r.error);

  if (errors.length > 0) {
    return NextResponse.json({ error: 'Some updates failed', details: errors.map((r) => r.error?.message) }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
