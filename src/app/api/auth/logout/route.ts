import { NextResponse } from 'next/server';
import { AUTH_COOKIE_NAME, getSession, invalidateSessionCache } from '@/lib/auth';

export async function POST() {
  const session = await getSession();
  if (session?.userId) {
    invalidateSessionCache(session.userId);
  }
  const response = NextResponse.json({ success: true, message: 'Logout realizado.' });
  response.cookies.set({
    name: AUTH_COOKIE_NAME,
    value: '',
    httpOnly: true,
    path: '/',
    maxAge: 0,
  });
  return response;
}
