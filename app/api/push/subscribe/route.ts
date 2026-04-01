// Web Push 訂閱管理：儲存到 Vercel KV（持久保存）
import { NextRequest, NextResponse } from 'next/server';

let memStore: Map<string, object> = new Map();

async function getKV() {
  if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
    const { kv } = await import('@vercel/kv');
    return kv;
  }
  return null;
}

function subKey(endpoint: string) {
  return `push:${Buffer.from(endpoint).toString('base64').slice(0, 40)}`;
}

export async function POST(req: NextRequest) {
  const subscription = await req.json();
  if (!subscription?.endpoint) {
    return NextResponse.json({ error: '無效的訂閱資料' }, { status: 400 });
  }

  const key = subKey(subscription.endpoint);
  const kv = await getKV();

  if (kv) {
    await kv.set(key, JSON.stringify(subscription));
    await kv.sadd('push:all_keys', key);
  } else {
    memStore.set(key, subscription);
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const { endpoint } = await req.json();
  const key = subKey(endpoint);
  const kv = await getKV();

  if (kv) {
    await kv.del(key);
    await kv.srem('push:all_keys', key);
  } else {
    memStore.delete(key);
  }

  return NextResponse.json({ ok: true });
}

export async function getAllSubscriptions(): Promise<object[]> {
  const kv = await getKV();
  if (kv) {
    const keys = await kv.smembers('push:all_keys') as string[];
    if (!keys.length) return [];
    const values = await Promise.all(keys.map(k => kv.get<string>(k)));
    return values.filter(Boolean).map(v => JSON.parse(v as string));
  }
  return Array.from(memStore.values());
}
