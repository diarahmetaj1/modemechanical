// Runs the real Anthropic SDK against a fake HTTP layer: checks the request we send and how the
// streamed response and API errors are turned into provider events.
import { describe, expect, it } from 'vitest';
import { createAnthropicProvider } from '../../src/server/assistant/provider-anthropic';
import { ProviderError, type ProviderEvent } from '../../src/server/assistant/types';
import { serviceRequestTool } from '../../src/server/assistant/prompt';

const sse = (events: object[]) => events.map((e) => `event: ${(e as { type: string }).type}\ndata: ${JSON.stringify(e)}\n\n`).join('');

const streamBody = (stopReason: string, toolJson?: string[]) => sse([
  { type: 'message_start', message: { id: 'msg_1', type: 'message', role: 'assistant', model: 'claude-haiku-5-5', content: [], stop_reason: null, stop_sequence: null,
    usage: { input_tokens: 40, output_tokens: 1, cache_read_input_tokens: 8100, cache_creation_input_tokens: 0 } } },
  { type: 'content_block_start', index: 0, content_block: { type: 'thinking', thinking: '', signature: '' } },
  { type: 'content_block_delta', index: 0, delta: { type: 'signature_delta', signature: 'sig' } },
  { type: 'content_block_stop', index: 0 },
  { type: 'content_block_start', index: 1, content_block: { type: 'text', text: '' } },
  { type: 'content_block_delta', index: 1, delta: { type: 'text_delta', text: 'We fix ' } },
  { type: 'content_block_delta', index: 1, delta: { type: 'text_delta', text: 'boilers.' } },
  { type: 'content_block_stop', index: 1 },
  ...(toolJson ? [
    { type: 'content_block_start', index: 2, content_block: { type: 'tool_use', id: 'toolu_1', name: 'prepare_service_request', input: {} } },
    ...toolJson.map((partial_json) => ({ type: 'content_block_delta', index: 2, delta: { type: 'input_json_delta', partial_json } })),
    { type: 'content_block_stop', index: 2 },
  ] : []),
  { type: 'message_delta', delta: { stop_reason: stopReason, stop_sequence: null }, usage: { output_tokens: 42 } },
  { type: 'message_stop' },
]);

function fakeFetch(respond: () => Response) {
  const requests: { url: string; body: Record<string, unknown>; headers: Headers }[] = [];
  const impl = (async (url: string | URL | Request, init?: RequestInit) => {
    requests.push({ url: String(url), body: JSON.parse(String(init?.body)), headers: new Headers(init?.headers) });
    return respond();
  }) as typeof fetch;
  return { impl, requests };
}

const provider = (impl: typeof fetch) => createAnthropicProvider({ apiKey: 'test-key', model: 'claude-haiku-5-5', effort: 'low', timeoutMs: 5000, maxRetries: 0, fetch: impl });

async function collect(stream: AsyncIterable<ProviderEvent>) {
  const out: ProviderEvent[] = [];
  for await (const e of stream) out.push(e);
  return out;
}

const req = (signal = new AbortController().signal) => ({
  system: 'SYSTEM', context: 'CONTEXT', messages: [{ role: 'user' as const, content: 'Do you fix boilers?' }],
  tools: [serviceRequestTool], maxTokens: 1500, signal,
});

describe('Anthropic provider', () => {
  it('sends a cacheable system prompt, low effort and the tool, with no sampling parameters', async () => {
    const f = fakeFetch(() => new Response(streamBody('end_turn'), { headers: { 'content-type': 'text/event-stream' } }));
    await collect(provider(f.impl).stream(req()));
    const { body, url } = f.requests[0];
    expect(url).toMatch(/\/v1\/messages$/);
    expect(body).toMatchObject({
      model: 'claude-haiku-5-5', max_tokens: 1500, stream: true,
      output_config: { effort: 'low' },
      system: [{ type: 'text', text: 'SYSTEM', cache_control: { type: 'ephemeral' } }, { type: 'text', text: 'CONTEXT' }],
      messages: [{ role: 'user', content: 'Do you fix boilers?' }],
      tool_choice: { type: 'auto', disable_parallel_tool_use: true },
    });
    expect((body.tools as { name: string; eager_input_streaming: boolean }[])[0]).toMatchObject({ name: 'prepare_service_request', eager_input_streaming: true });
    for (const key of ['temperature', 'top_p', 'top_k', 'thinking']) expect(body).not.toHaveProperty(key);
  });

  it('streams text, then the tool call, then usage', async () => {
    const json = ['{"service":"repair","equipment":"boiler",', '"area":"bronx","urgency":"flexible","property":"home","summary":"Radiators cold."}'];
    const f = fakeFetch(() => new Response(streamBody('tool_use', json), { headers: { 'content-type': 'text/event-stream' } }));
    const out = await collect(provider(f.impl).stream(req()));
    expect(out).toEqual([
      { type: 'text', text: 'We fix ' },
      { type: 'text', text: 'boilers.' },
      { type: 'tool', name: 'prepare_service_request', input: { service: 'repair', equipment: 'boiler', area: 'bronx', urgency: 'flexible', property: 'home', summary: 'Radiators cold.' } },
      { type: 'end', stopReason: 'tool_use', usage: { inputTokens: 40, outputTokens: 42, cacheReadTokens: 8100, cacheWriteTokens: 0 } },
    ]);
  });

  it('runs no tool when the reply was refused or cut off', async () => {
    for (const stop of ['refusal', 'max_tokens']) {
      const f = fakeFetch(() => new Response(streamBody(stop, ['{"service":"rep']), { headers: { 'content-type': 'text/event-stream' } }));
      const out = await collect(provider(f.impl).stream(req()));
      expect(out.some((e) => e.type === 'tool')).toBe(false);
      expect(out.at(-1)).toMatchObject({ type: 'end', stopReason: stop });
    }
  });

  it.each([
    [429, 'rate_limited'], [529, 'overloaded'], [500, 'overloaded'], [401, 'auth'], [400, 'bad_request'],
  ])('maps HTTP %i to %s', async (status, kind) => {
    const f = fakeFetch(() => new Response(JSON.stringify({ type: 'error', error: { type: 'x', message: 'x' } }), { status, headers: { 'content-type': 'application/json' } }));
    const err = await collect(provider(f.impl).stream(req())).catch((e) => e);
    expect(err).toBeInstanceOf(ProviderError);
    expect((err as ProviderError).kind).toBe(kind);
  });

  it('maps a network failure to unavailable', async () => {
    const impl = (async () => { throw new TypeError('fetch failed'); }) as typeof fetch;
    const err = await collect(provider(impl).stream(req())).catch((e) => e);
    expect((err as ProviderError).kind).toBe('unavailable');
  });
});
