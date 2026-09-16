// 一次性 Redis 自检接口：GET /api/diagnose
// 访问一次即可拿到：
//   1) 实际存在于当前部署环境中的 Redis 相关环境变量【只列变量名，绝不输出任何值/密码】
//   2) 用了哪一组变量、解析出的 REST 地址（仅协议+host，脱敏）
//   3) 连接连通性测试（ping）
//   4) 一次“写入 + 读取”往返测试（key 自动 60s 过期，不残留）
//   5) 每一步的具体报错信息
import { NextResponse } from 'next/server';
import { resolveRedis } from '@/lib/redis';

const DIAG_KEY = `diag_${Date.now()}`;

export async function GET() {
  return runDiag();
}

export async function POST() {
  return runDiag();
}

async function runDiag() {
  const cfg = resolveRedis();
  const result = {
    timestamp: new Date().toISOString(),
    runtime: process.env.NEXT_RUNTIME || 'node',
    env: {
      // 只列变量名，方便判断 Vercel 是否真的注入了这些变量
      redisRelatedKeys: cfg.presentKeys,
    },
    config: {
      source: cfg.source,
      url: cfg.url || '',
      hasRedisInstance: !!cfg.redis,
      reason: cfg.reason || '',
    },
    tests: {},
  };

  if (!cfg.redis) {
    result.conclusion = '无法建立 Redis 连接 → 当前代码会走【内存兜底】，数据不会持久化到数据库。';
    result.fix = '请确认 Vercel 项目已把 Redis(Upstash) 集成 Connect 到本项目，并【重新部署】一次让环境变量生效；部署后再访问本接口复查。';
    return NextResponse.json(result);
  }

  // 1) ping
  try {
    const pong = await cfg.redis.ping();
    result.tests.ping = { ok: true, value: pong };
  } catch (e) {
    result.tests.ping = { ok: false, error: str(e) };
  }

  // 2) 写
  const payload = JSON.stringify({ t: Date.now(), from: 'diagnose' });
  try {
    await cfg.redis.set(DIAG_KEY, payload, { ex: 60 });
    result.tests.write = { ok: true, key: DIAG_KEY };
  } catch (e) {
    result.tests.write = { ok: false, key: DIAG_KEY, error: str(e) };
  }

  // 3) 读
  try {
    const got = await cfg.redis.get(DIAG_KEY);
    result.tests.read = { ok: got === payload, key: DIAG_KEY, value: got };
  } catch (e) {
    result.tests.read = { ok: false, key: DIAG_KEY, error: str(e) };
  }

  // 4) 提交业务用的 list 键是否可用
  try {
    const n = await cfg.redis.llen('submissions');
    result.tests.submissionsKey = { ok: true, llen: n };
  } catch (e) {
    result.tests.submissionsKey = { ok: false, error: str(e) };
  }

  const allOk =
    result.tests.ping?.ok === true &&
    result.tests.write?.ok === true &&
    result.tests.read?.ok === true;
  result.conclusion = allOk
    ? 'Redis 连接、读写全部正常。提交接口应能把结果持久化到数据库。'
    : 'Redis 连接存在但【部分读写失败】，详见 tests 各字段与 error 信息。';
  return NextResponse.json(result);
}

function str(e) {
  return String((e && e.message) || e);
}