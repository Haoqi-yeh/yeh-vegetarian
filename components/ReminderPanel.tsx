'use client';

import { useState, useEffect, useCallback } from 'react';

interface LineStatus {
  connected: boolean;
  target?: string;
  targetType?: string;
}

export default function ReminderPanel() {
  const [lineStatus, setLineStatus] = useState<LineStatus>({ connected: false });
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushSupported, setPushSupported] = useState(false);
  const [loading, setLoading] = useState(false);
  const [testSent, setTestSent] = useState(false);
  const [reminderTime, setReminderTime] = useState('08:00');
  const [savedTime, setSavedTime] = useState('');
  const [reminderTiming, setReminderTiming] = useState<'day_of' | 'day_before' | 'both'>('both');
  const [activeSection, setActiveSection] = useState<'group' | 'personal' | 'push'>('group');

  useEffect(() => {
    const savedT = localStorage.getItem('vegetarian_reminder_time');
    if (savedT) { setReminderTime(savedT); setSavedTime(savedT); }
    const savedTiming = localStorage.getItem('vegetarian_reminder_timing') as 'day_of' | 'day_before' | 'both' | null;
    if (savedTiming) setReminderTiming(savedTiming);
  }, []);

  const checkLineStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/line-notify/status');
      const data = await res.json();
      setLineStatus(data);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { checkLineStatus(); }, [checkLineStatus]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('line_connected') === '1') {
      checkLineStatus();
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [checkLineStatus]);

  useEffect(() => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      setPushSupported(true);
      navigator.serviceWorker.register('/sw.js').then(() => {
        navigator.serviceWorker.ready.then(reg => {
          reg.pushManager.getSubscription().then(sub => setPushEnabled(!!sub));
        });
      }).catch(() => {});
    }
  }, []);

  const connectLINE = () => { window.location.href = '/api/line-notify/auth'; };

  const disconnectLINE = async () => {
    setLoading(true);
    await fetch('/api/line-notify/status', { method: 'DELETE' });
    setLineStatus({ connected: false });
    setLoading(false);
  };

  const sendLineTest = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/line-notify/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: '\n🌿 吃素日曆測試訊息\n\n初一、十五吃素，感恩神明護佑 🙏' }),
      });
      if (res.ok) { setTestSent(true); setTimeout(() => setTestSent(false), 3000); }
    } catch { /* ignore */ }
    setLoading(false);
  };

  const togglePush = async () => {
    if (!('serviceWorker' in navigator)) return;
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
        if (perm !== 'granted') { alert('請允許通知權限才能啟用提醒'); setLoading(false); return; }
        try {
          const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: undefined as unknown as string });
          await fetch('/api/push/subscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(sub),
          });
          setPushEnabled(true);
        } catch {
          new Notification('吃素日曆', { body: '瀏覽器推播已啟用！🌿', icon: '/icon-192.png' });
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

      {/* Section tabs */}
      <div className="flex rounded-xl overflow-hidden border border-gray-200 bg-gray-50">
        {[
          { id: 'group' as const, label: '群組提醒', icon: '👥', desc: '大家一起收到' },
          { id: 'personal' as const, label: '個人 LINE', icon: '💬', desc: '只有自己收到' },
          { id: 'push' as const, label: '推播通知', icon: '🔔', desc: '手機彈出通知' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveSection(tab.id)}
            className={[
              'flex-1 py-3 px-2 text-center transition-colors',
              activeSection === tab.id ? 'bg-white shadow-sm' : 'hover:bg-gray-100',
            ].join(' ')}
          >
            <div className="text-lg">{tab.icon}</div>
            <div className={`text-xs font-bold mt-0.5 ${activeSection === tab.id ? 'text-green-700' : 'text-gray-500'}`}>
              {tab.label}
            </div>
            <div className="text-xs text-gray-400 hidden sm:block">{tab.desc}</div>
          </button>
        ))}
      </div>

      {/* 群組 LINE 提醒（Admin 設定） */}
      {activeSection === 'group' && (
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-2xl p-5">
            <h3 className="font-bold text-green-800 mb-1 flex items-center gap-2">
              <span className="text-xl">👥</span> 群組 LINE 提醒
            </h3>
            <p className="text-sm text-green-700 mb-4">
              建立一個 LINE 群組，把大家都加進去。一旦設定好，每到農曆初一和十五，<strong>群組裡所有人</strong>都會收到提醒，完全自動！
            </p>

            <div className="bg-white rounded-xl p-4 border border-green-200 space-y-3">
              <p className="text-sm font-bold text-gray-700">📋 設定步驟（只需做一次）：</p>
              <ol className="space-y-2 text-sm text-gray-600 list-none">
                <li className="flex gap-2">
                  <span className="w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">1</span>
                  <span>在 LINE 建立一個群組（例如：「家人吃素提醒」），把想一起收到提醒的人加進去</span>
                </li>
                <li className="flex gap-2">
                  <span className="w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">2</span>
                  <span>去 <strong>notify-bot.line.me</strong> 登入，點「透過 LINE Notify 接收通知」→ 選你的群組 → 複製 Token</span>
                </li>
                <li className="flex gap-2">
                  <span className="w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">3</span>
                  <span>把這個 Token 填入 Vercel 後台的 <code className="bg-gray-100 px-1 rounded text-xs">ADMIN_LINE_NOTIFY_TOKEN</code> 環境變數</span>
                </li>
                <li className="flex gap-2">
                  <span className="w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">4</span>
                  <span>完成！之後每天早上 8 點系統自動檢查，初一/十五會自動發訊息 🎉</span>
                </li>
              </ol>
            </div>

            <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700">
              ⚠️ 這個設定需要在「部署網站」的步驟中完成，請見下方的完整教學
            </div>
          </div>

          {/* Reminder time */}
          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="font-bold text-gray-800 flex items-center gap-2">
              <span className="text-xl">⏰</span> 提醒設定
            </h3>

            {/* 提醒時機 */}
            <div>
              <p className="text-sm font-medium text-gray-600 mb-2">提醒時機</p>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: 'day_of' as const,     label: '當天提醒',     sub: '吃素日當天發',     icon: '🌅' },
                  { value: 'day_before' as const, label: '前一天預告',   sub: '提前一天告知',     icon: '📅' },
                  { value: 'both' as const,       label: '兩個都要',     sub: '預告 + 當天',      icon: '🔔' },
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
                    <div className={`text-xs font-bold ${reminderTiming === opt.value ? 'text-green-700' : 'text-gray-700'}`}>
                      {opt.label}
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">{opt.sub}</div>
                  </button>
                ))}
              </div>
              {reminderTiming === 'day_before' && (
                <p className="text-xs text-blue-600 mt-2">
                  💡 適合需要提前訂位或準備素食的人
                </p>
              )}
              {reminderTiming === 'both' && (
                <p className="text-xs text-green-600 mt-2">
                  💡 前一天預告「明天吃素」，當天早上再提醒一次
                </p>
              )}
            </div>

            {/* 提醒時間 */}
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
                <p className="text-xs text-gray-500 mt-1.5">
                  已儲存：每天 {savedTime} 發送提醒
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 個人 LINE Notify */}
      {activeSection === 'personal' && (
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-[#06C755] rounded-xl flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-6 h-6 fill-white">
                <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/>
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-gray-800">個人 LINE Notify</h3>
              <p className="text-xs text-gray-500">只有你自己收到 LINE 訊息</p>
            </div>
            {lineStatus.connected ? (
              <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">✓ 已連接</span>
            ) : (
              <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded-full">未連接</span>
            )}
          </div>

          {lineStatus.connected ? (
            <div className="space-y-3">
              {lineStatus.target && (
                <p className="text-sm text-gray-600">
                  已連接：<span className="font-medium text-green-700">{lineStatus.target}</span>
                </p>
              )}
              <div className="flex gap-2">
                <button onClick={sendLineTest} disabled={loading}
                  className="px-4 py-2 bg-[#06C755] text-white rounded-lg text-sm font-medium hover:bg-[#05b34c] disabled:opacity-50 transition-colors">
                  {testSent ? '✓ 已傳送！' : '傳送測試訊息'}
                </button>
                <button onClick={disconnectLINE} disabled={loading}
                  className="px-4 py-2 border border-red-200 text-red-500 rounded-lg text-sm hover:bg-red-50 disabled:opacity-50 transition-colors">
                  取消連接
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-gray-500">
                點下方按鈕，用你自己的 LINE 帳號授權，之後初一/十五你的 LINE 會收到提醒。
              </p>
              <button onClick={connectLINE}
                className="px-5 py-2.5 bg-[#06C755] text-white rounded-xl text-sm font-bold hover:bg-[#05b34c] transition-colors shadow-sm">
                連接我的 LINE
              </button>
              <p className="text-xs text-amber-600">
                ⚠️ 需先在後台設定 LINE_NOTIFY_CLIENT_ID 和 LINE_NOTIFY_CLIENT_SECRET
              </p>
            </div>
          )}
        </div>
      )}

      {/* Web Push */}
      {activeSection === 'push' && (
        <div className="space-y-4">
          {pushSupported ? (
            <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-xl">🔔</div>
                <div className="flex-1">
                  <h3 className="font-bold text-gray-800">瀏覽器推播通知</h3>
                  <p className="text-xs text-gray-500">手機/電腦彈出通知，不需要開 LINE</p>
                </div>
                <button onClick={togglePush} disabled={loading}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50 ${pushEnabled ? 'bg-blue-600' : 'bg-gray-300'}`}>
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow ${pushEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>
              {pushEnabled ? (
                <p className="text-sm text-blue-600">✓ 已啟用！初一、十五當天你的裝置會彈出通知</p>
              ) : (
                <p className="text-sm text-gray-500">開啟後，就算沒有打開網頁，到了吃素日也會彈出通知提醒你</p>
              )}

              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-700">
                💡 <strong>每個人都要自己設定</strong>：把這個網址分享給家人朋友，請他們各自開啟推播，這樣每個人的手機都會收到提醒
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5 text-center">
              <p className="text-gray-500 text-sm">你的瀏覽器不支援推播通知</p>
              <p className="text-gray-400 text-xs mt-1">建議使用 Chrome 或 Safari（iOS 16.4 以上）</p>
            </div>
          )}

          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm text-amber-800">
            <p className="font-bold mb-1">📱 如何讓朋友也收到提醒？</p>
            <p>把網址傳給他們，請他們：</p>
            <ol className="mt-2 space-y-1 list-decimal list-inside text-amber-700">
              <li>打開網址（手機或電腦都可以）</li>
              <li>點「提醒設定」→「推播通知」</li>
              <li>開啟推播開關，允許通知即可</li>
            </ol>
          </div>
        </div>
      )}
    </div>
  );
}
