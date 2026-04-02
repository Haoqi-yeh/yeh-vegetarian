// LINE Messaging API Webhook
// 處理加好友、收到訊息等事件
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

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://yeh-vegetarian.vercel.app';

// 關鍵字對應回覆內容
const KEYWORD_REPLIES: Array<{
  keywords: string[];
  messages: object[];
}> = [
  {
    keywords: ['日曆', '!日曆', '開啟日曆', '吃素日曆', '查日曆'],
    messages: [{
      type: 'text',
      text: `📅 吃素日曆\n\n點下方連結開啟，可以查看農曆初一、十五的日期，也能找附近的素食餐廳 🌿\n\n👉 ${BASE_URL}`,
    }],
  },
  {
    keywords: ['素食', '找素食', '素食餐廳', '吃素', '素食店'],
    messages: [{
      type: 'text',
      text: `🥦 找附近素食\n\n點下方連結，開啟地圖搜尋你附近的素食餐廳和便利商店 🗺️\n\n👉 ${BASE_URL}?tab=map`,
    }],
  },
  {
    keywords: ['提醒', '設定提醒', '通知', '提醒設定'],
    messages: [{
      type: 'text',
      text: `🔔 提醒設定\n\n點下方連結，可以設定 LINE 提醒或瀏覽器推播通知，再也不會忘記吃素日！\n\n👉 ${BASE_URL}?tab=reminder`,
    }],
  },
  {
    keywords: ['初一', '十五', '今天', '農曆', '吃素日'],
    messages: [{
      type: 'text',
      text: `🌿 農曆日曆\n\n點下方連結查看今天的農曆日期，初一和十五會特別標示 🙏\n\n👉 ${BASE_URL}`,
    }],
  },
  {
    keywords: ['說明', '幫助', 'help', '怎麼用', '功能'],
    messages: [{
      type: 'text',
      text: `🌿 吃素日曆 使用說明\n\n` +
        `你可以傳送以下關鍵字：\n\n` +
        `📅 「日曆」→ 開啟吃素日曆\n` +
        `🥦 「素食」→ 找附近素食餐廳\n` +
        `🔔 「提醒」→ 設定提醒通知\n` +
        `📖 「農曆」→ 查看農曆日期\n\n` +
        `每到農曆初一和十五，我會自動發送提醒給所有好友 🙏`,
    }],
  },
];

function getReply(text: string): object[] | null {
  const trimmed = text.trim();
  for (const { keywords, messages } of KEYWORD_REPLIES) {
    if (keywords.some(k => trimmed === k || trimmed.includes(k))) {
      return messages;
    }
  }
  return null;
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get('x-line-signature') || '';

  if (!verifySignature(rawBody, signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  const body = JSON.parse(rawBody);
  const events = body.events || [];
  const { pushMessage } = await import('../../../../lib/line-messaging');

  for (const event of events) {
    const userId = event.source?.userId;
    if (!userId) continue;

    // 加好友：發送歡迎訊息
    if (event.type === 'follow') {
      await pushMessage(userId, [{
        type: 'text',
        text: `🌿 歡迎加入吃素日曆！\n\n每到農曆初一和十五，我會自動提醒你記得吃素 🙏\n\n傳送「說明」可以查看所有功能\n\n👉 ${BASE_URL}`,
      }]).catch(() => {});
    }

    // 收到文字訊息：關鍵字回應
    if (event.type === 'message' && event.message?.type === 'text') {
      const text: string = event.message.text || '';
      const reply = getReply(text);
      if (reply) {
        await pushMessage(userId, reply).catch(() => {});
      }
    }
  }

  return NextResponse.json({ ok: true });
}

// LINE 在 Webhook 設定時會發 GET 確認
export async function GET() {
  return NextResponse.json({ ok: true });
}
