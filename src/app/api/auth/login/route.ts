import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/session';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { username, password } = body;

  const expectedUsername = process.env.APP_USERNAME || 'cleraacc';
  const expectedPassword = process.env.APP_PASSWORD || 'harshilcleraa';

  if (username !== expectedUsername || password !== expectedPassword) {
    return NextResponse.json({ error: 'Invalid credentials.' }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  const session = await getSessionFromRequest(req, response);
  session.user = { authenticated: true };
  await session.save();

  return response;
}
