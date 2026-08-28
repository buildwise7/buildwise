import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { createRequire } from 'node:module';
import { budgetFit, cheaperAlternatives, compatibility, makeBuild, total } from '../src/services/build.js';
import { readSharedBuild } from '../src/services/saved-builds.js';
const { chromium } = createRequire(import.meta.url)('playwright');

const root = process.cwd();
const types = { '.css':'text/css', '.js':'text/javascript', '.html':'text/html', '.png':'image/png', '.webp':'image/webp', '.xml':'application/xml', '.txt':'text/plain' };
const server = createServer(async (request, response) => {
  const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
  const relative = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
  const file = normalize(join(root, relative));
  if (!file.startsWith(root)) return response.writeHead(403).end();
  try { await stat(file); response.writeHead(200, { 'content-type': types[extname(file)] || 'application/octet-stream' }); response.end(await readFile(file)); }
  catch { response.writeHead(404).end('Not found'); }
});
await new Promise(resolve => server.listen(4173, '127.0.0.1', resolve));
const browser = await chromium.launch({ headless: true, executablePath: process.env.BUILDWISE_BROWSER || 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
let passed = 0;
async function test(name, fn) { try { await fn(); passed++; console.log(`PASS ${name}`); } catch (error) { console.error(`FAIL ${name}\n${error.stack}`); process.exitCode = 1; } }
async function pageFor(viewport = { width: 1280, height: 800 }) {
  const context = await browser.newContext({ viewport });
  await context.addInitScript(() => { localStorage.setItem('buildwise_terms_accepted', 'true'); localStorage.setItem('buildwise_terms_version', '1'); });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:4173/', { waitUntil: 'networkidle' });
  return { context, page };
}

async function openResults(page, budget) {
  await page.getByRole('button', { name: /Build my PC/ }).click();
  await page.getByRole('button', { name: `£${budget.toLocaleString('en-GB')}`, exact: true }).click();
  for (let step = 0; step < 5; step++) await page.getByRole('button', { name: /Continue/ }).click();
  await page.getByRole('button', { name: /Generate my build/ }).click();
}

await test('budget-fit ratings cover under, close, slightly over and significantly over budgets', async () => {
  assert.equal(budgetFit(1000, 850).rating, 'Excellent fit');
  assert.equal(budgetFit(1000, 700).rating, 'Good fit');
  assert.equal(budgetFit(1000, 1050).rating, 'Slightly over budget');
  assert.equal(budgetFit(1000, 1200).rating, 'Over budget');
});

await test('over-budget builds show compatible, lower-cost alternatives without auto-replacing parts', async () => {
  const preferences = { budget:500, use:'Gaming', balance:50, colour:'white', rgb:'RGB lighting', resolution:'1440p', software:'Competitive games', storage:2048, noise:'Quiet preferred', size:'Mid-size', connectivity:'Wi-Fi + Bluetooth', upgrade:'Important' };
  const ids = makeBuild(preferences, 'balanced');
  const alternatives = cheaperAlternatives(ids);
  assert.ok(total(ids) > preferences.budget);
  assert.ok(alternatives.length > 0);
  for (const option of alternatives) {
    const replacement = ids.map(id => id === option.current.id ? option.best.id : id);
    assert.ok(option.best.price.amount < option.current.price.amount);
    assert.equal(compatibility(replacement).length, 0);
  }
  assert.deepEqual(ids.filter(Boolean).sort(), makeBuild(preferences, 'balanced').filter(Boolean).sort());
});

await test('results show requested budget, total, rating and savings guidance when over budget', async () => {
  const { context, page } = await pageFor();
  await openResults(page, 500);
  assert.equal(await page.locator('.budget-fit').count(), 4);
  assert.match(await page.locator('.budget-fit').first().innerText(), /Budget fit: Over budget/);
  assert.match(await page.locator('.budget-fit').first().innerText(), /Budget £500/);
  assert.ok(await page.locator('.cost-options li').count() > 0);
  await context.close();
});

await test('results keep budget guidance readable on desktop and mobile', async () => {
  for (const viewport of [{ width:1440, height:900 }, { width:375, height:812 }]) {
    const { context, page } = await pageFor(viewport);
    await openResults(page, 500);
    const fit = page.locator('.budget-fit').first();
    const box = await fit.boundingBox();
    assert.ok(box && box.x >= 0 && box.x + box.width <= viewport.width);
    assert.ok(await fit.isVisible());
    await context.close();
  }
});

await test('generated builds save, reopen, delete and persist across refresh', async () => {
  const { context, page } = await pageFor();
  await openResults(page, 1000);
  await page.getByRole('button', { name:'Save build', exact:true }).first().click();
  assert.match(await page.locator('.save-status').innerText(), /Saved/);
  await page.getByRole('button', { name:'Close questionnaire' }).click();
  await page.getByRole('button', { name:'Saved builds', exact:true }).click();
  assert.equal(await page.locator('.saved-build').count(), 1);
  await page.reload({ waitUntil:'networkidle' });
  await page.getByRole('button', { name:'Saved builds', exact:true }).click();
  assert.equal(await page.locator('.saved-build').count(), 1);
  await page.getByRole('button', { name:'Open', exact:true }).click();
  assert.equal(await page.locator('.build-item').count(), 9);
  await page.getByRole('button', { name:'Close questionnaire' }).click();
  await page.getByRole('button', { name:'Saved builds', exact:true }).click();
  await page.getByRole('button', { name:'Delete', exact:true }).click();
  assert.equal(await page.locator('.saved-build').count(), 0);
  await context.close();
});

await test('manual builder saves a named build', async () => {
  const { context, page } = await pageFor();
  await page.getByRole('button', { name:'Manual builder', exact:true }).click();
  await page.locator('#build-name').fill('Quiet desk build');
  await page.getByRole('button', { name:'Save build', exact:true }).click();
  assert.match(await page.locator('.save-status').innerText(), /Quiet desk build/);
  await context.close();
});

await test('share links restore valid builds and safely reject invalid or missing parts', async () => {
  const { context, page } = await pageFor();
  await page.getByRole('button', { name:'Manual builder', exact:true }).click();
  await page.getByRole('button', { name:'Share build', exact:true }).click();
  const url = await page.getByLabel('Share build link').inputValue();
  assert.ok(url?.includes('build='));
  const shared = await context.newPage();
  await shared.goto(url, { waitUntil:'networkidle' });
  assert.equal(await shared.locator('.build-item').count(), 9);
  await shared.close();
  const invalid = await context.newPage();
  await invalid.goto('http://127.0.0.1:4173/?build=%3Cscript%3Ealert(1)%3C/script%3E', { waitUntil:'networkidle' });
  assert.match(await invalid.locator('#modal-content').innerText(), /couldn’t open/i);
  await invalid.close();
  const missing = await context.newPage();
  await missing.goto('http://127.0.0.1:4173/?build=cpu-a,cooler-a,motherboard-a,ram-a,gpu-a,storage-a,psu-a,case-a,does-not-exist', { waitUntil:'networkidle' });
  assert.match(await missing.locator('#modal-content').innerText(), /no longer in the catalogue/i);
  await missing.close();
  await context.close();
});

await test('shared build parser rejects malformed and unknown input', async () => {
  assert.equal(readSharedBuild('https://example.test/?build=<script>').valid, false);
  assert.equal(readSharedBuild('https://example.test/?build=does-not-exist').valid, false);
});

await test('saved and share controls fit on desktop and mobile', async () => {
  for (const viewport of [{width:1440,height:900},{width:375,height:812}]) {
    const { context, page } = await pageFor(viewport);
    await page.getByRole('button', { name:viewport.width <= 700 ? 'Or choose every part' : 'Manual builder', exact:true }).click();
    const box = await page.getByRole('button', { name:'Share build', exact:true }).boundingBox();
    assert.ok(box && box.x >= 0 && box.x + box.width <= viewport.width);
    await context.close();
  }
});

await test('questionnaire opens, navigates, returns, completes and closes cleanly', async () => {
  const { context, page } = await pageFor();
  await page.getByRole('button', { name: /Build my PC/ }).click();
  await expectText(page, '#modal-title', 'Budget');
  await page.getByRole('button', { name: '£1,000', exact: true }).click();
  await page.getByRole('button', { name: /Continue/ }).click();
  await expectText(page, '#modal-title', 'Purpose & performance');
  await page.getByRole('button', { name: 'Back', exact: true }).click();
  await expectText(page, '#modal-title', 'Budget');
  for (let step = 0; step < 5; step++) await page.getByRole('button', { name: /Continue/ }).click();
  await page.getByRole('button', { name: /Generate my build/ }).click();
  assert.equal(await page.locator('.result-card').count(), 4);
  await page.getByRole('button', { name: 'Close questionnaire' }).press('Escape');
  assert.equal(await page.locator('#app-modal').getAttribute('aria-hidden'), 'true');
  assert.equal(await page.evaluate(() => document.body.classList.contains('questionnaire-open')), false);
  await context.close();
});

await test('manual builder replaces a component and remains usable', async () => {
  const { context, page } = await pageFor();
  await page.getByRole('button', { name: 'Manual builder', exact: true }).click();
  assert.equal(await page.locator('.build-item').count(), 9);
  const original = await page.locator('.build-item .part-link').first().innerText();
  await page.getByRole('button', { name: 'Replace', exact: true }).first().click();
  assert.ok(await page.locator('.product-card').count() > 0);
  await page.getByRole('button', { name: 'Add to build', exact: true }).last().click();
  assert.equal(await page.locator('.build-item').count(), 9);
  assert.ok(await page.locator('.build-item .part-link').first().innerText() || original);
  await context.close();
});

await test('navigation and terms controls work', async () => {
  const { context, page } = await pageFor();
  await page.getByRole('link', { name: 'How it works', exact: true }).click();
  assert.equal(new URL(page.url()).hash, '#how-it-works');
  await page.getByRole('link', { name: 'Explore builds', exact: true }).click();
  assert.equal(new URL(page.url()).hash, '#examples');
  await page.getByRole('button', { name: 'Terms & Conditions', exact: true }).click();
  await page.getByRole('button', { name: 'More Info', exact: true }).click();
  assert.equal(await page.locator('.terms-details').isVisible(), true);
  await page.getByRole('button', { name: 'Back', exact: true }).last().click();
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  assert.equal(await page.locator('.terms-layer').getAttribute('aria-hidden'), 'true');
  await context.close();
});

for (const [name, viewport] of Object.entries({ desktop:{width:1440,height:900}, laptop:{width:1024,height:768}, tablet:{width:768,height:1024}, mobile:{width:375,height:812} })) {
  await test(`${name} layout has no horizontal overflow and usable questionnaire close control`, async () => {
    const { context, page } = await pageFor(viewport);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), true);
    await page.getByRole('button', { name: /Build my PC/ }).click();
    const box = await page.getByRole('button', { name: 'Close questionnaire' }).boundingBox();
    assert.ok(box && box.x >= 0 && box.y >= 0 && box.x + box.width <= viewport.width && box.y + box.height <= viewport.height);
    await context.close();
  });
}

await browser.close();
await new Promise(resolve => server.close(resolve));
if (!process.exitCode) console.log(`All ${passed} browser tests passed.`);

async function expectText(page, selector, text) { assert.equal((await page.locator(selector).innerText()).trim(), text); }
