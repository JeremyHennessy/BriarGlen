import { chromium } from 'playwright';

const target=process.argv[2]||'http://127.0.0.1:4173/';
const live=process.argv.includes('--live');
const viewports=[
  {name:'phone-landscape',width:932,height:430,touch:true},
  {name:'phone-portrait',width:430,height:932,touch:true},
  {name:'desktop',width:1440,height:900,touch:false},
];
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const browser=await chromium.launch({headless:true});

function withParam(url,key,value){const sep=url.includes('?')?'&':'?';return `${url}${sep}${key}=${encodeURIComponent(value)}`;}

async function openBuild28(page,url,label){
  let lastError;
  for(let attempt=1;attempt<=(live?48:1);attempt++){
    try{
      await page.goto(withParam(url,'build28Live',`${Date.now()}-${attempt}`),{waitUntil:'domcontentloaded',timeout:15000});
      await page.waitForFunction(()=>{
        const d=window.__BRIAR_GLENDebug;
        return Boolean(d?.getBuildInfo&&d?.getAuthoredArtState&&d.getBuildInfo()?.version==='28');
      },{timeout:7000});
      await page.waitForFunction(()=>{const s=window.__BRIAR_GLENDebug.getAuthoredArtState();return s.ready||s.failed;},{timeout:7000});
      return;
    }catch(error){lastError=error;if(live&&attempt<48)await sleep(5000);}
  }
  throw new Error(`${label}: Build 28 production runtime unavailable ${lastError?.message||'unknown'}`);
}

try{
  for(const vp of viewports){
    const context=await browser.newContext({viewport:{width:vp.width,height:vp.height},hasTouch:vp.touch,deviceScaleFactor:1});
    const page=await context.newPage();
    const errors=[];
    page.on('pageerror',e=>errors.push(`pageerror: ${e.message}`));
    page.on('console',m=>{if(m.type()==='error')errors.push(`console: ${m.text()}`);});
    page.on('requestfailed',r=>errors.push(`requestfailed: ${r.url()} • ${r.failure()?.errorText||'unknown'}`));
    await openBuild28(page,target,vp.name);
    await page.evaluate(()=>window.__BRIAR_GLENDebug.teleport(1090,-1375));
    await sleep(450);
    const state=await page.evaluate(()=>({build:window.__BRIAR_GLENDebug.getBuildInfo(),art:window.__BRIAR_GLENDebug.getAuthoredArtState()}));
    if(state.build.version!=='28'||state.build.label!=='Mosswater Shroud')throw new Error(`${vp.name}: incorrect Build 28 release ${JSON.stringify(state.build)}`);
    if(state.art.failed||!state.art.productionDefault||!state.art.expanded||!state.art.groveExpanded||!state.art.fenExpanded||state.art.rollbackRequested||state.art.build25ScopeRequested||state.art.build26ScopeRequested||state.art.build27ScopeRequested||!state.art.enabled||!state.art.ready||state.art.mode!=='authored-mosswater-shroud')throw new Error(`${vp.name}: Mosswater Shroud production default inactive ${JSON.stringify(state.art)}`);
    if(state.art.cottageTargets?.length!==2||state.art.greenwayTreeTargets?.length!==6||state.art.groveTreeTargets?.length!==4||state.art.fenTreeTargets?.length!==4||state.art.authoredTreeTargets?.length!==14)throw new Error(`${vp.name}: Mosswater Shroud target family incomplete ${JSON.stringify(state.art)}`);
    const crossing=state.art.fenTreeTargets.find(t=>t.anchor==='fen-crossing-west');
    const site=crossing&&state.art.drawSites?.[`fenTree:${Math.round(crossing.x)},${Math.round(crossing.y)}`];
    if(!site||site.variant!=='fen-shroud-tree'||site.draws<1)throw new Error(`${vp.name}: Old Warden Crossing production draw missing ${JSON.stringify(state.art.drawSites)}`);
    if(JSON.stringify(state.art.baseline)!==JSON.stringify(state.art.current))throw new Error(`${vp.name}: Mosswater production art mutated gameplay entities`);
    const overflow=await page.evaluate(()=>({sw:document.documentElement.scrollWidth,iw:innerWidth,sh:document.documentElement.scrollHeight,ih:innerHeight}));
    if(overflow.sw>overflow.iw+1||overflow.sh>overflow.ih+1)throw new Error(`${vp.name}: Build 28 overflow ${JSON.stringify(overflow)}`);
    if(errors.length)throw new Error(`${vp.name}: Build 28 errors:\n${errors.join('\n')}`);
    console.log(`PASS ${vp.name}: Build 28 Mosswater Shroud is production default`);
    await context.close();
  }
}finally{await browser.close();}
