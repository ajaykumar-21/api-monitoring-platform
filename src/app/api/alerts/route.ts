import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

const DEMO_USER_ID = 'demo-user-1';

export async function GET() {
  try {
    const alertRes = await query('SELECT * FROM alert_channels WHERE user_id = $1 ORDER BY created_at DESC', [
      DEMO_USER_ID,
    ]);
    return NextResponse.json({ alertChannels: alertRes.rows });
  } catch (error: unknown) {
    const errStr = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: errStr }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { type, target } = body;

    if (!target) {
      return NextResponse.json({ error: 'Target URL or Email is required' }, { status: 400 });
    }

    const channelId = 'channel_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);

    await query(
      'INSERT INTO alert_channels (id, user_id, type, target, is_active, created_at) VALUES ($1, $2, $3, $4, true, NOW())',
      [channelId, DEMO_USER_ID, type || 'WEBHOOK', target]
    );

    const channel = (await query('SELECT * FROM alert_channels WHERE id = $1', [channelId])).rows[0];

    return NextResponse.json({ channel }, { status: 201 });
  } catch (error: unknown) {
    const errStr = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: errStr }, { status: 500 });
  }
}
