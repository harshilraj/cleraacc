import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { runExtractionPipeline } from '@/lib/extraction';
import type { SourceKind, SourcePlatform } from '@/types/database';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const kind = searchParams.get('kind');

  let query = supabase.from('sources').select('*').order('created_at', { ascending: false });
  if (kind) query = query.eq('kind', kind);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ sources: data });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { kind, platform, url, raw_text } = body as {
    kind: SourceKind;
    platform: SourcePlatform;
    url?: string;
    raw_text?: string;
  };

  const isLinkKind = kind === 'competitor_link' || kind === 'inspired_link';

  const { data: source, error } = await supabase
    .from('sources')
    .insert({
      kind,
      platform: platform || 'both',
      url: isLinkKind ? url : null,
      raw_text: !isLinkKind ? raw_text : null,
      status: isLinkKind ? 'pending' : 'ready',
      extraction_method: !isLinkKind ? 'manual' : null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Kick off async extraction for link types (fire-and-forget)
  if (isLinkKind && source.url) {
    runExtractionPipeline(source.id).catch(console.error);
  }

  return NextResponse.json({ source });
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const { error } = await supabase.from('sources').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { id, raw_text, summary } = body;
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const updates: Record<string, unknown> = {};
  if (raw_text !== undefined) updates.raw_text = raw_text;
  if (summary !== undefined) updates.summary = summary;
  if (raw_text !== undefined) updates.status = 'ready';
  if (raw_text !== undefined) updates.extraction_method = 'manual';

  const { data, error } = await supabase
    .from('sources')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ source: data });
}
