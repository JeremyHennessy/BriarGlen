(() => {
  'use strict';

  // Build 4: persistent equipment and a town economy layer. Build 2/3 remain untouched.
  const trade = { open: false };
  const PRICES = { vest: 180, charm: 140, tonic: 40, hideSell: 22 };

  if (typeof progress.gearVest !== 'boolean') progress.gearVest = false;
  if (typeof progress.gearCharm !== 'boolean') progress.gearCharm = false;

  ui.tradeBackdrop = document.getElementById('trade-backdrop');
  ui.tradePanel = document.getElementById('trade-panel');
  ui.tradeClose = document.getElementById('trade-close');
  ui.tradeCoins = document.getElementById('trade-coins');
  ui.buyVest = document.getElementById('buy-vest-btn');
  ui.buyCharm = document.getElementById('buy-charm-btn');
  ui.buyTonic = document.getElementById('buy-tonic-btn');
  ui.sellHide = document.getElementById('sell-hide-btn');
  ui.gearVest = document.getElementById('gear-vest-status');
  ui.gearCharm = document.getElementById('gear-charm-status');

  addObject('merchant', -335, -205, { label: 'Rowan the Trader' });

  function applyEquipment({ healDifference = false } = {}) {
    const oldMax = player.maxHp;
    player.maxHp = progress.gearVest ? 125 : 100;
    if (healDifference && player.maxHp > oldMax) player.hp = Math.min(player.maxHp, player.hp + (player.maxHp - oldMax));
    player.hp = Math.min(player.hp, player.maxHp);
  }
  applyEquipment();

  function updateGearUI() {
    if (ui.gearVest) {
      ui.gearVest.textContent = progress.gearVest ? 'EQUIPPED • +25 MAX HEALTH' : 'Not owned';
      ui.gearVest.dataset.owned = progress.gearVest ? 'true' : 'false';
    }
    if (ui.gearCharm) {
      ui.gearCharm.textContent = progress.gearCharm ? 'EQUIPPED • FASTER DODGE' : 'Not owned';
      ui.gearCharm.dataset.owned = progress.gearCharm ? 'true' : 'false';
    }
  }

  function updateTradePanel() {
    if (!ui.tradePanel) return;
    ui.tradeCoins.textContent = `${player.coins} coins`;
    ui.buyVest.disabled = progress.gearVest || player.coins < PRICES.vest;
    ui.buyCharm.disabled = progress.gearCharm || player.coins < PRICES.charm;
    ui.buyTonic.disabled = player.coins < PRICES.tonic;
    ui.sellHide.disabled = player.inventory.hide < 1;
    ui.buyVest.textContent = progress.gearVest ? 'Owned' : `Buy • ${PRICES.vest} c`;
    ui.buyCharm.textContent = progress.gearCharm ? 'Owned' : `Buy • ${PRICES.charm} c`;
    ui.buyTonic.textContent = `Buy • ${PRICES.tonic} c`;
    ui.sellHide.textContent = player.inventory.hide > 0 ? `Sell 1 Hide • +${PRICES.hideSell} c (${player.inventory.hide})` : 'No Beast Hides to sell';
  }

  function toggleTrade(force) {
    trade.open = typeof force === 'boolean' ? force : !trade.open;
    ui.tradePanel.hidden = !trade.open;
    ui.tradeBackdrop.hidden = !trade.open;
    if (trade.open) {
      updateTradePanel();
      updateGearUI();
    }
  }

  function spendCoins(amount) {
    if (player.coins < amount) {
      toast(`Rowan needs ${amount} coins`);
      return false;
    }
    player.coins -= amount;
    return true;
  }

  function buyVest() {
    if (progress.gearVest) return false;
    if (!spendCoins(PRICES.vest)) return false;
    progress.gearVest = true;
    applyEquipment({ healDifference: true });
    spawnParticles(player.x, player.y, '#d2ad73', 14, .55);
    toast('Copperguard Vest equipped — max health increased');
    saveGame();
    updateTradePanel();
    updateGearUI();
    return true;
  }

  function buyCharm() {
    if (progress.gearCharm) return false;
    if (!spendCoins(PRICES.charm)) return false;
    progress.gearCharm = true;
    spawnParticles(player.x, player.y, '#a9d6a4', 12, .5);
    toast('Rootstep Charm equipped — dodge recovers faster');
    saveGame();
    updateTradePanel();
    updateGearUI();
    return true;
  }

  function buyTonic() {
    if (!spendCoins(PRICES.tonic)) return false;
    player.inventory.tonic += 1;
    toast('Healing Tonic purchased');
    saveGame();
    updateTradePanel();
    return true;
  }

  function sellHide() {
    if (player.inventory.hide < 1) {
      toast('No Beast Hides to sell');
      return false;
    }
    player.inventory.hide -= 1;
    player.coins += PRICES.hideSell;
    addFloater(player.x, player.y - 18, `+${PRICES.hideSell} COINS`, '#f0d28b');
    toast('Rowan bought 1 Beast Hide');
    saveGame();
    updateTradePanel();
    return true;
  }

  nearestInteractable = function build4NearestInteractable() {
    const candidates = [];
    for (const r of resources) if (r.active) candidates.push({ kind: 'resource', obj: r, d: dist(player, r) });
    for (const o of worldObjects) {
      if (['forge','board','shortcut','well','alchemy','merchant'].includes(o.type)) candidates.push({ kind: o.type, obj: o, d: dist(player, o) });
    }
    candidates.sort((a, b) => a.d - b.d);
    const c = candidates[0];
    if (!c) return null;
    const range = c.kind === 'shortcut' ? 105 : ['alchemy','merchant'].includes(c.kind) ? 100 : 90;
    return c.d <= range ? c : null;
  };

  const build3Interact = interact;
  interact = function build4Interact() {
    if (trade.open) return;
    const near = nearestInteractable();
    if (near?.kind === 'merchant') {
      toggleTrade(true);
      toast('Rowan opens his travelling stock');
      return;
    }
    return build3Interact();
  };

  const build3Attack = attack;
  attack = function build4Attack() {
    if (trade.open) return;
    return build3Attack();
  };

  const build3Dash = dash;
  dash = function build4Dash() {
    if (trade.open) return;
    const before = player.dashCd;
    build3Dash();
    if (progress.gearCharm && before <= 0 && player.dashCd > 0) player.dashCd = .82;
  };

  const build3Update = update;
  update = function build4Update(dt) {
    if (trade.open) {
      updateUI();
      return;
    }
    build3Update(dt);
  };

  const build3UpdateUI = updateUI;
  updateUI = function build4UpdateUI() {
    build3UpdateUI();
    applyEquipment();
    updateGearUI();
    if (trade.open) updateTradePanel();
    const near = nearestInteractable();
    if (near?.kind === 'merchant') ui.context.textContent = 'USE • Trade with Rowan';
  };

  const build3DrawObject = drawObject;
  drawObject = function build4DrawObject(o) {
    if (o.type !== 'merchant') return build3DrawObject(o);
    const p = worldToScreen(o.x, o.y), z = camera.zoom;
    if (p.x < -170 || p.x > viewport.w + 170 || p.y < -180 || p.y > viewport.h + 170) return;
    shadow(o.x, o.y, 38, 20, .24);
    ctx.fillStyle = '#5f4934';
    ctx.fillRect(p.x - 34*z, p.y - 24*z, 68*z, 24*z);
    ctx.fillStyle = '#8b6c43';
    ctx.beginPath(); ctx.moveTo(p.x - 41*z, p.y - 25*z); ctx.lineTo(p.x - 25*z, p.y - 52*z); ctx.lineTo(p.x + 30*z, p.y - 52*z); ctx.lineTo(p.x + 42*z, p.y - 25*z); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#d6b26f';
    ctx.fillRect(p.x - 26*z, p.y - 49*z, 14*z, 18*z);
    ctx.fillStyle = '#99a777';
    ctx.fillRect(p.x - 5*z, p.y - 46*z, 12*z, 15*z);
    ctx.fillStyle = '#9d6d51';
    ctx.fillRect(p.x + 14*z, p.y - 48*z, 11*z, 17*z);
    labelAt(p.x, p.y - 64*z, 'ROWAN • TRADER');
  };

  ui.tradeBackdrop.addEventListener('pointerdown', () => toggleTrade(false));
  ui.tradeClose.addEventListener('click', () => toggleTrade(false));
  ui.buyVest.addEventListener('click', buyVest);
  ui.buyCharm.addEventListener('click', buyCharm);
  ui.buyTonic.addEventListener('click', buyTonic);
  ui.sellHide.addEventListener('click', sellHide);

  addEventListener('keydown', e => {
    if (e.code === 'Escape' && trade.open) toggleTrade(false);
  });

  if (window.__BRIAR_GLENDebug) {
    window.__BRIAR_GLENDebug.interact = () => interact();
    window.__BRIAR_GLENDebug.attack = () => attack();
    window.__BRIAR_GLENDebug.dash = () => dash();
    window.__BRIAR_GLENDebug.getEconomyState = () => ({
      tradeOpen: trade.open,
      gear: { vest: progress.gearVest, charm: progress.gearCharm },
      maxHp: player.maxHp,
      hp: player.hp,
      dashCd: player.dashCd,
      coins: player.coins,
      tonic: player.inventory.tonic,
      hide: player.inventory.hide,
    });
  }

  updateUI();
})();