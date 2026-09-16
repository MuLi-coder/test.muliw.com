import { NextResponse } from 'next/server';
import { readSubmissions } from '@/lib/redis';

// 关键：这个 GET 接口读的是运行时的实时数据，绝不能做静态预渲染/CDN 长缓存，
// 否则无论数据库里写了多少，前端都会拿到构建时缓存的空列表（显示“共 0 次提交”）。
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  const r = await readSubmissions();

  const res = r.ok
    ? NextResponse.json({
        ok: true,
        storage: r.storage,
        source: r.source,
        host: r.host,
        submissions: r.submissions,
        detail: r.detail,
      })
    : NextResponse.json(
        {
          ok: false,
          error: '读取 Redis 失败',
          detail: r.detail,
          source: r.source,
          host: r.host,
          hint: '请访问 /api/diagnose 查看完整连接诊断',
        },
        { status: 500 }
      );

  // 禁止一切缓存，保证每次拉取都是最新数据
  res.headers.set('Cache-Control', 'no-store, max-age=0, must-revalidate');
  res.headers.set('Pragma', 'no-cache');
  return res;
}