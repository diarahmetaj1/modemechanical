import { describe, expect, it } from 'vitest';
import { clientId, ConcurrencyGate, FallbackStore, MemoryStore, UpstashStore } from '../../src/server/assistant/rate-limit';

const windows = [{ name: 'short', limit: 2, seconds: 60 }, { name: 'day', limit: 3, seconds: 86_400 }];

describe('MemoryStore', () => {
  it('allows up to the limit, then gives the wait time until a slot frees up', async () => {
    const s = new MemoryStore();
    const t0 = 1_000_000;
    expect((await s.hit('a', windows, t0)).ok).toBe(true);
    expect((await s.hit('a', windows, t0 + 10_000)).ok).toBe(true);
    expect(await s.hit('a', windows, t0 + 20_000)).toEqual({ ok: false, retryAfter: 40 });
    expect((await s.hit('b', windows, t0 + 20_000)).ok).toBe(true);
    // The short window has moved on, but the daily one is now the limit.
    expect((await s.hit('a', windows, t0 + 61_000)).ok).toBe(true);
    expect((await s.hit('a', windows, t0 + 200_000)).ok).toBe(false);
  });
});

describe('UpstashStore', () => {
  it('increments one counter per window in a single pipeline call', async () => {
    const calls: { url: string; body: unknown; auth: string | null }[] = [];
    const fetchImpl = (async (url: string, init: RequestInit) => {
      calls.push({ url, body: JSON.parse(String(init.body)), auth: new Headers(init.headers).get('authorization') });
      return new Response(JSON.stringify([{ result: 3 }, { result: 0 }, { result: 1 }, { result: 1 }]));
    }) as unknown as typeof fetch;
    const s = new UpstashStore('https://redis.example', 'YOUR_TOKEN', fetchImpl);
    const r = await s.hit('abc', windows, 120_000);
    expect(calls[0].url).toBe('https://redis.example/pipeline');
    expect(calls[0].auth).toBe('Bearer YOUR_TOKEN');
    expect(calls[0].body).toEqual([
      ['INCR', 'mm:assistant:short:abc:2'], ['EXPIRE', 'mm:assistant:short:abc:2', '60', 'NX'],
      ['INCR', 'mm:assistant:day:abc:0'], ['EXPIRE', 'mm:assistant:day:abc:0', '86400', 'NX'],
    ]);
    expect(r).toEqual({ ok: false, retryAfter: 60 });
  });

  it('falls back to memory when Redis is unreachable, never failing open', async () => {
    const errors: unknown[] = [];
    const broken = new UpstashStore('https://redis.example', 't', (async () => { throw new Error('down'); }) as unknown as typeof fetch);
    const s = new FallbackStore(broken, new MemoryStore(), (e) => errors.push(e));
    const one = [{ name: 'w', limit: 1, seconds: 60 }];
    expect((await s.hit('k', one)).ok).toBe(true);
    expect((await s.hit('k', one)).ok).toBe(false);
    expect(errors).toHaveLength(2);
  });
});

describe('ConcurrencyGate', () => {
  it('caps parallel work per key and releases once', () => {
    const g = new ConcurrencyGate(1);
    const release = g.acquire('k')!;
    expect(g.acquire('k')).toBeNull();
    release(); release();
    expect(g.acquire('k')).not.toBeNull();
    expect(g.acquire('k')).toBeNull();
  });
});

describe('clientId', () => {
  const req = (ip: string) => new Request('https://x.test', { headers: { 'x-forwarded-for': `${ip}, 10.0.0.1` } });
  it('is stable per IP and salt, and does not contain the IP', async () => {
    const a = await clientId(req('203.0.113.5'), 'salt');
    expect(a).toBe(await clientId(req('203.0.113.5'), 'salt'));
    expect(a).not.toBe(await clientId(req('203.0.113.6'), 'salt'));
    expect(a).not.toBe(await clientId(req('203.0.113.5'), 'other-salt'));
    expect(a).toMatch(/^[0-9a-f]{24}$/);
  });
  it('prefers the address set by the hosting platform', async () => {
    const r = new Request('https://x.test', { headers: { 'x-vercel-forwarded-for': '198.51.100.1', 'x-forwarded-for': '1.2.3.4' } });
    expect(await clientId(r, 's')).toBe(await clientId(new Request('https://x.test', { headers: { 'x-real-ip': '198.51.100.1' } }), 's'));
  });
});
