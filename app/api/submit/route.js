import { NextResponse } from 'next/server';
import { writeSubmission } from '@/lib/redis';

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

  if (!r.ok) {
    // 有 Redis 配置但写入失败 -> 明确报错
    return NextResponse.json(
      {
        ok: false,
        error: r.detail.includes('fetch') ? '连接 Redis 失败（请改用 rediss:// TCP 直连）' : '保存到 Redis 失败',
        detail: r.detail,
        source: r.source,
        host: r.host,
        hint: '请访问 /api/diagnose 查看完整连接诊断',
      },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, storage: r.storage, source: r.source, host: r.host, detail: r.detail });
}