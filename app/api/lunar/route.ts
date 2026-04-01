// API route: GET /api/lunar?year=2026&month=4
// Returns lunar data for all days in a given month

import { NextRequest, NextResponse } from 'next/server';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { Solar } = require('lunar-javascript');

// lunar-javascript 回傳簡體，手動對照繁體
const ZODIAC_MAP: Record<string, string> = {
  '鼠': '鼠', '牛': '牛', '虎': '虎', '兔': '兔',
  '龙': '龍', '蛇': '蛇', '马': '馬', '羊': '羊',
  '猴': '猴', '鸡': '雞', '狗': '狗', '猪': '豬',
};

function toTraditionalZodiac(raw: string): string {
  return raw.split('').map(c => ZODIAC_MAP[c] ?? c).join('');
}

interface DayLunarInfo {
  date: string;         // YYYY-MM-DD
  lunarYear: number;
  lunarMonth: string;
  lunarDay: string;
  lunarMonthNum: number;
  lunarDayNum: number;
  isLeapMonth: boolean;
  isVegetarianDay: boolean;
  zodiac: string;
  jieQi: string;
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()));
  const month = parseInt(searchParams.get('month') || String(new Date().getMonth() + 1));

  if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
    return NextResponse.json({ error: 'Invalid year or month' }, { status: 400 });
  }

  const daysInMonth = new Date(year, month, 0).getDate();
  const result: DayLunarInfo[] = [];

  for (let day = 1; day <= daysInMonth; day++) {
    const solar = Solar.fromYmd(year, month, day);
    const lunar = solar.getLunar();

    const lunarDayNum: number = lunar.getDay();
    const lunarMonthNum: number = Math.abs(lunar.getMonth());
    const isLeap: boolean = lunar.getMonth() < 0;

    result.push({
      date: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
      lunarYear: lunar.getYear(),
      lunarMonth: `${isLeap ? '閏' : ''}${lunar.getMonthInChinese()}月`,
      lunarDay: lunar.getDayInChinese(),
      lunarMonthNum,
      lunarDayNum,
      isLeapMonth: isLeap,
      isVegetarianDay: lunarDayNum === 1 || lunarDayNum === 15,
      zodiac: toTraditionalZodiac(lunar.getYearShengXiao()),
      jieQi: lunar.getJieQi() || '',
    });
  }

  return NextResponse.json({ year, month, days: result });
}
