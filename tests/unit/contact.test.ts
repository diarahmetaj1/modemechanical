// Contact form transport: EmailJS when configured, else the JSON endpoint, else "not configured".
import { beforeEach, describe, expect, it, vi } from 'vitest';

const send = vi.fn();
vi.mock('@emailjs/browser', () => ({ send: (...args: unknown[]) => send(...args) }));

const { submitContact, emailTemplateParams, ContactNotConfiguredError, validateContact } = await import('../../src/lib/contact');

const payload = {
  name: 'Jo Smith', email: 'jo@example.com', phone: '9175550100', message: 'AC not cooling',
  page: '/contact/', submittedAt: '2026-07-04T18:30:00.000Z', utm_source: 'google', gclid: 'abc',
};
const emailjs = { serviceId: 'service_test', templateId: 'template_test', publicKey: 'YOUR_PUBLIC_KEY_TEST' };

describe('submitContact with EmailJS', () => {
  beforeEach(() => { send.mockReset(); });

  it('sends the message through EmailJS with bot and rate protection', async () => {
    send.mockResolvedValue({ status: 200, text: 'OK' });
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    await submitContact(payload, 'https://example.com/hook', emailjs);
    expect(send).toHaveBeenCalledTimes(1);
    const [service, template, params, options] = send.mock.calls[0];
    expect([service, template]).toEqual(['service_test', 'template_test']);
    expect(params).toMatchObject({ name: 'Jo Smith', email: 'jo@example.com', reply_to: 'jo@example.com', phone: '(917) 555-0100', message: 'AC not cooling' });
    expect(options).toMatchObject({ publicKey: 'YOUR_PUBLIC_KEY_TEST', blockHeadless: true, limitRate: { throttle: 10_000 } });
    expect(fetchSpy).not.toHaveBeenCalled(); // EmailJS wins over the JSON endpoint
    fetchSpy.mockRestore();
  });

  it('reports a failure so the form shows its error message (nothing is lost silently)', async () => {
    send.mockImplementation(async () => { throw { status: 412, text: 'The Public Key is invalid' }; });
    const err = await submitContact(payload, '', emailjs).then(() => null, (e: unknown) => e);
    expect(err).toBeInstanceOf(Error);
    expect((err as Error).message).toBe('EmailJS rejected the message (412)');
  });

  it('falls back to the JSON endpoint, and says when nothing is configured', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 204 }));
    await submitContact(payload, 'https://example.com/hook', null);
    expect(fetchSpy).toHaveBeenCalledWith('https://example.com/hook', expect.objectContaining({ method: 'POST' }));
    fetchSpy.mockRestore();
    await expect(submitContact(payload, '', null)).rejects.toBeInstanceOf(ContactNotConfiguredError);
    expect(send).not.toHaveBeenCalled();
  });
});

describe('email template variables', () => {
  it('formats the time in New York and lists where the visitor came from', () => {
    const p = emailTemplateParams(payload);
    expect(p.submitted_at).toBe('Jul 4, 2026, 2:30 PM (New York time)');
    expect(p.source).toBe('utm_source=google, gclid=abc');
    expect(p.page).toBe('/contact/');
    expect(emailTemplateParams({ ...payload, utm_source: undefined, gclid: undefined }).source).toBe('direct');
  });
});

describe('validation still runs before anything is sent', () => {
  it('rejects an empty form', () => {
    expect(Object.keys(validateContact({ name: '', email: 'x', phone: '12', message: '' }))).toEqual(['name', 'email', 'phone', 'message']);
  });
});
