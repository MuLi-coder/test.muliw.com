import { NextResponse } from 'next/server';
import { resolveRedis } from '@/lib/redis';
import { getSubmissions } from '@/lib/store';

export async function GET() {
  const { redis, source, url, reason } = resolveRedis();
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
      return NextResponse.json({ ok: true, storage: 'redis', source, host: url, submissions: list });
    } catch (err) {
      return NextResponse.json(
        {
          ok: false,
          error: '读取 Redis 失败',
          detail: String((err && err.message) || err),
          source,
          host: url,
          hint: '请访问 /api/diagnose 查看完整连接诊断',
        },
        { status: 500 }
      );
    }
  }

  // 本地开发 / 未读到连接信息：内存兜底
  return NextResponse.json({
    ok: true,
    storage: 'memory',
    submissions: getSubmissions(),
    warning: reason || '未配置 Redis 环境变量，读取的是进程内存数据，不会持久化',
  });
}