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

async function openBuild31(page,url,label){
  let lastError;
  for(let attempt=1;attempt<=(live?48:1);attempt++){
    try{
      await page.goto(withParam(url,'build31Live',`${Date.now()}-${attempt}`),{waitUntil:'domcontentloaded',timeout:15000});
      await page.waitForFunction(()=>{
        const d=window.__BRIAR_GLENDebug;
        return Boolean(d?.getBuildInfo&&d?.getAuthoredArtState&&d?.getCharacterArtState&&d.getBuildInfo()?.version==='31');
      },{timeout:7000});
      await page.waitForFunction(()=>{const s=window.__BRIAR_GLENDebug.getCharacterArtState();return s.ready||s.failed;},{timeout:9000});
      return;
    }catch(error){lastError=error;if(live&&attempt<48)await sleep(5000);}
  }
  throw new Error(`${label}: Build 31 production runtime unavailable ${lastError?.message||'unknown'}`);
}

try{
  for(const vp of viewports){
    const context=await browser.newContext({viewport:{width:vp.width,height:vp.height},hasTouch:vp.touch,deviceScaleFactor:1});
    const page=await context.newPage();
    const errors=[];
    page.on('pageerror',e=>errors.push(`pageerror: ${e.message}`));
    page.on('console',m=>{if(m.type()==='error')errors.push(`console: ${m.text()}`);});
    page.on('requestfailed',r=>errors.push(`requestfailed: ${r.url()} • ${r.failure()?.errorText||'unknown'}`));
    await openBuild31(page,target,vp.name);
    await page.evaluate(()=>{const d=window.__BRIAR_GLENDebug;d.teleport(330,20);d.setThreat?.('wolf',{x:455,y:115,hp:52,dead:false,hurt:0});});
    await sleep(450);
    const state=await page.evaluate(()=>({build:window.__BRIAR_GLENDebug.getBuildInfo(),base:window.__BRIAR_GLENDebug.getAuthoredArtState(),cast:window.__BRIAR_GLENDebug.getCharacterArtState()}));
    if(state.build.version!=='31'||state.build.label!=='Living Cast'||state.build.runtime!=='canonical-manifest-hooks-v1')throw new Error(`${vp.name}: incorrect Build 31 release ${JSON.stringify(state.build)}`);
    if(state.base.failed||!state.base.productionDefault||!state.base.hollowDenExpanded||!state.base.enabled||!state.base.ready||state.base.mode!=='authored-copper-ember')throw new Error(`${vp.name}: Build 30 environment baseline inactive ${JSON.stringify(state.base)}`);
    if(state.cast.failed||!state.cast.productionDefault||!state.cast.characterExpanded||!state.cast.requested||!state.cast.enabled||!state.cast.ready||state.cast.mode!=='authored-living-cast'||state.cast.baseArtMode!=='authored-copper-ember')throw new Error(`${vp.name}: Living Cast production default inactive ${JSON.stringify(state.cast)}`);
    if(Object.keys(state.cast.loadedCharacterAssets||{}).length!==6||Object.values(state.cast.loadedCharacterAssets||{}).some(v=>!v.loaded))throw new Error(`${vp.name}: Living Cast source family incomplete ${JSON.stringify(state.cast.loadedCharacterAssets)}`);
    if(state.cast.playerDraws<1||state.cast.enemyDraws<1||state.cast.replacements.player_sword<1||state.cast.replacements.wolf<1)throw new Error(`${vp.name}: Living Cast production draws missing ${JSON.stringify(state.cast)}`);
    if(JSON.stringify(state.cast.baseline)!==JSON.stringify(state.cast.current))throw new Error(`${vp.name}: Living Cast production mutated gameplay entities`);
    const overflow=await page.evaluate(()=>({sw:document.documentElement.scrollWidth,iw:innerWidth,sh:document.documentElement.scrollHeight,ih:innerHeight}));
    if(overflow.sw>overflow.iw+1||overflow.sh>overflow.ih+1)throw new Error(`${vp.name}: Build 31 overflow ${JSON.stringify(overflow)}`);
    if(errors.length)throw new Error(`${vp.name}: Build 31 errors:\n${errors.join('\n')}`);
    console.log(`PASS ${vp.name}: Build 31 Living Cast is production default`);
    await context.close();
  }
}finally{await browser.close();}