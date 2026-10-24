// Validation for everything that crosses a trust boundary: the request body from the browser and
// the tool input produced by the model. Hand-written (no schema library) because the shapes are small.
import {
  AREAS, EQUIPMENT_TYPES, PROPERTY_TYPES, SERVICE_TYPES, URGENCY,
  type AssistantRequest, type ChatMessage, type ServiceRequest,
} from './types.js';

export const LIMITS = {
  bodyBytes: 24_000,
  messages: 20,
  /** Turns sent to the model; older ones are dropped (the visitor still sees them). */
  historyForModel: 10,
  userChars: 800,
  assistantChars: 3000,
  totalChars: 14_000,
  summaryChars: 400,
} as const;

export type Result<T> = { ok: true; value: T } | { ok: false; error: string };

// Control characters other than tab and newline; zero-width and bidi overrides used to hide text.
const UNSAFE_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F​-‏‪-‮⁦-⁩﻿]/g;
export const sanitizeText = (s: string): string => s.replace(UNSAFE_CHARS, '').replace(/\r\n?/g, '\n').trim();

export function parseAssistantRequest(raw: unknown, knownPaths: ReadonlySet<string>): Result<AssistantRequest> {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return { ok: false, error: 'body must be an object' };
  const { messages, page } = raw as Record<string, unknown>;
  if (!Array.isArray(messages) || messages.length === 0) return { ok: false, error: 'messages must be a non-empty array' };
  if (messages.length > LIMITS.messages) return { ok: false, error: 'too many messages' };

  const clean: ChatMessage[] = [];
  let total = 0;
  for (const [i, m] of messages.entries()) {
    if (typeof m !== 'object' || m === null) return { ok: false, error: `message ${i} is not an object` };
    const { role, content } = m as Record<string, unknown>;
    if (role !== 'user' && role !== 'assistant') return { ok: false, error: `message ${i} has an invalid role` };
    if (typeof content !== 'string') return { ok: false, error: `message ${i} content must be a string` };
    const text = sanitizeText(content);
    const max = role === 'user' ? LIMITS.userChars : LIMITS.assistantChars;
    if (!text) return { ok: false, error: `message ${i} is empty` };
    if (text.length > max) return { ok: false, error: `message ${i} is too long` };
    // Turns must alternate, starting and ending with the visitor.
    const expected = i % 2 === 0 ? 'user' : 'assistant';
    if (role !== expected) return { ok: false, error: 'messages must alternate user/assistant, starting with user' };
    total += text.length;
    clean.push({ role, content: text });
  }
  if (clean[clean.length - 1].role !== 'user') return { ok: false, error: 'last message must be from the user' };
  if (total > LIMITS.totalChars) return { ok: false, error: 'conversation is too long' };

  let validPage: string | undefined;
  if (typeof page === 'string' && knownPaths.has(page)) validPage = page;
  return { ok: true, value: { messages: clean, page: validPage } };
}

/** The most recent turns, still starting with a visitor message. */
export function trimHistory(messages: ChatMessage[], max: number = LIMITS.historyForModel): ChatMessage[] {
  let recent = messages.slice(-max);
  if (recent[0]?.role === 'assistant') recent = recent.slice(1);
  return recent;
}

const EMAIL = /[^\s@]+@[^\s@]+\.[a-z]{2,}/gi;
const PHONE = /(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/g;
/** Removes contact details the model may have copied into a summary despite its instructions. */
export const redactContactDetails = (s: string): string => s.replace(EMAIL, '[removed]').replace(PHONE, '[removed]');

const oneOf = <T extends string>(list: readonly T[], v: unknown): v is T => typeof v === 'string' && (list as readonly string[]).includes(v);

/** Tool input from the model is untrusted: check every field against the schema before using it. */
export function parseServiceRequest(input: unknown): Result<ServiceRequest> {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) return { ok: false, error: 'input is not an object' };
  const r = input as Record<string, unknown>;
  const extra = Object.keys(r).filter((k) => !['service', 'equipment', 'area', 'urgency', 'property', 'summary'].includes(k));
  if (extra.length) return { ok: false, error: `unexpected fields: ${extra.join(', ')}` };
  if (!oneOf(SERVICE_TYPES, r.service)) return { ok: false, error: 'invalid service' };
  if (!oneOf(EQUIPMENT_TYPES, r.equipment)) return { ok: false, error: 'invalid equipment' };
  if (!oneOf(AREAS, r.area)) return { ok: false, error: 'invalid area' };
  if (!oneOf(URGENCY, r.urgency)) return { ok: false, error: 'invalid urgency' };
  if (!oneOf(PROPERTY_TYPES, r.property)) return { ok: false, error: 'invalid property' };
  if (typeof r.summary !== 'string') return { ok: false, error: 'invalid summary' };
  const summary = redactContactDetails(sanitizeText(r.summary)).replace(/\s+/g, ' ');
  if (summary.length < 5 || summary.length > LIMITS.summaryChars) return { ok: false, error: 'summary length out of range' };
  return { ok: true, value: { service: r.service, equipment: r.equipment, area: r.area, urgency: r.urgency, property: r.property, summary } };
}
