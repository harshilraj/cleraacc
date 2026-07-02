import { supabase } from '@/lib/supabase';
import { summarizeWithAI, type Secrets } from '@/lib/ai-provider';

const LOGIN_WALL_SIGNALS = [
  'log in to see more',
  'sign up to continue',
  'log in to continue',
  'please log in',
  'create an account',
  'join to view',
  'sign in to view',
  'register to continue',
  'subscribe to read',
];

export async function extractWithJina(url: string): Promise<{ ok: boolean; text?: string; error?: string }> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    const res = await fetch(`https://r.jina.ai/${encodeURIComponent(url)}`, {
      headers: { Accept: 'text/plain', 'X-Return-Format': 'text' },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) return { ok: false, error: `Jina returned HTTP ${res.status}` };

    const text = await res.text();
    if (!text || text.trim().length < 100) return { ok: false, error: 'Extracted text too short (< 100 chars)' };

    const lower = text.toLowerCase();
    for (const signal of LOGIN_WALL_SIGNALS) {
      if (lower.includes(signal)) return { ok: false, error: `Login wall detected: "${signal}"` };
    }

    return { ok: true, text: text.trim() };
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'AbortError') return { ok: false, error: 'Jina Reader timed out (20s)' };
    return { ok: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function extractWithApify(
  url: string,
  platform: string,
  apiToken: string
): Promise<{ ok: boolean; text?: string; error?: string }> {
  try {
    const { ApifyClient } = await import('apify-client');
    const client = new ApifyClient({ token: apiToken });

    const actorId = platform === 'instagram' ? 'apify/instagram-post-scraper' : 'apify/website-content-crawler';
    const input = platform === 'instagram' ? { directUrls: [url], resultsLimit: 1 } : { startUrls: [{ url }], maxCrawlPages: 1 };

    const run = await client.actor(actorId).call(input, { waitSecs: 90 });
    const { items } = await client.dataset(run.defaultDatasetId).listItems();

    if (!items || items.length === 0) return { ok: false, error: 'Apify returned no results' };

    const item = items[0] as Record<string, unknown>;
    const text: string =
      (item.caption as string) || (item.text as string) || (item.content as string) || (item.body as string) || JSON.stringify(item);

    if (!text || text.trim().length < 50) return { ok: false, error: 'Apify returned insufficient content' };
    return { ok: true, text: text.trim() };
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : 'Apify error' };
  }
}

export async function runExtractionPipeline(sourceId: string) {
  const { data: source, error: fetchErr } = await supabase.from('sources').select('*').eq('id', sourceId).single();
  if (fetchErr || !source) return;

  const { data: settings } = await supabase.from('app_settings').select('secrets').eq('id', 1).single();
  const secrets = (settings?.secrets as Secrets) || {};

  await supabase.from('sources').update({ status: 'pending' }).eq('id', sourceId);

  let rawText: string | null = null;
  let extractionMethod: string | null = null;
  let errorMessage: string | null = null;

  const jinaResult = await extractWithJina(source.url!);
  if (jinaResult.ok && jinaResult.text) {
    rawText = jinaResult.text;
    extractionMethod = 'jina';
  } else {
    errorMessage = jinaResult.error || 'Jina failed';

    if (secrets.apify_api_token) {
      const apifyResult = await extractWithApify(source.url!, source.platform, secrets.apify_api_token);
      if (apifyResult.ok && apifyResult.text) {
        rawText = apifyResult.text;
        extractionMethod = 'apify';
        errorMessage = null;
      } else {
        errorMessage = `Jina: ${errorMessage}. Apify: ${apifyResult.error || 'failed'}`;
      }
    }
  }

  if (rawText) {
    const summary = await summarizeWithAI(rawText, secrets);
    await supabase.from('sources').update({
      raw_text: rawText,
      summary: summary || null,
      status: 'ready',
      extraction_method: extractionMethod,
      error_message: null,
    }).eq('id', sourceId);
  } else {
    await supabase.from('sources').update({
      status: 'failed',
      error_message: errorMessage,
    }).eq('id', sourceId);
  }
}
