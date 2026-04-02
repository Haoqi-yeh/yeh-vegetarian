'use client';

import { useState, Suspense, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Calendar from '@/components/Calendar';
import DayDetail from '@/components/DayDetail';
import MapSearch from '@/components/MapSearch';
import ReminderPanel from '@/components/ReminderPanel';

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

type Tab = 'calendar' | 'map' | 'reminder';

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'calendar', label: '日曆', icon: '📅' },
  { id: 'map', label: '找素食', icon: '🗺️' },
  { id: 'reminder', label: '提醒設定', icon: '🔔' },
];

function HomeContent() {
  const today = new Date();
  const [selectedDate, setSelectedDate] = useState<Date>(today);
  const [selectedLunar, setSelectedLunar] = useState<DayLunarInfo | undefined>();
  const [activeTab, setActiveTab] = useState<Tab>('calendar');
  const searchParams = useSearchParams();

  useEffect(() => {
    const tab = searchParams.get('tab') as Tab | null;
    if (tab && ['calendar', 'map', 'reminder'].includes(tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const handleDaySelect = (date: Date, lunarInfo?: DayLunarInfo) => {
    setSelectedDate(date);
    setSelectedLunar(lunarInfo);
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header + Tab navigation — 固定置頂 */}
      <div className="sticky top-0 z-20 shadow-md">
        <header className="bg-green-700 text-white px-4 py-4">
          <div className="max-w-2xl mx-auto flex items-center justify-between">
            <div>
              <h1 className="text-xl font-black tracking-wide">🌿 吃素日曆</h1>
              <p className="text-green-200 text-xs mt-0.5">農曆初一、十五吃素提醒</p>
            </div>
            <div className="text-right text-sm">
              <p className="text-green-100 font-medium">
                {today.getFullYear()}/{String(today.getMonth() + 1).padStart(2, '0')}/{String(today.getDate()).padStart(2, '0')}
              </p>
            </div>
          </div>
        </header>

        <nav className="bg-white border-b border-gray-200">
        <div className="max-w-2xl mx-auto flex">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={[
                'flex-1 py-3 text-sm font-semibold transition-colors flex items-center justify-center gap-1.5',
                activeTab === tab.id
                  ? 'text-green-700 border-b-2 border-green-600'
                  : 'text-gray-500 hover:text-gray-700',
              ].join(' ')}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
        </nav>
      </div>

      {/* Content */}
      <main className="flex-1 px-4 py-5 overflow-auto">
        <div className="max-w-2xl mx-auto">

          {/* Calendar tab */}
          {activeTab === 'calendar' && (
            <div className="space-y-5">
              <Suspense fallback={<div className="text-center text-green-600 py-10">載入中...</div>}>
                <Calendar
                  onDaySelect={handleDaySelect}
                  selectedDate={selectedDate}
                />
              </Suspense>

              {/* Selected day detail */}
              <DayDetail
                date={selectedDate}
                lunarInfo={selectedLunar}
                onFindFood={() => setActiveTab('map')}
                onRemind={() => setActiveTab('reminder')}
              />
            </div>
          )}

          {/* Map tab */}
          {activeTab === 'map' && (
            <div>
              <div className="mb-4">
                <h2 className="text-lg font-bold text-gray-800">找附近素食</h2>
                <p className="text-sm text-gray-500">搜尋您附近的素食餐廳和便利商店</p>
              </div>
              <MapSearch />
            </div>
          )}

          {/* Reminder tab */}
          {activeTab === 'reminder' && (
            <div>
              <div className="mb-4">
                <h2 className="text-lg font-bold text-gray-800">提醒設定</h2>
                <p className="text-sm text-gray-500">設定 LINE 或瀏覽器通知，再也不會忘記吃素日</p>
              </div>
              <ReminderPanel />
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-green-50 border-t border-green-100 py-3 px-4 text-center text-xs text-green-600">
        吃素迎吉祥・感恩神明護佑 🙏
      </footer>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-green-600">載入中...</div>}>
      <HomeContent />
    </Suspense>
  );
}
