import { chromium } from 'playwright';

const target = process.argv[2] || 'http://127.0.0.1:4173/';
const live = process.argv.includes('--live');
const viewports = [
  { name: 'phone-landscape', width: 932, height: 430, touch: true },
  { name: 'phone-portrait', width: 430, height: 932, touch: true },
  { name: 'desktop', width: 1440, height: 900, touch: false },
];
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const browser = await chromium.launch({ headless:true });

async function signature(page) {
  return page.evaluate(() => {
    const canvas = document.getElementById('game');
    const ctx = canvas.getContext('2d');
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    const stride = Math.max(4, Math.floor((canvas.width * canvas.height) / 20000)) * 4;
    let hash = 2166136261 >>> 0;
    const colors = new Set();
    for (let i = 0; i < data.length; i += stride) {
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
    const context = await browser.newContext({ viewport:{ width:vp.width, height:vp.height }, hasTouch:vp.touch, deviceScaleFactor:1 });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(`pageerror: ${error.message}`));
    page.on('console', msg => { if (msg.type() === 'error') errors.push(`console: ${msg.text()}`); });

    let loaded = false, lastError;
    for (let attempt=1; attempt <= (live ? 48 : 1); attempt++) {
      try {
        const sep = target.includes('?') ? '&' : '?';
        // Historical Build 19 biome-art recovery proof. Build 47 owns the normal-play ground
        // renderer, so validate the original Grove/Fen layer against the exact Build 46 rollback.
        await page.goto(`${target}${sep}sourceArt47=0&biome19=${Date.now()}-${attempt}`, { waitUntil:'domcontentloaded', timeout:15000 });
        await page.waitForFunction(() => Boolean(window.__BRIAR_GLENDebug?.getBiomeArtState && window.__BRIAR_GLENDebug?.getBuildInfo), { timeout:7000 });
        loaded = true; break;
      } catch (error) {
        lastError = error;
        if (live && attempt < 48) await sleep(5000);
      }
    }
    if (!loaded) throw new Error(`${vp.name}: Build 19 biome art runtime unavailable: ${lastError?.message || 'unknown'}`);

    const build = await page.evaluate(() => window.__BRIAR_GLENDebug.getBuildInfo());
    if (Number(build.version) < 19 || build.saveKey !== 'briar-glen-vslice-v1') {
      throw new Error(`${vp.name}: Build 19+ metadata unavailable ${JSON.stringify(build)}`);
    }

    await page.evaluate(() => {
      const d=window.__BRIAR_GLENDebug;
      d.setBiomeArtEnabled(true);
      d.teleport(520,-700);
    });
    await sleep(230);
    let state = await page.evaluate(() => window.__BRIAR_GLENDebug.getBiomeArtState());
    const baselineEntities = { ...state.entityCounts };
    if (state.style !== 'storybook-biomes-v1' || state.groveMarkCount < 130 || state.fenMarkCount < 160) {
      throw new Error(`${vp.name}: biome detail budget incorrect ${JSON.stringify(state)}`);
    }
    if (state.zone !== 'MOONCAP GROVE' || state.frame.groveGround < 15 || state.frame.groveObjects < 2 || state.frame.groveResources < 1 || state.frame.groveEnemies < 1 || state.frame.ambient < 2) {
      throw new Error(`${vp.name}: Mooncap Grove visual identity incomplete ${JSON.stringify(state.frame)}`);
    }
    const groveOn = await signature(page);
    const groveFrames = state.frames;
    await page.waitForFunction(before => window.__BRIAR_GLENDebug.getBiomeArtState().frames >= before + 5, groveFrames, { timeout:3000 });
    state = await page.evaluate(() => window.__BRIAR_GLENDebug.getBiomeArtState());
    if (state.frames - groveFrames < 5) throw new Error(`${vp.name}: Grove renderer cadence stalled`);
    if (JSON.stringify(state.entityCounts) !== JSON.stringify(baselineEntities)) throw new Error(`${vp.name}: Grove renderer mutated entities`);

    await page.evaluate(() => window.__BRIAR_GLENDebug.setBiomeArtEnabled(false));
    await sleep(120);
    const groveOffState = await page.evaluate(() => window.__BRIAR_GLENDebug.getBiomeArtState());
    const groveOff = await signature(page);
    if (groveOffState.frame.groveGround !== 0 || groveOffState.frame.groveObjects !== 0 || groveOffState.frame.groveEnemies !== 0 || groveOffState.frame.ambient !== 0) {
      throw new Error(`${vp.name}: Grove art debug disable did not cleanly fall through ${JSON.stringify(groveOffState.frame)}`);
    }
    if (groveOn.hash === groveOff.hash) throw new Error(`${vp.name}: Grove art produced no measurable Canvas delta`);

    await page.evaluate(() => {
      const d=window.__BRIAR_GLENDebug;
      d.setBiomeArtEnabled(true);
      d.setProgress({ fenCrossingOpened:true, fenDiscovered:true });
      d.teleport(1510,-1710);
    });
    await sleep(230);
    state = await page.evaluate(() => window.__BRIAR_GLENDebug.getBiomeArtState());
    if (state.zone !== 'MOSSWATER FEN' || state.frame.fenGround < 15 || state.frame.fenObjects < 2 || state.frame.fenResources < 1 || state.frame.fenEnemies < 2 || state.frame.ambient < 2) {
      throw new Error(`${vp.name}: Mosswater Fen visual identity incomplete ${JSON.stringify(state.frame)}`);
    }
    const fenOn = await signature(page);
    const fenFrames = state.frames;
    await page.waitForFunction(before => window.__BRIAR_GLENDebug.getBiomeArtState().frames >= before + 5, fenFrames, { timeout:3000 });
    state = await page.evaluate(() => window.__BRIAR_GLENDebug.getBiomeArtState());
    if (state.frames - fenFrames < 5) throw new Error(`${vp.name}: Fen renderer cadence stalled`);
    if (JSON.stringify(state.entityCounts) !== JSON.stringify(baselineEntities)) throw new Error(`${vp.name}: Fen renderer mutated entities`);

    await page.evaluate(() => window.__BRIAR_GLENDebug.setBiomeArtEnabled(false));
    await sleep(120);
    const fenOffState = await page.evaluate(() => window.__BRIAR_GLENDebug.getBiomeArtState());
    const fenOff = await signature(page);
    if (fenOffState.frame.fenGround !== 0 || fenOffState.frame.fenObjects !== 0 || fenOffState.frame.fenEnemies !== 0 || fenOffState.frame.ambient !== 0) {
      throw new Error(`${vp.name}: Fen art debug disable did not cleanly fall through ${JSON.stringify(fenOffState.frame)}`);
    }
    if (fenOn.hash === fenOff.hash) throw new Error(`${vp.name}: Fen art produced no measurable Canvas delta`);

    await page.evaluate(() => {
      const d=window.__BRIAR_GLENDebug;
      d.setCameraShake(12);
    });
    await sleep(40);
    const feedbackAfter = await page.evaluate(() => window.__BRIAR_GLENDebug.getFeedbackTuningState());
    if (feedbackAfter.renderedAmplitude > 1.55 || Math.hypot(feedbackAfter.frameX, feedbackAfter.frameY) > 1.95) {
      throw new Error(`${vp.name}: biome art regressed gentler feedback ${JSON.stringify(feedbackAfter)}`);
    }
    await page.evaluate(() => { window.__BRIAR_GLENDebug.setCameraShake(0); window.__BRIAR_GLENDebug.setBiomeArtEnabled(true); });

    const overflow = await page.evaluate(() => ({ sw:document.documentElement.scrollWidth, iw:innerWidth, sh:document.documentElement.scrollHeight, ih:innerHeight }));
    if (overflow.sw > overflow.iw + 1 || overflow.sh > overflow.ih + 1) throw new Error(`${vp.name}: biome art caused browser overflow ${JSON.stringify(overflow)}`);
    if (errors.length) throw new Error(`${vp.name}: runtime errors:\n${errors.join('\n')}`);

    console.log(`PASS ${vp.name}: Mooncap Grove + Mosswater Fen biome art active with healthy cadence and gentle feedback preserved`);
    await context.close();
  }
} finally {
  await browser.close();
}
