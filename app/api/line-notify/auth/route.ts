// LINE Notify OAuth: redirect user to LINE authorization page
import { NextResponse } from 'next/server';

export async function GET() {
  const clientId = process.env.LINE_NOTIFY_CLIENT_ID;
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

  if (!clientId) {
    return NextResponse.json(
      { error: 'LINE_NOTIFY_CLIENT_ID not configured. Please set it in .env.local' },
      { status: 503 }
    );
  }

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: `${baseUrl}/api/line-notify/callback`,
    scope: 'notify',
    state: crypto.randomUUID(),
  });

  return NextResponse.redirect(
    `https://notify-bot.line.me/oauth/authorize?${params.toString()}`
  );
}
