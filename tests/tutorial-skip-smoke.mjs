import { chromium } from 'playwright';

const target = process.argv[2] || 'http://127.0.0.1:4173/';
const viewports = [
  { name:'compact-landscape', width:667, height:375 },
  { name:'phone-landscape', width:844, height:390 },
  { name:'compact-portrait', width:375, height:667 },
  { name:'phone-portrait', width:390, height:844 },
];
const browser = await chromium.launch({ headless:true });
const inside = (box, vp) => box && box.x >= -1 && box.y >= -1 && box.x + box.width <= vp.width + 1 && box.y + box.height <= vp.height + 1;

try {
  for (const vp of viewports) {
    const context = await browser.newContext({ viewport:{width:vp.width,height:vp.height}, hasTouch:true });
    await context.addInitScript(() => {
      if (sessionStorage.getItem('briar-glen-tutorial-skip-test-clean') === '1') return;
      localStorage.removeItem('briar-glen-vslice-v1');
      localStorage.removeItem('briar-glen-onboarding-v1');
      localStorage.removeItem('briar-glen-context-guide-v37');
      sessionStorage.setItem('briar-glen-tutorial-skip-test-clean','1');
    });
    const page = await context.newPage();
    await page.goto(`${target}${target.includes('?')?'&':'?'}onboarding37=1&build40=${Date.now()}-${vp.name}`, { waitUntil:'domcontentloaded', timeout:15000 });
    await page.waitForFunction(() => window.__BRIAR_GLENDebug?.getContextualOnboardingState?.().active === 'move', null, { timeout:7000 });

    const prompt = page.locator('#onboarding37-prompt');
    const skip = page.locator('#onboarding37-skip');
    if (!(await prompt.isVisible()) || !(await skip.isVisible())) throw new Error(`${vp.name}: tutorial or Skip tips is not visible`);
    if (!inside(await prompt.boundingBox(), vp) || !inside(await skip.boundingBox(), vp)) throw new Error(`${vp.name}: tutorial or Skip tips is outside viewport`);

    await skip.click();
    await page.waitForFunction(() => document.getElementById('onboarding37-prompt')?.hidden === true);
    let state = await page.evaluate(() => ({ contextual:window.__BRIAR_GLENDebug.getContextualOnboardingState(), legacy:window.__BRIAR_GLENDebug.getOnboardingState() }));
    if (!state.contextual.skipped || state.contextual.active || !state.legacy.guide.skipped) throw new Error(`${vp.name}: skip did not close both tutorial layers ${JSON.stringify(state)}`);

    await page.reload({ waitUntil:'domcontentloaded' });
    await page.waitForFunction(() => window.__BRIAR_GLENDebug?.getContextualOnboardingState);
    state = await page.evaluate(() => window.__BRIAR_GLENDebug.getContextualOnboardingState());
    if (!state.skipped || state.active || await prompt.isVisible()) throw new Error(`${vp.name}: skipped tutorial returned after reload ${JSON.stringify(state)}`);
    console.log(`PASS ${vp.name}: tutorial visible, Skip tips reachable, dismissal persists`);
    await context.close();

    const returning = await browser.newContext({ viewport:{width:vp.width,height:vp.height}, hasTouch:true });
    await returning.addInitScript(() => {
      localStorage.setItem('briar-glen-vslice-v1',JSON.stringify({player:{x:-720,y:30,hp:100,coins:100,inventory:{}},progress:{step:1}}));
      localStorage.setItem('briar-glen-onboarding-v1',JSON.stringify({stage:'done',complete:true,skipped:false}));
      localStorage.setItem('briar-glen-context-guide-v37',JSON.stringify({move:true,dodge:true}));
    });
    const returningPage = await returning.newPage();
    await returningPage.goto(`${target}${target.includes('?')?'&':'?'}onboarding=1&onboarding37=1&returning41=${Date.now()}-${vp.name}`, { waitUntil:'domcontentloaded', timeout:15000 });
    await returningPage.waitForFunction(() => window.__BRIAR_GLENDebug?.getOnboardingState?.().startOpen === true, null, { timeout:7000 });
    await returningPage.locator('#onboarding21-continue').click();
    await returningPage.waitForFunction(() => window.__BRIAR_GLENDebug?.getContextualOnboardingState?.().active === 'idle');
    const idlePrompt = returningPage.locator('#onboarding37-prompt');
    const idleSkip = returningPage.locator('#onboarding37-skip');
    if (!(await idlePrompt.isVisible()) || !(await idleSkip.isVisible())) throw new Error(`${vp.name}: returning-player tutorial control is absent`);
    if (!inside(await idlePrompt.boundingBox(), vp) || !inside(await idleSkip.boundingBox(), vp)) throw new Error(`${vp.name}: returning-player tutorial control is outside viewport`);
    await idleSkip.click();
    await returningPage.waitForFunction(() => window.__BRIAR_GLENDebug.getContextualOnboardingState().skipped === true);
    if (await idlePrompt.isVisible()) throw new Error(`${vp.name}: returning-player Skip tips did not close the tutorial`);
    console.log(`PASS ${vp.name}: returning-player window and Skip tips remain reachable without an active lesson`);
    await returning.close();
  }
} finally {
  await browser.close();
}
