// Contact form logic, kept separate from the UI so the backend can be connected in one place.
//
// BACKEND INTEGRATION POINT
// -------------------------
// Set PUBLIC_FORM_ENDPOINT in .env to a URL that accepts a JSON POST of `ContactPayload`
// and returns any 2xx status on success. Nothing else needs to change.
// To use a different transport (FormData, an SDK, a server action), edit `submitContact` only.

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

export function getEndpoint(): string {
  const raw = (import.meta.env.PUBLIC_FORM_ENDPOINT ?? '').trim();
  return raw && !raw.startsWith('YOUR_') ? raw : '';
}

/** Resolves only when the backend confirms receipt (2xx). Throws otherwise. */
export async function submitContact(payload: ContactPayload, endpoint = getEndpoint()): Promise<void> {
  if (!endpoint) throw new ContactNotConfiguredError();
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Contact endpoint responded ${res.status}`);
}
