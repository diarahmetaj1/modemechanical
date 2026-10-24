import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { buildHistory, mailtoHref, requestRows, streamReply, type UiMessage } from '../../src/lib/assistant';
import Markdown, { allowedHref, type LinkPolicy } from '../../src/components/islands/assistant/Markdown';
import type { ServiceRequest } from '../../src/server/assistant/types';

const msg = (role: 'user' | 'assistant', content: string, extra: Partial<UiMessage> = {}): UiMessage => ({ id: content, role, content, status: 'done', ...extra });
const request: ServiceRequest = { service: 'repair', equipment: 'central_air', area: 'queens', urgency: 'this_week', property: 'home', summary: 'AC blows warm air & ices up.' };

describe('buildHistory', () => {
  it('sends completed exchanges and the new question, skipping failed replies', () => {
    const h = buildHistory([
      msg('user', 'q1'), msg('assistant', 'a1'),
      msg('user', 'q2'), msg('assistant', '', { status: 'error', error: 'busy' }),
      msg('user', 'q3'), msg('assistant', 'a3', { request }),
    ], 'q4');
    expect(h).toEqual([
      { role: 'user', content: 'q1' }, { role: 'assistant', content: 'a1' },
      { role: 'user', content: 'q3' }, { role: 'assistant', content: 'a3\n[A service request card was shown: AC blows warm air & ices up.]' },
      { role: 'user', content: 'q4' },
    ]);
  });

  it('stays within the server limits on long conversations', () => {
    const long: UiMessage[] = [];
    for (let i = 0; i < 20; i++) long.push(msg('user', `q${i}`.padEnd(700, '.')), msg('assistant', `a${i}`.padEnd(2900, '.')));
    const h = buildHistory(long, 'last');
    expect(h.length).toBeLessThanOrEqual(10);
    expect(h[0].role).toBe('user');
    expect(h.reduce((n, t) => n + t.content.length, 0)).toBeLessThanOrEqual(12_000);
    expect(h.at(-1)).toEqual({ role: 'user', content: 'last' });
  });
});

function sseResponse(chunks: string[], init: ResponseInit = {}) {
  const enc = new TextEncoder();
  return new Response(new ReadableStream({ start(c) { chunks.forEach((x) => c.enqueue(enc.encode(x))); c.close(); } }), { headers: { 'content-type': 'text/event-stream' }, ...init });
}
const config = { endpoint: '/api/assistant/', page: '/' };

describe('streamReply', () => {
  it('parses events split across network chunks', async () => {
    const text: string[] = [];
    const reqs: ServiceRequest[] = [];
    const fetchImpl = (async () => sseResponse([
      'data: {"type":"text","text":"Hel', 'lo"}\n\ndata: {"type":"text","text":" there"}\n', '\ndata: {"type":"service_request","request":',
      JSON.stringify(request), '}\n\ndata: {"type":"done"}\n\n',
    ])) as unknown as typeof fetch;
    const r = await streamReply(config, [{ role: 'user', content: 'hi' }], { onText: (t) => text.push(t), onServiceRequest: (x) => reqs.push(x) }, new AbortController().signal, fetchImpl);
    expect(r).toBeNull();
    expect(text.join('')).toBe('Hello there');
    expect(reqs).toEqual([request]);
  });

  it('returns the error code from the stream or the HTTP response', async () => {
    const noop = { onText: () => {}, onServiceRequest: () => {} };
    const sig = new AbortController().signal;
    const viaStream = (async () => sseResponse(['data: {"type":"error","code":"busy"}\n\n'])) as unknown as typeof fetch;
    expect(await streamReply(config, [], noop, sig, viaStream)).toBe('busy');
    const viaHttp = (async () => new Response('{"error":"rate_limited"}', { status: 429 })) as unknown as typeof fetch;
    expect(await streamReply(config, [], noop, sig, viaHttp)).toBe('rate_limited');
    const htmlError = (async () => new Response('<html>Bad gateway</html>', { status: 502 })) as unknown as typeof fetch;
    expect(await streamReply(config, [], noop, sig, htmlError)).toBe('unavailable');
    const cutOff = (async () => sseResponse(['data: {"type":"text","text":"Hi"}\n\n'])) as unknown as typeof fetch;
    expect(await streamReply(config, [], noop, sig, cutOff)).toBe('network');
    const offline = (async () => { throw new TypeError('Failed to fetch'); }) as unknown as typeof fetch;
    expect(await streamReply(config, [], noop, sig, offline)).toBe('network');
  });
});

describe('service request hand-off', () => {
  it('lists only the known fields', () => {
    expect(requestRows({ ...request, property: 'not_sure' })).toEqual([['Service', 'Repair'], ['System', 'Central air'], ['Area', 'Queens'], ['Timing', 'In the next few days']]);
  });
  it('builds an encoded email with blanks for contact details', () => {
    const href = mailtoHref('info@modemechanical.com', request);
    expect(href.startsWith('mailto:info@modemechanical.com?subject=Service%20request%3A%20Repair%20in%20Queens&body=')).toBe(true);
    const body = decodeURIComponent(href.split('body=')[1]);
    expect(body).toContain('AC blows warm air & ices up.');
    expect(body).toContain('Name:\nPhone:\nAddress:');
  });
});

const policy: LinkPolicy = { pages: ['/', '/hvac-repair/', '/contact/'], profiles: ['https://www.yelp.com/biz/mode-mechanical-brooklyn'], phoneHref: 'tel:+19142233301', email: 'info@modemechanical.com' };

describe('reply rendering (model output is untrusted)', () => {
  it.each([
    ['/hvac-repair/', '/hvac-repair/'],
    ['/hvac-repair', '/hvac-repair/'],
    ['/contact/#form', '/contact/#form'],
    ['tel:+19142233301', 'tel:+19142233301'],
    ['mailto:info@modemechanical.com', 'mailto:info@modemechanical.com'],
    ['https://www.yelp.com/biz/mode-mechanical-brooklyn', 'https://www.yelp.com/biz/mode-mechanical-brooklyn'],
    ['https://evil.example/phish', null],
    ['//evil.example', null],
    ['javascript:alert(1)', null],
    ['/wp-admin/', null],
    ['tel:+15555550100', null],
  ])('link %s -> %s', (href, expected) => {
    expect(allowedHref(href, policy)).toBe(expected);
  });

  it('renders the Markdown subset as elements and never as raw HTML', () => {
    const html = renderToStaticMarkup(<Markdown policy={policy} text={'**Yes.** See [repair](/hvac-repair/) or [this](javascript:alert(1)).\n\n- one\n- <img src=x onerror=alert(1)>\n\n1. first\n## Heading'} />);
    expect(html).toBe(
      '<p><strong>Yes.</strong> See <a href="/hvac-repair/">repair</a> or this.</p>' +
      '<ul><li>one</li><li>&lt;img src=x onerror=alert(1)&gt;</li></ul>' +
      '<ol><li>first</li></ol><p>Heading</p>',
    );
  });

  it('opens allowed external profiles in a new tab', () => {
    const html = renderToStaticMarkup(<Markdown policy={policy} text={'[Yelp](https://www.yelp.com/biz/mode-mechanical-brooklyn)'} />);
    expect(html).toContain('target="_blank" rel="noopener"');
  });
});
