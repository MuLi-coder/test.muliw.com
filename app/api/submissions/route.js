import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import fs from 'fs';
import path from 'path';

export async function GET() {
  // Vercel：读 KV
  if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
    try {
      const rawList = await kv.lrange('submissions', 0, -1);
      const list = (rawList || []).map((s) => {
        if (typeof s === 'string') {
          try {
            return JSON.parse(s);
          } catch {
            return s;
          }
        }
        return s;
      });
      return NextResponse.json({ ok: true, storage: 'kv', submissions: list });
    } catch (err) {
      return NextResponse.json(
        { error: '读取 KV 失败', detail: String(err) },
        { status: 500 }
      );
    }
  }

  // 本地 fallback：读 results/ 目录
  try {
    const dir = path.join(process.cwd(), 'results');
    if (!fs.existsSync(dir)) {
      return NextResponse.json({ ok: true, storage: 'file', submissions: [] });
    }
    const files = fs
      .readdirSync(dir)
      .filter((f) => f.endsWith('.json'))
      .sort()
      .reverse();
    const list = files
      .map((f) => {
        try {
          return JSON.parse(fs.readFileSync(path.join(dir, f), 'utf-8'));
        } catch {
          return null;
        }
      })
      .filter(Boolean);
    return NextResponse.json({ ok: true, storage: 'file', submissions: list });
  } catch (err) {
    return NextResponse.json(
      { error: '读取结果失败', detail: String(err) },
      { status: 500 }
    );
  }
}