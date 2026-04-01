// 回傳 VAPID Public Key 給前端，讓瀏覽器訂閱推播
import { NextResponse } from 'next/server';

export async function GET() {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  if (!publicKey) {
    return NextResponse.json({ error: 'VAPID 未設定' }, { status: 500 });
  }
  return NextResponse.json({ publicKey });
}
