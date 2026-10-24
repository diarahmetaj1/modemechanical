// The assistant chat panel. Loaded only after the visitor opens the assistant (see
// src/components/Assistant.astro), so it costs nothing on page load. Its styles come with it (mount.tsx).
// Free mode (default) answers in the browser from the site's pages (lib/assistant-local.ts);
// AI mode streams answers from the server function.
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { iconPaths, type IconName } from '../../../lib/icons';
import {
  CLIENT_LIMITS, buildHistory, clearConversation, loadConversation, mailtoHref, newId, requestRows, saveConversation,
  stashForContactForm, streamReply, track, type AssistantConfig, type ClientErrorCode, type UiMessage,
} from '../../../lib/assistant';
import type { ServiceRequest } from '../../../server/assistant/types';
import type { FlowState, LocalContext, Option } from '../../../lib/assistant-local';
import Markdown, { type LinkPolicy } from './Markdown';

type LocalEngine = typeof import('../../../lib/assistant-local');
interface Local { mod: LocalEngine; index: ReturnType<LocalEngine['createIndex']> }
let localEngine: Promise<Local> | null = null;
/** The free engine and its search index, loaded once (with the site's text) when first needed. */
const loadLocal = () => (localEngine ??= import('../../../lib/assistant-local').then((mod) => ({ mod, index: mod.createIndex(mod.buildSections()) })));

const plain = (md: string) => md.replace(/\*\*/g, '').replace(/\[([^\]]*)\]\([^)]*\)/g, '$1');
const retire = (list: UiMessage[]) => list.map((m) => (m.options && !m.answered ? { ...m, answered: true } : m));
const say = (content: string, options?: Option[]): UiMessage => ({ id: newId(), role: 'assistant', content, status: 'done', options });

interface Props { config: AssistantConfig; launcher: HTMLButtonElement; initiallyOpen: boolean }

const CLIENT_TIMEOUT_MS = 45_000;
const SMALL = '(max-width: 560px)';
const isSmall = () => window.matchMedia(SMALL).matches;

function Svg({ name, size = 18 }: { name: IconName; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"><path d={iconPaths[name]} /></svg>
  );
}

function errorText(code: ClientErrorCode | 'stopped', phone: string): string {
  switch (code) {
    case 'stopped': return 'Stopped.';
    case 'rate_limited': return `You’ve sent a lot of messages in a short time. Please wait a few minutes, or call us at ${phone}.`;
    case 'busy': return `The assistant is busy right now. Try again in a minute, or call us at ${phone}.`;
    case 'timeout': return `That took too long to answer. Try again, or call us at ${phone}.`;
    case 'refused': return `I can’t help with that here. For anything about heating or cooling, ask me or call us at ${phone}.`;
    case 'truncated': return 'My reply was cut short. Ask me to continue if you need the rest.';
    case 'network': return 'I couldn’t reach the assistant. Check your connection and try again.';
    case 'not_configured':
    case 'unavailable': return `The assistant isn’t available right now. Please call us at ${phone} or use the contact form.`;
    default: return `Something went wrong with that message. Try rephrasing it, or call us at ${phone}.`;
  }
}

function RequestCard({ request, config }: { request: ServiceRequest; config: AssistantConfig }) {
  return (
    <div className="mma-card" role="group" aria-label="Your service request">
      <p className="mma-card__title">Your service request</p>
      <dl>
        {requestRows(request).map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}
      </dl>
      <p className="mma-card__summary">{request.summary}</p>
      <p className="mma-card__note">Nothing has been sent yet. Choose how to reach us, and add your name and phone number there.</p>
      <div className="mma-card__actions">
        <a className="mma-btn mma-btn--primary" href={config.phoneHref} onClick={() => track('assistant_handoff', { method: 'call' })}>
          <Svg name="phone" size={16} /> Call {config.phoneDisplay}
        </a>
        <a className="mma-btn" href={mailtoHref(config.email, request)} onClick={() => track('assistant_handoff', { method: 'email' })}>
          <Svg name="mail" size={16} /> Email this request
        </a>
        <a className="mma-btn" href="/contact/" onClick={() => {
          stashForContactForm(request);
          track('assistant_handoff', { method: 'form' });
          // Already on the contact page: fill the form in place.
          if (location.pathname === '/contact/') window.dispatchEvent(new Event('mm-assistant-prefill'));
        }}>Use the contact form</a>
      </div>
    </div>
  );
}

export default function AssistantPanel({ config, launcher, initiallyOpen }: Props) {
  const [{ messages: saved, flow: savedFlow }] = useState(loadConversation);
  const [messages, setMessages] = useState<UiMessage[]>(saved);
  const [flow, setFlow] = useState<FlowState | null>(savedFlow);
  const [open, setOpen] = useState(initiallyOpen);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const panelRef = useRef<HTMLDivElement>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const stickToBottom = useRef(true);

  const policy: LinkPolicy = { pages: config.pages, profiles: config.profiles, phoneHref: config.phoneHref, email: config.email };
  const ctx: LocalContext = {
    phoneDisplay: config.phoneDisplay, phoneHref: config.phoneHref, email: config.email, hours: config.hours, areas: config.areas, brands: config.brands,
  };
  const site = config.mode !== 'ai';
  // AI mode: which AI the server has, if any (null while asking). Without one, answers come from the site.
  const [ai, setAi] = useState<{ available: boolean | null; provider: string | null }>({ available: site ? false : null, provider: null });
  const aiOn = !site && ai.available !== false;

  // Free mode: fetch the engine as the panel opens, so the first answer is instant.
  useEffect(() => { if (site) loadLocal(); }, [site]);

  useEffect(() => {
    if (site) return;
    fetch(config.endpoint, { headers: { Accept: 'application/json' } })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { available?: boolean; provider?: string | null } | null) => setAi({ available: Boolean(d?.available), provider: d?.provider ?? null }))
      .catch(() => setAi({ available: false, provider: null }));
  }, [site, config.endpoint]);

  // The launcher button lives in the page's HTML; keep its state in sync with the panel.
  useEffect(() => {
    const toggle = () => setOpen((o) => !o);
    launcher.addEventListener('click', toggle);
    return () => launcher.removeEventListener('click', toggle);
  }, [launcher]);

  useEffect(() => {
    launcher.setAttribute('aria-expanded', String(open));
    document.documentElement.classList.toggle('mma-open', open);
    if (open) {
      track('assistant_open');
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open, launcher]);

  useEffect(() => { saveConversation(messages, open && !isSmall(), flow); }, [messages, open, flow]);

  // Follow the reply as it streams, unless the visitor scrolled up to read.
  useLayoutEffect(() => {
    const log = logRef.current;
    if (log && stickToBottom.current) log.scrollTop = log.scrollHeight;
  }, [messages, open]);

  const close = useCallback(() => {
    setOpen(false);
    launcher.focus();
  }, [launcher]);

  const update = (id: string, patch: (m: UiMessage) => Partial<UiMessage>) =>
    setMessages((list) => list.map((m) => (m.id === id ? { ...m, ...patch(m) } : m)));

  /** Free mode: the reply to a guided-request choice (button value). */
  function flowReply(local: Local, value: string, current: FlowState | null): { reply: UiMessage; next: FlowState | null } {
    const { mod } = local;
    if (value === 'flow:start' || value === 'flow:start:emergency') {
      const next = mod.startFlow(value.endsWith('emergency'));
      const p = mod.flowPrompt(next, ctx);
      return { reply: say(p.text, p.options), next };
    }
    if (value.startsWith('flow:pick:') && current) {
      const r = mod.advance(current, value.slice('flow:pick:'.length), ctx);
      if ('request' in r) {
        track('assistant_service_request', { service: r.request.service });
        return { reply: { ...say('Here’s your request. Choose how to send it to us:'), request: r.request }, next: null };
      }
      const p = mod.flowPrompt(r.state, ctx);
      return { reply: say(p.text, p.options), next: r.state };
    }
    return { reply: say(`No problem. Ask me anything else, or call [${config.phoneDisplay}](${config.phoneHref}).`), next: null };
  }

  function show(base: UiMessage[], user: UiMessage, reply: UiMessage, next: FlowState | null) {
    setMessages([...retire(base), user, reply]);
    setFlow(next);
    stickToBottom.current = true;
    setAnnouncement(`Assistant: ${plain(reply.content)}${reply.request ? ' Your service request is ready below.' : ''}${reply.options?.length ? ` Choices: ${reply.options.map((o) => o.label).join(', ')}.` : ''}`);
    // Keyboard users land on the new choices when there are any, otherwise back in the text box;
    // on the "describe it" step the text box is what they need. Never take focus from typing.
    requestAnimationFrame(() => {
      const input = inputRef.current;
      if (input && document.activeElement === input && input.value) return;
      const first = next?.step === 'details' ? null : logRef.current?.querySelector<HTMLButtonElement>('.mma-msg:last-child .mma-options button');
      (first ?? input)?.focus();
    });
  }

  async function chooseOption(message: UiMessage, option: Option) {
    if (busy || message.answered) return;
    const local = await loadLocal();
    const base = messages.map((m) => (m.id === message.id ? { ...m, answered: true } : m));
    const { reply, next } = flowReply(local, option.value, flow);
    show(base, { id: newId(), role: 'user', content: option.label, status: 'done' }, reply, next);
  }

  /** Free mode: answer typed text, as the next step of a guided request when one is open. */
  async function sendLocal(q: string, base: UiMessage[]) {
    setInput('');
    track('assistant_question', { mode: 'site' });
    const local = await loadLocal();
    let value: string | null = null;
    if (flow) {
      if (/^\s*cancel\s*$/i.test(q)) value = 'flow:cancel';
      else if (flow.step === 'details') value = /^\s*skip\s*$/i.test(q) ? 'flow:pick:' : `flow:pick:${q}`;
      else value = local.mod.matchOption(q, local.mod.flowPrompt(flow, ctx).options!.filter((o) => o.value !== 'flow:cancel'))?.value ?? null;
    }
    const user: UiMessage = { id: newId(), role: 'user', content: q, status: 'done' };
    if (value) {
      const { reply, next } = flowReply(local, value, flow);
      show(base, user, reply, next);
    } else {
      // Anything else ends an open request and is answered as a question.
      const r = local.mod.reply(q, ctx, local.index);
      show(base, user, say(r.text, r.options), null);
    }
  }

  async function send(question: string, base: UiMessage[] = messages) {
    const q = question.trim().slice(0, CLIENT_LIMITS.userChars);
    if (!q || busy) return;
    // Site answers when there is no AI, and for the steps of a button-guided request.
    if (!aiOn || flow) { await sendLocal(q, base); return; }
    const history = buildHistory(base, q);
    const user: UiMessage = { id: newId(), role: 'user', content: q, status: 'done' };
    const reply: UiMessage = { id: newId(), role: 'assistant', content: '', status: 'streaming' };
    setMessages([...base, user, reply]);
    setInput('');
    setBusy(true);
    stickToBottom.current = true;
    track('assistant_question');

    const controller = new AbortController();
    abortRef.current = controller;
    const timer = setTimeout(() => controller.abort(new DOMException('timeout', 'TimeoutError')), CLIENT_TIMEOUT_MS);
    let text = '';
    let outcome: ClientErrorCode | 'stopped' | null;
    try {
      outcome = await streamReply(config, history, {
        onText: (t) => { text += t; update(reply.id, () => ({ content: text })); },
        onServiceRequest: (request) => {
          update(reply.id, () => ({ request }));
          track('assistant_service_request', { service: request.service });
        },
      }, controller.signal);
    } catch {
      outcome = (controller.signal.reason as DOMException | undefined)?.name === 'TimeoutError' ? 'timeout' : 'stopped';
    } finally {
      clearTimeout(timer);
      abortRef.current = null;
      setBusy(false);
    }

    if (outcome === null || outcome === 'truncated' || (outcome === 'stopped' && text)) {
      update(reply.id, () => ({ status: 'done', error: outcome === 'truncated' ? 'truncated' : undefined }));
      setAnnouncement(text ? `Assistant: ${text.replace(/\*\*|\[|\]\([^)]*\)/g, '')}` : 'The assistant prepared a service request.');
    } else if (!text && outcome !== 'stopped' && outcome !== 'refused') {
      // The AI couldn't answer (free quota used up, outage, not set up): answer from the site instead.
      if (outcome === 'not_configured') setAi({ available: false, provider: null });
      track('assistant_fallback', { code: outcome });
      const local = await loadLocal();
      const r = local.mod.reply(q, ctx, local.index);
      update(reply.id, () => ({ status: 'done', content: r.text, options: r.options }));
      setAnnouncement(`Assistant: ${plain(r.text)}`);
    } else {
      update(reply.id, () => ({ status: 'error', error: outcome === 'stopped' ? undefined : outcome as ClientErrorCode }));
      const msg = errorText(outcome, config.phoneDisplay);
      setAnnouncement(msg);
      if (outcome !== 'stopped') track('assistant_error', { code: outcome });
    }
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  function retry(failed: UiMessage) {
    const i = messages.findIndex((m) => m.id === failed.id);
    const question = messages[i - 1];
    if (i < 1 || question?.role !== 'user') return;
    send(question.content, messages.slice(0, i - 1));
  }

  function newChat() {
    abortRef.current?.abort();
    setMessages([]);
    setFlow(null);
    clearConversation();
    setAnnouncement('Started a new conversation.');
    inputRef.current?.focus();
  }

  function onSubmit(e: FormEvent) { e.preventDefault(); send(input); }

  function onInputKey(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); send(input); }
  }

  function onPanelKey(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === 'Escape') { e.stopPropagation(); close(); return; }
    // Full-screen on phones: keep keyboard focus inside the panel.
    if (e.key === 'Tab' && isSmall() && panelRef.current) {
      const items = panelRef.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), textarea');
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  }

  const onLink = (href: string) => {
    track('assistant_link', { link_url: href });
    if (isSmall()) setOpen(false);
  };

  // Auto-grow the text box up to a few lines.
  useLayoutEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 132)}px`;
  }, [input]);

  return (
    <div ref={panelRef} id="mm-assistant-panel" className="mma-panel" role="dialog" aria-labelledby="mma-title"
      aria-describedby="mma-note" hidden={!open} onKeyDown={onPanelKey}>
      <div className="mma-head">
        <div>
          <h2 id="mma-title">Ask Mode Mechanical</h2>
          <p>{aiOn ? `AI assistant${ai.provider ? ` (${ai.provider})` : ''} · answers from our website` : 'Answers from our website'}</p>
        </div>
        <button type="button" className="mma-icon" onClick={newChat} aria-label="Start a new conversation" title="New conversation"
          disabled={messages.length === 0}><Svg name="refresh" /></button>
        <button type="button" className="mma-icon" onClick={close} aria-label="Close assistant" title="Close"><Svg name="close" /></button>
      </div>

      <div ref={logRef} className="mma-log" role="log" aria-label="Conversation" aria-busy={busy}
        onScroll={(e) => { const el = e.currentTarget; stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40; }}>
        <div className="mma-msg mma-msg--assistant">
          <div className="mma-bubble">
            <p>Hi! I can answer questions about our heating and cooling services, service areas and booking, and help you put together a service request.</p>
            {site && messages.length === 0 && (
              <div className="mma-options" role="group" aria-label="Quick start">
                <button type="button" onClick={() => chooseOption({ id: 'intro', role: 'assistant', content: '', status: 'done' }, { label: 'Request a visit', value: 'flow:start' })}>Request a visit</button>
              </div>
            )}
            <p>No heat or AC right now? Call <a href={config.phoneHref}>{config.phoneDisplay}</a>. We answer emergencies 24/7.</p>
          </div>
        </div>
        {messages.length === 0 && config.suggestions.length > 0 && (
          <ul className="mma-suggest" aria-label="Suggested questions">
            {config.suggestions.map((s) => <li key={s}><button type="button" onClick={() => send(s)} disabled={busy}>{s}</button></li>)}
          </ul>
        )}
        {messages.map((m) => (
          <div key={m.id} className={`mma-msg mma-msg--${m.role}`}>
            {m.role === 'user' ? (
              <div className="mma-bubble"><span className="visually-hidden">You: </span>{m.content}</div>
            ) : (
              <div className="mma-bubble">
                <span className="visually-hidden">Assistant: </span>
                {m.content && <Markdown text={m.content} policy={policy} onLink={onLink} />}
                {m.status === 'streaming' && !m.content && !m.request && (
                  <span className="mma-typing" role="status"><span /><span /><span /><span className="visually-hidden">Assistant is typing</span></span>
                )}
                {m.request && <RequestCard request={m.request} config={config} />}
                {m.options && !m.answered && (
                  <div className="mma-options" role="group" aria-label="Choices">
                    {m.options.map((o) => (
                      <button key={o.value} type="button" className={o.value === 'flow:cancel' ? 'mma-options__quiet' : undefined}
                        onClick={() => chooseOption(m, o)}>{o.label}</button>
                    ))}
                  </div>
                )}
                {m.status === 'error' && (
                  <div className="mma-error">
                    <p>{errorText(m.error ?? 'stopped', config.phoneDisplay)}</p>
                    {m.error && !['refused', 'rate_limited', 'not_configured'].includes(m.error) && (
                      <button type="button" className="mma-btn" onClick={() => retry(m)} disabled={busy}>Try again</button>
                    )}
                  </div>
                )}
                {m.status === 'done' && m.error === 'truncated' && <p className="mma-hint">{errorText('truncated', config.phoneDisplay)}</p>}
              </div>
            )}
          </div>
        ))}
      </div>

      <form className="mma-form" onSubmit={onSubmit}>
        <label htmlFor="mma-input" className="visually-hidden">Your question</label>
        <textarea id="mma-input" ref={inputRef} rows={1} maxLength={CLIENT_LIMITS.userChars} value={input}
          placeholder="Ask about repairs, installs or areas…" autoComplete="off" enterKeyHint="send"
          onChange={(e) => setInput(e.target.value)} onKeyDown={onInputKey} />
        {busy ? (
          <button type="button" className="mma-send" onClick={() => abortRef.current?.abort()} aria-label="Stop the reply"><Svg name="stop" /></button>
        ) : (
          <button type="submit" className="mma-send" aria-label="Send" disabled={!input.trim()}><Svg name="send" /></button>
        )}
      </form>
      <p id="mma-note" className="mma-note">
        {!aiOn
          ? 'Answers come from our website, and what you type stays in your browser. Our team confirms every job.'
          : `AI answers can be wrong; our team confirms every job. Messages are sent to ${ai.provider ?? 'an AI service'} to answer, so please don’t share personal details.`}
      </p>
      <div className="visually-hidden" aria-live="polite" aria-atomic="true">{announcement}</div>
    </div>
  );
}
