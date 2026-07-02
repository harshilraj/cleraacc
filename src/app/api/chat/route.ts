import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { generateDrafts } from '@/lib/generation';
import { detectProvider } from '@/lib/ai-provider';
import type { PipelinePlatform } from '@/types/database';
import type { Secrets } from '@/lib/ai-provider';

export async function GET() {
  const { data, error } = await supabase
    .from('chat_messages')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ messages: data });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { content, platform = 'linkedin' } = body as { content: string; platform: PipelinePlatform };

  if (!content?.trim()) {
    return NextResponse.json({ error: 'Message content is required' }, { status: 400 });
  }

  const { data: settings } = await supabase.from('app_settings').select('secrets').eq('id', 1).single();
  const secrets = (settings?.secrets as Secrets) || {};

  const provider = detectProvider(secrets);
  if (!provider) {
    return NextResponse.json({
      error: 'No AI provider configured. Please add an API key in Settings (Anthropic, OpenAI, Gemini, or OpenRouter).',
    }, { status: 422 });
  }

  await supabase.from('chat_messages').insert({ role: 'user', content });

  try {
    const { drafts, sources_used, cost_usd, provider: usedProvider, model } = await generateDrafts(content, platform, secrets);

    await supabase.from('chat_messages').insert({
      role: 'assistant',
      content: JSON.stringify({ drafts, provider: usedProvider, model }),
    });

    await supabase.from('generation_runs').insert({
      prompt: content,
      sources_used: [],
      cost_usd,
    });

    return NextResponse.json({ drafts, sources_used, provider: usedProvider, model });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Generation failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
