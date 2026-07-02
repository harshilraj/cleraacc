import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { transcribeAudio, summarizeWithAI, type Secrets } from '@/lib/ai-provider';

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB

const SUPPORTED_TEXT = ['.txt', '.md', '.csv', '.json', '.html', '.xml'];
const SUPPORTED_PDF = ['.pdf'];
const SUPPORTED_AUDIO = ['.mp3', '.wav', '.m4a', '.ogg', '.webm', '.flac'];

function getExtension(filename: string): string {
  return filename.slice(filename.lastIndexOf('.')).toLowerCase();
}

async function extractPdf(buffer: Buffer): Promise<string> {
  try {
    // Use pdf-parse to extract text
    const pdfImport = await import('pdf-parse') as any;
    const pdfParse = pdfImport.default || pdfImport;
    const data = await pdfParse(buffer);
    return data.text?.trim() || '';
  } catch (err) {
    throw new Error(`PDF extraction failed: ${err instanceof Error ? err.message : 'unknown'}`);
  }
}

export async function POST(req: NextRequest) {
  const formData = await req.formData().catch(() => null);
  if (!formData) {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });
  }

  const file = formData.get('file') as File | null;
  const kind = (formData.get('kind') as string) || 'knowledge_base';
  const platform = (formData.get('platform') as string) || 'n/a';
  const summarize = formData.get('summarize') === 'true';

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: `File too large. Maximum size is 25 MB.` }, { status: 413 });
  }

  const ext = getExtension(file.name);
  const isText = SUPPORTED_TEXT.includes(ext);
  const isPdf = SUPPORTED_PDF.includes(ext);
  const isAudio = SUPPORTED_AUDIO.includes(ext);

  if (!isText && !isPdf && !isAudio) {
    return NextResponse.json({
      error: `Unsupported file type "${ext}". Supported: text (${SUPPORTED_TEXT.join(', ')}), PDF (.pdf), audio (${SUPPORTED_AUDIO.join(', ')}).`,
    }, { status: 415 });
  }

  // Get API secrets for transcription/summarization
  const { data: settings } = await supabase.from('app_settings').select('secrets').eq('id', 1).single();
  const secrets = (settings?.secrets as Secrets) || {};

  let rawText = '';
  let extractionMethod = 'manual';

  // ── Extract text ──────────────────────────────────────
  if (isText) {
    rawText = await file.text();
    extractionMethod = 'manual';
  } else if (isPdf) {
    const buffer = Buffer.from(await file.arrayBuffer());
    rawText = await extractPdf(buffer);
    extractionMethod = 'manual';
  } else if (isAudio) {
    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await transcribeAudio(buffer, file.name, secrets);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 422 });
    }
    rawText = result.text || '';
    extractionMethod = 'jina'; // closest semantic match — "auto extracted"
  }

  if (!rawText.trim()) {
    return NextResponse.json({ error: 'No text could be extracted from this file.' }, { status: 422 });
  }

  // ── Summarize if requested and provider available ──────
  let summary: string | null = null;
  if (summarize) {
    summary = await summarizeWithAI(rawText, secrets) || null;
  }

  // ── Save to sources ────────────────────────────────────
  const { data: source, error } = await supabase
    .from('sources')
    .insert({
      kind,
      platform: platform || 'n/a',
      url: null,
      raw_text: rawText,
      summary,
      status: 'ready',
      extraction_method: extractionMethod,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    source,
    filename: file.name,
    chars: rawText.length,
    was_audio: isAudio,
    was_pdf: isPdf,
  });
}
