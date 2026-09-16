import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import { getSubmissions } from '@/lib/store';

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
      const envVars = Object.keys(process.env).filter((k) => /upstash|redis|kv/i.test(k));
      return NextResponse.json(
        { error: '读取 Redis 失败', detail: String(err), envVars },
        { status: 500 }
      );
    }
  }

  // 本地开发：内存列表兜底
  return NextResponse.json({ ok: true, submissions: getSubmissions() });
}