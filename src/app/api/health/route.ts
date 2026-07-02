import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/session';

export async function GET(req: NextRequest) {
  let sessionError = null;
  try {
    const res = NextResponse.next();
    await getSessionFromRequest(req, res);
  } catch (err) {
    sessionError = err instanceof Error ? err.message : String(err);
  }

  const envs = {
    NEXT_PUBLIC_SUPABASE_URL: {
      defined: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    },
    NEXT_PUBLIC_SUPABASE_ANON_KEY: {
      defined: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    },
    SUPABASE_SERVICE_ROLE_KEY: {
      defined: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    },
    SESSION_SECRET: {
      defined: !!process.env.SESSION_SECRET,
      length: process.env.SESSION_SECRET?.length || 0,
    },
    NODE_ENV: process.env.NODE_ENV || null,
    sessionError,
  };

  return NextResponse.json({ envs });
}
