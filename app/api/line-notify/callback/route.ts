// LINE Notify OAuth callback: exchange code for token, store in cookie
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

  if (error || !code) {
    return NextResponse.redirect(`${baseUrl}?line_error=${error || 'no_code'}`);
  }

  const clientId = process.env.LINE_NOTIFY_CLIENT_ID;
  const clientSecret = process.env.LINE_NOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(`${baseUrl}?line_error=not_configured`);
  }

  try {
    const tokenRes = await fetch('https://notify-bot.line.me/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: `${baseUrl}/api/line-notify/callback`,
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });

    if (!tokenRes.ok) {
      throw new Error(`Token exchange failed: ${tokenRes.status}`);
    }

    const { access_token } = await tokenRes.json();

    const cookieStore = await cookies();
    cookieStore.set('line_notify_token', access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 365, // 1 year
      path: '/',
    });

    return NextResponse.redirect(`${baseUrl}?line_connected=1`);
  } catch (err) {
    console.error('LINE Notify callback error:', err);
    return NextResponse.redirect(`${baseUrl}?line_error=token_failed`);
  }
}
