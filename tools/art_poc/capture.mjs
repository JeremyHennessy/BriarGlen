import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const url = process.argv[2] || 'http://127.0.0.1:4174/tools/art_poc/preview.html';
const output = process.argv[3] || 'tools/art_poc/generated/browser-proof.png';

const outDir = path.dirname(output);
fs.mkdirSync(outDir, { recursive: true });
const gameplayOutput = path.join(outDir, 'gameplay-scale-proof.png');
const comparisonOutput = path.join(outDir, 'comparison-proof.png');

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({
  viewport: { width: 1440, height: 1000 },
  deviceScaleFactor: 1,
});

const errors = [];
page.on('console', (message) => {
  if (message.type() === 'error') errors.push(message.text());
});
page.on('pageerror', (error) => errors.push(error.message));

await page.goto(url, { waitUntil: 'networkidle' });
await page.waitForFunction(
  () => window.__BUILD24_ART_READY__ === true || Boolean(window.__BUILD24_ART_ERROR__),
  null,
  { timeout: 45000 },
);

const state = await page.evaluate(() => ({
  ready: window.__BUILD24_ART_READY__ === true,
  error: window.__BUILD24_ART_ERROR__ || null,
  report: window.__BUILD24_ART_REPORT__ || null,
  rawScene: {
    width: document.getElementById('raw-scene')?.naturalWidth || 0,
    height: document.getElementById('raw-scene')?.naturalHeight || 0,
  },
  rawSheet: {
    width: document.getElementById('raw-sheet')?.naturalWidth || 0,
    height: document.getElementById('raw-sheet')?.naturalHeight || 0,
  },
}));

if (!state.ready) throw new Error(`Build 24 art preview did not become ready: ${state.error || 'unknown error'}`);
if (errors.length) throw new Error(`Browser errors: ${errors.join(' | ')}`);
if (!state.report || state.report.targetCount !== 7) {
  throw new Error(`Expected seven target assets, got ${JSON.stringify(state.report)}`);
}
if (state.report.productionGameModified !== false) {
  throw new Error('Preview report does not preserve the no-runtime-integration constraint');
}
if (state.rawScene.width !== 1280 || state.rawScene.height !== 720) {
  throw new Error(`Unexpected composed scene dimensions: ${JSON.stringify(state.rawScene)}`);
}
if (state.rawSheet.width !== 1280 || state.rawSheet.height !== 720) {
  throw new Error(`Unexpected asset sheet dimensions: ${JSON.stringify(state.rawSheet)}`);
}

async function canvasAudit(selector, minWidth, minHeight, minColors) {
  const locator = page.locator(selector);
  const box = await locator.boundingBox();
  if (!box || box.width < minWidth || box.height < minHeight) {
    throw new Error(`${selector} missing or unexpectedly small: ${JSON.stringify(box)}`);
  }

  const audit = await locator.evaluate((canvas) => {
    const ctx = canvas.getContext('2d');
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    const colors = new Set();
    let opaqueSamples = 0;
    const stride = Math.max(4, Math.floor((canvas.width * canvas.height) / 16000) * 4);
    for (let i = 0; i < data.length; i += stride) {
      const a = data[i + 3];
      if (a > 0) opaqueSamples += 1;
      colors.add(`${data[i]},${data[i + 1]},${data[i + 2]},${a}`);
      if (colors.size > 400) break;
    }
    return { colors: colors.size, opaqueSamples, width: canvas.width, height: canvas.height };
  });

  if (audit.colors < minColors || audit.opaqueSamples < 20) {
    throw new Error(`${selector} looks blank or too uniform: ${JSON.stringify(audit)}`);
  }
  return { box, audit };
}

const gameplay = await canvasAudit('#scene', 900, 450, 30);
const comparison = await canvasAudit('#comparison', 900, 400, 20);

await page.screenshot({ path: output, fullPage: true });
await page.locator('#scene').screenshot({ path: gameplayOutput });
await page.locator('#comparison').screenshot({ path: comparisonOutput });

console.log(JSON.stringify({
  url,
  status: 'PASS',
  report: state.report,
  gameplay,
  comparison,
  outputs: {
    fullPage: output,
    gameplay: gameplayOutput,
    comparison: comparisonOutput,
  },
}, null, 2));

await browser.close();
