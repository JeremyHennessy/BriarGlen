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
async function gatherFirstKit(page){
  // The rendered map places Greenwood north-east of the Trail Ledger; travel uses only ordinary movement.
  await move(page,'north-east',1100);
  // Sweep back and forth through the player-visible Greenwood area rather than
  // drifting east on every circuit. All travel remains ordinary WASD movement.
  const pattern=[
    ...Array.from({length:6},(_,row)=>[
      ...Array(12).fill(row%2?'west':'east'),
      ...(row<5?Array(2).fill('north'):[])
    ]).flat(),
    ...Array(10).fill('south')
  ];
  // First-chapter preparation consumes 2 wood for the bow, 2 for two arrow batches,
  // and 1 for the earned Trail Pack. Keep two spare for ordinary field use.
  const woodTarget=7;
  const pickups=[];
  let {wood,hide:hides}=await visibleMaterials(page);
  for(let step=0;step<240&&(wood<woodTarget||hides<1);step++){
    if(await page.locator('#combat-cue').isVisible()){
      await fightVisible(page,'Greenwood');
      await page.waitForTimeout(150);
    }
    const use=await text(page,'#interaction-target');
    if(use==='Wolf Hide'||use==='Ashwood'){
      const before={wood,hides};
      const readiness=await text(page,'#interact-readiness');
      await activate(page,'#interact-btn');
      await page.waitForTimeout(120);
      const carried=await visibleMaterials(page);
      wood=carried.wood;hides=carried.hide;
      const gained=use==='Ashwood'?wood>before.wood:hides>before.hides;
      pickups.push({step,use,readiness,before,after:{wood,hides},gained});
      if(!gained)await move(page,pattern[step%pattern.length],210);
      continue;
    }
    await move(page,pattern[step%pattern.length],210);
  }
  await writeFile(`${evidence}/verified-greenwood-pickups.json`,JSON.stringify({wood,hides,pickups},null,2));
  if(wood<woodTarget||hides<1){
    const state=await visibleState(page);
    console.error('GATHER_DIAGNOSTIC '+JSON.stringify({wood,hides,attempts:pickups.length,unconfirmed:pickups.filter(x=>!x.gained),state,nearby:await text(page,'#nearby')}));
    await page.screenshot({path:`${evidence}/greenwood-gather-shortfall.png`});
  }
  assert.ok(wood>=woodTarget,`Fresh player found only ${wood}/${woodTarget} Ashwood through visible Greenwood exploration`);
  assert.ok(hides>=1,`Fresh player found only ${hides}/1 Wolf Hide through visible Greenwood combat`);
  return{wood,hides};
}
async function craftFieldKit(page){
  await activate(page,'[data-panel="craft"]');
  if(await page.locator('[data-craft-filter="gear"]').count())await activate(page,'[data-craft-filter="gear"]');
  assert.match(await text(page,'#recipe-bow'),/Ready to make/);
  const preparation=[];
  const snapshot=async stage=>{
    const record={stage,inventory:await text(page,'#inventory'),bow:await text(page,'#recipe-bow'),arrows:await text(page,'#recipe-arrows'),attack:await text(page,'#attack-readiness')};
    preparation.push(record);
    console.log('PREPARATION_STAGE '+JSON.stringify(record));
  };
  await snapshot('before-bow');
  await activate(page,'[data-craft="bow"]');
  await snapshot('after-bow');
  if(await page.locator('[data-craft-filter="supplies"]').count())await activate(page,'[data-craft-filter="supplies"]');
  for(let batch=1;batch<=2;batch++){
    await snapshot(`before-arrow-batch-${batch}`);
    assert.match(await text(page,'#recipe-arrows'),/Ready to make/);
    await activate(page,'[data-craft="arrows"]');
    await activate(page,'[data-panel="pack"]');
    try{
      await page.waitForFunction(expected=>{
        const row=document.querySelector('#inventory [data-item-id="arrows"]');
        return row&&!row.closest('.play-panel')?.hidden&&row.innerText.includes('×'+expected);
      },batch*6,{timeout:4000});
    }catch(error){
      console.error('ARROW_CRAFT_DIAGNOSTIC '+JSON.stringify({batch,inventory:await text(page,'#inventory'),weapon:await text(page,'#loadout-weapon-name'),attack:await text(page,'#attack-readiness')}));
      await page.screenshot({path:`${evidence}/arrows-batch-${batch}-failure.png`});
      throw error;
    }
    await snapshot(`after-arrow-batch-${batch}`);
    if(batch<2){
      await activate(page,'[data-panel="craft"]');
      if(await page.locator('[data-craft-filter="supplies"]').count())await activate(page,'[data-craft-filter="supplies"]');
    }
  }
  const bow=page.locator('#inventory [data-equip="bow"]');
  const label=await bow.getAttribute('aria-label');
  if(label==='Equip Briar Bow')await bow.click();
  else assert.equal(label,'Stow Briar Bow','Bow equipment control should describe its current state');
  await page.waitForFunction(()=>document.querySelector('#attack-readiness')?.textContent?.trim()==='Bow · 12',null,{timeout:4000});
  assert.equal(await text(page,'#loadout-weapon-name'),'Briar Bow');
  assert.match(await text(page,'#attack-readiness'),/Bow · 12/);
  await writeFile(`${evidence}/preparation-stages.json`,JSON.stringify(preparation,null,2));
}
async function followObjectiveToUse(page,expected,readiness,max=180){
  await activate(page,'[data-panel="nearby"]');
  let last=null;
  for(let step=0;step<max;step++){
    if(await page.locator('#combat-cue').isVisible()){await fightVisible(page,expected);continue;}
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
