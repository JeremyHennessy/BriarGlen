import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';

const target=process.argv[2]||'http://127.0.0.1:4173/';
const evidence=process.env.UI_EVIDENCE_DIR||'fresh-chapter-evidence';
await mkdir(evidence,{recursive:true});

const text=async(page,selector)=>{const el=page.locator(selector).first();return await el.count()&&await el.isVisible()?(await el.innerText()).trim():'';};
const activate=async(page,selector)=>{const el=page.locator(selector).first();assert.ok(await el.count(),`Missing visible control ${selector}`);await el.click();};
const compass=t=>(t.match(/North-east|South-east|South-west|North-west|North|South|East|West/i)||[])[0]?.toLowerCase()||null;
const keys={north:['KeyW'],south:['KeyS'],east:['KeyD'],west:['KeyA'],'north-east':['KeyW','KeyD'],'north-west':['KeyW','KeyA'],'south-east':['KeyS','KeyD'],'south-west':['KeyS','KeyA']};
async function move(page,direction,ms=180){
  await page.locator('#game').focus();
  for(const key of keys[direction])await page.keyboard.down(key);
  try{await page.waitForTimeout(ms);}finally{for(const key of [...keys[direction]].reverse())await page.keyboard.up(key);}
  await page.waitForTimeout(70);
}
async function visibleState(page){
  return{
    objective:await text(page,'#objective-text'),direction:await text(page,'#objective-direction'),
    use:await text(page,'#interaction-target'),readiness:await text(page,'#interact-readiness'),
    help:await text(page,'#interaction-help'),combat:await text(page,'#combat-threat'),
    combatAction:await text(page,'#combat-action'),hp:await text(page,'#hp-text'),energy:await text(page,'#energy-text')
  };
}
async function reachLedger(page){
  let last=null,residentWait=0;
  for(let step=0;step<100;step++){
    const s=await visibleState(page);
    if(s.use==='Stonepine Trail Ledger'&&s.readiness==='Begin'){
      await activate(page,'#interact-btn');
      await page.waitForFunction(()=>document.querySelector('#objective-text')?.textContent.includes('Chart Stonepine Overlook'),{timeout:3000});
      return;
    }
    if(s.direction.includes('Nearby resident has Use priority')){residentWait++;if(residentWait<8){await page.waitForTimeout(450);continue;}}
    residentWait=0;
    if(s.direction.includes('Close by')&&last){await move(page,last,45);continue;}
    const c=compass(s.direction);assert.ok(c,`Ledger route lost visible compass: ${JSON.stringify(s)}`);last=c;await move(page,c,150);
  }
  assert.fail('Ledger not reached through visible objective guidance');
}
async function fightVisible(page,label){
  const samples=[];
  for(let step=0;step<80;step++){
    if(!await page.locator('#combat-cue').isVisible())return;
    const action=await text(page,'#combat-action'),threat=await text(page,'#combat-threat');
    // Collect the first real hide as soon as Use exposes it; do not stand still
    // unarmed fighting a second wolf while useful loot is within reach.
    if(/^Unarmed$/.test(await text(page,'#attack-readiness'))&&await text(page,'#interaction-target')==='Wolf Hide')return;
    // A visible warning covers enemies up to 300 units away, while attacks have
    // a shorter range. Do not freeze ordinary travel waiting for a distant foe.
    if(/^No target in reach/.test(action)){
      console.log('DISTANT_THREAT '+JSON.stringify({label,action,threat}));
      return;
    }
    const hp=Number((await text(page,'#hp-text')).split('/')[0].trim());
    samples.push({step,action,threat,hp,energy:await text(page,'#energy-text'),attackReadiness:await text(page,'#attack-readiness'),braceReadiness:await text(page,'#brace-readiness'),direction:await text(page,'#objective-direction')});
    if(hp<=20){
      await writeFile(`${evidence}/combat-${label.toLowerCase().replace(/[^a-z0-9]+/g,'-')}.json`,JSON.stringify({reason:'low-health',samples},null,2));
      await page.screenshot({path:`${evidence}/combat-${label.toLowerCase().replace(/[^a-z0-9]+/g,'-')}.png`});
      console.error('COMBAT_DIAGNOSTIC '+JSON.stringify({label,reason:'low-health',samples}));
      assert.fail(`${label}: health fell below safe diagnostic floor while fighting: ${threat}; see combat diagnostic evidence`);
    }
    if(/Strike incoming|Pounce incoming|Close threat/.test(threat)){
      const brace=await text(page,'#brace-readiness');
      if(!/Braced|Low energy/.test(brace))await activate(page,'#quick-brace');
    }
    if(/^Attack /.test(action)&&!/recovering/.test(action))await activate(page,'#attack-btn');
    await page.waitForTimeout(/Bow/.test(await text(page,'#attack-readiness'))?680:440);
  }
  await writeFile(`${evidence}/combat-${label.toLowerCase().replace(/[^a-z0-9]+/g,'-')}.json`,JSON.stringify(samples,null,2));
  await page.screenshot({path:`${evidence}/combat-${label.toLowerCase().replace(/[^a-z0-9]+/g,'-')}.png`});
  console.error('COMBAT_DIAGNOSTIC '+JSON.stringify({label,samples}));
  assert.fail(`${label}: threat did not resolve through visible combat actions; see diagnostic evidence`);
}
// Read only the actually rendered Pack, never a debug snapshot or an inferred pickup count.
async function visibleMaterials(page){
  await activate(page,'[data-panel="pack"]');
  const carried={};
  for(const id of ['wood','hide']){
    const row=page.locator(`#inventory [data-item-id="${id}"]`);
    const value=await row.count()&&await row.isVisible()?(await row.innerText()).trim():'';
    carried[id]=Number(value.match(/×(\d+)/)?.[1]||0);
  }
  await activate(page,'[data-panel="nearby"]');
  return carried;
}
async function craftFirstKit(page){
  // Ordinary Make/Pack controls only. This is the earliest complete useful kit,
  // not a debug grant: 2 Ashwood + 1 Hide for the Bow, 1 Ashwood for 6 arrows.
  await activate(page,'[data-panel="craft"]');
  if(await page.locator('[data-craft-filter="gear"]').count())await activate(page,'[data-craft-filter="gear"]');
  assert.match(await text(page,'#recipe-bow'),/Ready to make/);
  await activate(page,'[data-craft="bow"]');
  if(await page.locator('[data-craft-filter="supplies"]').count())await activate(page,'[data-craft-filter="supplies"]');
  assert.match(await text(page,'#recipe-arrows'),/Ready to make/);
  await activate(page,'[data-craft="arrows"]');
  await activate(page,'[data-panel="pack"]');
  const bow=page.locator('#inventory [data-equip="bow"]');
  const equipLabel=await bow.getAttribute('aria-label');
  if(equipLabel==='Equip Briar Bow')await bow.click();
  else assert.equal(equipLabel,'Stow Briar Bow','The first Bow should be equipped');
  await page.waitForFunction(()=>document.querySelector('#attack-readiness')?.textContent?.trim()==='Bow · 6',null,{timeout:4000});
  assert.equal(await text(page,'#loadout-weapon-name'),'Briar Bow');
  assert.match(await text(page,'#inventory'),/Trail Arrows[\s\S]*×6/);
  console.log('FIRST_KIT_READY '+JSON.stringify({weapon:await text(page,'#loadout-weapon-name'),ammo:await text(page,'#attack-readiness'),materials:await text(page,'#inventory')}));
  await page.screenshot({path:`${evidence}/02-first-bow-and-arrows.png`});
  await activate(page,'[data-panel="nearby"]');
}
async function gatherFirstKit(page){
  // Greenwood is north-east of the Trail Ledger on the visible map. Collect only
  // the *first* Bow/arrow ingredients before crafting; finish provisions armed.
  await move(page,'north-east',1100);
  const pattern=[
    ...Array.from({length:6},(_,row)=>[
      ...Array(12).fill(row%2?'west':'east'),
      ...(row<5?Array(2).fill('north'):[])
    ]).flat(),
    ...Array(10).fill('south')
  ];
  const pickups=[];
  let armed=false,{wood,hide:hides}=await visibleMaterials(page);
  for(let step=0;step<240&&(!armed||wood<2||hides<2);step++){
    // Give visible pickups priority over another unnecessary fight. Use itself
    // retains the game's resident/landmark/resource/drop priority rules.
    const use=await text(page,'#interaction-target');
    if(use==='Wolf Hide'||use==='Ashwood'){
      const before={wood,hides},readiness=await text(page,'#interact-readiness');
      await activate(page,'#interact-btn');
      await page.waitForTimeout(120);
      const carried=await visibleMaterials(page);
      wood=carried.wood;hides=carried.hide;
      const gained=use==='Ashwood'?wood>before.wood:hides>before.hides;
      pickups.push({step,use,readiness,before,after:{wood,hides},gained});
      if(!gained)await move(page,pattern[step%pattern.length],210);
    }else if(await page.locator('#combat-cue').isVisible()){
      await fightVisible(page,'Greenwood');
      await page.waitForTimeout(100);
    }else await move(page,pattern[step%pattern.length],210);

    if(!armed&&wood>=3&&hides>=1){
      await craftFirstKit(page);
      armed=true;
      const carried=await visibleMaterials(page);
      wood=carried.wood;hides=carried.hide;
      assert.ok(wood>=0&&hides>=0,'First kit must consume real carried ingredients');
      console.log('FIRST_KIT_COST '+JSON.stringify({wood,hides}));
    }
  }
  await writeFile(`${evidence}/verified-greenwood-pickups.json`,JSON.stringify({wood,hides,armed,pickups},null,2));
  if(!armed||wood<2||hides<2){
    const state=await visibleState(page);
    console.error('GATHER_DIAGNOSTIC '+JSON.stringify({wood,hides,armed,attempts:pickups.length,unconfirmed:pickups.filter(x=>!x.gained),state,nearby:await text(page,'#nearby')}));
    await page.screenshot({path:`${evidence}/greenwood-gather-shortfall.png`});
  }
  assert.ok(armed,'Fresh player did not make a Bow and six arrows during Greenwood exploration');
  assert.ok(wood>=2,`Armed gathering left only ${wood}/2 Ashwood for another arrow batch + earned Trail Pack`);
  assert.ok(hides>=2,`Armed gathering left only ${hides}/2 Wolf Hides for earned Trail Pack`);
  return{wood,hides,firstKit:true,pickups:pickups.length};
}
async function craftFieldKit(page){
  // Top up from real materials after the first equipped Bow was made in the field.
  await activate(page,'[data-panel="craft"]');
  if(await page.locator('[data-craft-filter="supplies"]').count())await activate(page,'[data-craft-filter="supplies"]');
  const before=(await text(page,'#attack-readiness')).match(/Bow · (\d+)/);
  const previousArrows=Number(before?.[1]||0);
  assert.match(await text(page,'#recipe-arrows'),/Ready to make/);
  await activate(page,'[data-craft="arrows"]');
  await activate(page,'[data-panel="pack"]');
  await page.waitForFunction(previous=>{
    const match=document.querySelector('#attack-readiness')?.textContent?.match(/Bow · (\d+)/);
    return Number(match?.[1]||0)>=previous+6;
  },previousArrows,{timeout:4000});
  const ammo=(await text(page,'#attack-readiness')).match(/Bow · (\d+)/);
  assert.ok(Number(ammo?.[1]||0)>=6,'Prepared field Bow must have at least six arrows');
  assert.equal(await text(page,'#loadout-weapon-name'),'Briar Bow');
  console.log('FIELD_KIT_TOPUP '+JSON.stringify({previousArrows,ammo:Number(ammo?.[1]||0)}));
}
async function followObjectiveToUse(page,expected,readiness,max=180){
  await activate(page,'[data-panel="nearby"]');
  let last=null;
  for(let step=0;step<max;step++){
    if(await page.locator('#combat-cue').isVisible()&&!/^No target in reach/.test(await text(page,'#combat-action'))){
      await fightVisible(page,expected);
      continue;
    }
    const s=await visibleState(page);
    if(s.use===expected&&(!readiness||s.readiness===readiness)){await activate(page,'#interact-btn');await page.waitForTimeout(220);return;}
    if(s.direction.includes('Nearby resident has Use priority')){await page.waitForTimeout(350);continue;}
    if(s.direction.includes('Close by')&&last){await move(page,last,45);continue;}
    const c=compass(s.direction);assert.ok(c,`${expected}: objective lost visible compass ${JSON.stringify(s)}`);last=c;await move(page,c,170);
  }
  assert.fail(`${expected}: not reached through visible objective guidance`);
}
async function verifyEarnedPackMaterials(page){
  // The recipe needs two carried Wolf Hides, not two NEW hides from the Waycache.
  // Read the actual visible Pack, including resources legitimately collected in Greenwood.
  await activate(page,'[data-panel="pack"]');
  const materials={};
  for(const [id,label,required] of [['hide','Wolf Hides',2],['wood','Ashwood',1]]){
    const row=page.locator(`#inventory [data-item-id="${id}"]`);
    const visible=await row.count()&&(await row.isVisible())?(await row.innerText()).trim():'';
    const carried=Number(visible.match(/×(\d+)/)?.[1]||0);
    materials[id]=carried;
    assert.ok(carried>=required,`Earned Trail Pack requires ${required} carried ${label}; visible Pack shows ${carried}. Revisit Greenwood using ordinary play if short.`);
  }
  console.log('EARNED_PACK_MATERIALS '+JSON.stringify(materials));
  await activate(page,'[data-panel="nearby"]');
  return materials;
}

const browser=await chromium.launch({headless:true});
const results=[];
try{
  const context=await browser.newContext({viewport:{width:1280,height:800}});
  const page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push('pageerror: '+e.message));
  page.on('console',m=>{if(m.type()==='error')errors.push('console: '+m.text());});
  await page.goto(target,{waitUntil:'domcontentloaded',timeout:15000});
  await page.waitForFunction(()=>document.documentElement.dataset.playUi==='ready',{timeout:5000});
  await page.waitForFunction(()=>document.querySelector('#objective-text')?.textContent.includes('Visit the Stonepine Trail Ledger'),{timeout:3000});
  await reachLedger(page);
  assert.match(await text(page,'#objective-preparation'),/Prepare first/);
  await page.screenshot({path:`${evidence}/01-ledger-started.png`});

  await activate(page,'#objective-open');
  const sources=page.locator('.guide-sources');
  if(!await sources.getAttribute('open'))await activate(page,'.guide-sources summary');
  const sourceText=(await sources.innerText()).trim();
  assert.match(sourceText,/Greenwood/);assert.match(sourceText,/Wolf Hide|hides from wolves/);assert.match(sourceText,/Briar Bow|bow/);
  await activate(page,'[data-panel="nearby"]');

  const gathered=await gatherFirstKit(page);
  await page.screenshot({path:`${evidence}/02-first-materials.png`});
  await craftFieldKit(page);
  await page.screenshot({path:`${evidence}/03-bow-equipped.png`});

  await followObjectiveToUse(page,'Stonepine Overlook','Chart');
  // Use the existing bread recovery if the trip has already cost meaningful energy.
  const energy=Number((await text(page,'#energy-text')).split('/')[0].trim());
  if(energy<70&&await text(page,'#interaction-target')==='Stonepine Overlook')await activate(page,'#interact-btn');
  await followObjectiveToUse(page,'Stonepine Waycache',null);
  assert.match(await text(page,'#nearby'),/Field stash/);
  await page.screenshot({path:`${evidence}/04-waycache-secured.png`});

  const storeBread=page.locator('[data-cache-store="bread"]');
  assert.ok(await storeBread.count(),'Waycache must expose Brown Bread storage');
  await storeBread.click();
  for(let i=0;i<6;i++){const button=page.locator('[data-cache-store="arrows"]');assert.ok(await button.count(),`Arrow storage missing at ${i}/6`);await button.click();await page.waitForTimeout(60);}
  assert.match(await text(page,'#objective-text'),/Return to the Trail Ledger/);

  const earnedPackMaterials=await verifyEarnedPackMaterials(page);
  await followObjectiveToUse(page,'Stonepine Trail Ledger','Finish');
  assert.match(await text(page,'#objective-text'),/Craft your earned Trail Pack/);
  await activate(page,'#objective-open');
  assert.match(await text(page,'#guide-trailpack-plan'),/Trail Pack · .*Wolf Hides · .*Ashwood/);
  await activate(page,'[data-guide-panel="craft"]');
  assert.match(await text(page,'#recipe-trailpack'),/Ready to make/);
  await activate(page,'[data-craft="trailpack"]');
  await activate(page,'[data-panel="pack"]');
  assert.match(await text(page,'#inventory'),/Trail Pack/);
  assert.match(await text(page,'#objective-text'),/Choose a wider-field lead/);
  await page.screenshot({path:`${evidence}/05-first-chapter-complete.png`});

  await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.documentElement.dataset.playUi==='ready');
  assert.match(await text(page,'#objective-text'),/Choose a wider-field lead/);
  await activate(page,'[data-panel="pack"]');assert.match(await text(page,'#inventory'),/Trail Pack/);
  assert.deepEqual(errors,[],'Fresh chapter audit produced runtime console errors');
  results.push({gathered,earnedPackMaterials,finalObjective:await text(page,'#objective-text'),errors});
  await context.close();
}finally{await browser.close();}
await writeFile(`${evidence}/fresh-chapter.json`,JSON.stringify(results,null,2));
console.log('FRESH_CHAPTER '+JSON.stringify(results));
