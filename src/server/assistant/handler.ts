// The assistant endpoint as a standard fetch handler (Request in, Response out), so it runs on
// Vercel (api/assistant.ts), in the Astro dev server (scripts/assistant-dev-server.mjs) and in
// tests without changes.
//
//   GET  /api/assistant/  ->  { available: boolean }        (no model call)
//   POST /api/assistant/  ->  text/event-stream of StreamEvent, see types.ts
//
// Order of checks on POST: configured -> origin -> content type -> body size -> body shape ->
// rate limits -> concurrency. Only then is the provider called.
import { loadConfig, PRICES, type AssistantConfig, type Env } from './config.js';
import { buildContext, buildSystemPrompt, knownPages, serviceRequestTool, SERVICE_REQUEST_TOOL } from './prompt.js';
import { createAnthropicProvider } from './provider-anthropic.js';
import { createGeminiProvider } from './provider-gemini.js';
import { createMockProvider } from './provider-mock.js';
import { clientId, ConcurrencyGate, FallbackStore, MemoryStore, UpstashStore, type RateLimitStore } from './rate-limit.js';
import { LIMITS, parseAssistantRequest, parseServiceRequest, trimHistory } from './validate.js';
import { ProviderError, type AssistantErrorCode, type AssistantProvider, type StreamEvent, type Usage } from './types.js';

export interface LogRecord { event: string; [key: string]: unknown }

export interface HandlerOverrides {
  /** Replace settings after they are read from the environment (tests). */
  config?: Partial<AssistantConfig>;
  provider?: AssistantProvider | null;
  store?: RateLimitStore;
  now?: () => Date;
  log?: (record: LogRecord) => void;
}

const PROVIDER_LABEL: Record<string, string> = { gemini: 'Google Gemini', anthropic: 'Anthropic Claude' };

const BASE_HEADERS = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };

const json = (status: number, body: unknown, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { ...BASE_HEADERS, 'Content-Type': 'application/json; charset=utf-8', ...headers } });
const fail = (status: number, code: AssistantErrorCode, headers?: Record<string, string>) => json(status, { error: code }, headers);

class BodyTooLarge extends Error {}
/** Reads the body as text, giving up as soon as it passes `max` bytes. */
async function readLimited(request: Request, max: number): Promise<string> {
  const declared = Number(request.headers.get('content-length') ?? '0');
  if (declared > max) throw new BodyTooLarge();
  if (!request.body) return '';
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > max) { await reader.cancel(); throw new BodyTooLarge(); }
    chunks.push(value);
  }
  const all = new Uint8Array(size);
  let at = 0;
  for (const c of chunks) { all.set(c, at); at += c.byteLength; }
  return new TextDecoder().decode(all);
}

function makeProvider(config: AssistantConfig): AssistantProvider | null {
  if (config.provider === 'mock') return createMockProvider();
  if (!config.apiKey) return null;
  // No retries on Gemini: when the free quota runs out, the browser answers from the site at once.
  if (config.provider === 'gemini') return createGeminiProvider({ apiKey: config.apiKey, model: config.model, timeoutMs: config.timeoutMs, maxRetries: 0 });
  return createAnthropicProvider({
    apiKey: config.apiKey, model: config.model, effort: config.effort, timeoutMs: config.timeoutMs, maxRetries: config.maxRetries,
  });
}

function estimateCost(model: string, u: Usage): number | null {
  const p = PRICES[model];
  if (!p) return null;
  const usd = (u.inputTokens * p.input + u.cacheReadTokens * p.input * 0.1 + u.cacheWriteTokens * p.input * 1.25 + u.outputTokens * p.output) / 1e6;
  return Math.round(usd * 1e6) / 1e6;
}

export function createAssistantHandler(env: Env, overrides: HandlerOverrides = {}) {
  const config = { ...loadConfig(env), ...overrides.config };
  const log = overrides.log ?? ((r: LogRecord) => console.log(JSON.stringify(r)));
  const now = overrides.now ?? (() => new Date());
  const provider = overrides.provider !== undefined ? overrides.provider : makeProvider(config);
  const store = overrides.store ?? (config.upstash
    ? new FallbackStore(new UpstashStore(config.upstash.url, config.upstash.token), new MemoryStore(),
      (e) => log({ event: 'assistant_ratelimit_store_error', message: e instanceof Error ? e.message : String(e) }))
    : new MemoryStore());
  const gate = new ConcurrencyGate(config.limits.concurrentPerClient);
  const system = buildSystemPrompt();
  const pages = new Map(knownPages.map((p) => [p.url, p]));
  const pagePaths = new Set(pages.keys());
  // A provider exists only when it is configured (API key set, or the mock in development).
  const available = Boolean(provider);

  return async function handle(request: Request): Promise<Response> {
    // The panel asks first: without an AI provider it answers from the site instead, and it names
    // the provider in its privacy note.
    if (request.method === 'GET' || request.method === 'HEAD') return json(200, { available, provider: available ? PROVIDER_LABEL[provider!.name] ?? provider!.name : null });
    if (request.method !== 'POST') return fail(405, 'bad_request', { Allow: 'GET, POST' });
    if (!provider || !available) return fail(503, 'not_configured');

    // Browsers always send Origin on a POST from a page. Other sites, and scripts without an
    // Origin, are refused so the endpoint can't be used as a free model proxy.
    const origin = request.headers.get('origin');
    const self = new URL(request.url).origin;
    if (!origin || (origin !== self && !config.allowedOrigins.includes(origin))) return fail(403, 'forbidden');
    // JSON only: a cross-site form post can't send this type without a CORS preflight, which is never granted.
    if (!(request.headers.get('content-type') ?? '').toLowerCase().startsWith('application/json')) return fail(415, 'bad_request');

    let raw: unknown;
    try {
      raw = JSON.parse(await readLimited(request, LIMITS.bodyBytes));
    } catch (e) {
      return e instanceof BodyTooLarge ? fail(413, 'too_large') : fail(400, 'bad_request');
    }
    const parsed = parseAssistantRequest(raw, pagePaths);
    if (parsed.ok === false) return json(400, { error: 'bad_request', detail: parsed.error });

    const id = await clientId(request, config.hashSalt);
    const { limits } = config;
    const perClient = await store.hit(id, [
      { name: 'c10m', limit: limits.perClient10Min, seconds: 600 },
      { name: 'cday', limit: limits.perClientDay, seconds: 86_400 },
    ]);
    if (!perClient.ok) {
      log({ event: 'assistant_rate_limited', scope: 'client' });
      return fail(429, 'rate_limited', { 'Retry-After': String(perClient.retryAfter) });
    }
    const global = await store.hit('all', [{ name: 'gday', limit: limits.globalDay, seconds: 86_400 }]);
    if (!global.ok) {
      log({ event: 'assistant_rate_limited', scope: 'global' });
      return fail(429, 'busy', { 'Retry-After': String(global.retryAfter) });
    }
    const release = gate.acquire(id);
    if (!release) return fail(429, 'rate_limited', { 'Retry-After': '5' });

    const { messages, page } = parsed.value;
    const history = trimHistory(messages);
    const abort = new AbortController();
    // A visitor who closes the tab or presses Stop cancels the response stream (cancel() below).
    // request.signal isn't used: some hosts abort it as soon as the handler returns.
    const onClientAbort = () => abort.abort(new DOMException('client closed the connection', 'AbortError'));
    const deadline = setTimeout(() => abort.abort(new DOMException('deadline passed', 'TimeoutError')), config.deadlineMs);
    const started = Date.now();
    const encoder = new TextEncoder();

    const body = new ReadableStream<Uint8Array>({
      async start(controller) {
        let open = true;
        const send = (e: StreamEvent) => {
          if (!open) return;
          try { controller.enqueue(encoder.encode(`data: ${JSON.stringify(e)}\n\n`)); } catch { open = false; }
        };
        let firstTokenMs: number | null = null;
        let stopReason = 'none';
        let usage: Usage = { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 };
        let outcome: string = 'ok';
        let serviceRequest = false;
        let invalidTool: string | null = null;
        try {
          for await (const ev of provider.stream({
            system,
            context: buildContext(now(), page ? pages.get(page) : undefined),
            messages: history,
            tools: [serviceRequestTool],
            maxTokens: config.maxOutputTokens,
            signal: abort.signal,
          })) {
            if (ev.type === 'text') {
              firstTokenMs ??= Date.now() - started;
              send({ type: 'text', text: ev.text });
            } else if (ev.type === 'tool') {
              const result = ev.name === SERVICE_REQUEST_TOOL ? parseServiceRequest(ev.input) : { ok: false as const, error: `unknown tool ${ev.name}` };
              if (result.ok === true) { serviceRequest = true; send({ type: 'service_request', request: result.value }); } else invalidTool = result.error;
            } else {
              stopReason = ev.stopReason;
              usage = ev.usage;
            }
          }
          if (stopReason === 'refusal') { outcome = 'refused'; send({ type: 'error', code: 'refused' }); }
          else if (stopReason === 'max_tokens') { outcome = 'truncated'; send({ type: 'error', code: 'truncated' }); }
          else send({ type: 'done' });
        } catch (err) {
          const reason = abort.signal.reason as DOMException | undefined;
          let code: AssistantErrorCode = 'unavailable';
          if (abort.signal.aborted && reason?.name === 'AbortError') { outcome = 'client_gone'; open = false; }
          else if (abort.signal.aborted || (err instanceof ProviderError && err.kind === 'timeout')) { outcome = 'timeout'; code = 'timeout'; }
          else if (err instanceof ProviderError) {
            outcome = `provider_${err.kind}`;
            code = err.kind === 'rate_limited' || err.kind === 'overloaded' ? 'busy' : 'unavailable';
          } else outcome = 'error';
          send({ type: 'error', code });
          if (outcome !== 'client_gone') {
            log({ event: 'assistant_error', outcome, message: err instanceof Error ? err.message.slice(0, 300) : String(err).slice(0, 300) });
          }
        } finally {
          clearTimeout(deadline);
          release();
          // Metrics only: no message text, no IP address.
          log({
            event: 'assistant_reply', provider: provider.name, model: provider.model, outcome, stopReason,
            ms: Date.now() - started, firstTokenMs, turns: messages.length, page: page ?? null,
            serviceRequest, invalidTool, ...usage, estCostUsd: estimateCost(provider.model, usage),
          });
          try { controller.close(); } catch { /* already closed or cancelled */ }
        }
      },
      cancel() { onClientAbort(); },
    });

    return new Response(body, {
      status: 200,
      headers: { ...BASE_HEADERS, 'Content-Type': 'text/event-stream; charset=utf-8', 'X-Accel-Buffering': 'no' },
    });
  };
}
