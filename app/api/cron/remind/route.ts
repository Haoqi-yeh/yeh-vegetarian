// 排程提醒：每天早上由 Vercel Cron 自動呼叫
// 根據 REMINDER_TIMING 設定，發「當天提醒」或「前一天預告」或兩者皆發
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { Solar } = require('lunar-javascript');
import { NextRequest, NextResponse } from 'next/server';

type ReminderTiming = 'day_of' | 'day_before' | 'both';

interface LunarInfo {
  lunarDay: number;
  lunarMonth: string;
  isVegetarian: boolean;
  dayName: string;
}

function getLunarInfo(date: Date): LunarInfo {
  const solar = Solar.fromDate(date);
  const lunar = solar.getLunar();
  const lunarDay: number = lunar.getDay();
  const lunarMonth: string = lunar.getMonthInChinese();
  const isVegetarian = lunarDay === 1 || lunarDay === 15;
  const dayName = lunarDay === 1 ? '初一' : lunarDay === 15 ? '十五' : `${lunarDay}`;
  return { lunarDay, lunarMonth, isVegetarian, dayName };
}

function getTomorrow(): Date {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d;
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

function buildDayOfMessage(info: LunarInfo): string {
  return (
    `\n🌿 今天是農曆${info.lunarMonth}月${info.dayName}，記得吃素喔！\n\n` +
    `素食不只是食物，是對神明的承諾 🙏\n\n` +
    `開啟吃素日曆找附近素食：${process.env.NEXT_PUBLIC_BASE_URL || ''}`
  );
}

function buildDayBeforeMessage(info: LunarInfo): string {
  return (
    `\n📅 提前通知：明天是農曆${info.lunarMonth}月${info.dayName}，記得明天吃素喔！\n\n` +
    `提前安排好明天的素食餐廳，不用臨時手忙腳亂 🌱\n\n` +
    `開啟吃素日曆找附近素食：${process.env.NEXT_PUBLIC_BASE_URL || ''}`
  );
}

export async function GET(req: NextRequest) {
  // 驗證只有 Vercel Cron 或有授權的人可以呼叫
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const timing: ReminderTiming =
    (process.env.REMINDER_TIMING as ReminderTiming) || 'both';

  const today = getLunarInfo(new Date());
  const tomorrow = getLunarInfo(getTomorrow());

  const messages: Array<{ type: string; message: string }> = [];

  if ((timing === 'day_of' || timing === 'both') && today.isVegetarian) {
    messages.push({ type: 'day_of', message: buildDayOfMessage(today) });
  }

  if ((timing === 'day_before' || timing === 'both') && tomorrow.isVegetarian) {
    messages.push({ type: 'day_before', message: buildDayBeforeMessage(tomorrow) });
  }

  if (messages.length === 0) {
    return NextResponse.json({
      sent: false,
      reason: `今天農曆${today.lunarMonth}月${today.lunarDay}，明天農曆${tomorrow.lunarMonth}月${tomorrow.lunarDay}，都不需要提醒`,
    });
  }

  const results: string[] = [];
  const adminToken = process.env.ADMIN_LINE_NOTIFY_TOKEN;

  for (const { type, message } of messages) {
    const label = type === 'day_of' ? '當天提醒' : '前一天預告';

    if (adminToken) {
      const res = await sendLineNotify(adminToken, message);
      results.push(`LINE ${label}: ${res.ok ? '✓ 成功' : `✗ 失敗(${res.status})`}`);
    }
  }

  return NextResponse.json({ sent: true, results });
}
