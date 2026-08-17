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

async function openBuild30(page,url,label){
  let lastError;
  for(let attempt=1;attempt<=(live?48:1);attempt++){
    try{
      await page.goto(withParam(url,'build30Live',`${Date.now()}-${attempt}`),{waitUntil:'domcontentloaded',timeout:15000});
      await page.waitForFunction(()=>{
        const d=window.__BRIAR_GLENDebug;
        return Boolean(d?.getBuildInfo&&d?.getAuthoredArtState&&d.getBuildInfo()?.version==='30');
      },{timeout:7000});
      await page.waitForFunction(()=>{const s=window.__BRIAR_GLENDebug.getAuthoredArtState();return s.ready||s.failed;},{timeout:9000});
      return;
    }catch(error){lastError=error;if(live&&attempt<48)await sleep(5000);}
  }
  throw new Error(`${label}: Build 30 production runtime unavailable ${lastError?.message||'unknown'}`);
}

try{
  for(const vp of viewports){
    const context=await browser.newContext({viewport:{width:vp.width,height:vp.height},hasTouch:vp.touch,deviceScaleFactor:1});
    const page=await context.newPage();
    const errors=[];
    page.on('pageerror',e=>errors.push(`pageerror: ${e.message}`));
    page.on('console',m=>{if(m.type()==='error')errors.push(`console: ${m.text()}`);});
    page.on('requestfailed',r=>errors.push(`requestfailed: ${r.url()} • ${r.failure()?.errorText||'unknown'}`));
    await openBuild30(page,target,vp.name);
    await page.evaluate(()=>window.__BRIAR_GLENDebug.teleport(1030,0));
    await sleep(470);
    const state=await page.evaluate(()=>({build:window.__BRIAR_GLENDebug.getBuildInfo(),art:window.__BRIAR_GLENDebug.getAuthoredArtState()}));
    if(state.build.version!=='30'||state.build.label!=='Copper & Ember')throw new Error(`${vp.name}: incorrect Build 30 release ${JSON.stringify(state.build)}`);
    if(state.art.failed||!state.art.productionDefault||!state.art.hollowDenExpanded||!state.art.stonepineExpanded||!state.art.enabled||!state.art.ready||state.art.mode!=='authored-copper-ember')throw new Error(`${vp.name}: Copper & Ember production default inactive ${JSON.stringify(state.art)}`);
    if(state.art.authoredTreeTargets?.length!==18||state.art.hollowDenObjectTargets?.length!==6||state.art.hollowOreTargets?.length!==2||state.art.authoredEnvironmentTargets?.length!==8)throw new Error(`${vp.name}: Copper & Ember target family incomplete ${JSON.stringify(state.art)}`);
    const ore=state.art.hollowOreTargets.find(t=>t.anchor==='hollow-ore-west');
    const site=ore&&state.art.drawSites?.[`resource:ore:${Math.round(ore.x)},${Math.round(ore.y)}`];
    if(!site||site.asset!=='copper_ore'||site.draws<1)throw new Error(`${vp.name}: Copper Hollow production ore draw missing ${JSON.stringify(state.art.drawSites)}`);
    if(JSON.stringify(state.art.baseline)!==JSON.stringify(state.art.current))throw new Error(`${vp.name}: Build 30 production art mutated gameplay entities`);
    const overflow=await page.evaluate(()=>({sw:document.documentElement.scrollWidth,iw:innerWidth,sh:document.documentElement.scrollHeight,ih:innerHeight}));
    if(overflow.sw>overflow.iw+1||overflow.sh>overflow.ih+1)throw new Error(`${vp.name}: Build 30 overflow ${JSON.stringify(overflow)}`);
    if(errors.length)throw new Error(`${vp.name}: Build 30 errors:\n${errors.join('\n')}`);
    console.log(`PASS ${vp.name}: Build 30 Copper & Ember is production default`);
    await context.close();
  }
}finally{await browser.close();}
