import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import { addSubmission } from '@/lib/store';

// 已知的常见环境变量名（按优先级排列）
const URL_KEYS = [
  'UPSTASH_REDIS_REST_URL',
  'UPSTASH_REDIS_URL',
  'KV_REST_API_URL',
  'KV_URL',
  'REDIS_REST_URL',
  'REDIS_URL',
];
const TOKEN_KEYS = [
  'UPSTASH_REDIS_REST_TOKEN',
  'UPSTASH_REDIS_TOKEN',
  'KV_REST_API_TOKEN',
  'REDIS_REST_TOKEN',
  'REDIS_TOKEN',
];

// 从环境变量里找到 Redis 连接信息并建立连接；找不到/失败返回 null
function getRedis() {
  const env = process.env;

  let url = '';
  for (const k of URL_KEYS) {
    if (env[k]) {
      url = env[k];
      break;
    }
  }
  let token = '';
  for (const k of TOKEN_KEYS) {
    if (env[k]) {
      token = env[k];
      break;
    }
  }

  // 兜底：按变量名动态发现（兼容自定义前缀）——名字里含 redis/upstash/kv 且带 url/token
  if (!url || !token) {
    const keys = Object.keys(env);
    if (!url) {
      const k = keys.find(
        (n) => /(redis|upstash|kv).*url/i.test(n) && !/read.?only/i.test(n)
      );
      if (k) url = env[k];
    }
    if (!token) {
      const k = keys.find(
        (n) => /(redis|upstash|kv).*token/i.test(n) && !/read.?only/i.test(n)
      );
      if (k) token = env[k];
    }
  }

  if (!url || !token) return null;

  let restUrl = String(url).trim();
  // redis:// 协议统一转成 REST 的 https 端点
  if (/^redis?s?:\/\//.test(restUrl)) {
    restUrl = 'https://' + restUrl.replace(/^redis?s?:\/\//, '');
  }

  try {
    return new Redis({ url: restUrl, token, enableAutoPipelining: false });
  } catch {
    return null;
  }
}

// 列出所有环境变量名（只列名字、不含值），用于诊断 Vercel 实际注入了哪些变量
function listEnvKeys() {
  return Object.keys(process.env).sort();
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

  // 线上：写 Redis（持久化，多实例共享）
  const redis = getRedis();
  if (redis) {
    try {
      await redis.lpush('submissions', JSON.stringify(record));
      return NextResponse.json({ ok: true, storage: 'redis' });
    } catch (err) {
      return NextResponse.json(
        { error: '保存到 Redis 失败', detail: String(err), envKeys: listEnvKeys() },
        { status: 500 }
      );
    }
  }

  // 本地开发 / 未读到连接信息：内存兜底
  addSubmission(record);
  return NextResponse.json({ ok: true, storage: 'memory', envKeys: listEnvKeys() });
}