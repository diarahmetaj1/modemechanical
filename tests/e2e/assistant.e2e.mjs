// End-to-end test of the website assistant in a real browser. Starts `astro dev` twice: in the
// default free mode (answers from the site, no server calls), then in AI mode with the mock
// provider (no API key, no cost), and drives the UI on desktop and phone sizes.
//
//   npm run test:e2e
//
// Needs a Chromium for Playwright (`npx playwright install chromium` once, if you don't have one).
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';

const FREE_PORT = 4455;
const AI_PORT = 4456;
const PAGES = [
  '/', '/about-us/', '/hvac-installation/', '/hvac-maintenance/', '/hvac-repair/', '/projects/', '/contact/', '/service-areas/',
  '/hvac-brooklyn-ny/', '/hvac-queens-ny/', '/hvac-manhattan-ny/', '/hvac-bronx-ny/', '/hvac-staten-island-ny/', '/hvac-long-island-ny/', '/hvac-westchester-ny/',
];

const servers = [];
let serverLog = '';
async function startServer(port, env) {
  // Run Astro's CLI directly (not through npx) so stopping this process stops the server.
  const server = spawn(process.execPath, ['node_modules/astro/astro.js', 'dev', '--port', String(port)], { env: { ...process.env, ...env }, stdio: ['ignore', 'pipe', 'pipe'] });
  servers.push(server);
  server.stdout.on('data', (d) => { serverLog += d; });
  server.stderr.on('data', (d) => { serverLog += d; });
  const base = `http://localhost:${port}`;
  await waitForServer(base);
  return base;
}

let failures = 0;
const results = [];
async function test(name, fn) {
  try { await fn(); results.push(`✓ ${name}`); } catch (e) { failures++; results.push(`✗ ${name}\n    ${e.message.split('\n')[0]}`); }
}
const assert = (cond, msg) => { if (!cond) throw new Error(msg); };

async function waitForServer(base) {
  for (let i = 0; i < 60; i++) {
    try { if ((await fetch(base + '/')).ok) return; } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`dev server did not start:\n${serverLog}`);
}

const replyDone = (page) => page.waitForFunction(() => !document.querySelector('.mma-log[aria-busy="true"]') && !document.querySelector('.mma-typing'));

const lastReply = (page) => page.textContent('.mma-msg--assistant:last-child');
const pickOption = (page, label) => page.click(`.mma-msg:last-child .mma-options button:has-text("${label}")`);

/* ---------------- Free mode (default): no AI, no server calls ---------------- */
async function freeSuite(browser) {
  const BASE = await startServer(FREE_PORT, { PUBLIC_ASSISTANT_ENABLED: 'true', PUBLIC_ASSISTANT_MODE: '', ASSISTANT_PROVIDER: '' });
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 860 } });
  const page = await ctx.newPage();
  const errors = [];
  const apiCalls = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('request', (r) => { if (r.url().includes('/api/')) apiCalls.push(r.url()); });
  await page.goto(BASE + '/hvac-repair/', { waitUntil: 'networkidle' });

  await test('free: answers a repair question from the site', async () => {
    await page.click('.mma-launcher');
    await page.waitForSelector('.mma-panel:not([hidden])');
    assert((await page.textContent('.mma-head p')) === 'Answers from our website', 'header does not say free mode');
    await page.fill('#mma-input', 'my furnace wont turn on');
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => document.querySelectorAll('.mma-msg--assistant').length >= 2);
    const text = await lastReply(page);
    assert(text.includes('Heating system not working') && text.includes('ignitor'), `answer: ${text}`);
    assert(await page.isVisible('.mma-msg--assistant:last-child a[href="/hvac-repair/"]'), 'no link to the repair page');
    const live = await page.textContent('[aria-live="polite"]');
    assert(live.includes('Heating system not working'), `not announced: ${live}`);
  });

  await test('free: says when the site has no answer', async () => {
    await page.fill('#mma-input', 'write me a poem about cats');
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => document.querySelector('.mma-msg--assistant:last-child')?.textContent?.includes('couldn’t find'));
  });

  await test('free: guided request by buttons and keyboard, then contact form prefill', async () => {
    await pickOption(page, 'Request a visit');
    await page.waitForFunction(() => document.activeElement?.closest('.mma-options'));
    await page.keyboard.press('Enter'); // first choice: Repair
    for (const label of ['Furnace', 'Queens', 'In the next few days', 'Home']) {
      await page.waitForSelector(`.mma-msg:last-child .mma-options button:has-text("${label}")`);
      await pickOption(page, label);
    }
    await page.waitForFunction(() => document.querySelector('.mma-msg:last-child')?.textContent?.includes('In a sentence or two'));
    await page.fill('#mma-input', 'Furnace clicks but no heat. Call me 917-555-0100');
    await page.keyboard.press('Enter');
    await page.waitForSelector('.mma-card');
    const card = await page.textContent('.mma-card');
    assert(card.includes('Furnace') && card.includes('Queens') && card.includes('[removed]'), `card: ${card}`);
    await page.click('.mma-card a[href="/contact/"]');
    await page.waitForURL('**/contact/');
    await page.waitForFunction(() => (document.querySelector('#cf-message')?.value ?? '').includes('Furnace clicks'));
  });

  await test('free: typing a different question leaves the request steps', async () => {
    await page.waitForSelector('.mma-panel:not([hidden])');
    await pickOption(page, 'Request a visit').catch(async () => {
      await page.fill('#mma-input', 'can I get an estimate'); await page.keyboard.press('Enter');
      await pickOption(page, 'Start');
    });
    await page.waitForFunction(() => document.querySelector('.mma-msg:last-child')?.textContent?.includes('What do you need?'));
    await page.fill('#mma-input', 'Do you serve Astoria?');
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => document.querySelector('.mma-msg--assistant:last-child')?.textContent?.includes('part of our Queens'));
  });

  await test('free: nothing is sent to a server', async () => { assert(apiCalls.length === 0, `server calls: ${apiCalls.join(', ')}`); });
  await test('free: no script errors', async () => { assert(errors.length === 0, errors.join(' | ')); });
  await ctx.close();

  // Regression: every page still renders cleanly with the (default) free assistant.
  const reg = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  for (const path of PAGES) {
    const p = await reg.newPage();
    const errs = [];
    p.on('pageerror', (e) => errs.push(e.message));
    await test(`page ${path} renders with one h1, the launcher, and no errors`, async () => {
      const res = await p.goto(BASE + path, { waitUntil: 'networkidle' });
      assert(res.status() === 200, `status ${res.status()}`);
      // document.querySelectorAll stays out of the dev toolbar's shadow DOM, which has headings of its own.
      assert(await p.evaluate(() => document.querySelectorAll('h1').length) === 1, 'h1 count');
      assert(await p.$$eval('.mma-launcher', (b) => b.length) === 1, 'launcher missing');
      assert(errs.length === 0, errs.join(' | '));
    });
    await p.close();
  }
  await reg.close();
}

/* ---------------- AI mode, with the mock provider ---------------- */
async function aiSuite(browser) {
  const BASE = await startServer(AI_PORT, {
    PUBLIC_ASSISTANT_ENABLED: 'true', PUBLIC_ASSISTANT_MODE: 'ai', ASSISTANT_PROVIDER: 'mock', ASSISTANT_LIMIT_PER_CLIENT_10MIN: '500', ASSISTANT_LIMIT_PER_CLIENT_DAY: '500',
  });

  /* ---------------- Desktop ---------------- */
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 860 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const panelRequests = [];
  page.on('request', (r) => { if (/islands\/assistant\//.test(r.url())) panelRequests.push(r.url()); });

  await page.goto(BASE + '/hvac-repair/', { waitUntil: 'networkidle' });

  await test('ai: panel code is not loaded until the visitor shows interest', async () => {
    assert(await page.isVisible('.mma-launcher'), 'launcher not visible');
    assert(panelRequests.length === 0, `panel code requested on load: ${panelRequests.join(', ')}`);
  });

  await test('ai: opens with the keyboard and moves focus to the text box', async () => {
    await page.focus('.mma-launcher');
    await page.keyboard.press('Enter');
    await page.waitForSelector('.mma-panel:not([hidden])');
    assert(await page.getAttribute('.mma-launcher', 'aria-expanded') === 'true', 'aria-expanded not true');
    await page.waitForFunction(() => document.activeElement?.id === 'mma-input');
    assert(await page.isVisible('.mma-suggest'), 'no suggested questions');
    const dialog = await page.$('[role="dialog"][aria-labelledby="mma-title"]');
    assert(dialog, 'panel is not a labelled dialog');
  });

  await test('ai: streams a reply and shows the prepared service request', async () => {
    await page.fill('#mma-input', 'My AC is not cooling, can I book a repair?');
    await page.keyboard.press('Enter');
    await page.waitForSelector('.mma-card');
    await replyDone(page);
    const card = await page.textContent('.mma-card');
    assert(card.includes('Nothing has been sent yet'), 'card does not say nothing was sent');
    assert(card.includes('[removed]'), 'contact details were not removed from the summary');
    assert(await page.isVisible('.mma-card a[href="tel:+19142233301"]'), 'no call button');
    const mail = await page.getAttribute('.mma-card a[href^="mailto:"]', 'href');
    assert(mail.startsWith('mailto:info@modemechanical.com?subject='), 'bad email link');
    const live = await page.textContent('[aria-live="polite"]');
    assert(live.startsWith('Assistant:'), `reply not announced to screen readers: "${live}"`);
  });

  await test('ai: Escape closes and returns focus to the launcher', async () => {
    await page.focus('#mma-input');
    await page.keyboard.press('Escape');
    assert(await page.isHidden('.mma-panel'), 'panel still visible');
    assert(await page.evaluate(() => document.activeElement?.classList.contains('mma-launcher')), 'focus not on launcher');
    assert(await page.getAttribute('.mma-launcher', 'aria-expanded') === 'false', 'aria-expanded not false');
  });

  await test('ai: only allowlisted links are clickable; HTML in replies is shown as text', async () => {
    await page.click('.mma-launcher');
    await page.fill('#mma-input', 'mock:links');
    await page.keyboard.press('Enter');
    await replyDone(page);
    const hrefs = await page.$$eval('.mma-msg--assistant:last-child a', (as) => as.map((a) => a.getAttribute('href')));
    assert(JSON.stringify(hrefs) === JSON.stringify(['/hvac-repair/', 'tel:+19142233301']), `unexpected links ${hrefs}`);
    assert(await page.$$eval('.mma-log img', (x) => x.length) === 0, 'an <img> was injected');
  });

  await test('ai: when the AI can\'t answer (quota, outage), the site answers instead', async () => {
    const before = await page.$$eval('.mma-msg--assistant', (m) => m.length);
    await page.fill('#mma-input', 'mock:overloaded how often should I change my filter');
    await page.keyboard.press('Enter');
    await page.waitForFunction((n) => document.querySelectorAll('.mma-msg--assistant').length > n, before);
    await replyDone(page);
    const text = await lastReply(page);
    assert(text.includes('every 1 to 3 months'), `fallback answer: ${text}`);
    assert(!(await page.$('.mma-msg--assistant:last-child .mma-error')), 'showed an error instead of answering');
  });

  await test('ai: the panel names the AI service in its privacy note', async () => {
    const note = await page.textContent('#mma-note');
    assert(note.includes('Messages are sent to mock'), `note: ${note}`);
  });

  await test('ai: the visitor can stop a slow reply', async () => {
    await page.fill('#mma-input', 'mock:slow');
    await page.keyboard.press('Enter');
    await page.waitForSelector('button[aria-label="Stop the reply"]');
    await page.click('button[aria-label="Stop the reply"]');
    await page.waitForSelector('button[aria-label="Send"]');
    assert((await page.textContent('.mma-msg--assistant:last-child')).includes('Stopped.'), 'no stopped note');
  });

  await test('ai: the conversation survives navigation and fills the contact form', async () => {
    const before = await page.$$eval('.mma-msg', (m) => m.length);
    await page.click('.mma-card a[href="/contact/"]');
    await page.waitForURL('**/contact/');
    await page.waitForSelector('.mma-panel:not([hidden])'); // reopened on the next page (desktop)
    assert(await page.$$eval('.mma-msg', (m) => m.length) === before, 'conversation not restored');
    await page.waitForFunction(() => (document.querySelector('#cf-message')?.value ?? '').includes('Central air'));
    const message = await page.inputValue('#cf-message');
    assert(message.includes('Service: Repair') && message.includes('Area: Brooklyn'), `form message: ${message}`);
  });

  await test('ai: New conversation clears the chat', async () => {
    await page.click('button[aria-label="Start a new conversation"]');
    assert(await page.$$eval('.mma-msg', (m) => m.length) === 1, 'messages not cleared'); // only the greeting
    assert(await page.isVisible('.mma-suggest'), 'suggestions not back');
  });

  await test('ai: no script errors on the desktop flow', async () => { assert(errors.length === 0, errors.join(' | ')); });
  await ctx.close();

  /* ---------------- Phone ---------------- */
  const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const m = await phone.newPage();
  const mErrors = [];
  m.on('pageerror', (e) => mErrors.push(e.message));
  await m.goto(BASE + '/', { waitUntil: 'networkidle' });

  await test('ai: phone: launcher sits above the Call / Book bar', async () => {
    const launcher = await m.$eval('.mma-launcher', (el) => el.getBoundingClientRect().bottom);
    const bar = await m.$eval('.mbar', (el) => el.getBoundingClientRect().top);
    assert(launcher <= bar, `launcher bottom ${launcher} overlaps bar top ${bar}`);
  });

  await test('ai: phone: the panel fills the screen without sideways scrolling', async () => {
    await m.tap('.mma-launcher');
    await m.waitForSelector('.mma-panel:not([hidden])');
    await m.waitForTimeout(250);
    const box = await m.$eval('.mma-panel', (el) => el.getBoundingClientRect().toJSON());
    assert(box.x === 0 && box.y === 0 && box.width === 390 && box.height === 844, `panel box ${JSON.stringify(box)}`);
    assert(await m.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'horizontal scroll');
    assert(await m.isHidden('.mma-launcher'), 'launcher shows over the panel');
  });

  await test('ai: phone: keyboard focus stays inside the panel', async () => {
    for (let i = 0; i < 12; i++) {
      await m.keyboard.press('Tab');
      assert(await m.evaluate(() => Boolean(document.activeElement?.closest('.mma-panel'))), `focus left the panel after ${i + 1} tabs`);
    }
  });

  await test('ai: phone: a suggestion chip sends the question', async () => {
    await m.tap('.mma-suggest button >> nth=0');
    await replyDone(m);
    assert((await m.$$eval('.mma-msg--user', (x) => x.length)) === 1, 'question not sent');
  });

  await test('ai: no script errors on the phone flow', async () => { assert(mErrors.length === 0, mErrors.join(' | ')); });
  await phone.close();

}

async function main() {
  const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  await freeSuite(browser);
  await aiSuite(browser);
  await browser.close();
}

try {
  await main();
} catch (e) {
  failures++;
  results.push(`✗ setup: ${e.message}`);
} finally {
  servers.forEach((sv) => sv.kill('SIGTERM'));
}
console.log(results.join('\n'));
console.log(failures ? `\n${failures} test(s) failed.` : `\nAll ${results.length} end-to-end tests passed.`);
process.exit(failures ? 1 : 0);
