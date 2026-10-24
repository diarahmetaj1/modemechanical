import type { AssistantProvider, ProviderEvent, ProviderRequest } from '../../src/server/assistant/types';

export const ORIGIN = 'https://modemechanical.com';
export const usage = { inputTokens: 10, outputTokens: 5, cacheReadTokens: 0, cacheWriteTokens: 0 };

/** A provider that replays fixed events and records what it was asked. */
export function fakeProvider(events: ProviderEvent[] | ((req: ProviderRequest) => AsyncIterable<ProviderEvent>)) {
  const calls: ProviderRequest[] = [];
  const provider: AssistantProvider = {
    name: 'fake',
    model: 'claude-haiku-5-5',
    stream(req) {
      calls.push(req);
      if (typeof events === 'function') return events(req);
      return (async function* () { yield* events; })();
    },
  };
  return { provider, calls };
}

export function post(body: unknown, init: { origin?: string | null; contentType?: string; ip?: string; url?: string } = {}) {
  const headers = new Headers({ 'content-type': init.contentType ?? 'application/json', 'x-forwarded-for': init.ip ?? '203.0.113.7' });
  if (init.origin !== null) headers.set('origin', init.origin ?? ORIGIN);
  return new Request(init.url ?? 'https://modemechanical.com/api/assistant/', {
    method: 'POST', headers, body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

export const ask = (content: string, page?: string) => ({ messages: [{ role: 'user', content }], page });

/** Reads a server-sent event stream into the list of JSON events. */
export async function events(res: Response): Promise<{ type: string; [k: string]: unknown }[]> {
  const text = await res.text();
  return text.split('\n\n').filter(Boolean).map((chunk) => JSON.parse(chunk.replace(/^data: /, '')));
}
