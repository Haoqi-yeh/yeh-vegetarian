// 歷史上的今天：串接維基百科 On This Day API
// GET /api/history?month=4&day=1&index=0
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const month = searchParams.get('month');
  const day = searchParams.get('day');
  const index = parseInt(searchParams.get('index') || '0');

  if (!month || !day) {
    return NextResponse.json({ error: '缺少日期參數' }, { status: 400 });
  }

  try {
    // 使用維基百科繁體中文 API
    const res = await fetch(
      `https://zh.wikipedia.org/api/rest_v1/feed/onthisday/events/${month}/${day}`,
      {
        headers: {
          'Accept': 'application/json',
          'Accept-Language': 'zh-TW',
        },
        next: { revalidate: 3600 }, // 快取 1 小時
      }
    );

    if (!res.ok) throw new Error(`Wikipedia API 回應 ${res.status}`);

    const data = await res.json();
    const events: Array<{
      year: number;
      text: string;
      pages?: Array<{ thumbnail?: { source: string }; content_urls?: { mobile?: { page: string } } }>;
    }> = data.events || [];

    if (!events.length) {
      return NextResponse.json({ event: null, total: 0 });
    }

    // 隨機打散讓每次點擊結果不同
    const safeIndex = ((index % events.length) + events.length) % events.length;
    const event = events[safeIndex];

    // 找第一個有縮圖的頁面
    let imageUrl: string | null = null;
    let wikiUrl: string | null = null;
    for (const page of event.pages ?? []) {
      if (page.thumbnail?.source) {
        imageUrl = page.thumbnail.source;
      }
      if (!wikiUrl && page.content_urls?.mobile?.page) {
        wikiUrl = page.content_urls.mobile.page;
      }
      if (imageUrl && wikiUrl) break;
    }

    return NextResponse.json({
      year: event.year,
      text: event.text,
      imageUrl,
      wikiUrl,
      total: events.length,
      index: safeIndex,
    });
  } catch (err) {
    console.error('歷史上的今天 API 失敗:', err);
    return NextResponse.json({ error: '暫時無法取得資料，請稍後再試' }, { status: 500 });
  }
}
