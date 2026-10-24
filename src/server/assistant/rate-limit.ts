// Request budgets. Two stores behind one interface:
// - memory: per server instance. Enough for one long-running server; on serverless hosts each
//   instance counts separately, so treat it as a soft limit there.
// - Upstash Redis (REST API over fetch, no extra dependency): shared by every instance. Used
//   automatically when UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are set.
// The provider console's monthly spend limit stays the hard ceiling either way.

export interface Window { name: string; limit: number; seconds: number }
export interface LimitResult { ok: boolean; retryAfter: number }

export interface RateLimitStore {
  /** Counts one hit against each window for `key`; refuses if any window is already full. */
  hit(key: string, windows: Window[], now?: number): Promise<LimitResult>;
}

export class MemoryStore implements RateLimitStore {
  private hits = new Map<string, number[]>();
  private lastSweep = 0;

  async hit(key: string, windows: Window[], now = Date.now()): Promise<LimitResult> {
    this.sweep(now, Math.max(...windows.map((w) => w.seconds)));
    const times = this.hits.get(key) ?? [];
    let retryAfter = 0;
    for (const w of windows) {
      const since = now - w.seconds * 1000;
      const inWindow = times.filter((t) => t > since);
      if (inWindow.length >= w.limit) retryAfter = Math.max(retryAfter, Math.ceil((inWindow[0] - since) / 1000));
    }
    if (retryAfter > 0) return { ok: false, retryAfter };
    times.push(now);
    this.hits.set(key, times);
    return { ok: true, retryAfter: 0 };
  }

  /** Forget timestamps older than the longest window, at most once a minute. */
  private sweep(now: number, longestSeconds: number) {
    if (now - this.lastSweep < 60_000) return;
    this.lastSweep = now;
    const cutoff = now - longestSeconds * 1000;
    for (const [k, times] of this.hits) {
      const kept = times.filter((t) => t > cutoff);
      if (kept.length) this.hits.set(k, kept); else this.hits.delete(k);
    }
  }
}

/** Fixed windows in Redis: INCR a counter per window and let it expire with the window. */
export class UpstashStore implements RateLimitStore {
  constructor(private readonly url: string, private readonly token: string, private readonly fetchImpl: typeof fetch = fetch) {}

  async hit(key: string, windows: Window[], now = Date.now()): Promise<LimitResult> {
    const keys = windows.map((w) => `mm:assistant:${w.name}:${key}:${Math.floor(now / 1000 / w.seconds)}`);
    const commands = windows.flatMap((w, i) => [['INCR', keys[i]], ['EXPIRE', keys[i], String(w.seconds), 'NX']]);
    const res = await this.fetchImpl(`${this.url}/pipeline`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(commands),
      signal: AbortSignal.timeout(2000),
    });
    if (!res.ok) throw new Error(`Upstash responded ${res.status}`);
    const results = (await res.json()) as { result?: number; error?: string }[];
    let retryAfter = 0;
    windows.forEach((w, i) => {
      const count = Number(results[i * 2]?.result ?? 0);
      if (count > w.limit) retryAfter = Math.max(retryAfter, w.seconds - (Math.floor(now / 1000) % w.seconds));
    });
    return retryAfter > 0 ? { ok: false, retryAfter } : { ok: true, retryAfter: 0 };
  }
}

/** Shared store first; if it is unreachable, fall back to this instance's memory rather than fail open. */
export class FallbackStore implements RateLimitStore {
  constructor(private readonly primary: RateLimitStore, private readonly fallback: RateLimitStore, private readonly onError: (e: unknown) => void) {}
  async hit(key: string, windows: Window[], now?: number): Promise<LimitResult> {
    try { return await this.primary.hit(key, windows, now); } catch (e) {
      this.onError(e);
      return this.fallback.hit(key, windows, now);
    }
  }
}

/** Caps parallel streams per visitor (memory only: a stream lives on one instance). */
export class ConcurrencyGate {
  private active = new Map<string, number>();
  constructor(private readonly max: number) {}
  acquire(key: string): (() => void) | null {
    const n = this.active.get(key) ?? 0;
    if (n >= this.max) return null;
    this.active.set(key, n + 1);
    let released = false;
    return () => {
      if (released) return;
      released = true;
      const left = (this.active.get(key) ?? 1) - 1;
      if (left > 0) this.active.set(key, left); else this.active.delete(key);
    };
  }
}

/**
 * A stable, anonymous id for a visitor: a salted SHA-256 of their IP address. The raw IP is never
 * stored or logged. Without ASSISTANT_HASH_SALT the salt is random per instance.
 */
const instanceSalt = crypto.randomUUID();
export async function clientId(request: Request, salt: string): Promise<string> {
  const h = request.headers;
  const ip = h.get('x-vercel-forwarded-for')?.split(',')[0].trim()
    || h.get('x-real-ip')?.trim()
    || h.get('x-forwarded-for')?.split(',')[0].trim()
    || 'unknown';
  const data = new TextEncoder().encode(`${salt || instanceSalt}:${ip}`);
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', data));
  return Array.from(digest.slice(0, 12), (b) => b.toString(16).padStart(2, '0')).join('');
}
