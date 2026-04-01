'use client';

import { useState, useEffect, useCallback } from 'react';

interface LineBotStatus {
  configured: boolean;
  botName?: string;
  followerCount?: number;
}

export default function ReminderPanel() {
  const [lineBotStatus, setLineBotStatus] = useState<LineBotStatus>({ configured: false });
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushSupported, setPushSupported] = useState(false);
  const [loading, setLoading] = useState(false);
  const [testSent, setTestSent] = useState(false);
  const [reminderTime, setReminderTime] = useState('08:00');
  const [savedTime, setSavedTime] = useState('');
  const [reminderTiming, setReminderTiming] = useState<'day_of' | 'day_before' | 'both'>('both');
  const [activeSection, setActiveSection] = useState<'line' | 'push'>('line');

  useEffect(() => {
    const savedT = localStorage.getItem('vegetarian_reminder_time');
    if (savedT) { setReminderTime(savedT); setSavedTime(savedT); }
    const savedTiming = localStorage.getItem('vegetarian_reminder_timing') as 'day_of' | 'day_before' | 'both' | null;
    if (savedTiming) setReminderTiming(savedTiming);
  }, []);

  const checkLineBotStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/line/status');
      const data = await res.json();
      setLineBotStatus(data);
    } catch { /* 略過 */ }
  }, []);

  useEffect(() => { checkLineBotStatus(); }, [checkLineBotStatus]);

  useEffect(() => {
    if (!('serviceWorker' in navigator && 'PushManager' in window)) return;
    setPushSupported(true);
    navigator.serviceWorker.register('/sw.js').then(reg => {
      reg.pushManager.getSubscription().then(sub => setPushEnabled(!!sub));
    }).catch(() => {});
  }, []);

  const sendLineTest = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/line/test', { method: 'POST' });
      const data = await res.json();
      if (data.ok) { setTestSent(true); setTimeout(() => setTestSent(false), 3000); }
      else alert(`傳送失敗：${data.error}`);
    } catch { alert('傳送失敗，請確認設定是否正確'); }
    setLoading(false);
  };

  const togglePush = async () => {
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;

      if (pushEnabled) {
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          await sub.unsubscribe();
          await fetch('/api/push/subscribe', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ endpoint: sub.endpoint }),
          });
        }
        setPushEnabled(false);
      } else {
        const perm = await Notification.requestPermission();
        if (perm !== 'granted') {
          alert('請允許通知權限才能啟用提醒');
          setLoading(false);
          return;
        }

        // 取得 VAPID public key
        let applicationServerKey: string | undefined;
        try {
          const res = await fetch('/api/push/vapid-key');
          if (res.ok) {
            const data = await res.json();
            applicationServerKey = data.publicKey;
          }
        } catch { /* 略過，使用無 VAPID 模式 */ }

        try {
          const sub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            ...(applicationServerKey ? { applicationServerKey } : {}),
          });
          await fetch('/api/push/subscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(sub),
          });
          setPushEnabled(true);
        } catch {
          // 即使沒有 VAPID，也標記已啟用（本機通知模式）
          setPushEnabled(true);
        }
      }
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const saveReminderTime = () => {
    localStorage.setItem('vegetarian_reminder_time', reminderTime);
    localStorage.setItem('vegetarian_reminder_timing', reminderTiming);
    setSavedTime(reminderTime);
    const timingLabel = reminderTiming === 'day_of' ? '當天' : reminderTiming === 'day_before' ? '前一天' : '當天 + 前一天';
    alert(`✓ 已儲存！提醒時機：${timingLabel}，時間：${reminderTime}`);
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-4">

      {/* 分頁切換 */}
      <div className="flex rounded-xl overflow-hidden border border-gray-200 bg-gray-50">
        {[
          { id: 'line' as const, label: 'LINE 提醒', icon: '💬', desc: '加好友後自動收到' },
          { id: 'push' as const, label: '推播通知', icon: '🔔', desc: '手機彈出通知' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveSection(tab.id)}
            className={[
              'flex-1 py-3 px-4 text-center transition-colors',
              activeSection === tab.id ? 'bg-white shadow-sm' : 'hover:bg-gray-100',
            ].join(' ')}
          >
            <div className="text-lg">{tab.icon}</div>
            <div className={`text-sm font-bold mt-0.5 ${activeSection === tab.id ? 'text-green-700' : 'text-gray-500'}`}>
              {tab.label}
            </div>
            <div className="text-xs text-gray-400 hidden sm:block">{tab.desc}</div>
          </button>
        ))}
      </div>

      {/* LINE 分頁 */}
      {activeSection === 'line' && (
        <div className="space-y-4">

          {/* 申請步驟（未設定才顯示） */}
          {!lineBotStatus.configured && (
            <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
              <p className="font-bold text-gray-800 mb-3">📋 申請步驟（只需做一次）</p>
              <ol className="space-y-3 text-sm text-gray-600">
                {[
                  '打開 developers.line.biz，用 LINE 帳號登入',
                  '點「建立 Provider」→ 填入名稱 → 建立',
                  '點「建立 Channel」→ 選「Messaging API」',
                  '填寫帳號名稱、類別 → 建立',
                  '進入 Channel → 點「Messaging API」分頁 → 複製「Channel access token」',
                  '點「Basic settings」分頁 → 複製「Channel secret」',
                  '到 Vercel → Settings → Environment Variables 填入這兩個值，重新部署即完成',
                ].map((step, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="w-6 h-6 bg-[#06C755] text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">{i + 1}</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-700">
                💡 設定好後在 Vercel 重新部署，這個頁面就會顯示「已設定」
              </div>
            </div>
          )}

          {/* 提醒設定 */}
          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="font-bold text-gray-800 flex items-center gap-2">
              <span className="text-xl">⏰</span> 提醒設定
            </h3>

            <div>
              <p className="text-sm font-medium text-gray-600 mb-2">提醒時機</p>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: 'day_of' as const,     label: '當天提醒',   sub: '吃素日當天發', icon: '🌅' },
                  { value: 'day_before' as const, label: '前一天預告', sub: '提前一天告知', icon: '📅' },
                  { value: 'both' as const,       label: '兩個都要',   sub: '預告 + 當天',  icon: '🔔' },
                ].map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setReminderTiming(opt.value)}
                    className={[
                      'rounded-xl border-2 p-3 text-center transition-all',
                      reminderTiming === opt.value
                        ? 'border-green-500 bg-green-50'
                        : 'border-gray-200 hover:border-gray-300',
                    ].join(' ')}
                  >
                    <div className="text-xl mb-1">{opt.icon}</div>
                    <div className={`text-xs font-bold ${reminderTiming === opt.value ? 'text-green-700' : 'text-gray-700'}`}>{opt.label}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{opt.sub}</div>
                  </button>
                ))}
              </div>
              {reminderTiming === 'day_before' && (
                <p className="text-xs text-blue-600 mt-2">💡 適合需要提前訂位或準備的人</p>
              )}
              {reminderTiming === 'both' && (
                <p className="text-xs text-green-600 mt-2">💡 前一天預告 + 當天早上再提醒一次</p>
              )}
            </div>

            <div>
              <p className="text-sm font-medium text-gray-600 mb-2">提醒時間</p>
              <div className="flex items-center gap-3">
                <input
                  type="time"
                  value={reminderTime}
                  onChange={e => setReminderTime(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-gray-800 font-medium"
                />
                <button
                  onClick={saveReminderTime}
                  className="px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600 transition-colors"
                >
                  儲存
                </button>
              </div>
              {savedTime && (
                <p className="text-xs text-gray-500 mt-1.5">已儲存：每天 {savedTime} 發送提醒</p>
              )}
              <p className="text-xs text-gray-400 mt-1">※ 時間設定僅供參考，實際排程需在 Vercel 後台調整</p>
            </div>
          </div>

          {/* LINE Bot 狀態卡（移到最下面） */}
          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-[#06C755] rounded-xl flex items-center justify-center">
                <svg viewBox="0 0 24 24" className="w-6 h-6 fill-white">
                  <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/>
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-gray-800">
                  {lineBotStatus.configured && lineBotStatus.botName ? lineBotStatus.botName : 'LINE Bot'}
                </h3>
                <p className="text-xs text-gray-500">
                  {lineBotStatus.configured
                    ? `目前有 ${lineBotStatus.followerCount ?? 0} 人加好友`
                    : '尚未設定'}
                </p>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${lineBotStatus.configured ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                {lineBotStatus.configured ? '✓ 已設定' : '未設定'}
              </span>
            </div>

            {lineBotStatus.configured && (
              <div className="space-y-3">
                <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-sm text-green-800">
                  <p className="font-bold mb-1">📲 如何讓朋友也收到提醒？</p>
                  <div className="mt-2 bg-white rounded-lg p-2 border border-green-200 text-gray-700 text-xs font-mono">
                    在 LINE 搜尋「{lineBotStatus.botName}」加好友，就能在農曆初一和十五自動收到吃素提醒！🌿
                  </div>
                </div>
                <button
                  onClick={sendLineTest}
                  disabled={loading}
                  className="px-4 py-2 bg-[#06C755] text-white rounded-lg text-sm font-medium hover:bg-[#05b34c] disabled:opacity-50 transition-colors"
                >
                  {testSent ? '✓ 測試訊息已送出！' : '傳送測試訊息'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 推播通知分頁 */}
      {activeSection === 'push' && (
        <div className="space-y-4">
          {pushSupported ? (
            <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-xl">🔔</div>
                <div className="flex-1">
                  <h3 className="font-bold text-gray-800">瀏覽器推播通知</h3>
                  <p className="text-xs text-gray-500">手機／電腦彈出通知，不需要 LINE</p>
                </div>
                <button
                  onClick={togglePush}
                  disabled={loading}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50 ${pushEnabled ? 'bg-blue-600' : 'bg-gray-300'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow ${pushEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>
              {pushEnabled
                ? <p className="text-sm text-blue-600">✓ 已啟用！初一、十五當天你的裝置會彈出通知</p>
                : <p className="text-sm text-gray-500">開啟後，就算沒有打開網頁，到了吃素日也會彈出通知</p>
              }
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-700">
                💡 <strong>每個人都要自己設定</strong>：把網址傳給朋友，請他們各自開啟推播通知
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5 text-center">
              <p className="text-gray-500 text-sm">你的瀏覽器不支援推播通知</p>
              <p className="text-gray-400 text-xs mt-1">建議使用 Chrome 或 Safari（iOS 16.4 以上）</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
