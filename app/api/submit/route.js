import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import { addSubmission } from '@/lib/store';

// 从环境变量读取 Redis 连接信息，兼容 Upstash / 旧 Vercel KV 命名
function getRedis() {
  const rawUrl =
    process.env.UPSTASH_REDIS_REST_URL ||
    process.env.UPSTASH_REDIS_URL ||
    process.env.KV_REST_API_URL ||
    process.env.KV_URL ||
    '';
  const token =
    process.env.UPSTASH_REDIS_REST_TOKEN ||
    process.env.UPSTASH_REDIS_TOKEN ||
    process.env.KV_REST_API_TOKEN ||
    '';

  if (!rawUrl || !token) return null;

  let url = rawUrl.trim();
  // redis:// 协议统一转成 REST 的 https 端点
  if (/^redis?s?:\/\//.test(url)) {
    url = 'https://' + url.replace(/^redis?s?:\/\//, '');
  }

  try {
    // 关闭自动流水线，避免 /pipeline 端点拼接异常
    return new Redis({ url, token, enableAutoPipelining: false });
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
      // 出错时列出与 Redis 相关的环境变量名（不含值），方便定位
      const envVars = Object.keys(process.env).filter((k) => /upstash|redis|kv/i.test(k));
      return NextResponse.json(
        { error: '保存到 Redis 失败', detail: String(err), envVars },
        { status: 500 }
      );
    }
  }

  // 本地开发：内存列表兜底
  addSubmission(record);
  return NextResponse.json({ ok: true, storage: 'memory' });
}