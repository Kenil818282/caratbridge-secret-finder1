import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'secret_vault_key_123');

export async function middleware(request: NextRequest) {
  const token = request.cookies.get('session_token')?.value;
  const isLoginPage = request.nextUrl.pathname === '/login';

  let verified = false;
  if (token) {
    try {
      await jwtVerify(token, JWT_SECRET);
      verified = true;
    } catch (e) {
      verified = false;
    }
  }

  if (isLoginPage && verified) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  if (!isLoginPage && !verified) {
    // 🛑 ALLOW PUBLIC ASSETS
    if (request.nextUrl.pathname.includes('.')) return NextResponse.next();

    // ✅ NEW: ALLOW ALL API ROUTES TO PASS
    // This lets the Cron Job hit /api/monitor without logging in
    if (request.nextUrl.pathname.startsWith('/api/')) {
        return NextResponse.next();
    }

    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

// UPDATE MATCHER TO WATCH EVERYTHING
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};