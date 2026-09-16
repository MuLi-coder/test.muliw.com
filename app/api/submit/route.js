import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import fs from 'fs';
import path from 'path';

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

  // Vercel 上：KV_REST_API_URL / KV_REST_API_TOKEN 会自动注入，走 KV 存储
  if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
    try {
      await kv.lpush('submissions', JSON.stringify(record));
      return NextResponse.json({
        ok: true,
        storage: 'kv',
        savedAt: record.submittedAt,
      });
    } catch (err) {
      return NextResponse.json(
        { error: '保存到 KV 失败', detail: String(err) },
        { status: 500 }
      );
    }
  }

  // 本地开发 fallback：写文件到 results/
  try {
    const dir = path.join(process.cwd(), 'results');
    const filename = `submission-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, filename), JSON.stringify(record, null, 2), 'utf-8');
    return NextResponse.json({ ok: true, storage: 'file', file: `results/${filename}` });
  } catch (err) {
    return NextResponse.json(
      { error: '保存结果失败', detail: String(err) },
      { status: 500 }
    );
  }
}