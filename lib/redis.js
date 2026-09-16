// 统一的 Redis 数据访问模块（仅供 API 路由 / server 组件使用）
//
// 关键点：本项目实际使用的 Redis 是「Redis Cloud」（域名 *.db.redis.io），
// 它只提供 TCP/TLS 连接（rediss://），并不提供 Upstash 那套 HTTP REST API。
// 所以这里【优先】用 ioredis 走 TCP/TLS 连 rediss:// 连接串；
// 同时为兼容将来改回 Upstash 的情况，保留 Upstash REST 作为后备；
// 两者都不可用时，才退回进程内存兜底。
import Redis from 'ioredis';
import { addSubmission, getSubmissions } from '@/lib/store';

// 可能携带 redis/rediss 连接串的环境变量（按优先级）
const CONN_KEYS = ['REDIS_URL', 'UPSTASH_REDIS_URL', 'KV_URL', 'REDIS_REST_URL'];
// Upstash 的 REST 成对变量（后备方案）
const UPSTASH_URL_KEYS = ['UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_URL', 'KV_REST_API_URL', 'KV_URL'];
const UPSTASH_TOKEN_KEYS = [
  'UPSTASH_REDIS_REST_TOKEN',
  'UPSTASH_REDIS_TOKEN',
  'KV_REST_API_TOKEN',
  'REDIS_REST_TOKEN',
  'REDIS_TOKEN',
];

// 找出一个 redis/rediss 连接串（保留原始端口，ioredis 才能按 TCP 连对端口）
export function findConnString() {
  for (const k of CONN_KEYS) {
    const v = process.env[k];
    if (v && /^rediss?:\/\//.test(v)) return { key: k, conn: v.trim() };
  }
  return null;
}

// 找出 Upstash REST 成对变量
export function findUpstashPair() {
  for (let i = 0; i < UPSTASH_URL_KEYS.length; i++) {
    const u = process.env[UPSTASH_URL_KEYS[i]];
    const t = process.env[UPSTASH_TOKEN_KEYS[i]];
    if (u && t) return { urlKey: UPSTASH_URL_KEYS[i], tokenKey: UPSTASH_TOKEN_KEYS[i], url: u, token: t };
  }
  return null;
}

// 列出所有可能与 Redis 相关的环境变量名（只列名字，不列任何值）
export function listRedisEnvKeys() {
  return Object.keys(process.env)
    .filter((k) => /(redis|upstash|kv)/i.test(k) && !/username/i.test(k))
    .sort();
}

// 脱敏连接串：redis://***@host:port
function maskConn(cs) {
  const m = String(cs).match(/^(rediss?):\/\/[^@/]*@([^:/]+)(:\d+)?/);
  return m ? `${m[1]}://***@${m[2]}${m[3] || ''}` : '(无法解析)';
}
function maskUrl(url) {
  try {
    const u = new URL(url);
    return `${u.protocol}//${u.host}`;
  } catch {
    return String(url).slice(0, 16);
  }
}

// redis:// <-> rediss:// 互换，用于“分不清该用明文还是 TLS”时自动重试
function swapScheme(conn) {
  if (/^redis:\/\//.test(conn)) return conn.replace(/^redis:\/\//, 'rediss://');
  if (/^rediss:\/\//.test(conn)) return conn.replace(/^rediss:\/\//, 'redis://');
  return conn;
}

function makeClient(url) {
  return new Redis(url, {
    lazyConnect: true, // 不自动连接，由 connect() 显式控制，能拿到真实连接结果
    maxRetriesPerRequest: 1,
    retryStrategy: () => null, // 失败不无限重连
    enableOfflineQueue: false,
    connectTimeout: 15_000,
  });
}

// 用 ioredis 走 TCP/TLS 执行一次命令，用完即断开（适合 Serverless）
// 关键：lazyConnect + await connect()，真正等到底层 socket 建连成功或拿到真实报错；
//   若有 need，明文/TLS 各试一次。
async function withTcp(conn, fn) {
  const candidates = [conn, swapScheme(conn)];
  const attempts = [];
  let lastMessage = '';
  for (const url of candidates) {
    const client = makeClient(url);
    try {
      await client.connect(); // 就绪则 resolve，失败则 reject（真实原因，如 ECONNREFUSED / ETIMEDOUT / TLS 校验失败）
      try {
        return await fn(client);
      } finally {
        try {
          client.disconnect();
        } catch {}
      }
    } catch (e) {
      client.disconnect();
      lastMessage = String((e && e.message) || e);
      attempts.push({ url: maskConn(url), error: lastMessage });
    }
  }
  const err = new Error(lastMessage || '连接失败');
  err.attempts = attempts;
  throw err;
}

// ---------- 业务：写入一次提交 ----------
export async function writeSubmission(record) {
  // 方案 A：TCP/TLS 直连 Redis（本项目实际使用）
  const cs = findConnString();
  if (cs) {
    try {
      await withTcp(cs.conn, async (c) => {
        await c.lpush('submissions', JSON.stringify(record));
      });
      return { ok: true, storage: 'redis', source: `${cs.key}（TCP/TLS classic）`, host: maskConn(cs.conn) };
    } catch (e) {
      return {
        ok: false,
        storage: 'redis',
        source: `${cs.key}（TCP/TLS classic）`,
        host: maskConn(cs.conn),
        detail: String((e && e.message) || e),
      };
    }
  }

  // 方案 B：Upstash REST（兼容旧配置）
  const up = findUpstashPair();
  if (up) {
    try {
      const { Redis: UpstashRedis } = await import('@upstash/redis');
      const r = new UpstashRedis({ url: up.url, token: up.token, enableAutoPipelining: false });
      await r.lpush('submissions', JSON.stringify(record));
      return { ok: true, storage: 'redis', source: `${up.urlKey}+${up.tokenKey}（Upstash REST）`, host: maskUrl(up.url) };
    } catch (e) {
      return { ok: false, storage: 'redis', source: 'Upstash REST', host: maskUrl(up.url), detail: String((e && e.message) || e) };
    }
  }

  // 方案 C：内存兜底
  addSubmission(record);
  return { ok: true, storage: 'memory', detail: '未配置可用的 Redis 连接，已用进程内存兜底（不会持久化）' };
}

// ---------- 业务：读取全部提交 ----------
export async function readSubmissions() {
  const cs = findConnString();
  if (cs) {
    try {
      const rawList = await withTcp(cs.conn, (c) => c.lrange('submissions', 0, -1));
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
      return { ok: true, storage: 'redis', source: `${cs.key}（TCP/TLS classic）`, host: maskConn(cs.conn), submissions: list };
    } catch (e) {
      return { ok: false, storage: 'redis', source: `${cs.key}（TCP/TLS classic）`, host: maskConn(cs.conn), detail: String((e && e.message) || e) };
    }
  }

  const up = findUpstashPair();
  if (up) {
    try {
      const { Redis: UpstashRedis } = await import('@upstash/redis');
      const r = new UpstashRedis({ url: up.url, token: up.token, enableAutoPipelining: false });
      const rawList = await r.lrange('submissions', 0, -1);
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
      return { ok: true, storage: 'redis', source: `${up.urlKey}+${up.tokenKey}（Upstash REST）`, host: maskUrl(up.url), submissions: list };
    } catch (e) {
      return { ok: false, storage: 'redis', source: 'Upstash REST', host: maskUrl(up.url), detail: String((e && e.message) || e) };
    }
  }

  return { ok: true, storage: 'memory', submissions: getSubmissions(), detail: '未配置可用的 Redis 连接，读取的是进程内存数据' };
}

// ---------- 自检 /api/diagnose ----------
export async function diagnoseRedis() {
  const presentKeys = listRedisEnvKeys();
  const cs = findConnString();
  const up = findUpstashPair();
  const result = {
    env: { redisRelatedKeys: presentKeys },
    config: {
      connString: cs ? maskConn(cs.conn) : '',
      connSource: cs ? cs.key : '',
      upstashSource: up ? `${up.urlKey}+${up.tokenKey}` : '',
      backend: cs ? 'redis-tcp' : up ? 'upstash-rest' : 'memory',
    },
    tests: {},
  };

  if (cs) {
    result.config.backend = 'redis-tcp (ioredis)';
    const diagKey = `diag_${Date.now()}`;
    const payload = JSON.stringify({ t: Date.now(), from: 'diagnose' });
    try {
      const o = await withTcp(cs.conn, async (c) => {
        const pong = await c.ping();
        await c.set(diagKey, payload, 'EX', 60);
        const got = await c.get(diagKey);
        const llen = await c.llen('submissions');
        return { pong, got, llen };
      });
      result.tests = {
        ping: { ok: true, value: o.pong },
        write: { ok: true, key: diagKey },
        read: { ok: o.got === payload, key: diagKey, value: o.got },
        submissionsKey: { ok: true, llen: o.llen },
      };
      const allOk = result.tests.ping.ok && result.tests.write.ok && result.tests.read.ok;
      result.conclusion = allOk
        ? 'TCP/TLS 直连 Redis Cloud 成功，连接、写入、读取全部正常，提交应可持久化到数据库。'
        : '连接建立但部分读写失败，详见 tests。';
      return result;
    } catch (e) {
      result.tests.ping = { ok: false, error: String((e && e.message) || e), attempts: e.attempts || null };
      result.conclusion =
        `TCP/TLS 直连失败：${result.tests.ping.error}。` +
        (e.attempts?.length ? `已尝试 ${e.attempts.length} 种协议：` + e.attempts.map((a) => `${a.url} -> ${a.error}`).join('；') + '。' : '') +
        `请确认 ①REDIS_URL 的端口/协议是否正确；②Vercel 函数能否访问该 Redis 端口；③Redis Cloud 是否开启了 IP 白名单并放行 Vercel 出口 IP。`;
      return result;
    }
  }

  if (up) {
    result.config.backend = 'upstash-rest (@upstash/redis)';
    const { Redis: UpstashRedis } = await import('@upstash/redis');
    const r = new UpstashRedis({ url: up.url, token: up.token, enableAutoPipelining: false });
    const diagKey = `diag_${Date.now()}`;
    try {
      const pong = await r.ping();
      await r.set(diagKey, JSON.stringify({ t: Date.now() }), { ex: 60 });
      const got = await r.get(diagKey);
      const llen = await r.llen('submissions');
      result.tests = { ping: { ok: true, value: pong }, write: { ok: true, key: diagKey }, read: { ok: !!got, key: diagKey, value: got }, submissionsKey: { ok: true, llen } };
      result.conclusion = 'Upstash REST 连接正常。';
    } catch (e) {
      result.tests.ping = { ok: false, error: String((e && e.message) || e) };
      result.conclusion = `Upstash REST 失败：${result.tests.ping.error}`;
    }
    return result;
  }

  result.conclusion = '未发现 Redis 连接串或 Upstash 变量 → 当前走内存兜底，数据不会持久化。';
  return result;
}