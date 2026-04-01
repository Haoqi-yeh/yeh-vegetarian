// 排程提醒：每天早上由 Vercel Cron 自動呼叫
// 檢查今天是不是農曆初一或十五，是的話送出 LINE 和推播通知
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { Solar } = require('lunar-javascript');
import { NextRequest, NextResponse } from 'next/server';

function getTodayLunarDay(): { lunarDay: number; lunarMonth: string; isVegetarian: boolean } {
  const now = new Date();
  const solar = Solar.fromDate(now);
  const lunar = solar.getLunar();
  const lunarDay: number = lunar.getDay();
  const lunarMonth: string = lunar.getMonthInChinese();
  return {
    lunarDay,
    lunarMonth,
    isVegetarian: lunarDay === 1 || lunarDay === 15,
  };
}

async function sendLineNotify(token: string, message: string) {
  return fetch('https://notify-api.line.me/api/notify', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ message }),
  });
}

export async function GET(req: NextRequest) {
  // 驗證只有 Vercel Cron 或有授權的人可以呼叫
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { lunarDay, lunarMonth, isVegetarian } = getTodayLunarDay();

  if (!isVegetarian) {
    return NextResponse.json({
      sent: false,
      reason: `今天是農曆${lunarMonth}月${lunarDay}，不是吃素日`,
    });
  }

  const dayName = lunarDay === 1 ? '初一' : '十五';
  const message = `\n🌿 今天是農曆${lunarMonth}月${dayName}，記得吃素喔！\n\n素食不只是食物，是對神明的承諾 🙏\n\n開啟吃素日曆找附近素食：${process.env.NEXT_PUBLIC_BASE_URL || ''}`;

  const results: string[] = [];

  // 1. 送出管理員 LINE（可以是群組）
  const adminToken = process.env.ADMIN_LINE_NOTIFY_TOKEN;
  if (adminToken) {
    const res = await sendLineNotify(adminToken, message);
    results.push(`LINE管理員: ${res.ok ? '✓ 成功' : `✗ 失敗(${res.status})`}`);
  }

  // 2. 送出 Web Push 給所有訂閱者
  try {
    const { getAllSubscriptions } = await import('../../../api/push/subscribe/route');
    const subs = await getAllSubscriptions();
    results.push(`Web Push: ${subs.length} 位訂閱者（需設定 VAPID key 才能推送）`);
    // 注意：完整 Web Push 需要 VAPID key，這裡先記錄訂閱數
  } catch {
    results.push('Web Push: 跳過');
  }

  return NextResponse.json({
    sent: true,
    lunarDay: dayName,
    results,
  });
}
