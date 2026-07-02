import { supabase } from '@/lib/supabase';
import { generateWithAI, summarizeWithAI, type Secrets } from '@/lib/ai-provider';
import type { Source, PipelinePlatform, DraftCard } from '@/types/database';

// ──────────────────────────────────────────────────────────
// Keyword-based relevance scoring
// ──────────────────────────────────────────────────────────
function scoreSource(query: string, source: Source): number {
  const queryWords = query.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
  const text = `${source.summary || ''} ${source.raw_text?.slice(0, 500) || ''} ${source.kind}`.toLowerCase();

  let score = 0;
  for (const word of queryWords) {
    if (text.includes(word)) score += 2;
  }

  // Recency bonus
  const ageDays = (Date.now() - new Date(source.created_at).getTime()) / (1000 * 60 * 60 * 24);
  score += Math.max(0, 10 - ageDays);

  return score;
}

// ──────────────────────────────────────────────────────────
// Source retrieval
// ──────────────────────────────────────────────────────────
export async function retrieveSources(query: string, maxSources = 8): Promise<Source[]> {
  const { data: sources } = await supabase
    .from('sources')
    .select('*')
    .eq('status', 'ready')
    .order('created_at', { ascending: false });

  if (!sources || sources.length === 0) return [];

  const instructions = (sources as Source[]).filter((s: Source) => s.kind === 'instruction');
  const rest = (sources as Source[]).filter((s: Source) => s.kind !== 'instruction');

  const scored = rest.map((s: Source) => ({ source: s, score: scoreSource(query, s) }));
  scored.sort((a, b) => b.score - a.score);

  const topRest = scored.slice(0, maxSources - instructions.length).map((s) => s.source);
  return [...instructions, ...topRest];
}

// ──────────────────────────────────────────────────────────
// System prompt assembly
// ──────────────────────────────────────────────────────────
export function buildSystemPrompt(sources: Source[], platform: PipelinePlatform): string {
  const instructions = sources.filter((s) => s.kind === 'instruction');
  const voice = sources.filter((s) => s.kind === 'voice_sample');
  const competitors = sources.filter((s) => s.kind === 'competitor_link');
  const inspired = sources.filter((s) => s.kind === 'inspired_link');
  const knowledge = sources.filter((s) => s.kind === 'knowledge_base');

  const parts: string[] = [];

  parts.push(
    `You are a professional content writer helping create ${platform === 'instagram' ? 'Instagram captions' : 'LinkedIn posts'}. You write grounded, specific content — not generic AI output.`
  );

  if (instructions.length > 0) {
    parts.push(`\n## HARD WRITING RULES (always follow these — no exceptions)\n${instructions.map((s) => `- ${s.raw_text}`).join('\n')}`);
  }

  if (voice.length > 0) {
    parts.push(`\n## VOICE SAMPLES (match this tone and style exactly)\n${voice.map((s) => `---\n${s.raw_text}`).join('\n')}`);
  }

  if (competitors.length > 0) {
    parts.push(`\n## COMPETITOR CONTENT (study STRUCTURE and FORMAT only — never copy topics, wording, or ideas)\n${competitors.map((s) => `---\nSource: ${s.url || 'uploaded file'}\n${s.raw_text?.slice(0, 1200)}`).join('\n')}`);
  }

  if (inspired.length > 0) {
    parts.push(`\n## INSPIRATION CONTENT (study STRUCTURE and FORMAT only)\n${inspired.map((s) => `---\nSource: ${s.url || 'uploaded file'}\n${s.raw_text?.slice(0, 1200)}`).join('\n')}`);
  }

  if (knowledge.length > 0) {
    parts.push(`\n## KNOWLEDGE BASE (general context, facts, and notes to draw on)\n${knowledge.map((s) => `---\n${s.raw_text}`).join('\n')}`);
  }

  if (platform === 'instagram') {
    parts.push(`\n## INSTAGRAM FORMATTING RULES
- Hook in the first ~125 characters — this is the only text visible before "more"
- Short paragraphs with line breaks
- Group hashtags at the very end
- Emoji sparingly — 0-2 per post
- Caption limit: ~2,200 characters
- Return each draft wrapped in a <draft> tag containing JSON: {"hook":"...","body":"...","hashtags":["#tag1","#tag2"]}`);
  } else {
    parts.push(`\n## LINKEDIN FORMATTING RULES
- First line critical — readers see only ~210 chars before "see more"
- 1-2 sentence paragraphs, line breaks between each
- 3-5 hashtags max, grouped at end
- Professional but human — not corporate speak
- Post limit: ~3,000 characters
- Return each draft wrapped in a <draft> tag containing JSON: {"body":"..."}`);
  }

  return parts.join('\n');
}

// ──────────────────────────────────────────────────────────
// User message → draft generation prompt
// ──────────────────────────────────────────────────────────
export function buildUserPrompt(userRequest: string, platform: PipelinePlatform): string {
  const draftsInstruction =
    platform === 'instagram'
      ? `Generate 1-3 Instagram caption drafts. For each draft, return a <draft> tag containing JSON like:\n{"hook":"The opening line","body":"The full body text","hashtags":["#tag1","#tag2"]}`
      : `Generate 1-3 LinkedIn post drafts. For each draft, return a <draft> tag containing JSON like:\n{"body":"The full post text"}`;

  return `${userRequest}\n\n${draftsInstruction}\n\nWrite drafts that are specific and grounded — never generic. Use the knowledge base and voice samples to anchor the content. Study competitor/inspired content for structure only, not topic.`;
}

// ──────────────────────────────────────────────────────────
// Parse Claude/AI response into draft cards
// ──────────────────────────────────────────────────────────
export function parseDrafts(
  responseText: string,
  platform: PipelinePlatform,
  sourceIds: string[]
): DraftCard[] {
  const drafts: DraftCard[] = [];
  const draftMatches = responseText.matchAll(/<draft>([\s\S]*?)<\/draft>/g);

  for (const match of draftMatches) {
    try {
      const json = JSON.parse(match[1].trim());
      drafts.push({
        id: Math.random().toString(36).slice(2),
        platform,
        hook: json.hook || undefined,
        body: json.body || json.content || '',
        hashtags: json.hashtags || undefined,
        source_ids: sourceIds,
      });
    } catch {
      const body = match[1].trim();
      if (body.length > 20) {
        drafts.push({ id: Math.random().toString(36).slice(2), platform, body, source_ids: sourceIds });
      }
    }
  }

  // Fallback: no <draft> tags
  if (drafts.length === 0) {
    const sections = responseText.split(/\n---+\n|^#+\s+Draft \d+/m).filter(Boolean);
    for (const section of sections.slice(0, 3)) {
      const trimmed = section.trim();
      if (trimmed.length > 30) {
        drafts.push({ id: Math.random().toString(36).slice(2), platform, body: trimmed, source_ids: sourceIds });
      }
    }
  }

  return drafts.slice(0, 3);
}

// ──────────────────────────────────────────────────────────
// Full pipeline
// ──────────────────────────────────────────────────────────
export async function generateDrafts(
  userContent: string,
  platform: PipelinePlatform,
  secrets: Secrets
) {
  const sources = await retrieveSources(userContent);
  const sourceIds = sources.map((s) => s.id);
  const systemPrompt = buildSystemPrompt(sources, platform);
  const userPrompt = buildUserPrompt(userContent, platform);

  const result = await generateWithAI(systemPrompt, userPrompt, secrets);
  const drafts = parseDrafts(result.text, platform, sourceIds);

  return { drafts, sources_used: sources.length, cost_usd: result.cost_usd, provider: result.provider, model: result.model };
}

export { summarizeWithAI };
