import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { generateDrafts } from '@/lib/generation';
import { detectProvider } from '@/lib/ai-provider';
import type { PipelinePlatform } from '@/types/database';
import type { Secrets } from '@/lib/ai-provider';

interface ParsedMessage {
  id: string;
  created_at: string;
  role: string;
  type: string | null;
  conversation_id: string;
  text: string;
  drafts?: any[] | null;
  provider?: string | null;
  model?: string | null;
  title?: string | null;
}

// Helper to parse message JSON content with backward-compatibility for legacy plain text
function parseMessage(row: any): ParsedMessage {
  try {
    const parsed = JSON.parse(row.content);
    if (parsed && typeof parsed === 'object') {
      return {
        id: row.id,
        created_at: row.created_at,
        role: row.role,
        type: parsed.type || null,
        conversation_id: parsed.conversation_id || 'archive',
        text: parsed.text || '',
        drafts: parsed.drafts || null,
        provider: parsed.provider || null,
        model: parsed.model || null,
        title: parsed.title || null,
      };
    }
  } catch {
    // Fallback: not JSON, treat as legacy message
  }
  return {
    id: row.id,
    created_at: row.created_at,
    role: row.role,
    type: null,
    conversation_id: 'archive',
    text: row.content,
  };
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const targetId = searchParams.get('conversationId');

  const { data, error } = await supabase
    .from('chat_messages')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const parsed: ParsedMessage[] = (data || []).map(parseMessage);

  // Group into conversations list
  const conversationsMap = new Map<string, { id: string; title: string; updated_at: string }>();

  // Check if there are legacy messages to instantiate the Archive thread
  const hasLegacy = parsed.some(m => m.conversation_id === 'archive' && m.type !== 'conversation_meta');
  if (hasLegacy) {
    conversationsMap.set('archive', {
      id: 'archive',
      title: 'Archive Thread',
      updated_at: new Date(0).toISOString(),
    });
  }

  // Pass 1: Extract all explicit metadata rows
  for (const m of parsed) {
    if (m.type === 'conversation_meta' && m.conversation_id) {
      conversationsMap.set(m.conversation_id, {
        id: m.conversation_id,
        title: m.title || 'Untitled Conversation',
        updated_at: m.created_at,
      });
    }
  }

  // Pass 2: Calculate updated_at timestamps, and backfill titles for threads without meta rows
  for (const m of parsed) {
    if (m.type !== 'conversation_meta' && m.conversation_id) {
      const existing = conversationsMap.get(m.conversation_id);
      if (existing) {
        if (new Date(m.created_at) > new Date(existing.updated_at)) {
          existing.updated_at = m.created_at;
        }
      } else {
        conversationsMap.set(m.conversation_id, {
          id: m.conversation_id,
          title: m.text ? m.text.slice(0, 30) + '...' : 'Conversation ' + m.conversation_id.slice(0, 5),
          updated_at: m.created_at,
        });
      }
    }
  }

  const conversations = Array.from(conversationsMap.values()).sort(
    (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  );

  // Filter messages for active conversation
  const activeId = targetId || (conversations.length > 0 ? conversations[0].id : null);
  const activeMessages = activeId
    ? parsed.filter(m => m.conversation_id === activeId && m.type !== 'conversation_meta')
    : [];

  return NextResponse.json({
    conversations,
    activeId,
    messages: activeMessages,
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { content, platform = 'linkedin', conversationId } = body as {
    content: string;
    platform: PipelinePlatform;
    conversationId?: string;
  };

  if (!content?.trim()) {
    return NextResponse.json({ error: 'Message content is required' }, { status: 400 });
  }

  // Resolve or create conversation
  let activeId = conversationId;
  if (!activeId) {
    activeId = 'conv_' + Math.random().toString(36).slice(2, 11);
  }

  const { data: settings } = await supabase.from('app_settings').select('secrets').eq('id', 1).single();
  const secrets = (settings?.secrets as Secrets) || {};

  const provider = detectProvider(secrets);
  if (!provider) {
    return NextResponse.json({
      error: 'No AI provider configured. Please add an API key in Settings (Anthropic, OpenAI, Gemini, or OpenRouter).',
    }, { status: 422 });
  }

  // Check if conversation metadata exists; if not, create it
  if (activeId !== 'archive') {
    const { data: existingMeta } = await supabase
      .from('chat_messages')
      .select('id')
      .like('content', `%"type":"conversation_meta"%"conversation_id":"${activeId}"%`)
      .limit(1);

    if (!existingMeta || existingMeta.length === 0) {
      const title = content.slice(0, 30) + (content.length > 30 ? '...' : '');
      await supabase.from('chat_messages').insert({
        role: 'assistant',
        content: JSON.stringify({
          type: 'conversation_meta',
          conversation_id: activeId,
          title: title,
        }),
      });
    }
  }

  // Insert user message
  await supabase.from('chat_messages').insert({
    role: 'user',
    content: JSON.stringify({ text: content, conversation_id: activeId }),
  });

  try {
    const { drafts, sources_used, cost_usd, provider: usedProvider, model } = await generateDrafts(content, platform, secrets);

    // Insert assistant message
    await supabase.from('chat_messages').insert({
      role: 'assistant',
      content: JSON.stringify({ drafts, provider: usedProvider, model, conversation_id: activeId }),
    });

    await supabase.from('generation_runs').insert({
      prompt: content,
      sources_used: [],
      cost_usd,
    });

    return NextResponse.json({ drafts, sources_used, provider: usedProvider, model, conversationId: activeId });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Generation failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { conversationId, title } = body as { conversationId: string; title: string };

  if (!conversationId || !title?.trim()) {
    return NextResponse.json({ error: 'conversationId and title are required' }, { status: 400 });
  }

  // Find the metadata row for this conversationId
  const { data, error } = await supabase
    .from('chat_messages')
    .select('*')
    .like('content', `%"type":"conversation_meta"%"conversation_id":"${conversationId}"%`)
    .limit(1);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (data && data.length > 0) {
    const metaRow = data[0];
    const updatedContent = JSON.stringify({
      type: 'conversation_meta',
      conversation_id: conversationId,
      title: title.trim(),
    });

    const { error: updateError } = await supabase
      .from('chat_messages')
      .update({ content: updatedContent })
      .eq('id', metaRow.id);

    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });
  } else {
    // If no metadata row exists, create one
    const { error: insertError } = await supabase.from('chat_messages').insert({
      role: 'assistant',
      content: JSON.stringify({
        type: 'conversation_meta',
        conversation_id: conversationId,
        title: title.trim(),
      }),
    });
    if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const conversationId = searchParams.get('conversationId');

  if (!conversationId) {
    return NextResponse.json({ error: 'conversationId is required' }, { status: 400 });
  }

  // Fetch all messages, filter matches in JS, and delete
  const { data, error } = await supabase
    .from('chat_messages')
    .select('id, content');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const idsToDelete: string[] = [];
  for (const row of data || []) {
    try {
      const parsed = JSON.parse(row.content);
      if (parsed.conversation_id === conversationId) {
        idsToDelete.push(row.id);
      }
    } catch {
      // Legacy messages
      if (conversationId === 'archive') {
        idsToDelete.push(row.id);
      }
    }
  }

  if (idsToDelete.length > 0) {
    const { error: deleteError } = await supabase
      .from('chat_messages')
      .delete()
      .in('id', idsToDelete);

    if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
