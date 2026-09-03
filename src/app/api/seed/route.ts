import { NextResponse } from 'next/server';
import { query, initDb } from '@/lib/db';

export async function POST() {
  try {
    await initDb();

    const userRes = await query('SELECT * FROM users WHERE id = $1', ['demo-user-1']);
    if (userRes.rows.length === 0) {
      await query(
        'INSERT INTO users (id, email, name, created_at, updated_at) VALUES ($1, $2, $3, NOW(), NOW())',
        ['demo-user-1', 'developer@sentinel.local', 'Portfolio Developer']
      );
    }

    const pageRes = await query('SELECT * FROM status_pages WHERE slug = $1', ['system-status']);
    if (pageRes.rows.length === 0) {
      await query(
        'INSERT INTO status_pages (id, user_id, title, slug, is_public, monitors, created_at, updated_at) VALUES ($1, $2, $3, $4, true, $5, NOW(), NOW())',
        ['status-page-demo', 'demo-user-1', 'Platform System Status', 'system-status', JSON.stringify([])]
      );
    }

    return NextResponse.json({ success: true, message: 'PostgreSQL database initialized!' });
  } catch (error: unknown) {
    const errStr = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: errStr }, { status: 500 });
  }
}
