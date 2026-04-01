'use client';

import { useState, useEffect, useCallback } from 'react';
import { getMonthCalendar, getDayName, isSameDay, isToday, isCurrentMonth, formatDateKey } from '@/lib/lunar';

interface DayLunarInfo {
  date: string;
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

interface CalendarProps {
  onDaySelect?: (date: Date, lunarInfo?: DayLunarInfo) => void;
  selectedDate?: Date;
}

const DOW_LABELS = ['日', '一', '二', '三', '四', '五', '六'];
const MONTHS_ZH = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二'];

export default function Calendar({ onDaySelect, selectedDate }: CalendarProps) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth() + 1);
  const [lunarMap, setLunarMap] = useState<Record<string, DayLunarInfo>>({});
  const [loading, setLoading] = useState(false);

  const fetchLunar = useCallback(async (year: number, month: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/lunar?year=${year}&month=${month}`);
      const data = await res.json();
      const map: Record<string, DayLunarInfo> = {};
      for (const d of data.days) {
        map[d.date] = d;
      }
      setLunarMap((prev) => ({ ...prev, ...map }));
    } catch (e) {
      console.error('Failed to fetch lunar data', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLunar(viewYear, viewMonth);
  }, [viewYear, viewMonth, fetchLunar]);

  const weeks = getMonthCalendar(viewYear, viewMonth);

  const prevMonth = () => {
    if (viewMonth === 1) { setViewYear(y => y - 1); setViewMonth(12); }
    else setViewMonth(m => m - 1);
  };

  const nextMonth = () => {
    if (viewMonth === 12) { setViewYear(y => y + 1); setViewMonth(1); }
    else setViewMonth(m => m + 1);
  };

  const goToday = () => {
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth() + 1);
  };

  // Count vegetarian days in this month
  const vegDays = Object.values(lunarMap).filter(
    d => d.isVegetarianDay && d.date.startsWith(`${viewYear}-${String(viewMonth).padStart(2, '0')}`)
  );

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={prevMonth}
          className="p-2 rounded-full hover:bg-green-100 text-green-700 transition-colors"
          aria-label="上個月"
        >
          ◀
        </button>

        <div className="text-center">
          <h2 className="text-2xl font-bold text-green-800">
            {viewYear} 年 {MONTHS_ZH[viewMonth - 1]} 月
          </h2>
          {vegDays.length > 0 && (
            <p className="text-sm text-amber-600 font-medium mt-0.5">
              本月有 {vegDays.length} 個吃素日 🌿
            </p>
          )}
        </div>

        <button
          onClick={nextMonth}
          className="p-2 rounded-full hover:bg-green-100 text-green-700 transition-colors"
          aria-label="下個月"
        >
          ▶
        </button>
      </div>

      {/* Today button */}
      <div className="text-center mb-3">
        <button
          onClick={goToday}
          className="text-xs text-green-600 border border-green-300 rounded px-3 py-1 hover:bg-green-50 transition-colors"
        >
          回到今天
        </button>
      </div>

      {/* Day of week headers */}
      <div className="grid grid-cols-7 mb-1">
        {DOW_LABELS.map((d, i) => (
          <div
            key={d}
            className={`text-center text-sm font-semibold py-2 ${i === 0 ? 'text-red-500' : i === 6 ? 'text-blue-500' : 'text-gray-500'}`}
          >
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      {loading && (
        <div className="text-center py-4 text-green-600 text-sm animate-pulse">載入農曆中...</div>
      )}

      <div className="grid grid-cols-7 gap-0.5">
        {weeks.flat().map((date, idx) => {
          const key = formatDateKey(date);
          const lunar = lunarMap[key];
          const inMonth = isCurrentMonth(date, viewYear, viewMonth);
          const today_ = isToday(date);
          const selected = selectedDate && isSameDay(date, selectedDate);
          const isVeg = lunar?.isVegetarianDay && inMonth;
          const dow = date.getDay();

          return (
            <button
              key={idx}
              onClick={() => onDaySelect?.(date, lunar)}
              className={[
                'relative flex flex-col items-center rounded-xl p-1.5 min-h-[64px] transition-all',
                inMonth ? 'cursor-pointer hover:bg-green-50' : 'opacity-30 cursor-default',
                today_ ? 'ring-2 ring-green-500 bg-green-50' : '',
                selected ? 'bg-green-600 text-white hover:bg-green-700 ring-0' : '',
                isVeg && !selected ? 'bg-amber-50 border border-amber-300' : '',
              ].filter(Boolean).join(' ')}
            >
              {/* Gregorian date */}
              <span className={[
                'text-base font-bold leading-tight',
                selected ? 'text-white' : today_ ? 'text-green-700' : dow === 0 ? 'text-red-500' : dow === 6 ? 'text-blue-500' : 'text-gray-800',
              ].join(' ')}>
                {date.getDate()}
              </span>

              {/* Lunar day */}
              <span className={[
                'text-xs leading-tight mt-0.5 font-medium',
                selected ? 'text-green-100' : isVeg ? 'text-amber-600 font-bold' : 'text-gray-400',
              ].join(' ')}>
                {lunar?.lunarDay || ''}
                {lunar?.jieQi ? ` ${lunar.jieQi}` : ''}
              </span>

              {/* Vegetarian day badge */}
              {isVeg && (
                <span className={[
                  'absolute -top-1 -right-1 text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold shadow',
                  selected ? 'bg-white text-amber-600' : 'bg-amber-400 text-white',
                ].join(' ')}>
                  素
                </span>
              )}

              {/* Lunar month label on 1st of month */}
              {lunar?.lunarDayNum === 1 && !isVeg && inMonth && (
                <span className="absolute -top-1 -right-1 text-xs bg-blue-100 text-blue-600 rounded px-1 font-medium shadow">
                  {lunar.lunarMonth}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-4 text-xs text-gray-500 justify-center">
        <span className="flex items-center gap-1">
          <span className="w-4 h-4 bg-amber-50 border border-amber-300 rounded inline-block" />
          吃素日（初一/十五）
        </span>
        <span className="flex items-center gap-1">
          <span className="w-4 h-4 bg-green-50 ring-2 ring-green-500 rounded inline-block" />
          今天
        </span>
        <span className="flex items-center gap-1">
          <span className="素 bg-amber-400 text-white rounded-full w-4 h-4 flex items-center justify-center font-bold" style={{fontSize:'9px'}}>素</span>
          吃素徽章
        </span>
      </div>
    </div>
  );
}
