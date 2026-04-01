// 測試廣播：手動觸發一次測試訊息，確認 Bot 設定正確
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { broadcast } = await import('../../../../lib/line-messaging');
    await broadcast([{
      type: 'text',
      text: '🌿 吃素日曆測試訊息\n\n你的 LINE Bot 設定成功！\n初一、十五當天系統會自動發送提醒 🙏',
    }]);
    return NextResponse.json({ ok: true, message: '測試訊息已送出' });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
