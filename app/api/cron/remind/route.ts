// 排程提醒：每天 UTC 00:00（台灣早上 8 點）由 Vercel Cron 自動呼叫
// 檢查今天/明天是否為農曆初一或十五，自動廣播 LINE + 推播通知
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { Solar } = require('lunar-javascript');
import { NextRequest, NextResponse } from 'next/server';
import webpush from 'web-push';

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

async function sendWebPush(info: LunarInfo, type: 'day_of' | 'day_before') {
  const vapidPublic = process.env.VAPID_PUBLIC_KEY;
  const vapidPrivate = process.env.VAPID_PRIVATE_KEY;
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || '';

  if (!vapidPublic || !vapidPrivate) return '推播：未設定 VAPID Key，跳過';

  webpush.setVapidDetails(`mailto:admin@${baseUrl.replace('https://', '')}`, vapidPublic, vapidPrivate);

  const { getAllSubscriptions } = await import('../../push/subscribe/route');
  const subs = await getAllSubscriptions();
  if (!subs.length) return '推播：目前沒有訂閱者';

  const title = type === 'day_before'
    ? `📅 明天是農曆${info.lunarMonth}月${info.dayName}`
    : `🌿 今天是農曆${info.lunarMonth}月${info.dayName}`;

  const body = type === 'day_before'
    ? '記得明天吃素，提前查好附近素食！'
    : '記得今天吃素，感恩神明護佑 🙏';

  const payload = JSON.stringify({ title, body });
  let success = 0;

  await Promise.allSettled(
    subs.map(sub =>
      webpush.sendNotification(sub as webpush.PushSubscription, payload)
        .then(() => { success++; })
        .catch(() => {})
    )
  );

  return `推播：成功送出 ${success}/${subs.length} 則`;
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: '未授權' }, { status: 401 });
  }

  const timing: ReminderTiming = (process.env.REMINDER_TIMING as ReminderTiming) || 'both';
  const today = getLunarInfo(new Date());
  const tomorrow = getLunarInfo(getTomorrow());

  const toSend: Array<{ type: 'day_of' | 'day_before'; info: LunarInfo }> = [];
  if ((timing === 'day_of' || timing === 'both') && today.isVegetarian)
    toSend.push({ type: 'day_of', info: today });
  if ((timing === 'day_before' || timing === 'both') && tomorrow.isVegetarian)
    toSend.push({ type: 'day_before', info: tomorrow });

  if (toSend.length === 0) {
    return NextResponse.json({
      sent: false,
      reason: `今天農曆${today.lunarMonth}月${today.lunarDay}，明天農曆${tomorrow.lunarMonth}月${tomorrow.lunarDay}，不需要提醒`,
    });
  }

  const results: string[] = [];

  for (const { type, info } of toSend) {
    const label = type === 'day_of' ? '當天提醒' : '前一天預告';

    // LINE 廣播
    if (process.env.LINE_CHANNEL_ACCESS_TOKEN) {
      try {
        const { broadcast, buildVegetarianMessage } = await import('../../../../lib/line-messaging');
        await broadcast([buildVegetarianMessage(type, info.lunarMonth, info.dayName)]);
        results.push(`LINE ${label}：✓ 廣播成功`);
      } catch (err) {
        results.push(`LINE ${label}：✗ ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    // Web Push
    const pushResult = await sendWebPush(info, type);
    results.push(`${label} ${pushResult}`);
  }

  return NextResponse.json({ sent: true, results });
}
