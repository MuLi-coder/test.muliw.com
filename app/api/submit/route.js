import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import { addSubmission } from '@/lib/store';

// 尝试从环境变量建立 Redis 连接（Vercel 集成会注入 UPSTASH_REDIS_REST_URL / TOKEN）
function getRedis() {
  try {
    return Redis.fromEnv();
  } catch {
    return null;
  }
}

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

  // 线上：写 Upstash Redis（持久化，多实例共享）
  const redis = getRedis();
  if (redis) {
    try {
      await redis.lpush('submissions', JSON.stringify(record));
      return NextResponse.json({ ok: true, storage: 'redis' });
    } catch (err) {
      return NextResponse.json(
        { error: '保存到 Redis 失败', detail: String(err) },
        { status: 500 }
      );
    }
  }

  // 本地开发：内存列表兜底
  addSubmission(record);
  return NextResponse.json({ ok: true, storage: 'memory' });
}