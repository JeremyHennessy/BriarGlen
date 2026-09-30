import { chromium } from 'playwright';

const base = process.argv[2] || 'http://127.0.0.1:4173/';
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 932, height: 430 } });
  const errors = [];
  page.on('pageerror', error => errors.push(String(error)));
  await page.goto(base, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => !!window.__BRIAR_GLEN_DEBUG__, { timeout: 5000 });

  const result = await page.evaluate(() => {
    const d = window.__BRIAR_GLEN_DEBUG__;
    d.reset();
    d.clearEnemies();

    for (let i = 0; i < 2; i++) {
      d.forceNpcNeed('alden', 'iron');
      const alden = d.npc('alden');
      const req = { ...alden.request };
      d.give('iron', req.qty, 1.5);
      d.setPosition(alden.x, alden.y);
      if (!d.help('alden')) throw new Error('setup delivery failed');
    }

    d.setNpcStock('alden', 'iron', 99);
    d.setDay(5);
    d.advance(160);
    d.setPosition(1500, 545);
    d.forceNpcNeed('alden', 'iron');

    const goal = d.rethink('alden');
    const evidenceBefore = d.providerEvidence('alden', 'iron');
    const statusBefore = d.providerCallStatus('alden');

    d.advance(30);
    const evidenceAfter = d.providerEvidence('alden', 'iron');
    const statusAfter = d.providerCallStatus('alden');
    const afterAging = d.snapshot();

    d.advance(30);
    const afterDeadline = d.snapshot();

    return { goal, evidenceBefore, statusBefore, evidenceAfter, statusAfter, afterAging, afterDeadline };
  });

  const agingAlden = result.afterAging.npcs.find(n => n.id === 'alden');
  const agingItem = agingAlden.knowledge?.provider?.items?.iron;
  if (
    result.goal !== 'seekProvider' ||
    result.evidenceBefore < 0.6 ||
    !result.statusBefore ||
    result.evidenceAfter >= 0.6 ||
    agingAlden.seekingProviderFor !== 'iron' ||
    !agingAlden.providerCall ||
    !result.statusAfter ||
    result.statusAfter.remaining <= 0 ||
    (agingItem?.misses || 0) !== 0
  ) {
    throw new Error('active provider call was cancelled by evidence aging before its response deadline: ' + JSON.stringify(result));
  }

  const expiredAlden = result.afterDeadline.npcs.find(n => n.id === 'alden');
  const expiredItem = expiredAlden.knowledge?.provider?.items?.iron;
  if (
    (expiredItem?.misses || 0) !== 1 ||
    expiredAlden.seekingProviderFor ||
    expiredAlden.providerCall ||
    !expiredAlden.memory.some(m => m.text.includes('I waited and you never came through'))
  ) {
    throw new Error('aged provider call did not remain active until the actual deadline then record the miss: ' + JSON.stringify(result));
  }

  if (errors.length) throw new Error('runtime errors: ' + errors.join(' | '));
  console.log('PASS provider aging: active calls survive evidence decay until the explicit response deadline');
} finally {
  await browser.close();
}
