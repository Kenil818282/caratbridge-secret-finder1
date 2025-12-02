import { SignJWT } from 'jose';
import { NextResponse } from 'next/server';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'secret_vault_key_123');
// 🔒 READ PASSWORD FROM SECRETS
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

export async function POST(request: Request) {
  const body = await request.json();
  const { password } = body;

  // Safety Check
  if (!ADMIN_PASSWORD) {
      return NextResponse.json({ error: "Setup Error: ADMIN_PASSWORD missing in Secrets." }, { status: 500 });
  }

  // Verify Password
  if (password === ADMIN_PASSWORD) {
    // Create the Digital Pass (Token)
    const token = await new SignJWT({ role: 'admin' })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('24h') // Login lasts 24 hours
      .sign(JWT_SECRET);

    const response = NextResponse.json({ success: true });

    // Set Secure Cookie
    response.cookies.set('session_token', token, {
      httpOnly: true, // JavaScript cannot steal it
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 // 1 Day
    });

    return response;
  }

  return NextResponse.json({ error: 'Access Denied' }, { status: 401 });
}