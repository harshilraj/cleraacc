import { NextRequest, NextResponse } from 'next/server';
import { runExtractionPipeline } from '@/lib/extraction';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { sourceId } = body;

  if (!sourceId) {
    return NextResponse.json({ error: 'Missing sourceId' }, { status: 400 });
  }

  // Fire and forget — extraction runs async
  runExtractionPipeline(sourceId).catch(console.error);

  return NextResponse.json({ ok: true, message: 'Extraction started' });
}
