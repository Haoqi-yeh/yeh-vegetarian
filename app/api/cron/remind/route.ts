// 排程提醒：每天早上 08:00（台灣時間）由 Vercel Cron 自動呼叫
// 根據 REMINDER_TIMING 設定，廣播「當天提醒」或「前一天預告」或兩者
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

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const timing: ReminderTiming =
    (process.env.REMINDER_TIMING as ReminderTiming) || 'both';

  const today = getLunarInfo(new Date());
  const tomorrow = getLunarInfo(getTomorrow());

  const toSend: Array<{ type: 'day_of' | 'day_before'; info: LunarInfo }> = [];

  if ((timing === 'day_of' || timing === 'both') && today.isVegetarian) {
    toSend.push({ type: 'day_of', info: today });
  }
  if ((timing === 'day_before' || timing === 'both') && tomorrow.isVegetarian) {
    toSend.push({ type: 'day_before', info: tomorrow });
  }

  if (toSend.length === 0) {
    return NextResponse.json({
      sent: false,
      reason: `今天農曆${today.lunarMonth}月${today.lunarDay}，明天農曆${tomorrow.lunarMonth}月${tomorrow.lunarDay}，都不需要提醒`,
    });
  }

  const results: string[] = [];

  if (process.env.LINE_CHANNEL_ACCESS_TOKEN) {
    const { broadcast, buildVegetarianMessage } = await import('../../../../lib/line-messaging');
    for (const { type, info } of toSend) {
      const label = type === 'day_of' ? '當天提醒' : '前一天預告';
      try {
        const message = buildVegetarianMessage(type, info.lunarMonth, info.dayName);
        await broadcast([message]);
        results.push(`LINE ${label}: ✓ 成功廣播`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        results.push(`LINE ${label}: ✗ 失敗 - ${msg}`);
      }
    }
  } else {
    results.push('LINE: 未設定 LINE_CHANNEL_ACCESS_TOKEN，跳過');
  }

  return NextResponse.json({ sent: true, results });
}
