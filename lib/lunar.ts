// Lunar calendar utility using lunar-javascript

export interface LunarDate {
  lunarYear: number;
  lunarMonth: string;   // e.g. "二月"
  lunarDay: string;     // e.g. "初一"
  lunarMonthNum: number;
  lunarDayNum: number;
  isLeapMonth: boolean;
  isVegetarianDay: boolean; // 初一 or 十五
  zodiac: string;
  jieQi?: string;       // 節氣
}

// Client-safe wrapper: the actual Solar→Lunar conversion happens via API
// This file is used both server-side (Node) and client-side (via API result)

export function getDayName(date: Date): string {
  const days = ['日', '一', '二', '三', '四', '五', '六'];
  return `週${days[date.getDay()]}`;
}

export function getMonthCalendar(year: number, month: number): Date[][] {
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);
  const startDow = firstDay.getDay();

  const weeks: Date[][] = [];
  let currentWeek: Date[] = [];

  for (let i = 0; i < startDow; i++) {
    currentWeek.push(new Date(year, month - 1, 1 - (startDow - i)));
  }

  for (let day = 1; day <= lastDay.getDate(); day++) {
    currentWeek.push(new Date(year, month - 1, day));
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  }

  if (currentWeek.length > 0) {
    let next = 1;
    while (currentWeek.length < 7) {
      currentWeek.push(new Date(year, month, next++));
    }
    weeks.push(currentWeek);
  }

  return weeks;
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function isToday(date: Date): boolean {
  return isSameDay(date, new Date());
}

export function isCurrentMonth(date: Date, year: number, month: number): boolean {
  return date.getFullYear() === year && date.getMonth() === month - 1;
}

export function formatDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
