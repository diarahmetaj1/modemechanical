// Browser side of the website assistant: conversation state, the streaming request (AI mode),
// and the hand-off of a prepared service request to phone, email or the contact form. Kept apart
// from the UI so it can be tested without a browser. The free mode's answers: assistant-local.ts.
import type { AssistantErrorCode, ServiceRequest, StreamEvent } from '../server/assistant/types';
import type { AreaInfo, FlowState, Option } from './assistant-local';
import { PREFILL_KEY } from './assistant-prefill';

export interface AssistantConfig {
  /** "site": free, answers from the site's pages in the browser. "ai": answers from the AI server function. */
  mode: 'site' | 'ai';
  endpoint: string;
  page: string;
  phoneDisplay: string;
  phoneHref: string;
  email: string;
  /** Internal paths the assistant may link to; any other link is shown as plain text. */
  pages: string[];
  /** External profile links (Google, Yelp, social) that may also be linked. */
  profiles: string[];
  suggestions: string[];
  hours: string;
  areas: AreaInfo[];
  brands: string[];
}

export type ClientErrorCode = AssistantErrorCode | 'network';

export interface UiMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  status: 'streaming' | 'done' | 'error';
  error?: ClientErrorCode;
  request?: ServiceRequest;
  /** Buttons offered under a reply (free mode); `answered` once the visitor picked one. */
  options?: Option[];
  answered?: boolean;
}

/** Same limits as the server (validate.ts), so a normal conversation never hits a 400. */
export const CLIENT_LIMITS = { userChars: 800, assistantChars: 3000, historyMessages: 10, totalChars: 12_000 } as const;

const STORAGE_KEY = 'mm_assistant_v1';

export const newId = () => Math.random().toString(36).slice(2, 10);

/** Session storage only: the conversation ends when the tab closes. In free mode it never leaves the browser. */
export function loadConversation(): { messages: UiMessage[]; open: boolean; flow: FlowState | null } {
  try {
    const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || 'null');
    if (saved && Array.isArray(saved.messages)) {
      // A reply cut off by navigating away is kept as far as it got.
      const messages = (saved.messages as UiMessage[]).map((m) => (m.status === 'streaming' ? { ...m, status: 'done' as const } : m));
      return { messages, open: Boolean(saved.open), flow: saved.flow ?? null };
    }
  } catch { /* storage unavailable or corrupt: start fresh */ }
  return { messages: [], open: false, flow: null };
}

export function saveConversation(messages: UiMessage[], open: boolean, flow: FlowState | null = null) {
  try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ messages: messages.slice(-30), open, flow })); } catch { /* ignore */ }
}

export function clearConversation() {
  try { sessionStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
}

/**
 * The turns sent to the server: completed exchanges only (a failed reply and the question that
 * caused it are left out), then the new question. Always alternates user/assistant.
 */
export function buildHistory(messages: UiMessage[], question: string): { role: 'user' | 'assistant'; content: string }[] {
  const turns: { role: 'user' | 'assistant'; content: string }[] = [];
  for (let i = 0; i < messages.length - 1; i++) {
    const q = messages[i];
    const a = messages[i + 1];
    if (q.role !== 'user' || a.role !== 'assistant' || a.status === 'error') continue;
    let answer = a.content.trim();
    if (a.request) answer += `${answer ? '\n' : ''}[A service request card was shown: ${a.request.summary}]`;
    if (!answer) continue;
    turns.push({ role: 'user', content: q.content.slice(0, CLIENT_LIMITS.userChars) });
    turns.push({ role: 'assistant', content: answer.slice(0, CLIENT_LIMITS.assistantChars) });
    i++;
  }
  const recent = turns.slice(-(CLIENT_LIMITS.historyMessages - 1));
  if (recent[0]?.role === 'assistant') recent.shift();
  const last = { role: 'user' as const, content: question.slice(0, CLIENT_LIMITS.userChars) };
  // Drop the oldest exchanges until the whole conversation fits the server's size limit.
  const size = () => recent.reduce((n, t) => n + t.content.length, last.content.length);
  while (recent.length && size() > CLIENT_LIMITS.totalChars) recent.splice(0, 2);
  return [...recent, last];
}

export interface StreamHandlers {
  onText: (text: string) => void;
  onServiceRequest: (request: ServiceRequest) => void;
}

const HTTP_ERRORS: Record<number, ClientErrorCode> = { 400: 'bad_request', 403: 'forbidden', 413: 'too_large', 415: 'bad_request', 429: 'rate_limited', 503: 'not_configured' };

/**
 * Sends the conversation and streams the reply. Resolves with null when the reply completed, or
 * with an error code (the text received so far stays with the caller). Rejects only on abort.
 */
export async function streamReply(
  config: Pick<AssistantConfig, 'endpoint' | 'page'>,
  messages: { role: 'user' | 'assistant'; content: string }[],
  handlers: StreamHandlers,
  signal: AbortSignal,
  fetchImpl: typeof fetch = fetch,
): Promise<ClientErrorCode | null> {
  let res: Response;
  try {
    res = await fetchImpl(config.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
      body: JSON.stringify({ messages, page: config.page }),
      signal,
    });
  } catch (err) {
    if (signal.aborted) throw err;
    return 'network';
  }
  if (!res.ok || !res.body) {
    try {
      const body = (await res.json()) as { error?: ClientErrorCode };
      if (body.error) return body.error;
    } catch { /* not JSON */ }
    return HTTP_ERRORS[res.status] ?? 'unavailable';
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let ended: ClientErrorCode | null | undefined;
  try {
    while (ended === undefined) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let cut: number;
      while ((cut = buffer.indexOf('\n\n')) !== -1) {
        const chunk = buffer.slice(0, cut);
        buffer = buffer.slice(cut + 2);
        const data = chunk.split('\n').filter((l) => l.startsWith('data: ')).map((l) => l.slice(6)).join('\n');
        if (!data) continue;
        let event: StreamEvent;
        try { event = JSON.parse(data) as StreamEvent; } catch { continue; }
        if (event.type === 'text') handlers.onText(event.text);
        else if (event.type === 'service_request') handlers.onServiceRequest(event.request);
        else if (event.type === 'done') ended = null;
        else if (event.type === 'error') ended = event.code;
      }
    }
  } catch (err) {
    if (signal.aborted) throw err;
    return 'network';
  }
  // A stream that stops without saying it finished was cut off.
  return ended === undefined ? 'network' : ended;
}

/* ---- Service request hand-off ---- */

const LABELS: Record<string, string> = {
  repair: 'Repair', installation: 'Installation', maintenance: 'Maintenance', emergency: 'Emergency service', not_sure: 'Not sure yet',
  central_air: 'Central air', ductless_mini_split: 'Ductless mini-split', heat_pump: 'Heat pump', furnace: 'Furnace', boiler: 'Boiler',
  rooftop_unit: 'Rooftop unit', ductwork_ventilation: 'Ductwork or ventilation', commercial_refrigeration: 'Commercial refrigeration',
  thermostat: 'Thermostat', other: 'Other',
  brooklyn: 'Brooklyn', queens: 'Queens', manhattan: 'Manhattan', bronx: 'The Bronx', staten_island: 'Staten Island',
  long_island: 'Long Island', westchester: 'Westchester',
  this_week: 'In the next few days', flexible: 'Flexible',
  home: 'Home', business: 'Business',
};
export const label = (v: string) => LABELS[v] ?? v;

export function requestRows(r: ServiceRequest): [string, string][] {
  const rows: [string, string][] = [
    ['Service', label(r.service)],
    ['System', label(r.equipment)],
    ['Area', label(r.area)],
    ['Timing', r.urgency === 'emergency' ? 'Emergency' : label(r.urgency)],
    ['Property', label(r.property)],
  ];
  return rows.filter(([, v]) => v !== 'Not sure yet');
}

export function requestText(r: ServiceRequest): string {
  return [
    ...requestRows(r).map(([k, v]) => `${k}: ${v}`),
    '',
    r.summary,
    '',
    '(Prepared with the assistant on modemechanical.com)',
  ].join('\n');
}

export function mailtoHref(email: string, r: ServiceRequest): string {
  const subject = `Service request: ${label(r.service)}${r.area !== 'not_sure' && r.area !== 'other' ? ` in ${label(r.area)}` : ''}`;
  const body = `${requestText(r)}\n\nName:\nPhone:\nAddress:\n`;
  return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

/** Leaves the request for the contact form to pick up (contact form reads it once). */
export function stashForContactForm(r: ServiceRequest) {
  try { sessionStorage.setItem(PREFILL_KEY, requestText(r)); } catch { /* ignore */ }
}

/** Analytics: event names only, never message text. No-op without Google Analytics. */
export function track(name: string, params: Record<string, string> = {}) {
  const w = window as unknown as { gtag?: (...args: unknown[]) => void };
  if (typeof w.gtag === 'function') w.gtag('event', name, { ...params, page_path: location.pathname });
}
