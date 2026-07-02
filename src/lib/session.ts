import { getIronSession, SessionOptions } from 'iron-session';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export interface SessionData {
  user?: {
    authenticated: boolean;
  };
}

export const sessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET || 'cleraacc-dev-secret-min-32-chars-long!!',
  cookieName: 'cleraacc_session',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 30, // 30 days
    sameSite: 'lax',
  },
};

// For use in Server Components and Route Handlers
export async function getSession() {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, sessionOptions);
}

// For use in middleware (operates on request/response)
export async function getSessionFromRequest(req: NextRequest, res: NextResponse) {
  return getIronSession<SessionData>(req, res, sessionOptions);
}
