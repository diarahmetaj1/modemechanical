// Contact form logic, kept separate from the UI so the backend can be connected in one place.
//
// BACKEND INTEGRATION POINT
// -------------------------
// EmailJS (emails each message to the business, no server needed): set PUBLIC_EMAILJS_SERVICE_ID,
// PUBLIC_EMAILJS_TEMPLATE_ID and PUBLIC_EMAILJS_PUBLIC_KEY. These three are public by design (EmailJS
// runs in the browser); restrict the domain in the EmailJS dashboard. Template variables: see
// `emailTemplateParams`.
// Or set PUBLIC_FORM_ENDPOINT to a URL that accepts a JSON POST of `ContactPayload` and returns any
// 2xx. EmailJS is used when both are set. To change the transport, edit `submitContact` only.

export type ContactField = 'name' | 'email' | 'phone' | 'message';
export type ContactValues = Record<ContactField, string>;
export type ContactErrors = Partial<Record<ContactField, string>>;

/** Shape sent to the backend. Attribution keys are present only when the visitor arrived with them. */
export interface ContactPayload extends ContactValues {
  page: string;
  submittedAt: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
  gclid?: string;
  fbclid?: string;
}

export const emptyContact: ContactValues = { name: '', email: '', phone: '', message: '' };

export const LIMITS = { name: 100, email: 254, phone: 20, message: 2000 } as const;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** US numbers: 10 digits, or 11 starting with country code 1. */
export function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 10) return digits;
  if (digits.length === 11 && digits.startsWith('1')) return digits.slice(1);
  return null;
}

export function validateField(field: ContactField, value: string): string | undefined {
  const v = value.trim();
  switch (field) {
    case 'name':
      if (!v) return 'Enter your name.';
      if (v.length > LIMITS.name) return `Keep your name under ${LIMITS.name} characters.`;
      return;
    case 'email':
      if (!v) return 'Enter your email address.';
      if (!EMAIL_RE.test(v)) return 'Enter an email address like name@example.com.';
      return;
    case 'phone':
      if (!v) return 'Enter a phone number so we can call you back.';
      if (!normalizePhone(v)) return 'Enter a 10-digit US phone number, like (914) 223-3301.';
      return;
    case 'message':
      if (!v) return 'Tell us briefly what you need help with.';
      if (v.length > LIMITS.message) return `Keep your message under ${LIMITS.message} characters.`;
      return;
  }
}

export function validateContact(values: ContactValues): ContactErrors {
  const errors: ContactErrors = {};
  (Object.keys(values) as ContactField[]).forEach((f) => {
    const msg = validateField(f, values[f]);
    if (msg) errors[f] = msg;
  });
  return errors;
}

function readAttribution(): Partial<ContactPayload> {
  try { return JSON.parse(sessionStorage.getItem('mm_attribution') || '{}'); } catch { return {}; }
}

export function buildPayload(values: ContactValues): ContactPayload {
  return {
    name: values.name.trim(),
    email: values.email.trim(),
    phone: normalizePhone(values.phone) ?? values.phone.trim(),
    message: values.message.trim(),
    page: typeof location !== 'undefined' ? location.pathname : '',
    submittedAt: new Date().toISOString(),
    ...readAttribution(),
  };
}

export class ContactNotConfiguredError extends Error {
  constructor() { super('Contact form endpoint is not configured'); this.name = 'ContactNotConfiguredError'; }
}

const env = (v: string | undefined) => {
  const raw = (v ?? '').trim();
  return raw && !raw.startsWith('YOUR_') ? raw : '';
};

export function getEndpoint(): string {
  return env(import.meta.env.PUBLIC_FORM_ENDPOINT);
}

export interface EmailJsConfig { serviceId: string; templateId: string; publicKey: string }

/** EmailJS settings, or null unless all three are set. */
export function getEmailJsConfig(): EmailJsConfig | null {
  const c = {
    serviceId: env(import.meta.env.PUBLIC_EMAILJS_SERVICE_ID),
    templateId: env(import.meta.env.PUBLIC_EMAILJS_TEMPLATE_ID),
    publicKey: env(import.meta.env.PUBLIC_EMAILJS_PUBLIC_KEY),
  };
  return c.serviceId && c.templateId && c.publicKey ? c : null;
}

const ATTRIBUTION_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'gclid', 'fbclid'] as const;

/**
 * Variables available in the EmailJS template: {{name}}, {{email}}, {{phone}}, {{message}},
 * {{page}}, {{submitted_at}}, {{source}}, and {{reply_to}} (use it as the template's Reply-To so
 * answering the email writes back to the customer).
 */
export function emailTemplateParams(p: ContactPayload): Record<string, string> {
  const source = ATTRIBUTION_KEYS.filter((k) => p[k]).map((k) => `${k}=${p[k]}`).join(', ');
  const submitted = new Date(p.submittedAt);
  return {
    name: p.name,
    email: p.email,
    reply_to: p.email,
    phone: p.phone.length === 10 ? `(${p.phone.slice(0, 3)}) ${p.phone.slice(3, 6)}-${p.phone.slice(6)}` : p.phone,
    message: p.message,
    page: p.page || '/',
    submitted_at: Number.isNaN(submitted.getTime()) ? p.submittedAt
      : submitted.toLocaleString('en-US', { timeZone: 'America/New_York', dateStyle: 'medium', timeStyle: 'short' }) + ' (New York time)',
    source: source || 'direct',
  };
}

/** Resolves only when the backend confirms receipt (2xx). Throws otherwise. */
export async function submitContact(payload: ContactPayload, endpoint = getEndpoint(), emailjs = getEmailJsConfig()): Promise<void> {
  if (emailjs) {
    // Loaded only when a message is sent, so the page doesn't carry the SDK.
    const { send } = await import('@emailjs/browser');
    try {
      await send(emailjs.serviceId, emailjs.templateId, emailTemplateParams(payload), {
        publicKey: emailjs.publicKey,
        blockHeadless: true, // drops most bots
        limitRate: { id: 'contact-form', throttle: 10_000 }, // one message per 10 seconds per browser
      });
    } catch (err) {
      const status = (err as { status?: number })?.status;
      throw new Error(`EmailJS rejected the message${status ? ` (${status})` : ''}`);
    }
    return;
  }
  if (!endpoint) throw new ContactNotConfiguredError();
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Contact endpoint responded ${res.status}`);
}
