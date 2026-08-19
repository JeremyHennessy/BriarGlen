import { chromium } from 'playwright';

const target = process.argv[2] || 'http://127.0.0.1:4173/';
const live = process.argv.includes('--live');
const viewports = [
  { name: 'phone-landscape', width: 932, height: 430, touch: true },
  { name: 'phone-portrait', width: 430, height: 932, touch: true },
  { name: 'desktop', width: 1440, height: 900, touch: false },
];
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const browser = await chromium.launch({ headless: true });

async function canvasSignature(page) {
  return page.evaluate(() => {
    const canvas = document.getElementById('game');
    const ctx = canvas.getContext('2d');
    const w = canvas.width, h = canvas.height;
    const data = ctx.getImageData(0, 0, w, h).data;
    const step = Math.max(4, Math.floor((w*h) / 18000)) * 4;
    let hash = 2166136261 >>> 0;
    const colors = new Set();
    for (let i = 0; i < data.length; i += step) {
      const r=data[i], g=data[i+1], b=data[i+2], a=data[i+3];
      hash ^= r; hash = Math.imul(hash, 16777619) >>> 0;
      hash ^= g; hash = Math.imul(hash, 16777619) >>> 0;
      hash ^= b; hash = Math.imul(hash, 16777619) >>> 0;
      colors.add(`${r>>3},${g>>3},${b>>3},${a>>5}`);
    }
    return { hash, colors: colors.size };
  });
}

try {
  for (const vp of viewports) {
    const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, hasTouch: vp.touch, deviceScaleFactor: 1 });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(`pageerror: ${error.message}`));
    page.on('console', msg => { if (msg.type() === 'error') errors.push(`console: ${msg.text()}`); });

    let loaded = false, lastError;
    for (let attempt=1; attempt <= (live ? 48 : 1); attempt++) {
      try {
        const sep = target.includes('?') ? '&' : '?';
        await page.goto(`${target}${sep}art16=${Date.now()}-${attempt}`, { waitUntil:'domcontentloaded', timeout:15000 });
        await page.waitForFunction(() => Boolean(window.__BRIAR_GLENDebug?.getArtState && window.__BRIAR_GLENDebug?.getBuildInfo), { timeout:7000 });
        loaded=true; break;
      } catch (error) {
        lastError=error;
        if (live && attempt<48) await sleep(5000);
      }
    }
    if (!loaded) throw new Error(`${vp.name}: Build 16+ art runtime unavailable: ${lastError?.message || 'unknown'}`);

    const build = await page.evaluate(() => window.__BRIAR_GLENDebug.getBuildInfo());
    if (!(Number.parseFloat(build.version) >= 16) || build.saveKey !== 'briar-glen-vslice-v1') {
      throw new Error(`${vp.name}: incorrect Build 16+ metadata ${JSON.stringify(build)}`);
    }

    await page.evaluate(() => {
      const d=window.__BRIAR_GLENDebug;
      d.setArtEnabled(true);
      d.teleport(-625, 30);
    });
    await sleep(250);
    let art = await page.evaluate(() => window.__BRIAR_GLENDebug.getArtState());
    const entityCounts = { ...art.current };
    if (art.slice !== 'BRIAR GLEN + MEADOW ROAD' || art.style !== 'warm-storybook-v1') throw new Error(`${vp.name}: art slice identity incorrect ${JSON.stringify(art)}`);
    if (art.detailCount < 140 || art.lightSourceCount < 8) throw new Error(`${vp.name}: art world detail budget unexpectedly low ${JSON.stringify(art)}`);
    if (art.frame.groundDetails < 12 || art.frame.lightPools < 2 || art.frame.customObjects < 4 || art.frame.playerAccents < 1) {
      throw new Error(`${vp.name}: Briar Glen visual layer not rendering enough authored detail ${JSON.stringify(art.frame)}`);
    }

    const onSignature = await canvasSignature(page);
    const framesBefore = art.frames;
    await page.waitForFunction(before => window.__BRIAR_GLENDebug.getArtState().frames >= before + 5, framesBefore, { timeout: 3000 });
    art = await page.evaluate(() => window.__BRIAR_GLENDebug.getArtState());
    if (art.frames - framesBefore < 5) throw new Error(`${vp.name}: render cadence stalled with art enabled: ${art.frames-framesBefore} frames`);
    if (JSON.stringify(art.current) !== JSON.stringify(entityCounts)) throw new Error(`${vp.name}: art pass mutated gameplay entity counts during render ${JSON.stringify({before:entityCounts,after:art.current})}`);

    await page.evaluate(() => window.__BRIAR_GLENDebug.setArtEnabled(false));
    await sleep(120);
    const offState = await page.evaluate(() => window.__BRIAR_GLENDebug.getArtState());
    const offSignature = await canvasSignature(page);
    if (offState.frame.customObjects !== 0 || offState.frame.groundDetails !== 0 || offState.frame.playerAccents !== 0) {
      throw new Error(`${vp.name}: debug art disable did not cleanly return to prior renderer ${JSON.stringify(offState.frame)}`);
    }
    if (JSON.stringify(offState.current) !== JSON.stringify(entityCounts)) throw new Error(`${vp.name}: art disable mutated gameplay entities`);
    if (onSignature.hash === offSignature.hash) throw new Error(`${vp.name}: art layer produced no measurable canvas difference`);

    await page.evaluate(() => window.__BRIAR_GLENDebug.setArtEnabled(true));
    await sleep(120);
    const reenabled = await page.evaluate(() => window.__BRIAR_GLENDebug.getArtState());
    if (reenabled.frame.customObjects < 4 || reenabled.frame.playerAccents < 1) throw new Error(`${vp.name}: art layer did not restore after toggle`);

    await page.evaluate(() => window.__BRIAR_GLENDebug.teleport(320, 120));
    await sleep(180);
    const meadow = await page.evaluate(() => window.__BRIAR_GLENDebug.getArtState());
    if (meadow.frame.groundDetails < 8 || meadow.frame.customResources < 1 || meadow.frame.playerAccents < 1) {
      throw new Error(`${vp.name}: Meadow Road art slice incomplete ${JSON.stringify(meadow.frame)}`);
    }

    const bodyWidth = await page.evaluate(() => ({ sw:document.documentElement.scrollWidth, iw:innerWidth, sh:document.documentElement.scrollHeight, ih:innerHeight }));
    if (bodyWidth.sw > bodyWidth.iw + 1 || bodyWidth.sh > bodyWidth.ih + 1) throw new Error(`${vp.name}: visual layer caused browser overflow ${JSON.stringify(bodyWidth)}`);
    if (errors.length) throw new Error(`${vp.name}: runtime errors:\n${errors.join('\n')}`);

    console.log(`PASS ${vp.name}: Briar Glen + Meadow Road storybook art slice active without gameplay mutation`);
    await context.close();
  }
} finally {
  await browser.close();
}
