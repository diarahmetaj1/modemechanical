// Hand-off from the website assistant to the contact form, kept tiny so the contact form
// doesn't load the assistant's code.
export const PREFILL_KEY = 'mm_assistant_prefill';

/** The service request text left by the assistant, if any. Read once, then removed. */
export function takeContactPrefill(): string {
  try {
    const text = sessionStorage.getItem(PREFILL_KEY) ?? '';
    sessionStorage.removeItem(PREFILL_KEY);
    return text;
  } catch { return ''; }
}
