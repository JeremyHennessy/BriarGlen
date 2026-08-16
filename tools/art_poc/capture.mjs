import { chromium } from 'playwright';

const url = process.argv[2] || 'http://127.0.0.1:4174/tools/art_poc/preview.html';
const output = process.argv[3] || 'tools/art_poc/generated/browser-preview.png';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 820 }, deviceScaleFactor: 1 });
const errors = [];
page.on('console', (message) => {
  if (message.type() === 'error') errors.push(message.text());
});
page.on('pageerror', (error) => errors.push(error.message));

await page.goto(url, { waitUntil: 'networkidle' });
await page.waitForFunction(() => window.__ART_POC_READY__ === true || Boolean(window.__ART_POC_ERROR__), null, { timeout: 30000 });
const state = await page.evaluate(() => ({ ready: window.__ART_POC_READY__ === true, error: window.__ART_POC_ERROR__ || null }));
if (!state.ready) throw new Error(`Art POC did not become ready: ${state.error || 'unknown error'}`);
if (errors.length) throw new Error(`Browser errors: ${errors.join(' | ')}`);

const canvas = page.locator('#scene');
const box = await canvas.boundingBox();
if (!box || box.width < 500 || box.height < 300) throw new Error('Preview canvas is missing or unexpectedly small');
await page.screenshot({ path: output, fullPage: true });

console.log(JSON.stringify({ url, output, canvas: box, status: 'PASS' }, null, 2));
await browser.close();
