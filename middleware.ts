import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

// This secret key signs the digital pass. 
// In production, use a long random string in Secrets.
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'secret_vault_key_123');

export async function middleware(request: NextRequest) {
  const token = request.cookies.get('session_token')?.value;
  const isLoginPage = request.nextUrl.pathname === '/login';

  // 1. Verify Token
  let verified = false;
  if (token) {
    try {
      await jwtVerify(token, JWT_SECRET);
      verified = true;
    } catch (e) {
      verified = false;
    }
  }

  // 2. Logic: If on Login Page but already verified -> Go to Dashboard
  if (isLoginPage && verified) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // 3. Logic: If NOT on Login Page and NOT verified -> Go to Login
  if (!isLoginPage && !verified) {
    // Allow public assets (images, css, etc) to pass through
    if (request.nextUrl.pathname.includes('.')) return NextResponse.next();

    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

// Protect everything EXCEPT api/auth (so we can login) and static files
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (Login Route)
     * - _next/static (Static files)
     * - _next/image (Image optimization files)
     * - favicon.ico (Favicon file)
     */
    '/((?!api/auth|_next/static|_next/image|favicon.ico).*)',
  ],
};