import type { PipelinePlatform } from '@/types/database';

export type AIProvider = 'anthropic' | 'openai' | 'gemini' | 'openrouter';

export interface Secrets {
  anthropic_api_key?: string;
  openai_api_key?: string;
  gemini_api_key?: string;
  openrouter_api_key?: string;
  apify_api_token?: string;
  openrouter_model?: string;
}

export interface GenerationResult {
  text: string;
  cost_usd: number;
  provider: AIProvider;
  model: string;
}

// ──────────────────────────────────────────────────────────
// Detect which provider to use (priority order)
// ──────────────────────────────────────────────────────────
export function detectProvider(secrets: Secrets): AIProvider | null {
  if (secrets.anthropic_api_key) return 'anthropic';
  if (secrets.openai_api_key) return 'openai';
  if (secrets.gemini_api_key) return 'gemini';
  if (secrets.openrouter_api_key) return 'openrouter';
  return null;
}

// ──────────────────────────────────────────────────────────
// Anthropic (Claude)
// ──────────────────────────────────────────────────────────
async function callAnthropic(
  systemPrompt: string,
  userPrompt: string,
  apiKey: string
): Promise<GenerationResult> {
  const Anthropic = (await import('@anthropic-ai/sdk')).default;
  const client = new Anthropic({ apiKey });

  const model = 'claude-opus-4-5';
  const msg = await client.messages.create({
    model,
    max_tokens: 2048,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  });

  const text = msg.content[0].type === 'text' ? msg.content[0].text : '';
  const inputTokens = msg.usage?.input_tokens || 0;
  const outputTokens = msg.usage?.output_tokens || 0;
  // claude-opus-4-5: $15/M input, $75/M output
  const cost_usd = (inputTokens * 15 + outputTokens * 75) / 1_000_000;

  return { text, cost_usd, provider: 'anthropic', model };
}

// ──────────────────────────────────────────────────────────
// OpenAI (ChatGPT)
// ──────────────────────────────────────────────────────────
async function callOpenAI(
  systemPrompt: string,
  userPrompt: string,
  apiKey: string,
  baseURL?: string,
  model?: string
): Promise<GenerationResult> {
  const { OpenAI } = await import('openai');
  const client = new OpenAI({
    apiKey,
    ...(baseURL ? { baseURL } : {}),
  });

  const resolvedModel = model || 'gpt-4o';
  const response = await client.chat.completions.create({
    model: resolvedModel,
    max_tokens: 2048,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
  });

  const text = response.choices[0]?.message?.content || '';
  const inputTokens = response.usage?.prompt_tokens || 0;
  const outputTokens = response.usage?.completion_tokens || 0;
  // gpt-4o: $5/M input, $15/M output (approximate)
  const cost_usd = baseURL
    ? 0 // OpenRouter bills separately
    : (inputTokens * 5 + outputTokens * 15) / 1_000_000;

  return { text, cost_usd, provider: baseURL ? 'openrouter' : 'openai', model: resolvedModel };
}

// ──────────────────────────────────────────────────────────
// Google Gemini
// ──────────────────────────────────────────────────────────
async function callGemini(
  systemPrompt: string,
  userPrompt: string,
  apiKey: string
): Promise<GenerationResult> {
  const { GoogleGenerativeAI } = await import('@google/generative-ai');
  const genAI = new GoogleGenerativeAI(apiKey);

  const model = 'gemini-2.0-flash';
  const genModel = genAI.getGenerativeModel({
    model,
    systemInstruction: systemPrompt,
  });

  const result = await genModel.generateContent({
    contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
    generationConfig: { maxOutputTokens: 2048 },
  });

  const text = result.response.text();
  // gemini-2.0-flash: very cheap, approximate
  const inputTokens = result.response.usageMetadata?.promptTokenCount || 0;
  const outputTokens = result.response.usageMetadata?.candidatesTokenCount || 0;
  const cost_usd = (inputTokens * 0.1 + outputTokens * 0.4) / 1_000_000;

  return { text, cost_usd, provider: 'gemini', model };
}

// ──────────────────────────────────────────────────────────
// Unified generation call
// ──────────────────────────────────────────────────────────
export async function generateWithAI(
  systemPrompt: string,
  userPrompt: string,
  secrets: Secrets
): Promise<GenerationResult> {
  const provider = detectProvider(secrets);

  if (!provider) {
    throw new Error(
      'No AI provider configured. Please add an API key in Settings (Anthropic, OpenAI, Gemini, or OpenRouter).'
    );
  }

  switch (provider) {
    case 'anthropic':
      return callAnthropic(systemPrompt, userPrompt, secrets.anthropic_api_key!);

    case 'openai':
      return callOpenAI(systemPrompt, userPrompt, secrets.openai_api_key!);

    case 'gemini':
      return callGemini(systemPrompt, userPrompt, secrets.gemini_api_key!);

    case 'openrouter':
      return callOpenAI(
        systemPrompt,
        userPrompt,
        secrets.openrouter_api_key!,
        'https://openrouter.ai/api/v1',
        secrets.openrouter_model || 'anthropic/claude-3.5-sonnet'
      );
  }
}

// ──────────────────────────────────────────────────────────
// Quick summarization (uses cheapest available model)
// ──────────────────────────────────────────────────────────
export async function summarizeWithAI(text: string, secrets: Secrets): Promise<string> {
  const prompt = `Write a 2-3 sentence summary of this content, plus 2-3 structural tags (e.g. "hook: question", "format: listicle", "topic: automation"). Keep it under 150 words total. Respond only with the summary and tags, no preamble.\n\n---\n${text.slice(0, 3000)}`;

  try {
    // Prefer fastest/cheapest for summaries
    if (secrets.gemini_api_key) {
      const result = await callGemini('You are a concise content summarizer.', prompt, secrets.gemini_api_key);
      return result.text;
    }
    if (secrets.anthropic_api_key) {
      // Use Haiku for summaries (faster & cheaper)
      const Anthropic = (await import('@anthropic-ai/sdk')).default;
      const client = new Anthropic({ apiKey: secrets.anthropic_api_key });
      const msg = await client.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 200,
        messages: [{ role: 'user', content: prompt }],
      });
      return msg.content[0].type === 'text' ? msg.content[0].text : '';
    }
    if (secrets.openai_api_key) {
      const { OpenAI } = await import('openai');
      const client = new OpenAI({ apiKey: secrets.openai_api_key });
      const res = await client.chat.completions.create({
        model: 'gpt-4o-mini',
        max_tokens: 200,
        messages: [{ role: 'user', content: prompt }],
      });
      return res.choices[0]?.message?.content || '';
    }
    if (secrets.openrouter_api_key) {
      const { OpenAI } = await import('openai');
      const client = new OpenAI({ apiKey: secrets.openrouter_api_key, baseURL: 'https://openrouter.ai/api/v1' });
      const res = await client.chat.completions.create({
        model: 'google/gemini-flash-1.5',
        max_tokens: 200,
        messages: [{ role: 'user', content: prompt }],
      });
      return res.choices[0]?.message?.content || '';
    }
  } catch {
    return '';
  }
  return '';
}

// ──────────────────────────────────────────────────────────
// Audio transcription (Whisper via OpenAI)
// ──────────────────────────────────────────────────────────
export async function transcribeAudio(
  audioBuffer: Buffer,
  filename: string,
  secrets: Secrets
): Promise<{ ok: boolean; text?: string; error?: string }> {
  if (!secrets.openai_api_key) {
    return { ok: false, error: 'Audio transcription requires an OpenAI API key (configured in Settings).' };
  }

  try {
    const { OpenAI, toFile } = await import('openai');
    const client = new OpenAI({ apiKey: secrets.openai_api_key });

    const file = await toFile(audioBuffer, filename);
    const transcription = await client.audio.transcriptions.create({
      file,
      model: 'whisper-1',
    });

    return { ok: true, text: transcription.text };
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : 'Transcription failed' };
  }
}
