import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import type { PipelinePlatform, PipelineStatus, CreatedVia } from '@/types/database';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const status = searchParams.get('status');
  const platform = searchParams.get('platform');
  const search = searchParams.get('search');

  let query = supabase.from('pipeline_cards').select('*').order('position', { ascending: true });

  if (status) query = query.eq('status', status);
  if (platform) query = query.eq('platform', platform);
  if (search) query = query.ilike('content', `%${search}%`);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ cards: data });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    platform,
    status = 'idea',
    content,
    hashtags,
    notes,
    source_ids,
    created_via = 'manual',
  } = body as {
    platform: PipelinePlatform;
    status?: PipelineStatus;
    content: string;
    hashtags?: string[];
    notes?: string;
    source_ids?: string[];
    created_via?: CreatedVia;
  };

  // Get max position in this column
  const { data: existing } = await supabase
    .from('pipeline_cards')
    .select('position')
    .eq('status', status)
    .order('position', { ascending: false })
    .limit(1);

  const position = existing && existing.length > 0 ? existing[0].position + 1 : 0;

  const { data, error } = await supabase
    .from('pipeline_cards')
    .insert({ platform, status, content, hashtags, notes, source_ids, created_via, position })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ card: data });
}
