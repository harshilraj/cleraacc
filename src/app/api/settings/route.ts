import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

const ALLOWED_KEYS = [
  'anthropic_api_key',
  'openai_api_key',
  'gemini_api_key',
  'openrouter_api_key',
  'openrouter_model',
  'apify_api_token',
] as const;

type AllowedKey = typeof ALLOWED_KEYS[number];

function maskKey(key: string): string {
  if (!key || key.length < 8) return '••••••••';
  return key.slice(0, 4) + '••••••••' + key.slice(-4);
}

export async function GET() {
  const { data, error } = await supabase
    .from('app_settings')
    .select('secrets')
    .eq('id', 1)
    .single();

  if (error || !data) {
    return NextResponse.json({
      anthropic_configured: false,
      anthropic_preview: null,
      openai_configured: false,
      openai_preview: null,
      gemini_configured: false,
      gemini_preview: null,
      openrouter_configured: false,
      openrouter_preview: null,
      openrouter_model: null,
      apify_configured: false,
      apify_preview: null,
    });
  }

  const s = data.secrets as Record<string, string>;
  return NextResponse.json({
    anthropic_configured: !!s.anthropic_api_key,
    anthropic_preview: s.anthropic_api_key ? maskKey(s.anthropic_api_key) : null,
    openai_configured: !!s.openai_api_key,
    openai_preview: s.openai_api_key ? maskKey(s.openai_api_key) : null,
    gemini_configured: !!s.gemini_api_key,
    gemini_preview: s.gemini_api_key ? maskKey(s.gemini_api_key) : null,
    openrouter_configured: !!s.openrouter_api_key,
    openrouter_preview: s.openrouter_api_key ? maskKey(s.openrouter_api_key) : null,
    openrouter_model: s.openrouter_model || null,
    apify_configured: !!s.apify_api_token,
    apify_preview: s.apify_api_token ? maskKey(s.apify_api_token) : null,
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { key, value } = body as { key: AllowedKey; value: string };

  if (!ALLOWED_KEYS.includes(key)) {
    return NextResponse.json({ error: 'Invalid key name' }, { status: 400 });
  }

  const { data: current } = await supabase
    .from('app_settings')
    .select('secrets')
    .eq('id', 1)
    .single();

  const existing = (current?.secrets as Record<string, string>) || {};
  const updated = { ...existing };

  if (value) {
    updated[key] = value;
  } else {
    delete updated[key];
  }

  const { error } = await supabase
    .from('app_settings')
    .upsert({ id: 1, secrets: updated });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Return masked preview for key types; plain value for model field
  const preview = key === 'openrouter_model'
    ? value
    : (value ? maskKey(value) : null);

  return NextResponse.json({ ok: true, preview });
}
