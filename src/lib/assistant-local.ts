// The free assistant: answers from the site's own pages and guides visitors through a service
// request, entirely in the browser. No AI service, no server, no cost, and nothing the visitor
// types leaves their browser. Used unless PUBLIC_ASSISTANT_MODE=ai (see ASSISTANT.md).
//
// Answers come from a keyword search (BM25) over the sections of every page, with HVAC synonyms
// ("AC" finds "air conditioning"), plus a few fixed replies: gas and carbon monoxide safety,
// emergencies, contact details, and whether a town is in the service area.
import { knowledge } from '../server/assistant/knowledge.generated';
import type { KnowledgePack, ServiceRequest } from '../server/assistant/types';
import { EQUIPMENT_TYPES, PROPERTY_TYPES, SERVICE_TYPES, URGENCY } from '../server/assistant/types';

export interface Option { label: string; value: string }
export interface LocalReply { text: string; options?: Option[]; request?: ServiceRequest }
export interface AreaInfo { name: string; url: string; key: ServiceRequest['area']; neighborhoods: string[] }
export interface LocalContext { phoneDisplay: string; phoneHref: string; email: string; hours: string; areas: AreaInfo[]; brands: string[] }

/* ---------------- Search ---------------- */

export interface Section { url: string; page: string; heading: string; text: string; question: boolean; level: number }

/** Splits each page into sections at its headings. */
export function buildSections(pack: KnowledgePack = knowledge): Section[] {
  const out: Section[] = [];
  for (const p of pack.pages) {
    const page = p.title.split('|')[0].trim();
    let heading = page;
    let level = 1;
    let lines: string[] = [];
    const flush = () => {
      const text = lines.join('\n').trim();
      if (text.length >= 30) out.push({ url: p.url, page, heading, text, question: heading.endsWith('?'), level });
      lines = [];
    };
    for (const line of p.content.split('\n')) {
      const h = /^(#{1,4})\s+(.*)$/.exec(line);
      // Repair problems are titled "Poor airflow Cooling and heating": drop the category label.
      if (h) { flush(); level = h[1].length; heading = h[2].replace(/\s+(Cooling and heating|Cooling|Heating)$/, ''); } else lines.push(line);
    }
    flush();
  }
  return out;
}

const STOP = new Set(('a an the is are am was were be been i im my me we you your our us do does did can could would should will '
  + 'to of in on for at by with and or it its this that these those have has had how what when where why which who whom much many '
  + 'any there here please hi hello hey just get got really very so if about from as than then them they he she him her '
  + 'come go need want like know tell help ok okay not wont dont doesnt isnt cant arent didnt turn still keep').split(' '));

/** Ways visitors describe a problem, mapped to the words the repair page uses. */
const PHRASES: [RegExp, string][] = [
  [/\b(won.?t|doesn.?t|does not|will not|not) (turn|start|come|switch|kick)( on)?\b|stopped working|not working|\bbroken\b|\b(dead|died)\b/i, 'working'],
  [/\b(ic(e|ing|ed)( up)?|frost\w*|froze\w*|freez\w*)\b/i, 'frozen'],
  [/blowing (warm|hot)|warm air|hot air|not cool\w*|isn.?t cool\w*/i, 'cooling'],
  [/\b(nois\w*|loud|bang\w*|grind\w*|squeal\w*|rattl\w*|buzz\w*|humm\w*|clank\w*)\b/i, 'strange noises'],
  [/\bleak\w*/i, 'leaking'],
  [/weak (air|flow)|low airflow|barely blowing|not blowing/i, 'poor airflow'],
];
const expand = (query: string) => PHRASES.reduce((q, [re, add]) => (re.test(q) ? `${q} ${add}` : q), query);

/** Words that mean the same thing to a visitor; each maps to the terms used on the site. */
const SYNONYMS: Record<string, string[]> = {
  ac: ['air', 'condition', 'cool', 'ac'], aircon: ['air', 'condition', 'cool'], airconditioner: ['air', 'condition'],
  conditioner: ['condition'], conditioning: ['condition'], cooling: ['cool'], cold: ['cool', 'heat'], hot: ['heat', 'cool'], warm: ['cool', 'heat'],
  heater: ['heat'], heating: ['heat'], heat: ['heat', 'furnace', 'boiler'], furnace: ['furnace', 'heat'], boiler: ['boiler', 'heat'], radiator: ['boiler', 'radiator'],
  cost: ['cost', 'price', 'estimate'], price: ['price', 'cost', 'estimate'], pricing: ['price', 'cost', 'estimate'], expensive: ['cost', 'price'],
  cheap: ['cost', 'price'], quote: ['quote', 'estimate'], estimate: ['estimate', 'quote'], charge: ['cost', 'price'], fee: ['fee', 'cost'],
  fix: ['repair', 'fix'], broken: ['repair'], broke: ['repair'], repair: ['repair'],
  replace: ['install', 'replacement', 'new'], replacement: ['install', 'replacement'], new: ['new', 'install'], install: ['install'], installation: ['install'],
  tuneup: ['tune', 'maintenance'], tune: ['tune', 'maintenance'], checkup: ['maintenance', 'inspection'], maintenance: ['maintenance'], service: ['service', 'maintenance'],
  minisplit: ['mini', 'split', 'ductless'], mini: ['mini', 'ductless'], split: ['split', 'ductless'], ductless: ['ductless', 'mini'],
  hour: ['hour', 'open'], open: ['open', 'hour'], weekend: ['weekend', 'hour'],
  serve: ['serve', 'area'], cover: ['serve', 'area'], area: ['area', 'serve'], location: ['area', 'base'], near: ['area', 'serve'],
  warranty: ['warranty', 'guarantee'], guarantee: ['guarantee', 'warranty'], noise: ['noise', 'noisy', 'sound'], noisy: ['noise'], loud: ['noise'],
  leak: ['leak', 'refrigerant'], leaking: ['leak'], frozen: ['frozen', 'ice', 'freeze'], ice: ['frozen', 'ice'], icing: ['frozen', 'ice'],
  smell: ['smell', 'odor'], thermostat: ['thermostat'], filter: ['filter'], filters: ['filter'], permit: ['permit', 'code'],
  long: ['long', 'take'], take: ['take', 'long'], brand: ['brand'], brands: ['brand'], emergency: ['emergency', '24'],
};

export function stem(word: string): string {
  if (word.length <= 4) return word;
  for (const [suffix, repl] of [['ies', 'y'], ['ing', ''], ['ers', 'er'], ['ed', ''], ['es', ''], ['s', '']] as const) {
    if (word.endsWith(suffix) && word.length - suffix.length >= 3) return word.slice(0, -suffix.length) + repl;
  }
  return word;
}

const words = (text: string) => text.toLowerCase().replace(/[’']/g, '').replace(/a\/c/g, 'ac').match(/[a-z0-9]+/g) ?? [];
export const tokenize = (text: string): string[] => words(text).filter((w) => !STOP.has(w)).map(stem);

/** Query terms grouped by the word the visitor typed: a group counts as found if any of its terms is. */
function queryGroups(query: string): string[][] {
  const seen = new Set<string>();
  const groups: string[][] = [];
  for (const w of words(expand(query))) {
    if (STOP.has(w)) continue;
    const s = stem(w);
    if (seen.has(s)) continue;
    seen.add(s);
    groups.push([...new Set([s, ...(SYNONYMS[w] ?? SYNONYMS[s] ?? []).map(stem)])]);
  }
  return groups;
}

export interface Hit { section: Section; score: number; coverage: number }

export function createIndex(sections: Section[]) {
  // Headings count double: they say what a section is about.
  const docs = sections.map((s) => {
    const tokens = [...tokenize(s.heading), ...tokenize(s.heading), ...tokenize(s.text)];
    const tf = new Map<string, number>();
    tokens.forEach((t) => tf.set(t, (tf.get(t) ?? 0) + 1));
    return { tf, length: tokens.length };
  });
  const avg = docs.reduce((n, d) => n + d.length, 0) / Math.max(1, docs.length);
  const df = new Map<string, number>();
  docs.forEach((d) => d.tf.forEach((_, t) => df.set(t, (df.get(t) ?? 0) + 1)));
  const idf = (t: string) => Math.log(1 + (docs.length - (df.get(t) ?? 0) + 0.5) / ((df.get(t) ?? 0) + 0.5));

  return {
    search(query: string, limit = 3): Hit[] {
      const groups = queryGroups(query);
      if (!groups.length) return [];
      const hits: Hit[] = docs.map((d, i) => {
        let score = 0;
        let found = 0;
        for (const group of groups) {
          let best = 0;
          for (const t of group) {
            const f = d.tf.get(t) ?? 0;
            if (!f) continue;
            best = Math.max(best, idf(t) * (f * 2.2) / (f + 1.2 * (0.25 + 0.75 * d.length / avg)));
          }
          if (best > 0) found++;
          score += best;
        }
        if (sections[i].question) score *= 1.15;
        // The seven area pages repeat each other; prefer the service pages when both match.
        if (/^\/hvac-[a-z-]+-ny\/$/.test(sections[i].url)) score *= 0.8;
        return { section: sections[i], score, coverage: found / groups.length };
      });
      return hits.filter((h) => h.score > 0).sort((a, b) => b.score - a.score).slice(0, limit);
    },
  };
}

/** The sentences of a section that match the question best, in their original order. */
export function excerpt(text: string, query: string, max = 340): string {
  const sentences = text.replace(/\n- /g, '\n').split(/(?<=[.!?])\s+|\n/).map((s) => s.trim()).filter(Boolean);
  if (text.length <= max) return sentences.join(' ');
  const terms = new Set(queryGroups(query).flat());
  const ranked = sentences.map((s, i) => ({ s, i, n: tokenize(s).filter((t) => terms.has(t)).length }))
    .sort((a, b) => b.n - a.n || a.i - b.i);
  const picked: typeof ranked = [];
  let size = 0;
  for (const r of ranked) {
    if (size + r.s.length > max && picked.length) break;
    picked.push(r);
    size += r.s.length + 1;
  }
  return picked.sort((a, b) => a.i - b.i).map((r) => r.s).join(' ');
}

/* ---------------- Fixed replies ---------------- */

const GAS = /\b(smell(s|ing)? (of )?gas|gas (smell|leak|odou?r)|carbon monoxide|co (alarm|detector)|co2? alarm)\b/i;
const EMERGENCY = /\b(emergency|no heat|no hot water|not heating|no (ac|a\/c|air|cooling)|not cooling|(water|ceiling) leak|leaking water|burning smell|smell(s)? (like )?burning|smoke|sparks?)\b/i;
const BOOK = /\b(book|schedule|appointment|quote|estimate|send (someone|a tech\w*)|come (out|over)|technician|request (a )?(service|visit))\b/i;
const MONEY = /\b(cost|price|how much|charge|fee|expensive)\b/i;
const CONTACT = /\b(phone|number|call you|email|e-mail|contact( you)?|reach you)\b/i;
const HOURS = /\b(hours|open|opening|close[ds]?|weekends?|saturday|sunday|holidays?)\b/i;
const BRAND = /\b(brands?|makes?|manufacturers?)\b/i;
const OTHER_BRANDS = /\b(lennox|rheem|goodman|american standard|bryant|amana|ruud|bosch|gree|samsung|friedrich|weil.?mclain|burnham|navien|haier|midea|panasonic|toshiba|hitachi)\b/i;
const AREA_QUESTION = /\b(serve|service|cover|come to|work in|in my area|near|travel)\b/i;
const GREETING = /^\s*(hi|hello|hey|good (morning|afternoon|evening)|yo)\b[\s!.,]*$/i;
const THANKS = /^\s*(thanks|thank you|thx|ty|great|ok(ay)?|perfect|cool)\b[\s\w!.,]{0,20}$/i;

const REQUEST_OPTION: Option = { label: 'Request a visit', value: 'flow:start' };

function findArea(query: string, areas: AreaInfo[]): { area: AreaInfo; place: string } | null {
  const q = ` ${query.toLowerCase().replace(/[’'.]/g, '')} `;
  // Neighborhoods first and longest first, so "Long Island City" isn't read as "Long Island".
  const places = areas.flatMap((area) => [
    ...area.neighborhoods.map((n) => ({ area, place: n })),
    { area, place: area.name }, { area, place: area.name.replace(/^The /, '').replace(/ County$/, '') },
  ]).sort((a, b) => b.place.length - a.place.length);
  for (const p of places) {
    const needle = p.place.toLowerCase().replace(/[.]/g, '');
    if (new RegExp(`[^a-z]${needle.replace(/[-/\\^$*+?()|[\]{}]/g, '\\$&')}[^a-z]`).test(q)) return p;
  }
  return null;
}

/** Replies to a free-text message. */
export function reply(query: string, ctx: LocalContext, index: ReturnType<typeof createIndex>): LocalReply {
  const phone = `[${ctx.phoneDisplay}](${ctx.phoneHref})`;
  if (GAS.test(query)) {
    return { text: `**If you smell gas or a carbon monoxide alarm is sounding, leave the building now** and call 911 or your gas utility’s emergency line from outside. Don’t switch lights or appliances on or off. Once everyone is safe, call us at ${phone}.` };
  }
  if (EMERGENCY.test(query)) {
    return {
      text: `That sounds urgent. **Call us now at ${phone}** — we answer emergency calls 24/7. Or set up a request and we’ll get back to you.`,
      options: [{ label: 'Request emergency service', value: 'flow:start:emergency' }],
    };
  }
  if (GREETING.test(query)) return { text: 'Hi! Ask me about repairs, installations, maintenance or our service areas, or request a visit.', options: [REQUEST_OPTION] };
  if (THANKS.test(query)) return { text: `You’re welcome! If you need anything else, I’m here, or call ${phone}.` };
  if (BOOK.test(query) && !MONEY.test(query)) return { text: 'Happy to help you set that up.', options: [{ label: 'Start', value: 'flow:start' }] };
  if (CONTACT.test(query) && !MONEY.test(query)) {
    return { text: `Call ${phone} (emergencies answered 24/7), email [${ctx.email}](mailto:${ctx.email}), or use the [contact form](/contact/). Office hours: ${ctx.hours}.`, options: [REQUEST_OPTION] };
  }

  if (HOURS.test(query) && !MONEY.test(query)) {
    return { text: `Our office hours are ${ctx.hours}, and we answer emergency calls 24/7 at ${phone}.`, options: [REQUEST_OPTION] };
  }
  const brand = ctx.brands.find((b) => new RegExp(`\\b${b.split(' ')[0]}\\b`, 'i').test(query));
  const other = brand ? null : OTHER_BRANDS.exec(query)?.[0];
  if (other) {
    const name = other.replace(/\b\w/g, (c) => c.toUpperCase());
    return { text: `${name} isn’t on our website’s brand list (${ctx.brands.join(', ')}), but we may still be able to help. Call ${phone} to check.`, options: [REQUEST_OPTION] };
  }
  if (brand || BRAND.test(query)) {
    const list = ctx.brands.join(', ').replace(/, ([^,]*)$/, ' and $1');
    return {
      text: brand
        ? `Yes, ${brand} is one of the brands we install and service. See [HVAC installation](/hvac-installation/) and [repair](/hvac-repair/).`
        : `We install and service ${list}. For another brand, call ${phone} and we’ll tell you if we can help.`,
      options: [REQUEST_OPTION],
    };
  }

  const place = findArea(query, ctx.areas);
  if (place) {
    const whole = place.place === place.area.name || place.area.name.includes(place.place);
    const text = whole
      ? `Yes, we serve ${place.area.name}, including ${place.area.neighborhoods.slice(0, 6).join(', ')} and more.`
      : `Yes, we serve ${place.place}. It’s part of our ${place.area.name} service area.`;
    return { text: `${text} See [HVAC in ${place.area.name}](${place.area.url}).`, options: [REQUEST_OPTION] };
  }

  const hits = index.search(query);
  const best = hits[0];
  // Most of the visitor's words must be found; with three or more, a third is enough.
  const minCoverage = queryGroups(query).length >= 3 ? 0.34 : 0.5;
  if (!best || best.score < 1.5 || best.coverage < minCoverage) {
    if (AREA_QUESTION.test(query)) {
      return { text: `I couldn’t find that place in our list. We cover ${ctx.areas.map((a) => a.name).join(', ')}, and nearby. Call ${phone} and we’ll tell you straight away if you’re in range.` };
    }
    return {
      text: `I couldn’t find that on our website. Our team can help: call ${phone}, email [${ctx.email}](mailto:${ctx.email}), or use the [contact form](/contact/).`,
      options: [REQUEST_OPTION],
    };
  }
  const s = best.section;
  // Questions and repair problems read best whole, under their own title.
  const whole = s.question || s.level === 4;
  const answer = whole ? s.text.replace(/\n/g, ' ') : excerpt(s.text, query);
  const more = whole ? `**${s.heading}**\n\n${answer}` : answer;
  return {
    text: `${more}\n\nMore: [${s.page}](${s.url})`,
    options: [REQUEST_OPTION],
  };
}

/* ---------------- Guided service request ---------------- */

export type FlowStep = 'service' | 'equipment' | 'area' | 'urgency' | 'property' | 'details';
export interface FlowState { step: FlowStep; draft: Partial<ServiceRequest> }

const LABEL: Record<string, string> = {
  repair: 'Repair', installation: 'New installation', maintenance: 'Maintenance / tune-up', emergency: 'Emergency',
  central_air: 'Central air', ductless_mini_split: 'Ductless mini-split', heat_pump: 'Heat pump', furnace: 'Furnace', boiler: 'Boiler',
  rooftop_unit: 'Rooftop unit', ductwork_ventilation: 'Ductwork / ventilation', commercial_refrigeration: 'Commercial refrigeration',
  thermostat: 'Thermostat', other: 'Other', not_sure: 'Not sure',
  this_week: 'In the next few days', flexible: 'Flexible', home: 'Home', business: 'Business',
};
const CANCEL: Option = { label: 'Cancel', value: 'flow:cancel' };
const pick = (values: readonly string[], skip: string[] = []) => values.filter((v) => !skip.includes(v)).map((v) => ({ label: LABEL[v] ?? v, value: `flow:pick:${v}` }));

export function flowPrompt(state: FlowState, ctx: LocalContext): LocalReply {
  switch (state.step) {
    case 'service': return { text: 'What do you need?', options: [...pick(SERVICE_TYPES), CANCEL] };
    case 'equipment': return { text: 'What kind of system is it?', options: [...pick(EQUIPMENT_TYPES, ['thermostat']), CANCEL] };
    case 'area': return { text: 'Where is the property?', options: [...ctx.areas.map((a) => ({ label: a.name, value: `flow:pick:${a.key}` })), { label: 'Somewhere else', value: 'flow:pick:other' }, CANCEL] };
    case 'urgency': return { text: 'How soon do you need us?', options: [{ label: 'Today (emergency)', value: 'flow:pick:emergency' }, ...pick(URGENCY, ['emergency', 'not_sure']), CANCEL] };
    case 'property': return { text: 'Is it a home or a business?', options: [...pick(PROPERTY_TYPES, ['not_sure']), CANCEL] };
    case 'details': return { text: 'In a sentence or two, what’s happening or what would you like done? Please leave out names and phone numbers.', options: [{ label: 'Skip', value: 'flow:pick:' }, CANCEL] };
  }
}

const ORDER: FlowStep[] = ['service', 'equipment', 'area', 'urgency', 'property', 'details'];

export const startFlow = (emergency = false): FlowState =>
  emergency ? { step: 'equipment', draft: { service: 'emergency', urgency: 'emergency' } } : { step: 'service', draft: {} };

const EMAIL = /[^\s@]+@[^\s@]+\.[a-z]{2,}/gi;
const PHONE = /(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/g;
export const redact = (s: string) => s.replace(EMAIL, '[removed]').replace(PHONE, '[removed]');

/** Matches typed text to one of the current step's options (by label or value). */
export function matchOption(text: string, options: Option[]): Option | null {
  const t = text.trim().toLowerCase();
  if (!t) return null;
  return options.find((o) => o.label.toLowerCase() === t)
    ?? options.find((o) => o.label.toLowerCase().startsWith(t) || t.includes(o.label.toLowerCase()))
    ?? null;
}

/** Applies an answer; returns the next state, or the finished request. */
export function advance(state: FlowState, value: string, ctx: LocalContext): { state: FlowState } | { request: ServiceRequest } {
  const draft = { ...state.draft };
  if (state.step === 'details') {
    const area = ctx.areas.find((a) => a.key === draft.area);
    const fallback = `${LABEL[draft.service ?? 'not_sure']} for ${draft.equipment && draft.equipment !== 'not_sure' ? `a ${LABEL[draft.equipment].toLowerCase()}` : 'a heating or cooling system'}`
      + `${draft.property && draft.property !== 'not_sure' ? ` at a ${draft.property}` : ''}${area ? ` in ${area.name}` : ''}.`;
    const summary = redact(value.trim().replace(/\s+/g, ' ')).slice(0, 400) || fallback;
    return {
      request: {
        service: draft.service ?? 'not_sure', equipment: draft.equipment ?? 'not_sure', area: draft.area ?? 'not_sure',
        urgency: draft.urgency ?? 'not_sure', property: draft.property ?? 'not_sure', summary,
      },
    };
  }
  (draft as Record<string, string>)[state.step] = value;
  if (state.step === 'service' && value === 'emergency') draft.urgency = 'emergency';
  let next = ORDER[ORDER.indexOf(state.step) + 1];
  if (next === 'urgency' && draft.urgency) next = 'property';
  return { state: { step: next, draft } };
}

export const optionLabel = (value: string) => LABEL[value] ?? value;
