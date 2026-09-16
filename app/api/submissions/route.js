import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { getSubmissions } from '@/lib/store';

export async function GET() {
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
      return NextResponse.json({ ok: true, submissions: list });
    } catch (err) {
      return NextResponse.json(
        { error: '读取 KV 失败', detail: String(err) },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ ok: true, submissions: getSubmissions() });
}