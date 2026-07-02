import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/session';

export async function POST(req: NextRequest) {
  const response = NextResponse.json({ ok: true });
  const session = await getSessionFromRequest(req, response);
  session.destroy();
  return response;
}
