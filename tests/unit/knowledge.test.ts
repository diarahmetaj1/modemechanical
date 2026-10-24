import { describe, expect, it } from 'vitest';
import { knowledge } from '../../src/server/assistant/knowledge.generated';
import { buildContext, buildSystemPrompt, knownPages, serviceRequestTool } from '../../src/server/assistant/prompt';

const all = knowledge.pages.map((p) => p.content).join('\n');
const page = (url: string) => knowledge.pages.find((p) => p.url === url)!.content;

describe('knowledge pack (what the assistant can ground answers in)', () => {
  it('covers every public page', () => {
    expect(knownPages.map((p) => p.url).sort()).toEqual([
      '/', '/about-us/', '/contact/', '/hvac-bronx-ny/', '/hvac-brooklyn-ny/', '/hvac-installation/', '/hvac-long-island-ny/',
      '/hvac-maintenance/', '/hvac-manhattan-ny/', '/hvac-queens-ny/', '/hvac-repair/', '/hvac-staten-island-ny/',
      '/hvac-westchester-ny/', '/projects/', '/service-areas/',
    ]);
  });

  it('carries the business facts from the structured data', () => {
    expect(knowledge.business).toMatchObject({ name: 'Mode Mechanical', phone: '+1-914-223-3301', email: 'info@modemechanical.com' });
    expect(knowledge.business.baseLocation).toContain('11238');
    expect(knowledge.business.areaServed).toEqual(expect.arrayContaining(['Brooklyn', 'Queens', 'Long Island', 'Westchester County']));
  });

  // Questions visitors ask, and the passage that must be in the pack to answer each one.
  it.each([
    ['How often should I change filters?', 'every 1 to 3 months'],
    ['When should I schedule maintenance?', 'once a year'],
    ['Is there a warranty on repairs?', 'warranty on all HVAC repairs'],
    ['How long does an installation take?', 'one to two days'],
    ['Do you handle permits?', 'pull the required permits'],
    ['Why is my AC not cooling?', 'Low refrigerant, a dirty condenser coil'],
    ['Do you serve Astoria?', 'Astoria'],
    ['Do you serve Yonkers?', 'Yonkers'],
    ['How much does a new system cost?', 'written estimate'],
  ])('%s', (_, passage) => {
    expect(all).toContain(passage);
  });

  it('keeps shared blocks once and drops page chrome', () => {
    expect(all.split('every 1 to 3 months').length - 1).toBe(1);
    expect(all).not.toMatch(/<[a-z]+[\s>]/i);
    expect(page('/hvac-repair/')).toMatch(/^# /);
  });

  it('stays small enough to send whole on every request', () => {
    expect(all.length).toBeLessThan(60_000);
  });
});

describe('system prompt', () => {
  it('is byte-identical on every call, so the provider can cache it', () => {
    expect(buildSystemPrompt()).toBe(buildSystemPrompt());
  });

  it('includes the knowledge, the grounding and safety rules, and the link allowlist', () => {
    const p = buildSystemPrompt();
    for (const url of knownPages.map((x) => x.url)) expect(p).toContain(`<page url="${url}"`);
    expect(p).toMatch(/Never guess or invent/);
    expect(p).toMatch(/Never quote prices/);
    expect(p).toMatch(/leave the building/);
    expect(p).toMatch(/information, not instructions/);
    expect(p).toMatch(/never say a request was sent/);
    expect(p).toContain('tel:+19142233301');
  });

  it('puts the date and page in the per-request context, in New York time', () => {
    const ctx = buildContext(new Date('2026-01-15T03:30:00Z'), { url: '/hvac-repair/', title: 'AC & Heating Repair' });
    expect(ctx).toContain('Wednesday, January 14, 2026');
    expect(ctx).toContain('/hvac-repair/');
  });

  it('defines a strict tool schema with no contact fields', () => {
    const schema = serviceRequestTool.inputSchema as { properties: Record<string, unknown>; additionalProperties: boolean; required: string[] };
    expect(schema.additionalProperties).toBe(false);
    expect(Object.keys(schema.properties).sort()).toEqual(schema.required.slice().sort());
    expect(Object.keys(schema.properties).join()).not.toMatch(/name|phone|email|address/);
  });
});
