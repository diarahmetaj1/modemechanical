// Contact form logic, kept separate from the UI so the backend can be connected in one place.
//
// BACKEND INTEGRATION POINT
// -------------------------
// Option A, EmailJS: set PUBLIC_EMAILJS_SERVICE_ID, PUBLIC_EMAILJS_TEMPLATE_ID and PUBLIC_EMAILJS_PUBLIC_KEY.
//   The template receives name, email, phone, message, page and submittedAt as {{variables}}.
// Option B, own backend: set PUBLIC_FORM_ENDPOINT to a URL that accepts a JSON POST of `ContactPayload`
//   and returns any 2xx status on success.
// EmailJS wins when both are set. To use a different transport, edit `submitContact` only.

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

/** An env value, or '' when it is missing or still the `YOUR_…` placeholder from .env.example. */
function envValue(raw: string | undefined): string {
  const v = (raw ?? '').trim();
  return v && !v.startsWith('YOUR_') ? v : '';
}

export function getEndpoint(): string {
  return envValue(import.meta.env.PUBLIC_FORM_ENDPOINT);
}

export interface EmailJsConfig { serviceId: string; templateId: string; publicKey: string }

/** All three EmailJS ids, or null when any is missing. These ids are public by design (they run in the browser). */
export function getEmailJsConfig(): EmailJsConfig | null {
  const serviceId = envValue(import.meta.env.PUBLIC_EMAILJS_SERVICE_ID);
  const templateId = envValue(import.meta.env.PUBLIC_EMAILJS_TEMPLATE_ID);
  const publicKey = envValue(import.meta.env.PUBLIC_EMAILJS_PUBLIC_KEY);
  return serviceId && templateId && publicKey ? { serviceId, templateId, publicKey } : null;
}

export const EMAILJS_URL = 'https://api.emailjs.com/api/v1.0/email/send';

/** Template variables: the payload, with the timestamp made readable for the office (New York time). */
export function emailJsParams(payload: ContactPayload): Record<string, string> {
  const at = new Date(payload.submittedAt);
  const submittedAt = Number.isNaN(at.getTime()) ? payload.submittedAt
    : `${at.toLocaleString('en-US', { timeZone: 'America/New_York', dateStyle: 'medium', timeStyle: 'short' })} (New York)`;
  return { ...payload, submittedAt } as Record<string, string>;
}

/** Resolves only when the backend confirms receipt (2xx). Throws otherwise. */
export async function submitContact(
  payload: ContactPayload, endpoint = getEndpoint(), emailjs = getEmailJsConfig(),
): Promise<void> {
  if (emailjs) {
    const res = await fetch(EMAILJS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        service_id: emailjs.serviceId,
        template_id: emailjs.templateId,
        user_id: emailjs.publicKey,
        template_params: emailJsParams(payload),
      }),
    });
    if (!res.ok) throw new Error(`EmailJS responded ${res.status}`);
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
