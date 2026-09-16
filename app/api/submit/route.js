import { NextResponse } from 'next/server';
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

  const dir = path.join(process.cwd(), 'results');
  const filename = `submission-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  const filepath = path.join(dir, filename);

  const payload = {
    submittedAt: new Date().toISOString(),
    choices,
  };

  try {
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(filepath, JSON.stringify(payload, null, 2), 'utf-8');
  } catch (err) {
    return NextResponse.json(
      { error: '保存结果失败', detail: String(err) },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, file: `results/${filename}` });
}