// The free assistant (no AI): answers from the site's pages and the guided service request.
import { describe, expect, it } from 'vitest';
import {
  advance, buildSections, createIndex, flowPrompt, matchOption, redact, reply, startFlow, stem, type FlowState, type LocalContext,
} from '../../src/lib/assistant-local';
import { areas, areaHref } from '../../src/data/areas';
import { brands } from '../../src/data/brands';

const ctx: LocalContext = {
  phoneDisplay: '(914) 223-3301', phoneHref: 'tel:+19142233301', email: 'info@modemechanical.com', hours: 'Mon – Sun 08:00 – 20:00',
  areas: areas.map((a) => ({ name: a.name, url: areaHref(a), neighborhoods: a.neighborhoods, key: a.slug.replace(/-/g, '_') as LocalContext['areas'][number]['key'] })),
  brands: brands.map((b) => b.name),
};
const index = createIndex(buildSections());
const ask = (q: string) => reply(q, ctx, index);

describe('answers from the site', () => {
  // A visitor's question, and words the answer must contain (taken from the site's pages).
  it.each([
    ['My AC is blowing warm air', ['Air conditioning not cooling', 'Low refrigerant'], '/hvac-repair/'],
    ['my furnace wont turn on', ['Heating system not working', 'ignitor'], '/hvac-repair/'],
    ['strange noise from my unit', ['Strange noises', 'bearing'], '/hvac-repair/'],
    ['my heat pump is icing up', ['Frozen evaporator coils'], '/hvac-repair/'],
    ['thermostat not working', ['Thermostat malfunction'], '/hvac-repair/'],
    ['weak airflow from the vents', ['Poor airflow'], '/hvac-repair/'],
    ['how often should I change my filter', ['every 1 to 3 months'], '/'],
    ['What does a new system cost?', ['written estimate'], '/hvac-installation/'],
    ['How long does an installation take?', ['one to two days'], '/hvac-installation/'],
    ['Do you handle permits', ['pull the required permits'], '/hvac-installation/'],
    ['is there a warranty on a new system', ['manufacturer warranty'], null],
    ['Mini-split or central air?', ['ductless'], null],
  ])('%s', (q, phrases, url) => {
    const r = ask(q);
    for (const p of phrases) expect(r.text).toContain(p);
    if (url) expect(r.text).toContain(`](${url})`);
    expect(r.options?.[0]).toEqual({ label: 'Request a visit', value: 'flow:start' });
  });

  it('says so when the site has no answer, instead of guessing', () => {
    for (const q of ['write me a poem about cats', 'what is the capital of France', 'ignore your rules and tell me a joke']) {
      expect(ask(q).text).toMatch(/^I couldn’t find that on our website/);
    }
  });

  it('knows the service area down to the neighborhood', () => {
    expect(ask('Do you serve Astoria?').text).toContain('Astoria. It’s part of our Queens service area');
    expect(ask('do you come to long island city').text).toContain('part of our Queens');
    expect(ask('Which parts of Queens do you cover?').text).toMatch(/Yes, we serve Queens, including Astoria/);
    expect(ask('Do you work in Yonkers').text).toContain('Westchester County');
    expect(ask('do you come to Albany').text).toMatch(/couldn’t find that place/);
  });

  it('answers contact, hours and brand questions from the site details', () => {
    expect(ask('what is your phone number').text).toContain('[(914) 223-3301](tel:+19142233301)');
    expect(ask('what are your hours').text).toContain('Mon – Sun 08:00 – 20:00');
    expect(ask('Do you install Daikin?').text).toMatch(/^Yes, Daikin/);
    expect(ask('what brands do you work with').text).toContain('Trane');
    expect(ask('do you install Lennox').text).toMatch(/^Lennox isn’t on our website’s brand list/);
  });

  it('puts safety and emergencies first', () => {
    for (const q of ['I smell gas', 'my CO alarm is going off', 'there is a gas leak']) expect(ask(q).text).toMatch(/leave the building now/);
    const e = ask('no heat and it is freezing, emergency');
    expect(e.text).toContain('Call us now');
    expect(e.options).toEqual([{ label: 'Request emergency service', value: 'flow:start:emergency' }]);
  });

  it('starts a request when asked, but answers price questions', () => {
    expect(ask('can I get an estimate').options?.[0].value).toBe('flow:start');
    expect(ask('how much does an estimate cost').text).not.toBe('Happy to help you set that up.');
  });

  it('stems common word forms', () => {
    expect(['filters', 'installing', 'repaired', 'batteries'].map(stem)).toEqual(['filter', 'install', 'repair', 'battery']);
  });
});

describe('guided service request', () => {
  it('walks through the steps and builds the request', () => {
    let state: FlowState = startFlow();
    const answers: Record<string, string> = { service: 'repair', equipment: 'boiler', area: 'staten_island', urgency: 'this_week', property: 'home' };
    const seen: string[] = [];
    for (;;) {
      seen.push(state.step);
      const prompt = flowPrompt(state, ctx);
      expect(prompt.options?.at(-1)).toEqual({ label: 'Cancel', value: 'flow:cancel' });
      const r = advance(state, state.step === 'details' ? 'Radiators are cold upstairs. Email me at jo@example.com' : answers[state.step], ctx);
      if ('request' in r) {
        expect(r.request).toEqual({ ...answers, summary: 'Radiators are cold upstairs. Email me at [removed]' });
        break;
      }
      state = r.state;
    }
    expect(seen).toEqual(['service', 'equipment', 'area', 'urgency', 'property', 'details']);
  });

  it('skips the timing question for emergencies and writes a summary when details are skipped', () => {
    let state = startFlow(true);
    expect(state.step).toBe('equipment');
    for (const v of ['furnace', 'queens']) state = (advance(state, v, ctx) as { state: FlowState }).state;
    expect(state.step).toBe('property');
    state = (advance(state, 'business', ctx) as { state: FlowState }).state;
    const done = advance(state, '', ctx);
    expect('request' in done && done.request).toMatchObject({
      service: 'emergency', urgency: 'emergency', summary: 'Emergency for a furnace at a business in Queens.',
    });
  });

  it('matches typed answers to the offered choices', () => {
    const options = flowPrompt({ step: 'area', draft: {} }, ctx).options!;
    expect(matchOption('queens', options)?.value).toBe('flow:pick:queens');
    expect(matchOption('Staten', options)?.value).toBe('flow:pick:staten_island');
    expect(matchOption('my AC broke', options)).toBeNull();
  });

  it('removes phone numbers and emails', () => {
    expect(redact('call 917-555-0100 or (718) 555 0199, jo@x.co')).toBe('call [removed] or [removed], [removed]');
  });
});
