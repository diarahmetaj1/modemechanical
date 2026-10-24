// Runs Google's real SDK against a fake HTTP layer: checks the request we send and how the
// streamed response and API errors are turned into provider events.
import { describe, expect, it } from 'vitest';
import { createGeminiProvider } from '../../src/server/assistant/provider-gemini';
import { loadConfig } from '../../src/server/assistant/config';
import { ProviderError, type ProviderEvent } from '../../src/server/assistant/types';
import { serviceRequestTool } from '../../src/server/assistant/prompt';

const sse = (chunks: object[]) => chunks.map((c) => `data: ${JSON.stringify(c)}\r\n\r\n`).join('');
const usageMetadata = { promptTokenCount: 8200, cachedContentTokenCount: 8000, candidatesTokenCount: 40, thoughtsTokenCount: 0 };
const textChunk = (text: string, finishReason?: string) => ({ candidates: [{ content: { role: 'model', parts: [{ text }] }, ...(finishReason ? { finishReason } : {}) }] });

function fakeFetch(respond: () => Response) {
  const requests: { url: string; body: Record<string, unknown>; headers: Headers }[] = [];
  const impl = (async (url: string | URL | Request, init?: RequestInit) => {
    requests.push({ url: String(url), body: JSON.parse(String(init?.body)), headers: new Headers(init?.headers) });
    return respond();
  }) as typeof fetch;
  return { impl, requests };
}
const ok = (body: string) => () => new Response(body, { headers: { 'content-type': 'text/event-stream' } });
const provider = (impl: typeof fetch) => createGeminiProvider({ apiKey: 'test-key', model: 'gemini-flash-lite-latest', timeoutMs: 5000, maxRetries: 0, fetch: impl });
const req = () => ({
  system: 'SYSTEM', context: 'CONTEXT', messages: [{ role: 'user' as const, content: 'Hi' }, { role: 'assistant' as const, content: 'Hello!' }, { role: 'user' as const, content: 'Do you fix boilers?' }],
  tools: [serviceRequestTool], maxTokens: 1500, signal: new AbortController().signal,
});
async function collect(stream: AsyncIterable<ProviderEvent>) {
  const out: ProviderEvent[] = [];
  for await (const e of stream) out.push(e);
  return out;
}

describe('Gemini provider', () => {
  it('sends the instructions, conversation, limit and tool to the streaming endpoint', async () => {
    const f = fakeFetch(ok(sse([{ ...textChunk('Yes.', 'STOP'), usageMetadata }])));
    await collect(provider(f.impl).stream(req()));
    const { url, body, headers } = f.requests[0];
    expect(url).toContain('models/gemini-flash-lite-latest:streamGenerateContent');
    expect(url).toContain('alt=sse');
    expect(headers.get('x-goog-api-key')).toBe('test-key');
    expect(body.contents).toEqual([
      { role: 'user', parts: [{ text: 'Hi' }] }, { role: 'model', parts: [{ text: 'Hello!' }] }, { role: 'user', parts: [{ text: 'Do you fix boilers?' }] },
    ]);
    expect(JSON.stringify(body.systemInstruction)).toContain('SYSTEM\\n\\nCONTEXT');
    expect(body.generationConfig).toMatchObject({ maxOutputTokens: 1500 });
    const decl = (body.tools as { functionDeclarations: { name: string; parametersJsonSchema: unknown }[] }[])[0].functionDeclarations[0];
    expect(decl.name).toBe('prepare_service_request');
    expect(decl.parametersJsonSchema).toEqual(serviceRequestTool.inputSchema);
  });

  it('streams text, then a function call, then usage', async () => {
    const args = { service: 'repair', equipment: 'boiler', area: 'bronx', urgency: 'flexible', property: 'home', summary: 'Radiators cold.' };
    const f = fakeFetch(ok(sse([
      textChunk('We fix '),
      textChunk('boilers.'),
      { candidates: [{ content: { role: 'model', parts: [{ functionCall: { name: 'prepare_service_request', args } }] }, finishReason: 'STOP' }], usageMetadata },
    ])));
    expect(await collect(provider(f.impl).stream(req()))).toEqual([
      { type: 'text', text: 'We fix ' },
      { type: 'text', text: 'boilers.' },
      { type: 'tool', name: 'prepare_service_request', input: args },
      { type: 'end', stopReason: 'tool_use', usage: { inputTokens: 200, outputTokens: 40, cacheReadTokens: 8000, cacheWriteTokens: 0 } },
    ]);
  });

  it('skips thinking text and reports safety blocks and cut-off replies', async () => {
    const thought = { candidates: [{ content: { role: 'model', parts: [{ text: 'secret reasoning', thought: true }, { text: 'Answer' }] } }] };
    let out = await collect(provider(fakeFetch(ok(sse([thought, textChunk('', 'STOP')]))).impl).stream(req()));
    expect(out.filter((e) => e.type === 'text')).toEqual([{ type: 'text', text: 'Answer' }]);
    out = await collect(provider(fakeFetch(ok(sse([textChunk('I', 'SAFETY')]))).impl).stream(req()));
    expect(out.at(-1)).toMatchObject({ stopReason: 'refusal' });
    out = await collect(provider(fakeFetch(ok(sse([{ promptFeedback: { blockReason: 'SAFETY' } }]))).impl).stream(req()));
    expect(out.at(-1)).toMatchObject({ stopReason: 'refusal' });
    out = await collect(provider(fakeFetch(ok(sse([textChunk('Long', 'MAX_TOKENS')]))).impl).stream(req()));
    expect(out.at(-1)).toMatchObject({ stopReason: 'max_tokens' });
  });

  it.each([[429, 'rate_limited'], [503, 'overloaded'], [500, 'overloaded'], [403, 'auth'], [400, 'bad_request']])(
    'maps HTTP %i to %s (the browser then answers from the site)', async (status, kind) => {
      const f = fakeFetch(() => new Response(JSON.stringify({ error: { code: status, message: 'x', status: 'X' } }), { status, headers: { 'content-type': 'application/json' } }));
      const err = await collect(provider(f.impl).stream(req())).catch((e) => e);
      expect(err).toBeInstanceOf(ProviderError);
      expect((err as ProviderError).kind).toBe(kind);
      expect(f.requests).toHaveLength(1); // no retries: fall back fast
    });

  it('maps a network failure to unavailable', async () => {
    const impl = (async () => { throw new TypeError('fetch failed'); }) as typeof fetch;
    const err = await collect(provider(impl).stream(req())).catch((e) => e);
    expect((err as ProviderError).kind).toBe('unavailable');
  });
});

describe('provider choice', () => {
  it('uses free Gemini when its key is set, Claude otherwise, and honours ASSISTANT_PROVIDER', () => {
    expect(loadConfig({ GEMINI_API_KEY: 'g' })).toMatchObject({ provider: 'gemini', apiKey: 'g', model: 'gemini-flash-lite-latest' });
    expect(loadConfig({ ANTHROPIC_API_KEY: 'a' })).toMatchObject({ provider: 'anthropic', apiKey: 'a', model: 'claude-haiku-5-5' });
    expect(loadConfig({ GEMINI_API_KEY: 'g', ANTHROPIC_API_KEY: 'a' })).toMatchObject({ provider: 'gemini' });
    expect(loadConfig({ GEMINI_API_KEY: 'g', ANTHROPIC_API_KEY: 'a', ASSISTANT_PROVIDER: 'anthropic' })).toMatchObject({ provider: 'anthropic', apiKey: 'a' });
    expect(loadConfig({ GEMINI_API_KEY: 'g', ASSISTANT_MODEL: 'gemini-3.6-flash' }).model).toBe('gemini-3.6-flash');
    expect(loadConfig({ GEMINI_API_KEY: 'YOUR_API_KEY' })).toMatchObject({ provider: 'anthropic', apiKey: '' });
    expect(loadConfig({ ASSISTANT_PROVIDER: 'mock', VERCEL_ENV: 'production', GEMINI_API_KEY: 'g' }).provider).toBe('gemini');
  });
});
