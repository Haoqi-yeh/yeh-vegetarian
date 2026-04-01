// LINE Messaging API Webhook
// 當有人加好友或封鎖時，LINE 會呼叫這個端點
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

function verifySignature(body: string, signature: string): boolean {
  const secret = process.env.LINE_CHANNEL_SECRET;
  if (!secret) return false;
  const hash = crypto
    .createHmac('SHA256', secret)
    .update(body)
    .digest('base64');
  return hash === signature;
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get('x-line-signature') || '';

  if (!verifySignature(rawBody, signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  const body = JSON.parse(rawBody);
  const events = body.events || [];

  for (const event of events) {
    if (event.type === 'follow') {
      // 有人加好友，可以在這裡發歡迎訊息
      const userId = event.source?.userId;
      if (userId) {
        const { pushMessage } = await import('../../../../lib/line-messaging');
        await pushMessage(userId, [{
          type: 'text',
          text: '🌿 歡迎加入吃素日曆！\n\n每到農曆初一和十五，我會自動提醒你記得吃素 🙏\n\n你也可以打開網頁查看農曆日曆，或找附近的素食餐廳。',
        }]).catch(() => {});
      }
    }
  }

  return NextResponse.json({ ok: true });
}

// LINE 在 Webhook 設定時會發 GET 確認
export async function GET() {
  return NextResponse.json({ ok: true });
}
