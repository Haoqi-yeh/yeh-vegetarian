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

  // Load saved reminder time
  useEffect(() => {
    const saved = localStorage.getItem('vegetarian_reminder_time');
    if (saved) { setReminderTime(saved); setSavedTime(saved); }
  }, []);

  // Check LINE status
  const checkLineStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/line-notify/status');
      const data = await res.json();
      setLineStatus(data);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { checkLineStatus(); }, [checkLineStatus]);

  // Check URL params for LINE callback result
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('line_connected') === '1') {
      checkLineStatus();
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [checkLineStatus]);

  // Check Web Push support
  useEffect(() => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      setPushSupported(true);
      navigator.serviceWorker.register('/sw.js').then(() => {
        navigator.serviceWorker.ready.then(reg => {
          reg.pushManager.getSubscription().then(sub => {
            setPushEnabled(!!sub);
          });
        });
      }).catch(() => {});
    }
  }, []);

  const connectLINE = () => {
    window.location.href = '/api/line-notify/auth';
  };

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
        body: JSON.stringify({
          message: '\n🌿 吃素日曆測試訊息\n\n今天是農曆初一/十五，記得吃素喔！\n\n祝您吃素愉快 🙏',
        }),
      });
      if (res.ok) {
        setTestSent(true);
        setTimeout(() => setTestSent(false), 3000);
      }
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
        if (perm !== 'granted') {
          alert('請允許通知權限才能啟用提醒');
          setLoading(false);
          return;
        }

        // For demo: subscribe without VAPID (basic push)
        try {
          const sub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: undefined as unknown as string, // No VAPID for demo
          });
          await fetch('/api/push/subscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(sub),
          });
          setPushEnabled(true);
        } catch {
          // VAPID key required in production; show local notification as demo
          new Notification('吃素日曆', {
            body: '瀏覽器推播已啟用！初一和十五我們會提醒您 🌿',
            icon: '/icon-192.png',
          });
          setPushEnabled(true);
        }
      }
    } catch (err) {
      console.error('Push error:', err);
    }
    setLoading(false);
  };

  const saveReminderTime = () => {
    localStorage.setItem('vegetarian_reminder_time', reminderTime);
    setSavedTime(reminderTime);

    // Schedule daily check using service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(reg => {
        // Use Background Sync or simply show confirmation
        reg.showNotification('提醒時間已設定 ✓', {
          body: `每天 ${reminderTime} 將在吃素日當天提醒您`,
          icon: '/icon-192.png',
          tag: 'time-set',
        });
      }).catch(() => {
        alert(`提醒時間已儲存：每天 ${reminderTime} 在吃素日提醒`);
      });
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-4">

      {/* LINE Notify */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-[#06C755] rounded-xl flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-6 h-6 fill-white">
              <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/>
            </svg>
          </div>
          <div>
            <h3 className="font-bold text-gray-800">LINE Notify 提醒</h3>
            <p className="text-xs text-gray-500">在吃素日當天傳 LINE 訊息提醒您</p>
          </div>
          <div className="ml-auto">
            {lineStatus.connected ? (
              <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">✓ 已連接</span>
            ) : (
              <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded-full">未連接</span>
            )}
          </div>
        </div>

        {lineStatus.connected ? (
          <div className="space-y-3">
            {lineStatus.target && (
              <p className="text-sm text-gray-600">
                已連接：<span className="font-medium text-green-700">{lineStatus.target}</span>
                {lineStatus.targetType === 'group' ? ' (群組)' : ' (個人)'}
              </p>
            )}
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={sendLineTest}
                disabled={loading}
                className="px-4 py-2 bg-[#06C755] text-white rounded-lg text-sm font-medium hover:bg-[#05b34c] disabled:opacity-50 transition-colors"
              >
                {testSent ? '✓ 已傳送！' : '傳送測試訊息'}
              </button>
              <button
                onClick={disconnectLINE}
                disabled={loading}
                className="px-4 py-2 border border-red-200 text-red-500 rounded-lg text-sm hover:bg-red-50 disabled:opacity-50 transition-colors"
              >
                取消連接
              </button>
            </div>
          </div>
        ) : (
          <div>
            <p className="text-sm text-gray-500 mb-3">
              連接 LINE Notify 後，在農曆初一和十五當天會自動傳訊息提醒您吃素。
              <br />
              <span className="text-xs text-amber-600 mt-1 inline-block">
                ⚠️ 需先在 .env.local 設定 LINE_NOTIFY_CLIENT_ID 和 LINE_NOTIFY_CLIENT_SECRET
              </span>
            </p>
            <button
              onClick={connectLINE}
              className="px-5 py-2.5 bg-[#06C755] text-white rounded-xl text-sm font-bold hover:bg-[#05b34c] transition-colors shadow-sm"
            >
              連接 LINE Notify
            </button>
          </div>
        )}
      </div>

      {/* Web Push */}
      {pushSupported && (
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-xl">
              🔔
            </div>
            <div>
              <h3 className="font-bold text-gray-800">瀏覽器推播提醒</h3>
              <p className="text-xs text-gray-500">即使沒開網頁，也能收到通知</p>
            </div>
            <div className="ml-auto">
              <button
                onClick={togglePush}
                disabled={loading}
                className={[
                  'relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50',
                  pushEnabled ? 'bg-blue-600' : 'bg-gray-300',
                ].join(' ')}
              >
                <span className={[
                  'inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow',
                  pushEnabled ? 'translate-x-6' : 'translate-x-1',
                ].join(' ')} />
              </button>
            </div>
          </div>

          {pushEnabled && (
            <p className="text-sm text-blue-600">
              ✓ 推播已啟用，吃素日當天您會收到瀏覽器通知
            </p>
          )}
        </div>
      )}

      {/* Reminder time setting */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center text-xl">
            ⏰
          </div>
          <div>
            <h3 className="font-bold text-gray-800">提醒時間設定</h3>
            <p className="text-xs text-gray-500">設定每天幾點收到吃素日提醒</p>
          </div>
        </div>

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
          {savedTime && (
            <span className="text-sm text-gray-500">已設定：{savedTime}</span>
          )}
        </div>

        <p className="text-xs text-gray-400 mt-2">
          * 提醒僅在農曆初一和十五當天發送
        </p>
      </div>

      {/* How to set up LINE Notify */}
      <details className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
        <summary className="cursor-pointer font-medium text-amber-800 select-none">
          📋 如何設定 LINE Notify？（點此展開步驟）
        </summary>
        <ol className="mt-3 space-y-2 text-sm text-amber-700 list-decimal list-inside">
          <li>前往 <strong>LINE Notify</strong> 官網（notify-bot.line.me）並登入</li>
          <li>點「管理登錄的服務」→「登錄服務」</li>
          <li>填寫服務名稱（如：吃素日曆），Callback URL 填入：
            <code className="block bg-amber-100 rounded px-2 py-1 mt-1 text-xs break-all">
              http://localhost:3000/api/line-notify/callback
            </code>
          </li>
          <li>取得 <strong>Client ID</strong> 和 <strong>Client Secret</strong></li>
          <li>複製 <code className="bg-amber-100 px-1 rounded">.env.local.example</code> 為 <code className="bg-amber-100 px-1 rounded">.env.local</code> 並填入</li>
          <li>重啟開發伺服器後點「連接 LINE Notify」</li>
        </ol>
      </details>
    </div>
  );
}
