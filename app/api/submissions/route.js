import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import { getSubmissions } from '@/lib/store';

// 尝试从环境变量建立 Redis 连接（Vercel 集成会注入 UPSTASH_REDIS_REST_URL / TOKEN）
function getRedis() {
  try {
    return Redis.fromEnv();
  } catch {
    return null;
  }
}

export async function GET() {
  const redis = getRedis();
  if (redis) {
    try {
      const rawList = await redis.lrange('submissions', 0, -1);
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
        { error: '读取 Redis 失败', detail: String(err) },
        { status: 500 }
      );
    }
  }

  // 本地开发：内存列表兜底
  return NextResponse.json({ ok: true, submissions: getSubmissions() });
}