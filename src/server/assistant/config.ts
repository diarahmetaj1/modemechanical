// Assistant settings, read from server environment variables (never exposed to the browser).
// Every value has a safe default except the provider API key. Placeholder values that start with
// "YOUR_" (as in .env.example) count as unset.

export type Env = Record<string, string | undefined>;
export type Effort = 'low' | 'medium' | 'high';

export interface AssistantConfig {
  provider: 'anthropic' | 'mock';
  apiKey: string;
  model: string;
  effort: Effort;
  /** Output cap per reply, thinking included. Replies are short; this only stops runaways. */
  maxOutputTokens: number;
  /** Provider request timeout and retries (the SDK retries 408/409/429/5xx with backoff). */
  timeoutMs: number;
  maxRetries: number;
  /** Whole-request deadline, retries and streaming included. */
  deadlineMs: number;
  allowedOrigins: string[];
  limits: { perClient10Min: number; perClientDay: number; globalDay: number; concurrentPerClient: number };
  hashSalt: string;
  upstash: { url: string; token: string } | null;
}

const value = (env: Env, key: string): string => {
  const v = (env[key] ?? '').trim();
  return v.startsWith('YOUR_') ? '' : v;
};
const int = (env: Env, key: string, fallback: number, min: number, max: number): number => {
  const n = Number.parseInt(value(env, key), 10);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
};

/** Origins allowed to call the endpoint, besides the deployment's own origin. */
const SITE_ORIGINS = ['https://modemechanical.com', 'https://www.modemechanical.com'];

export function loadConfig(env: Env): AssistantConfig {
  const effort = value(env, 'ASSISTANT_EFFORT');
  // The mock provider exists for local development and tests; production always uses the real one.
  const wantsMock = value(env, 'ASSISTANT_PROVIDER') === 'mock' && value(env, 'VERCEL_ENV') !== 'production';
  const upstashUrl = value(env, 'UPSTASH_REDIS_REST_URL');
  const upstashToken = value(env, 'UPSTASH_REDIS_REST_TOKEN');
  return {
    provider: wantsMock ? 'mock' : 'anthropic',
    apiKey: value(env, 'ANTHROPIC_API_KEY'),
    // Claude Haiku 5.5: fast and low-cost, and ample for answering from a small, given set of pages.
    model: value(env, 'ASSISTANT_MODEL') || 'claude-haiku-5-5',
    effort: effort === 'medium' || effort === 'high' ? effort : 'low',
    maxOutputTokens: 1500,
    timeoutMs: 20_000,
    maxRetries: 2,
    deadlineMs: 28_000,
    allowedOrigins: [
      ...SITE_ORIGINS,
      ...value(env, 'ASSISTANT_ALLOWED_ORIGINS').split(',').map((o) => o.trim().replace(/\/$/, '')).filter(Boolean),
    ],
    limits: {
      perClient10Min: int(env, 'ASSISTANT_LIMIT_PER_CLIENT_10MIN', 12, 1, 1000),
      perClientDay: int(env, 'ASSISTANT_LIMIT_PER_CLIENT_DAY', 60, 1, 10_000),
      globalDay: int(env, 'ASSISTANT_LIMIT_GLOBAL_DAY', 2000, 1, 1_000_000),
      concurrentPerClient: 2,
    },
    hashSalt: value(env, 'ASSISTANT_HASH_SALT'),
    upstash: upstashUrl && upstashToken ? { url: upstashUrl.replace(/\/$/, ''), token: upstashToken } : null,
  };
}

/** Price per million tokens, for the cost estimate in the logs only (check current pricing). */
export const PRICES: Record<string, { input: number; output: number }> = {
  'claude-haiku-5-5': { input: 0.1, output: 0.5 },
  'claude-sonnet-5-5': { input: 2, output: 10 },
  'claude-opus-5-5': { input: 4, output: 20 },
};
