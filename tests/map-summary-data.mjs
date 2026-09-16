import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// Exercise the actual presentation module with the persisted economy record shapes.
const element = { classList: { add() {} }, insertAdjacentHTML() {}, before() {}, hidden: true };
const progress = { step: 0, contractComplete: false, mapDiscoveries: { briar: true }, marketLedger: { purchases: {}, coinsSpent: 0, ordersCompleted: 0, serviceUses: 0 }, stonepineSupply: { purchases: {}, coinsSpent: 0, commissions: 0, services: 0 } };
let objective = 'Gather 3 Briarleaf along Meadow Road.';
const debug = { openMap() {}, openJournal() {} };
vm.runInNewContext(fs.readFileSync('src/v31/45-map-journal-restructure.js', 'utf8'), {
  window: { __BRIAR_GLENDebug: debug, __BRIAR_GLEN_RUNTIME: { registerHook() {} } },
  document: { getElementById: () => element, querySelector: () => element, createElement: () => ({}), head: { appendChild() {} }, styleSheets: [] },
  progress, player: { x: 0, y: 0 }, zoneFor: () => ({ name: 'Briar Glen' }), objectiveText: () => objective,
});
const state = () => debug.getMapJournal35State();
assert.equal(state().destination, 'Meadow Road', 'fresh objective must direct the player to the herb gathering area');
assert.equal(state().economy['Rowan market'], 'Not engaged', 'empty purchase dictionaries are not transactions');
objective = 'Return to Alden the Smith and forge a Reinforced Sword.';
assert.equal(state().destination, 'Briar Glen', 'Alden is in the settlement, not Copper Hollow');
objective = 'Mine 3 Copper in Copper Hollow.';
assert.equal(state().destination, 'Copper Hollow');
objective = 'Enter Emberback Den and defeat Emberback.';
assert.equal(state().destination, 'Emberback Den');
objective = 'Stonepine Quarry Patrol is ready to turn in at the Contract Board.';
assert.equal(state().destination, 'Briar Glen', 'turn-in location must win over the contract region');
objective = 'Recover 2 Ironpine Resin from the Stonepine slopes.';
assert.equal(state().destination, 'Stonepine Reach');

for (const [ledger, field] of [['marketLedger','coinsSpent'],['marketLedger','ordersCompleted'],['marketLedger','serviceUses'],['stonepineSupply','coinsSpent'],['stonepineSupply','commissions'],['stonepineSupply','services']]) {
  progress[ledger][field] = 1;
  assert.equal(state().economy['Rowan market'], 'Engaged', `${ledger}.${field} records real market activity`);
  progress[ledger][field] = 0;
}
progress.marketLedger.purchases.briarleaf_parcel = true;
assert.equal(state().economy['Rowan market'], 'Engaged', 'existing purchase records remain supported');
progress.marketLedger.purchases = {};
progress.marketLedger.coinsSpent = 60;
assert.equal(state().economy['Rowan market'], 'Engaged', 'restocking does not erase prior market activity');
delete progress.marketLedger;
delete progress.stonepineSupply;
assert.equal(state().economy['Rowan market'], 'Not engaged', 'older saves without ledgers are safe');
console.log('PASS map summary: objective destinations and persistent market activity');
