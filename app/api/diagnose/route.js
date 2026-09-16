// 一次性 Redis 自检接口：GET /api/diagnose
// 访问一次即可拿到：实际存在的 Redis 相关环境变量名（仅名字，不含值）、
// 选用的连接方式、TCP/TLS 直连测试（ping + 写 + 读 + 业务键长度）及具体报错。
import { NextResponse } from 'next/server';
import { diagnoseRedis } from '@/lib/redis';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  return runDiag();
}

export async function POST() {
  return runDiag();
}

async function runDiag() {
  const result = await diagnoseRedis();
  result.timestamp = new Date().toISOString();
  result.runtime = process.env.NEXT_RUNTIME || 'node';
  const res = NextResponse.json(result);
  res.headers.set('Cache-Control', 'no-store, max-age=0');
  return res;
}