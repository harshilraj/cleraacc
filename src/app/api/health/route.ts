import { NextResponse } from 'next/server';

export async function GET() {
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
    },
    NODE_ENV: process.env.NODE_ENV || null,
  };

  return NextResponse.json({ envs });
}
