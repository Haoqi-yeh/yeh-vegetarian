// Check if LINE Notify is connected
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get('line_notify_token')?.value;

  if (!token) {
    return NextResponse.json({ connected: false });
  }

  try {
    const res = await fetch('https://notify-api.line.me/api/status', {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.status === 401) {
      // Token revoked
      return NextResponse.json({ connected: false });
    }

    const data = await res.json();
    return NextResponse.json({
      connected: res.ok,
      target: data.target,
      targetType: data.targetType,
    });
  } catch {
    return NextResponse.json({ connected: false });
  }
}

export async function DELETE() {
  const cookieStore = await cookies();
  const token = cookieStore.get('line_notify_token')?.value;

  if (token) {
    // Revoke token
    await fetch('https://notify-api.line.me/api/revoke', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => {});
  }

  cookieStore.delete('line_notify_token');
  return NextResponse.json({ ok: true });
}
