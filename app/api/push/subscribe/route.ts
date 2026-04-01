// Web Push: store push subscriptions in Vercel KV (persistent across deploys)
import { NextRequest, NextResponse } from 'next/server';

// Use Vercel KV in production, fallback to in-memory for local dev
let memStore: Set<string> = new Set();

async function getKV() {
  if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
    const { kv } = await import('@vercel/kv');
    return kv;
  }
  return null;
}

export async function POST(req: NextRequest) {
  const subscription = await req.json();
  if (!subscription?.endpoint) {
    return NextResponse.json({ error: 'Invalid subscription' }, { status: 400 });
  }

  const key = `push:${Buffer.from(subscription.endpoint).toString('base64').slice(0, 40)}`;
  const kv = await getKV();

  if (kv) {
    await kv.set(key, JSON.stringify(subscription));
    // Track all keys in a set
    await kv.sadd('push:all_keys', key);
  } else {
    memStore.add(JSON.stringify(subscription));
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const { endpoint } = await req.json();
  const key = `push:${Buffer.from(endpoint).toString('base64').slice(0, 40)}`;
  const kv = await getKV();

  if (kv) {
    await kv.del(key);
    await kv.srem('push:all_keys', key);
  } else {
    for (const s of memStore) {
      if (JSON.parse(s).endpoint === endpoint) {
        memStore.delete(s);
        break;
      }
    }
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
  return Array.from(memStore).map(s => JSON.parse(s));
}
