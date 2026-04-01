'use client';

import { getDayName } from '@/lib/lunar';

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

interface DayDetailProps {
  date: Date;
  lunarInfo?: DayLunarInfo;
  onFindFood?: () => void;
  onRemind?: () => void;
}

export default function DayDetail({ date, lunarInfo, onFindFood, onRemind }: DayDetailProps) {
  const MONTHS = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'];

  return (
    <div className={[
      'rounded-2xl p-5 border-2 transition-all',
      lunarInfo?.isVegetarianDay
        ? 'bg-amber-50 border-amber-300 shadow-amber-100 shadow-md'
        : 'bg-white border-gray-200 shadow-sm',
    ].join(' ')}>
      <div className="flex items-start justify-between">
        <div>
          {/* Gregorian */}
          <p className="text-sm text-gray-500">{date.getFullYear()} 年 {MONTHS[date.getMonth()]} {getDayName(date)}</p>
          <p className={[
            'text-5xl font-black mt-0.5',
            lunarInfo?.isVegetarianDay ? 'text-amber-700' : 'text-gray-800',
          ].join(' ')}>
            {date.getDate()}
          </p>

          {/* Lunar */}
          {lunarInfo && (
            <div className="mt-2 space-y-0.5">
              <p className="text-base font-semibold text-gray-700">
                農曆 {lunarInfo.lunarMonth}{lunarInfo.lunarDay}
              </p>
              {lunarInfo.jieQi && (
                <p className="text-sm text-green-600 font-medium">🌱 {lunarInfo.jieQi}</p>
              )}
              <p className="text-xs text-gray-400">{lunarInfo.lunarYear} 年・{lunarInfo.zodiac}年</p>
            </div>
          )}
        </div>

        {/* Vegetarian indicator */}
        {lunarInfo?.isVegetarianDay && (
          <div className="text-center">
            <div className="w-16 h-16 bg-amber-400 rounded-2xl flex items-center justify-center shadow-md">
              <span className="text-white text-2xl font-black">素</span>
            </div>
            <p className="text-xs text-amber-600 font-bold mt-1">
              {lunarInfo.lunarDayNum === 1 ? '農曆初一' : '農曆十五'}
            </p>
          </div>
        )}
      </div>

      {/* Vegetarian day message */}
      {lunarInfo?.isVegetarianDay && (
        <div className="mt-4 p-3 bg-amber-100 rounded-xl">
          <p className="text-amber-800 text-sm font-medium">
            🙏 今天是吃素日，記得守約，吃素迎吉祥！
          </p>
        </div>
      )}

      {/* Action buttons */}
      {lunarInfo?.isVegetarianDay && (
        <div className="flex gap-2 mt-4">
          <button
            onClick={onFindFood}
            className="flex-1 py-2.5 bg-green-600 text-white rounded-xl text-sm font-bold hover:bg-green-700 transition-colors"
          >
            🥦 找附近素食
          </button>
          <button
            onClick={onRemind}
            className="flex-1 py-2.5 border border-amber-300 text-amber-700 rounded-xl text-sm font-bold hover:bg-amber-50 transition-colors"
          >
            🔔 設定提醒
          </button>
        </div>
      )}
    </div>
  );
}
