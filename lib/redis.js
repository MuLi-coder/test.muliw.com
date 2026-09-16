// 统一的 Upstash Redis 连接模块（服务端专用，仅可在 API 路由 / server 组件中 import）
// 目标：把所有常见的 Vercel / Upstash 环境变量命名都覆盖到，并给出可复用的诊断能力。
import { Redis } from '@upstash/redis';

// 官方 Upstash 集成注入的标准 REST 变量，优先级最高
const REST_URL_KEYS = [
  'UPSTASH_REDIS_REST_URL',
  'UPSTASH_REDIS_URL',
  'KV_REST_API_URL',
  'KV_URL',
  'REDIS_REST_URL',
  'REDIS_URL',
];
const REST_TOKEN_KEYS = [
  'UPSTASH_REDIS_REST_TOKEN',
  'UPSTASH_REDIS_TOKEN',
  'KV_REST_API_TOKEN',
  'REDIS_REST_TOKEN',
  'REDIS_TOKEN',
];
// 内嵌账号密码的 redis(s): 连接串变量
const CONN_KEYS = ['REDIS_URL', 'UPSTASH_REDIS_URL', 'KV_URL', 'REDIS_REST_URL'];

// 解析 redis:// / rediss:// 连接串，得到 REST 地址 + token（password）
// 形如 redis[s]://[user:]password@host[:port]
function parseConnString(raw) {
  const s = String(raw || '').trim();
  const m = s.match(/^rediss?:\/\/([^@/]+)@([^:/]+)(?::\d+)?/);
  if (!m) return null;
  const auth = m[1]; // "default:xxx" 或 ":xxx"
  const host = m[2];
  const idx = auth.indexOf(':');
  const token = idx >= 0 ? auth.slice(idx + 1) : auth;
  return { user: idx >= 0 ? auth.slice(0, idx) : '', token, host, url: `https://${host}` };
}

// 脱敏：只返回 host，不返回任何账号/密码/完整地址
function maskUrl(url) {
  try {
    const u = new URL(url);
    return `${u.protocol}//${u.host}`;
  } catch {
    return String(url).slice(0, 16);
  }
}

// 列出所有可能与 Redis 相关的环境变量名（只列名字，不列任何值）— 用于离线诊断
export function listRedisEnvKeys() {
  return Object.keys(process.env)
    .filter((k) => /(redis|upstash|kv)/i.test(k) && !/username/i.test(k))
    .sort();
}

/**
 * 解析出 Redis 连接配置（不含任何密码泄露）。
 * 返回 { redis?, url, urlKey, tokenKey, source, reason, presentKeys }
 *  - redis: 可用的 Redis 实例（唯一成员字段）
 *  - url    : 脱敏后的 REST 地址（只有协议+host）
 *  - source : 用的是哪一组变量 / 哪种策略
 *  - presentKeys: 检测到的相关环境变量名列表
 */
export function resolveRedis() {
  const presentKeys = listRedisEnvKeys();
  const env = process.env;

  // 策略 1：显式 REST 地址 + token 成对存在（最优先、最可靠）
  for (let i = 0; i < REST_URL_KEYS.length; i++) {
    const u = env[REST_URL_KEYS[i]];
    const t = env[REST_TOKEN_KEYS[i]];
    if (u && t) {
      return {
        redis: safeCreate(u, t),
        url: maskUrl(u),
        urlKey: REST_URL_KEYS[i],
        tokenKey: REST_TOKEN_KEYS[i],
        source: `${REST_URL_KEYS[i]} + ${REST_TOKEN_KEYS[i]}（成对 REST）`,
        presentKeys,
      };
    }
  }

  // 策略 2：只有 redis(s): 连接串（密码内嵌），解析拆分
  for (const k of CONN_KEYS) {
    const raw = env[k];
    if (raw && /^rediss?:\/\//.test(raw)) {
      const p = parseConnString(raw);
      if (p) {
        return {
          redis: safeCreate(p.url, p.token),
          url: maskUrl(p.url),
          urlKey: k,
          tokenKey: `（内嵌于 ${k}）`,
          source: `${k}（连接串解析）`,
          presentKeys,
        };
      }
    }
  }

  // 策略 3：动态发现“名字含 url 的变量 + 名字含 token/password 的变量”，排除只读 token
  let url = '';
  let urlKey = '';
  let token = '';
  let tokenKey = '';
  for (const k of Object.keys(env).sort()) {
    if (!/redis|upstash|kv/i.test(k)) continue;
    if (/read.?only|username/i.test(k)) continue;
    if (/(url|addr|endpoint|host)/i.test(k.toLowerCase()) && !url) {
      url = env[k];
      urlKey = k;
    } else if (/(token|password|pass|secret|auth)/i.test(k.toLowerCase()) && !token) {
      token = env[k];
      tokenKey = k;
    }
  }
  if (url && token) {
    let rest = String(url).trim();
    if (/^rediss?:\/\//.test(rest)) {
      const p = parseConnString(rest);
      if (p) {
        rest = p.url;
        token = p.token;
      } else {
        rest = 'https://' + rest.replace(/^rediss?:\/\//, '');
      }
    }
    return {
      redis: safeCreate(rest, token),
      url: maskUrl(rest),
      urlKey,
      tokenKey,
      source: `${urlKey} + ${tokenKey}（动态发现）`,
      presentKeys,
    };
  }

  return { redis: null, source: '未找到可用的 URL+Token 配置', reason: '缺少 Redis 环境变量', presentKeys };
}

function safeCreate(url, token) {
  try {
    return new Redis({ url, token, enableAutoPipelining: false });
  } catch (e) {
    return null;
  }
}

// 便捷：直接用，得不到连接就返回 null（回调方决定使用内存兜底）
export function getRedis() {
  return resolveRedis().redis || null;
}