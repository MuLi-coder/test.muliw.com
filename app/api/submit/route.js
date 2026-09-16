import { NextResponse } from 'next/server';
import { writeSubmission } from '@/lib/redis';

// 数据写入接口，禁用缓存/预渲染
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: '请求体不是合法的 JSON' }, { status: 400 });
  }

  const choices = body && body.choices;
  if (!choices || typeof choices !== 'object' || Array.isArray(choices)) {
    return NextResponse.json({ error: '缺少 choices 字段' }, { status: 400 });
  }

  const record = {
    submittedAt: new Date().toISOString(),
    choices,
  };

  const r = await writeSubmission(record);

  const res = r.ok
    ? NextResponse.json({ ok: true, storage: r.storage, source: r.source, host: r.host, detail: r.detail })
    : NextResponse.json(
        {
          ok: false,
          error: r.detail && r.detail.includes('fetch') ? '连接 Redis 失败' : '保存到 Redis 失败',
          detail: r.detail,
          source: r.source,
          host: r.host,
          hint: '请访问 /api/diagnose 查看完整连接诊断',
        },
        { status: 500 }
      );

  res.headers.set('Cache-Control', 'no-store, max-age=0, must-revalidate');
  return res;
}