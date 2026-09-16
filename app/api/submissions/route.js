import { NextResponse } from 'next/server';
import { readSubmissions } from '@/lib/redis';

export async function GET() {
  const r = await readSubmissions();

  if (!r.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: '读取 Redis 失败',
        detail: r.detail,
        source: r.source,
        host: r.host,
        hint: '请访问 /api/diagnose 查看完整连接诊断',
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    storage: r.storage,
    source: r.source,
    host: r.host,
    submissions: r.submissions,
    detail: r.detail,
  });
}