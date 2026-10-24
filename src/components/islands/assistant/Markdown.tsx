// Renders the assistant's replies. Model output is untrusted, so this supports only a small
// Markdown subset and builds React elements from plain text: no HTML is ever parsed or injected
// (no dangerouslySetInnerHTML). Paragraphs, "-" / "1." lists, **bold**, and [text](link) where the
// link is on the allowlist; any other link shows as its text only.
import type { ReactNode } from 'react';

export interface LinkPolicy { pages: string[]; profiles: string[]; phoneHref: string; email: string }

/** The href to use for a link, or null when it isn't allowed. */
export function allowedHref(href: string, policy: LinkPolicy): string | null {
  const h = href.trim();
  if (h === policy.phoneHref || h === `mailto:${policy.email}`) return h;
  if (policy.profiles.includes(h)) return h;
  if (h.startsWith('/') && !h.startsWith('//')) {
    const path = h.split('#')[0];
    const withSlash = path.endsWith('/') ? path : `${path}/`;
    if (policy.pages.includes(path)) return h;
    if (policy.pages.includes(withSlash)) return withSlash + h.slice(path.length);
  }
  return null;
}

const INLINE = /\*\*([^*\n]+)\*\*|\[([^\]\n]+)\]\(((?:[^()\s]|\([^()\s]*\))+)\)/g;

function inline(text: string, policy: LinkPolicy, onLink: (href: string) => void, keyBase: string): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  let n = 0;
  for (const m of text.matchAll(INLINE)) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const key = `${keyBase}-${n++}`;
    if (m[1] !== undefined) out.push(<strong key={key}>{m[1]}</strong>);
    else {
      const href = allowedHref(m[3], policy);
      out.push(href
        ? <a key={key} href={href} {...(href.startsWith('http') ? { target: '_blank', rel: 'noopener' } : {})} onClick={() => onLink(href)}>{m[2]}</a>
        : m[2]);
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export default function Markdown({ text, policy, onLink = () => {} }: { text: string; policy: LinkPolicy; onLink?: (href: string) => void }) {
  const blocks: ReactNode[] = [];
  const lines = text.replace(/\r/g, '').split('\n');
  let para: string[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;
  const flushPara = () => {
    if (para.length) blocks.push(<p key={`p${blocks.length}`}>{inline(para.join(' '), policy, onLink, `p${blocks.length}`)}</p>);
    para = [];
  };
  const flushList = () => {
    if (!list) return;
    const k = `l${blocks.length}`;
    const items = list.items.map((it, i) => <li key={i}>{inline(it, policy, onLink, `${k}-${i}`)}</li>);
    blocks.push(list.ordered ? <ol key={k}>{items}</ol> : <ul key={k}>{items}</ul>);
    list = null;
  };
  for (const raw of lines) {
    const line = raw.trim();
    const bullet = /^[-*•]\s+(.*)$/.exec(line);
    const numbered = /^\d+[.)]\s+(.*)$/.exec(line);
    if (bullet || numbered) {
      flushPara();
      const ordered = Boolean(numbered);
      if (list && list.ordered !== ordered) flushList();
      list ??= { ordered, items: [] };
      list.items.push((bullet ?? numbered)![1]);
    } else if (!line) {
      flushPara(); flushList();
    } else {
      flushList();
      // Headings aren't wanted in chat; show them as plain text.
      para.push(line.replace(/^#{1,6}\s+/, ''));
    }
  }
  flushPara(); flushList();
  return <>{blocks}</>;
}
