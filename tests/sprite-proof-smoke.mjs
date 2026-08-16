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

try {
  for (const vp of viewports) {
    // Control: the ordinary Build 23 URL must leave the proof layer fully disabled.
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

    // Opt-in proof: load all three authored sprites and replace only presentation draws.
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
      let state = await page.evaluate(() => window.__BRIAR_GLENDebug.getSpriteProofState());
      if (state.failed || !state.requested || !state.enabled || !state.ready) throw new Error(`${vp.name}: proof did not become ready ${JSON.stringify(state)}`);
      if (Object.keys(state.loadedAssets).sort().join(',') !== 'cottage,pine_tree,tall_tree') throw new Error(`${vp.name}: authored asset set incomplete ${JSON.stringify(state.loadedAssets)}`);
      for (const [name, info] of Object.entries(state.loadedAssets)) {
        if (!info.loaded || info.width < 200 || info.height < 200) throw new Error(`${vp.name}: invalid sprite ${name} ${JSON.stringify(info)}`);
      }

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

      console.log(`PASS ${vp.name}: Warden hero-cluster sprite proof active without gameplay mutation`);
      await context.close();
    }
  }
} finally {
  await browser.close();
}
