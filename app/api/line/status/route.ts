// 取得 LINE Bot 狀態：是否設定好、好友人數
import { NextResponse } from 'next/server';

export async function GET() {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;

  if (!token) {
    return NextResponse.json({ configured: false });
  }

  try {
    const { getBotInfo } = await import('../../../../lib/line-messaging');
    const info = await getBotInfo();
    return NextResponse.json({
      configured: true,
      botName: info.displayName || '',
      pictureUrl: info.pictureUrl || '',
      followerCount: info.followerCount ?? 0,
    });
  } catch {
    return NextResponse.json({ configured: false });
  }
}
