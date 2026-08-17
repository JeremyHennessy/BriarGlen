import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const target = process.argv[2] || 'http://127.0.0.1:4173/';
const viewports = [
  { name:'phone-landscape', width:932, height:430, touch:true },
  { name:'phone-portrait', width:430, height:932, touch:true },
  { name:'desktop', width:1440, height:900, touch:false },
];
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const artifactDir = path.resolve('test-artifacts/build24-1');
fs.mkdirSync(artifactDir, { recursive:true });
const browser = await chromium.launch({ headless:true });

function withParam(url, key, value) {
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}${key}=${encodeURIComponent(value)}`;
}

async function assertBrowserPaintsSources(page, vpName) {
  const report = await page.evaluate(async () => {
    const paths = [
      'assets/v24/cottage-authored.webp',
      'assets/v24/tall-tree-authored.webp',
      'assets/v24/pine-tree-authored.webp',
    ];
    const out = {};
    for (const src of paths) {
      const image = new Image();
      image.src = `${src}?decode-control=${Date.now()}-${Math.random()}`;
      await image.decode();
      const c = document.createElement('canvas');
      c.width = 160; c.height = 160;
      const g = c.getContext('2d');
      const x = (160 - image.naturalWidth) / 2;
      const y = (160 - image.naturalHeight) / 2;
      g.clearRect(0,0,160,160);
      g.drawImage(image,x,y);
      const patch = g.getImageData(74,74,12,12).data;
      let alpha = 0;
      let rgb = 0;
      let visible = 0;
      for (let i=0;i<patch.length;i+=4) {
        rgb += patch[i] + patch[i+1] + patch[i+2];
        alpha += patch[i+3];
        if (patch[i+3] > 32) visible += 1;
      }
      out[src] = { width:image.naturalWidth, height:image.naturalHeight, alpha, rgb, visible };
    }
    return out;
  });
  for (const [src, info] of Object.entries(report)) {
    if (info.width < 64 || info.height < 64 || info.visible < 20 || info.alpha < 3000 || info.rgb < 1000) {
      throw new Error(`${vpName}: Chromium source decode/paint failed ${src} ${JSON.stringify(info)}`);
    }
  }
  return report;
}

try {
  for (const vp of viewports) {
    // Control: ordinary Build 23 path remains unchanged and does not request authored files.
    {
      const context = await browser.newContext({ viewport:{ width:vp.width, height:vp.height }, hasTouch:vp.touch, deviceScaleFactor:1 });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(`pageerror: ${error.message}`));
      page.on('console', msg => { if (msg.type() === 'error') errors.push(`console: ${msg.text()}`); });
      await page.goto(withParam(target, 'proofControl', `${Date.now()}-${vp.name}`), { waitUntil:'domcontentloaded', timeout:15000 });
      await page.waitForFunction(() => Boolean(window.__BRIAR_GLENDebug?.getSpriteProofState), { timeout:7000 });
      const state = await page.evaluate(() => window.__BRIAR_GLENDebug.getSpriteProofState());
      if (state.requested || state.enabled || !state.ready || state.draws !== 0 || Object.keys(state.loadedAssets).length !== 0) {
        throw new Error(`${vp.name}: default path did not remain Build 23 Canvas mode ${JSON.stringify(state)}`);
      }
      if (JSON.stringify(state.baseline) !== JSON.stringify(state.current)) throw new Error(`${vp.name}: disabled proof mutated entities`);
      if (errors.length) throw new Error(`${vp.name}: default-path runtime errors:\n${errors.join('\n')}`);
      await context.close();
    }

    // Opt-in proof: prove source bytes paint in Chromium before testing the world renderer.
    {
      const context = await browser.newContext({ viewport:{ width:vp.width, height:vp.height }, hasTouch:vp.touch, deviceScaleFactor:1 });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(`pageerror: ${error.message}`));
      page.on('console', msg => { if (msg.type() === 'error') errors.push(`console: ${msg.text()}`); });
      let url = withParam(target, 'spriteProof', '1');
      url = withParam(url, 'proofRun', `${Date.now()}-${vp.name}`);
      await page.goto(url, { waitUntil:'domcontentloaded', timeout:15000 });
      await page.waitForFunction(() => Boolean(window.__BRIAR_GLENDebug?.getSpriteProofState), { timeout:7000 });
      await page.waitForFunction(() => {
        const state = window.__BRIAR_GLENDebug.getSpriteProofState();
        return state.ready || state.failed;
      }, { timeout:7000 });

      const decodeReport = await assertBrowserPaintsSources(page, vp.name);
      let state = await page.evaluate(() => window.__BRIAR_GLENDebug.getSpriteProofState());
      if (state.failed || !state.requested || !state.enabled || !state.ready) throw new Error(`${vp.name}: proof did not become ready ${JSON.stringify(state)}`);
      if (Object.keys(state.loadedAssets).sort().join(',') !== 'cottage,pine_tree,tall_tree') throw new Error(`${vp.name}: authored asset set incomplete ${JSON.stringify(state.loadedAssets)}`);
      for (const [name, info] of Object.entries(state.loadedAssets)) {
        if (!info.loaded || info.width < 64 || info.height < 64 || !String(info.src).endsWith('.webp')) throw new Error(`${vp.name}: invalid WebP sprite ${name} ${JSON.stringify(info)}`);
      }
      if (!Array.isArray(state.heroTreeTargets) || state.heroTreeTargets.length !== 2) {
        throw new Error(`${vp.name}: hero cluster must target exactly two authored trees ${JSON.stringify(state.heroTreeTargets)}`);
      }
      const targetAssets = state.heroTreeTargets.map(target => target.asset).sort().join(',');
      if (targetAssets !== 'pine_tree,tall_tree') throw new Error(`${vp.name}: hero tree family incorrect ${JSON.stringify(state.heroTreeTargets)}`);

      await page.evaluate(() => window.__BRIAR_GLENDebug.teleport(-575, -330));
      await sleep(500);
      state = await page.evaluate(() => window.__BRIAR_GLENDebug.getSpriteProofState());
      if (state.draws < 1 || state.replacements.cottage < 1) throw new Error(`${vp.name}: authored cottage sprite was not drawn in Briar Glen ${JSON.stringify(state)}`);
      if ((state.replacements.tall_tree || 0) + (state.replacements.pine_tree || 0) < 1) throw new Error(`${vp.name}: hero-cluster tree sprite was not drawn ${JSON.stringify(state)}`);
      const wardenSite = state.drawSites?.['cottage:-575,-365'];
      if (!wardenSite || wardenSite.asset !== 'cottage' || wardenSite.draws < 1) throw new Error(`${vp.name}: Warden House authored draw site missing ${JSON.stringify(state.drawSites)}`);
      if (wardenSite.screen.x < -30 || wardenSite.screen.x > vp.width + 30 || wardenSite.screen.y < -30 || wardenSite.screen.y > vp.height + 30) {
        throw new Error(`${vp.name}: Warden House authored sprite anchored outside viewport ${JSON.stringify(wardenSite)}`);
      }
      if (wardenSite.size.w < 100 || wardenSite.size.w > 185 || wardenSite.size.h < 100 || wardenSite.size.h > 185) {
        throw new Error(`${vp.name}: Warden House authored scale escaped tuned range ${JSON.stringify(wardenSite)}`);
      }
      const treeSites = Object.entries(state.drawSites).filter(([key]) => key.startsWith('tree:')).map(([,site]) => site);
      if (treeSites.length < 1 || treeSites.length > 2) throw new Error(`${vp.name}: hero tree density escaped tuned range ${JSON.stringify(treeSites)}`);
      if (treeSites.some(site => site.size.w > 145 || site.size.h > 145)) throw new Error(`${vp.name}: authored tree scale too dominant ${JSON.stringify(treeSites)}`);
      if (JSON.stringify(state.baseline) !== JSON.stringify(state.current)) throw new Error(`${vp.name}: sprite proof mutated gameplay entities ${JSON.stringify(state)}`);

      const offState = await page.evaluate(() => {
        const d = window.__BRIAR_GLENDebug;
        d.setSpriteProofEnabled(false);
        return d.getSpriteProofState();
      });
      const drawsAtDisable = offState.draws;
      if (offState.enabled) throw new Error(`${vp.name}: proof toggle-off did not disable renderer ${JSON.stringify(offState)}`);
      await sleep(180);
      state = await page.evaluate(() => window.__BRIAR_GLENDebug.getSpriteProofState());
      if (state.enabled || state.draws !== drawsAtDisable) throw new Error(`${vp.name}: proof toggle-off did not restore prior renderer ${JSON.stringify(state)}`);

      await page.evaluate(() => window.__BRIAR_GLENDebug.setSpriteProofEnabled(true));
      await sleep(220);
      state = await page.evaluate(() => window.__BRIAR_GLENDebug.getSpriteProofState());
      if (!state.enabled || state.draws <= drawsAtDisable) throw new Error(`${vp.name}: proof toggle-on did not resume authored draws ${JSON.stringify(state)}`);
      if (JSON.stringify(state.baseline) !== JSON.stringify(state.current)) throw new Error(`${vp.name}: re-enabled proof mutated gameplay entities`);

      await page.screenshot({ path:path.join(artifactDir, `${vp.name}.png`), fullPage:false });
      const overflow = await page.evaluate(() => ({ sw:document.documentElement.scrollWidth, iw:innerWidth, sh:document.documentElement.scrollHeight, ih:innerHeight }));
      if (overflow.sw > overflow.iw + 1 || overflow.sh > overflow.ih + 1) throw new Error(`${vp.name}: sprite proof caused browser overflow ${JSON.stringify(overflow)}`);
      if (errors.length) throw new Error(`${vp.name}: proof runtime errors:\n${errors.join('\n')}`);

      console.log(`PASS ${vp.name}: tuned WebP hero cluster active without gameplay mutation ${JSON.stringify(decodeReport)}`);
      await context.close();
    }
  }
} finally {
  await browser.close();
}
