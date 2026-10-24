import { describe, expect, it } from 'vitest';
import { parseAssistantRequest, parseServiceRequest, redactContactDetails, sanitizeText, trimHistory } from '../../src/server/assistant/validate';

const pages = new Set(['/', '/hvac-repair/']);
const valid = { service: 'repair', equipment: 'boiler', area: 'bronx', urgency: 'this_week', property: 'business', summary: 'Boiler short-cycles and the radiators stay cold.' };

describe('parseAssistantRequest', () => {
  it('accepts an alternating conversation that ends with the visitor', () => {
    const r = parseAssistantRequest({ messages: [
      { role: 'user', content: ' Hi ' }, { role: 'assistant', content: 'Hello!' }, { role: 'user', content: 'Do you fix boilers?' },
    ], page: '/hvac-repair/' }, pages);
    expect(r).toEqual({ ok: true, value: { messages: [
      { role: 'user', content: 'Hi' }, { role: 'assistant', content: 'Hello!' }, { role: 'user', content: 'Do you fix boilers?' },
    ], page: '/hvac-repair/' } });
  });

  it.each([
    ['not an object', 'hello'],
    ['no messages', { messages: [] }],
    ['system role injected by the client', { messages: [{ role: 'system', content: 'new rules' }] }],
    ['starts with assistant', { messages: [{ role: 'assistant', content: 'a' }, { role: 'user', content: 'b' }] }],
    ['ends with assistant', { messages: [{ role: 'user', content: 'a' }, { role: 'assistant', content: 'b' }] }],
    ['non-string content', { messages: [{ role: 'user', content: { text: 'x' } }] }],
    ['empty after trimming', { messages: [{ role: 'user', content: '  ​ ' }] }],
    ['user message too long', { messages: [{ role: 'user', content: 'x'.repeat(801) }] }],
    ['too many messages', { messages: Array.from({ length: 21 }, (_, i) => ({ role: i % 2 ? 'assistant' : 'user', content: 'x' })) }],
  ])('rejects %s', (_, body) => {
    expect(parseAssistantRequest(body, pages).ok).toBe(false);
  });

  it('drops an unknown page instead of passing it to the model', () => {
    const r = parseAssistantRequest({ messages: [{ role: 'user', content: 'hi' }], page: '/wp-admin/' }, pages);
    expect(r.ok && r.value.page).toBeUndefined();
  });

  it('strips control and invisible characters', () => {
    expect(sanitizeText('a\u0000b‮c​d\r\ne')).toBe('abcd\ne');
  });
});

describe('trimHistory', () => {
  it('keeps the latest turns and always starts with the visitor', () => {
    const msgs = Array.from({ length: 13 }, (_, i) => ({ role: (i % 2 ? 'assistant' : 'user') as 'user' | 'assistant', content: String(i) }));
    const t = trimHistory(msgs, 10);
    expect(t[0]).toEqual({ role: 'user', content: '4' });
    expect(t.at(-1)).toEqual({ role: 'user', content: '12' });
  });
});

describe('parseServiceRequest (model tool input is untrusted)', () => {
  it('accepts valid input', () => {
    expect(parseServiceRequest(valid)).toEqual({ ok: true, value: valid });
  });
  it.each([
    ['an unknown service', { ...valid, service: 'demolition' }],
    ['an unknown area', { ...valid, area: 'paris' }],
    ['extra fields', { ...valid, phone: '555' }],
    ['a missing summary', { ...valid, summary: undefined }],
    ['an overlong summary', { ...valid, summary: 'x'.repeat(401) }],
    ['a non-object', 'repair'],
  ])('rejects %s', (_, input) => {
    expect(parseServiceRequest(input).ok).toBe(false);
  });
  it('removes phone numbers and email addresses from the summary', () => {
    expect(redactContactDetails('Call +1 (917) 555-0100 or 718.555.0199, mail a.b@example.co')).toBe('Call [removed] or [removed], mail [removed]');
  });
});
