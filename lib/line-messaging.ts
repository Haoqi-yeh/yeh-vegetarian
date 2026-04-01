// LINE Messaging API - 共用工具函式

const LINE_API = 'https://api.line.me/v2/bot';

export function getChannelToken(): string {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token) throw new Error('LINE_CHANNEL_ACCESS_TOKEN 未設定');
  return token;
}

// 廣播訊息給所有加好友的人
export async function broadcast(messages: object[]) {
  const token = getChannelToken();
  const res = await fetch(`${LINE_API}/message/broadcast`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ messages }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`LINE broadcast 失敗 (${res.status}): ${err}`);
  }
  return res;
}

// 傳訊息給特定使用者
export async function pushMessage(userId: string, messages: object[]) {
  const token = getChannelToken();
  const res = await fetch(`${LINE_API}/message/push`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ to: userId, messages }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`LINE push 失敗 (${res.status}): ${err}`);
  }
  return res;
}

// 取得 Bot 基本資訊（包含好友數）
export async function getBotInfo() {
  const token = getChannelToken();
  const [infoRes, followerRes] = await Promise.all([
    fetch(`${LINE_API}/info`, {
      headers: { Authorization: `Bearer ${token}` },
    }),
    fetch(`${LINE_API}/followers/count`, {
      headers: { Authorization: `Bearer ${token}` },
    }),
  ]);
  const info = infoRes.ok ? await infoRes.json() : {};
  const follower = followerRes.ok ? await followerRes.json() : {};
  return { ...info, followerCount: follower.followerCount ?? 0 };
}

// 建立吃素提醒的訊息內容
export function buildVegetarianMessage(type: 'day_of' | 'day_before', lunarMonth: string, dayName: string): object {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || '';

  if (type === 'day_before') {
    return {
      type: 'text',
      text: `📅 提前通知\n\n明天是農曆${lunarMonth}月${dayName}，記得明天吃素喔！\n\n提前查好附近的素食餐廳，不用臨時手忙腳亂 🌱\n\n▶ 找附近素食：${baseUrl}`,
    };
  }

  return {
    type: 'text',
    text: `🌿 吃素日提醒\n\n今天是農曆${lunarMonth}月${dayName}，記得吃素喔！\n\n素食不只是食物，是對神明的承諾 🙏\n\n▶ 找附近素食：${baseUrl}`,
  };
}
