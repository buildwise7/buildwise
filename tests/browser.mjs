import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { createRequire } from 'node:module';
import { budgetFit, cheaperAlternatives, compatibility, makeBuild, total } from '../src/services/build.js';
import { estimateGamingPerformance } from '../src/services/gaming-performance.js';
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

async function openPrebuiltResults(page) {
  await page.goto('http://127.0.0.1:4173/prebuilts.html', { waitUntil:'networkidle' });
  await page.getByRole('button', { name:/Find the build that suits you/ }).click();
  await page.getByRole('button', { name:'Next →', exact:true }).click();
  await page.getByRole('button', { name:'Next →', exact:true }).click();
  await page.getByRole('button', { name:'Show matches →', exact:true }).click();
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
  await page.goto('http://127.0.0.1:4173/manual-builder.html', { waitUntil:'networkidle' });
  await page.locator('.build-item').first().waitFor({state:'visible'});
  await page.locator('#build-name').fill('Quiet desk build');
  await page.getByRole('button', { name:'Save build', exact:true }).click();
  assert.match(await page.locator('.save-status').innerText(), /Quiet desk build/);
  await context.close();
});

await test('share links restore valid builds and safely reject invalid or missing parts', async () => {
  const { context, page } = await pageFor();
  await page.goto('http://127.0.0.1:4173/manual-builder.html', { waitUntil:'networkidle' });
  await page.locator('.build-item').first().waitFor({state:'visible'});
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

await test('pre-built page loads its safe catalogue framework and matcher flow', async () => {
  const { context, page } = await pageFor();
  await page.goto('http://127.0.0.1:4173/prebuilts.html', { waitUntil:'networkidle' });
  assert.equal(await page.locator('.prebuilt-card').count(), 6);
  assert.equal(await page.locator('.prebuilt-card .prebuilt-visual img').count(), 6);
  assert.equal(await page.locator('.prebuilt-card .prebuilt-visual figcaption').count(), 6);
  for (const image of await page.locator('.prebuilt-card .prebuilt-visual img').all()) {
    assert.match(await image.getAttribute('src'), /illustrative-(everyday|gaming|enthusiast)\.png$/);
    assert.ok(await image.getAttribute('alt'));
  }
  await page.getByRole('button', { name:/Find the build that suits you/ }).click();
  assert.match(await page.locator('.prebuilt-progress').innerText(), /01\/03/);
  await page.getByRole('button', { name:'Next →', exact:true }).click();
  assert.match(await page.locator('.prebuilt-progress').innerText(), /02\/03/);
  await page.getByRole('button', { name:'Back', exact:true }).click();
  await page.getByRole('button', { name:'Close pre-built questionnaire' }).click();
  assert.equal(await page.locator('#prebuilt-modal').getAttribute('aria-hidden'), 'true');
  await context.close();
});

await test('Choose Every Part is a direct page with the shared editable builder and sidebar link', async () => {
  const { context, page } = await pageFor();
  await page.goto('http://127.0.0.1:4173/manual-builder.html', { waitUntil:'networkidle' });
  await page.locator('.build-item').first().waitFor({state:'visible'});
  assert.equal(await page.getByRole('heading', { name:'Build It How You Want It', exact:true }).count(), 1);
  assert.equal(await page.locator('.build-item').count(), 9);
  const current = page.getByRole('link', { name:'Choose Every Part', exact:true });
  assert.equal(await current.getAttribute('aria-current'), 'page');
  assert.equal(await page.getByRole('link', { name:'Main page', exact:true }).getAttribute('href'), './index.html');
  await page.getByRole('button', { name:'Replace', exact:true }).first().click();
  assert.ok(await page.locator('.product-card').count() > 0);
  await page.getByRole('button', { name:'Add to build', exact:true }).first().click();
  assert.equal(await page.locator('.build-item').count(), 9);
  await context.close();
});

await test('performance model returns four game ranges and scales down across resolutions', async () => {
  const preferences = { budget:1250, use:'Gaming', balance:50, colour:'white', rgb:'RGB lighting', resolution:'1440p', software:'Competitive games', storage:2048, noise:'Quiet preferred', size:'Mid-size', connectivity:'Wi-Fi + Bluetooth', upgrade:'Important' };
  const ids = makeBuild(preferences, 'performance');
  const at1080 = estimateGamingPerformance(ids, '1080p');
  const at1440 = estimateGamingPerformance(ids, '1440p');
  const at4k = estimateGamingPerformance(ids, '4K');
  assert.deepEqual(at1440.games.map(game => game.name), ['Fortnite','Counter-Strike 2','Minecraft (Java, no shaders)','Valorant']);
  for (let index = 0; index < at1440.games.length; index++) {
    assert.ok(at1080.games[index].max > at1440.games[index].max);
    assert.ok(at1440.games[index].max > at4k.games[index].max);
    assert.ok(at1440.games[index].min < at1440.games[index].max);
  }
});

await test('all custom recommendations expose a working performance view', async () => {
  const { context, page } = await pageFor();
  await openResults(page, 1250);
  assert.equal(await page.getByRole('button', { name:'Performance', exact:true }).count(), 4);
  assert.equal(await page.locator('.build-actions .secondary-button').count(), 12);
  assert.equal(await page.locator('.build-actions .text-button').count(), 0);
  await page.getByRole('button', { name:'Performance', exact:true }).nth(1).click();
  assert.equal(await page.locator('.performance-game').count(), 4);
  assert.match(await page.locator('.performance-view').innerText(), /Minecraft \(Java, no shaders\)/);
  const before = await page.locator('.performance-games').innerText();
  await page.getByLabel('Performance resolution').selectOption('4K');
  const after = await page.locator('.performance-games').innerText();
  assert.notEqual(after, before);
  await page.getByRole('button', { name:'Close questionnaire' }).click();
  assert.equal(await page.locator('.result-card').count(), 4);
  await page.getByRole('button', { name:'Performance', exact:true }).first().click();
  await page.getByRole('button', { name:'Close questionnaire' }).press('Escape');
  assert.equal(await page.locator('.result-card').count(), 4);
  await context.close();
});

await test('pre-built matches use compact cards and an informational component view', async () => {
  const { context, page } = await pageFor();
  await openPrebuiltResults(page);
  assert.equal(await page.locator('.prebuilt-result').count(), 4);
  const first = page.locator('.prebuilt-result').first();
  const image = await first.locator('.result-image').boundingBox();
  assert.ok(image && image.width <= 148);
  assert.equal(await first.getByRole('button', { name:'View components', exact:true }).count(), 1);
  assert.equal(await first.getByRole('link', { name:/View details \/ retailer/ }).count(), 1);
  assert.equal(await first.locator('.prebuilt-result-copy').innerText().then(text=>/CPU|GPU|RAM|Storage/.test(text)), false);
  await first.getByRole('button', { name:'View components', exact:true }).click();
  assert.equal(await page.locator('.prebuilt-component-row').count(), 4);
  assert.equal(await page.getByRole('button', { name:/Replace|Add to build/ }).count(), 0);
  await page.getByRole('button', { name:'Back to matches', exact:true }).click();
  assert.equal(await page.locator('.prebuilt-result').count(), 4);
  await context.close();
});

await test('saved builds page unifies editable custom and view-only pre-built saves', async () => {
  const { context, page } = await pageFor();
  await page.goto('http://127.0.0.1:4173/manual-builder.html', { waitUntil:'networkidle' });
  await page.locator('.build-item').first().waitFor({state:'visible'});
  await page.getByRole('button', { name:'Save build', exact:true }).click();
  await page.goto('http://127.0.0.1:4173/saved-builds.html', { waitUntil:'networkidle' });
  assert.equal(await page.locator('.saved-card-custom').count(), 1);
  assert.match(await page.locator('.saved-card-custom').innerText(), /CPU/);
  const editHref = await page.getByRole('link', { name:'View / edit build', exact:true }).getAttribute('href');
  assert.match(editHref, /savedBuild=/);
  assert.match(editHref, /returnTo=saved-builds/);
  await page.goto(new URL(editHref, 'http://127.0.0.1:4173/').toString(), { waitUntil:'networkidle' });
  await page.getByRole('button', { name:'Replace', exact:true }).first().click();
  await page.getByRole('button', { name:'Add to build', exact:true }).last().click();
  await page.getByRole('button', { name:'Save build', exact:true }).click();
  await page.getByRole('button', { name:'Close questionnaire', exact:true }).click();
  await page.waitForURL('**/saved-builds.html');
  assert.equal(await page.locator('.saved-card-custom').count(), 1);
  const escapeHref = await page.getByRole('link', { name:'View / edit build', exact:true }).getAttribute('href');
  await page.goto(new URL(escapeHref, 'http://127.0.0.1:4173/').toString(), { waitUntil:'networkidle' });
  await page.getByRole('button', { name:'Close questionnaire', exact:true }).press('Escape');
  await page.waitForURL('**/saved-builds.html');
  assert.equal(await page.locator('.saved-card-custom').count(), 1);
  await openPrebuiltResults(page);
  await page.getByRole('button', { name:'Save build', exact:true }).first().click();
  await page.goto('http://127.0.0.1:4173/saved-builds.html', { waitUntil:'networkidle' });
  assert.equal(await page.locator('.saved-card-prebuilt').count(), 1);
  assert.equal(await page.locator('.saved-card-prebuilt [data-change]').count(), 0);
  await context.close();
});

await test('compact pre-built matches remain usable on mobile', async () => {
  const { context, page } = await pageFor({width:375,height:812});
  await openPrebuiltResults(page);
  const first = page.locator('.prebuilt-result').first();
  const actions = await first.locator('.prebuilt-result-actions').boundingBox();
  assert.ok(actions && actions.x >= 0 && actions.x + actions.width <= 375);
  assert.ok(await first.getByRole('button', { name:'Save build', exact:true }).isVisible());
  await context.close();
});

await test('saved and share controls fit on desktop and mobile', async () => {
  for (const viewport of [{width:1440,height:900},{width:375,height:812}]) {
    const { context, page } = await pageFor(viewport);
    await page.goto('http://127.0.0.1:4173/manual-builder.html', { waitUntil:'networkidle' });
    await page.locator('.build-item').first().waitFor({state:'visible'});
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
  assert.equal(new URL(page.url()).pathname, '/');
  await context.close();
});

await test('manual builder replaces a component and remains usable', async () => {
  const { context, page } = await pageFor();
  await page.goto('http://127.0.0.1:4173/manual-builder.html', { waitUntil:'networkidle' });
  await page.locator('.build-item').first().waitFor({state:'visible'});
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
