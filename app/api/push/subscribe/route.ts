// Web Push: store push subscriptions (in-memory for demo; use DB in production)
import { NextRequest, NextResponse } from 'next/server';

// In production, persist subscriptions to a database
// For this demo, store in module-level variable (resets on server restart)
const subscriptions: Set<string> = new Set();

export async function POST(req: NextRequest) {
  const subscription = await req.json();
  if (!subscription?.endpoint) {
    return NextResponse.json({ error: 'Invalid subscription' }, { status: 400 });
  }
  subscriptions.add(JSON.stringify(subscription));
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const { endpoint } = await req.json();
  for (const s of subscriptions) {
    if (JSON.parse(s).endpoint === endpoint) {
      subscriptions.delete(s);
      break;
    }
  }
  return NextResponse.json({ ok: true });
}

export function getSubscriptions() {
  return Array.from(subscriptions).map((s) => JSON.parse(s));
}
