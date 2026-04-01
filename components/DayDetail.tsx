'use client';

import { useState, useCallback } from 'react';
import { getDayName } from '@/lib/lunar';
import Image from 'next/image';

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

interface HistoryEvent {
  year: number;
  text: string;
  imageUrl: string | null;
  wikiUrl: string | null;
  total: number;
  index: number;
}

interface DayDetailProps {
  date: Date;
  lunarInfo?: DayLunarInfo;
  onFindFood?: () => void;
  onRemind?: () => void;
}

export default function DayDetail({ date, lunarInfo, onFindFood, onRemind }: DayDetailProps) {
  const MONTHS = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'];

  const [history, setHistory] = useState<HistoryEvent | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [historyError, setHistoryError] = useState('');

  const fetchHistory = useCallback(async (idx: number) => {
    setHistoryLoading(true);
    setHistoryError('');
    try {
      const m = date.getMonth() + 1;
      const d = date.getDate();

      // 直接從瀏覽器呼叫維基百科（伺服器端會被 403，瀏覽器 CORS 允許）
      // 先試繁體中文，失敗則改英文
      let events: Array<{ year: number; text: string; pages?: Array<{ thumbnail?: { source: string }; content_urls?: { mobile?: { page: string } } }> }> = [];

      try {
        const zhRes = await fetch(
          `https://zh.wikipedia.org/api/rest_v1/feed/onthisday/events/${m}/${d}`,
          { headers: { 'Accept': 'application/json' } }
        );
        if (zhRes.ok) {
          const zhData = await zhRes.json();
          events = zhData.events || [];
        }
      } catch { /* 改用英文 */ }

      if (!events.length) {
        const enRes = await fetch(
          `https://en.wikipedia.org/api/rest_v1/feed/onthisday/events/${m}/${d}`,
          { headers: { 'Accept': 'application/json' } }
        );
        if (!enRes.ok) throw new Error('Wikipedia 無法連線');
        const enData = await enRes.json();
        events = enData.events || [];
      }

      if (!events.length) { setHistoryError('這一天暫無歷史資料'); return; }

      const safeIdx = ((idx % events.length) + events.length) % events.length;
      const event = events[safeIdx];

      let imageUrl: string | null = null;
      let wikiUrl: string | null = null;
      for (const page of event.pages ?? []) {
        if (!imageUrl && page.thumbnail?.source) imageUrl = page.thumbnail.source;
        if (!wikiUrl && page.content_urls?.mobile?.page) wikiUrl = page.content_urls.mobile.page;
        if (imageUrl && wikiUrl) break;
      }

      setHistory({ year: event.year, text: event.text, imageUrl, wikiUrl, total: events.length, index: safeIdx });
      setHistoryIndex(safeIdx);
    } catch {
      setHistoryError('無法取得資料，請稍後再試');
    } finally {
      setHistoryLoading(false);
    }
  }, [date]);

  const handleNextHistory = () => {
    const nextIdx = history ? (history.index + 1) % history.total : 0;
    fetchHistory(nextIdx);
  };

  return (
    <div className={[
      'rounded-2xl p-5 border-2 transition-all',
      lunarInfo?.isVegetarianDay
        ? 'bg-amber-50 border-amber-300 shadow-amber-100 shadow-md'
        : 'bg-white border-gray-200 shadow-sm',
    ].join(' ')}>
      <div className="flex items-start justify-between">
        <div>
          {/* 國曆 */}
          <p className="text-sm text-gray-500">{date.getFullYear()} 年 {MONTHS[date.getMonth()]} {getDayName(date)}</p>
          <p className={[
            'text-5xl font-black mt-0.5',
            lunarInfo?.isVegetarianDay ? 'text-amber-700' : 'text-gray-800',
          ].join(' ')}>
            {date.getDate()}
          </p>

          {/* 農曆 */}
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

        {/* 吃素日標示 */}
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

      {/* 吃素日訊息 */}
      {lunarInfo?.isVegetarianDay && (
        <div className="mt-4 p-3 bg-amber-100 rounded-xl">
          <p className="text-amber-800 text-sm font-medium">
            🙏 今天是吃素日，記得守約，吃素迎吉祥！
          </p>
        </div>
      )}

      {/* 歷史上的今天 */}
      <div className="mt-4">
        {!history && !historyLoading && (
          <button
            onClick={() => fetchHistory(Math.floor(Math.random() * 30))}
            className="w-full py-2.5 rounded-xl border border-dashed border-indigo-300 text-indigo-500 text-sm font-medium hover:bg-indigo-50 transition-colors flex items-center justify-center gap-2"
          >
            <span>📖</span>
            <span>歷史上的今天</span>
          </button>
        )}

        {historyLoading && (
          <div className="w-full py-3 rounded-xl bg-indigo-50 border border-indigo-100 text-center">
            <p className="text-indigo-400 text-sm animate-pulse">查詢歷史資料中...</p>
          </div>
        )}

        {historyError && !historyLoading && (
          <div className="p-3 rounded-xl bg-gray-50 border border-gray-200 text-sm text-gray-400 text-center">
            {historyError}
          </div>
        )}

        {history && !historyLoading && (
          <div className="rounded-xl border border-indigo-100 bg-indigo-50 overflow-hidden">
            {/* 標題列 */}
            <div className="flex items-center justify-between px-4 py-2 bg-indigo-100">
              <span className="text-xs font-bold text-indigo-600">📖 歷史上的今天</span>
              <span className="text-xs text-indigo-400">{historyIndex + 1} / {history.total}</span>
            </div>

            <div className="p-4">
              {/* 圖片 + 文字並排 */}
              <div className="flex gap-3">
                {history.imageUrl && (
                  <div className="flex-shrink-0 relative w-20 h-20 rounded-lg overflow-hidden bg-gray-100">
                    <Image
                      src={history.imageUrl}
                      alt="歷史圖片"
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-indigo-400 mb-1">{history.year} 年</p>
                  <p className="text-sm text-gray-700 leading-relaxed">{history.text}</p>
                </div>
              </div>

              {/* 操作列 */}
              <div className="flex gap-2 mt-3">
                <button
                  onClick={handleNextHistory}
                  className="flex-1 py-1.5 rounded-lg bg-white border border-indigo-200 text-indigo-500 text-xs font-medium hover:bg-indigo-50 transition-colors"
                >
                  🔀 換一個
                </button>
                {history.wikiUrl && (
                  <a
                    href={history.wikiUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 py-1.5 rounded-lg bg-white border border-indigo-200 text-indigo-500 text-xs font-medium hover:bg-indigo-50 transition-colors text-center"
                  >
                    📚 詳細介紹
                  </a>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 行動按鈕（吃素日才顯示） */}
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
