// 轻量进程内滑动窗口限流。首版为单 Node 服务，进程内计数即可；
// 若未来水平扩展，可把计数迁移到 SQLite/Redis。
//
// 规则：在 windowMs 内最多 max 次命中；连续失败达到 lockThreshold 后，
// 对该 key 额外锁定 lockMs。成功一次即清空该 key 的失败计数。

class RateLimiter {
  constructor({ windowMs = 60_000, max = 10, lockThreshold = 8, lockMs = 15 * 60_000 } = {}) {
    this.windowMs = windowMs;
    this.max = max;
    this.lockThreshold = lockThreshold;
    this.lockMs = lockMs;
    this.hits = new Map(); // key -> [timestamps]
    this.locks = new Map(); // key -> lockUntil
  }

  now() {
    return Date.now();
  }

  _prune(key, now) {
    const list = this.hits.get(key) || [];
    const fresh = list.filter((t) => now - t < this.windowMs);
    this.hits.set(key, fresh);
    return fresh;
  }

  // 返回 { allowed, retryAfterMs }
  check(key) {
    const now = this.now();
    const lockedUntil = this.locks.get(key) || 0;
    if (lockedUntil > now) return { allowed: false, retryAfterMs: lockedUntil - now, locked: true };

    const fresh = this._prune(key, now);
    if (fresh.length >= this.max) {
      return { allowed: false, retryAfterMs: this.windowMs - (now - fresh[0]), locked: false };
    }
    return { allowed: true, retryAfterMs: 0, locked: false };
  }

  // 记录一次失败尝试，必要时上锁。
  fail(key) {
    const now = this.now();
    const fresh = this._prune(key, now);
    fresh.push(now);
    this.hits.set(key, fresh);
    if (fresh.length >= this.lockThreshold) this.locks.set(key, now + this.lockMs);
  }

  // 成功后清除计数。
  reset(key) {
    this.hits.delete(key);
    this.locks.delete(key);
  }
}

// 登录：同一 IP 每分钟最多 10 次；连续 8 次失败锁 15 分钟。
export const loginLimiter = new RateLimiter({ windowMs: 60_000, max: 10, lockThreshold: 8, lockMs: 15 * 60_000 });
// 兑换：同一 IP 每分钟最多 8 次（防试码枚举）；连续 8 次失败锁 15 分钟。
export const redeemLimiter = new RateLimiter({ windowMs: 60_000, max: 8, lockThreshold: 8, lockMs: 15 * 60_000 });

export function clientIp(request) {
  const xff = request.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  return request.headers.get('x-real-ip') || 'unknown';
}
