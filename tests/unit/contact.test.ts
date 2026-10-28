import { afterEach, describe, expect, it, vi } from 'vitest';
import { ContactNotConfiguredError, EMAILJS_URL, emailJsParams, submitContact, type ContactPayload } from '../../src/lib/contact';

const payload: ContactPayload = {
  name: 'Jane Smith', email: 'jane@example.com', phone: '9142233301', message: 'AC is not cooling',
  page: '/contact/', submittedAt: '2026-10-09T15:05:00.000Z',
};
const emailjs = { serviceId: 'service_x', templateId: 'template_y', publicKey: 'pk_z' };

function mockFetch(status = 200) {
  const fn = vi.fn(async () => new Response('OK', { status }));
  vi.stubGlobal('fetch', fn);
  return fn;
}

afterEach(() => vi.unstubAllGlobals());

describe('submitContact', () => {
  it('sends the form to EmailJS with the template variables', async () => {
    const fetch = mockFetch();
    await submitContact(payload, '', emailjs);
    expect(fetch).toHaveBeenCalledOnce();
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(EMAILJS_URL);
    expect(JSON.parse(init.body as string)).toEqual({
      service_id: 'service_x', template_id: 'template_y', user_id: 'pk_z', template_params: emailJsParams(payload),
    });
  });

  it('prefers EmailJS over the JSON endpoint when both are set', async () => {
    const fetch = mockFetch();
    await submitContact(payload, 'https://forms.example/submit', emailjs);
    expect((fetch.mock.calls[0] as unknown as [string])[0]).toBe(EMAILJS_URL);
  });

  it('rejects when EmailJS refuses the message, so no fake success is shown', async () => {
    mockFetch(400);
    await expect(submitContact(payload, '', emailjs)).rejects.toThrow('EmailJS responded 400');
  });

  it('falls back to the JSON endpoint without EmailJS', async () => {
    const fetch = mockFetch();
    await submitContact(payload, 'https://forms.example/submit', null);
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://forms.example/submit');
    expect(JSON.parse(init.body as string)).toEqual(payload);
  });

  it('reports "not configured" when nothing is set', async () => {
    const fetch = mockFetch();
    await expect(submitContact(payload, '', null)).rejects.toBeInstanceOf(ContactNotConfiguredError);
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe('emailJsParams', () => {
  it('passes every field and shows the time in New York', () => {
    const p = emailJsParams(payload);
    expect(p).toMatchObject({ name: 'Jane Smith', email: 'jane@example.com', phone: '9142233301', message: 'AC is not cooling', page: '/contact/' });
    expect(p.submittedAt).toMatch(/Oct 9, 2026.*11:05.*AM \(New York\)/);
  });
});
