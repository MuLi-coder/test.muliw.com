import { NextResponse } from 'next/server';
import { resolveRedis } from '@/lib/redis';
import { addSubmission } from '@/lib/store';

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
  const { redis, source, url, reason } = resolveRedis();
  if (redis) {
    try {
      await redis.lpush('submissions', JSON.stringify(record));
      return NextResponse.json({
        ok: true,
        storage: 'redis',
        source,
        host: url, // 仅协议+host，不含密码
      });
    } catch (err) {
      return NextResponse.json(
        {
          ok: false,
          error: '保存到 Redis 失败',
          detail: String((err && err.message) || err),
          source,
          host: url,
          reason: reason || '',
          hint: '请访问 /api/diagnose 查看完整连接诊断',
        },
        { status: 500 }
      );
    }
  }

  // 本地开发 / 未读到连接信息：内存兜底
  addSubmission(record);
  return NextResponse.json({
    ok: true,
    storage: 'memory',
    warning: reason || '未配置 Redis 环境变量，数据仅保存在进程内存，不会持久化',
    hint: '请访问 /api/diagnose 查看当前部署环境实际注入的 Redis 变量',
  });
}