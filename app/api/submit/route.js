import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { addSubmission } from '@/lib/store';

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

  // Vercel：走 KV 持久化
  if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
    try {
      await kv.lpush('submissions', JSON.stringify(record));
      return NextResponse.json({ ok: true, storage: 'kv' });
    } catch (err) {
      return NextResponse.json(
        { error: '保存到 KV 失败', detail: String(err) },
        { status: 500 }
      );
    }
  }

  // 本地开发：内存列表兜底
  addSubmission(record);
  return NextResponse.json({ ok: true, storage: 'memory' });
}