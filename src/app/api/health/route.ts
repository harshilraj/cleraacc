import { NextResponse } from 'next/server';

export async function GET() {
  const envs = {
    NEXT_PUBLIC_SUPABASE_URL: {
      defined: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      length: process.env.NEXT_PUBLIC_SUPABASE_URL?.length || 0,
      prefix: process.env.NEXT_PUBLIC_SUPABASE_URL ? process.env.NEXT_PUBLIC_SUPABASE_URL.slice(0, 15) + '...' : null,
    },
    NEXT_PUBLIC_SUPABASE_ANON_KEY: {
      defined: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      length: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.length || 0,
      prefix: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.slice(0, 10) + '...' : null,
    },
    SUPABASE_SERVICE_ROLE_KEY: {
      defined: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      length: process.env.SUPABASE_SERVICE_ROLE_KEY?.length || 0,
      prefix: process.env.SUPABASE_SERVICE_ROLE_KEY ? process.env.SUPABASE_SERVICE_ROLE_KEY.slice(0, 10) + '...' : null,
    },
    SESSION_SECRET: {
      defined: !!process.env.SESSION_SECRET,
      length: process.env.SESSION_SECRET?.length || 0,
    },
    NODE_ENV: process.env.NODE_ENV || null,
  };

  return NextResponse.json({ envs });
}
