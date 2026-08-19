import { chromium } from 'playwright';

const target = process.argv[2] || 'http://127.0.0.1:4173/';
const live = process.argv.includes('--live');
const viewports = [
  { name:'phone-landscape', width:932, height:430, touch:true },
  { name:'phone-portrait', width:430, height:932, touch:true },
  { name:'desktop', width:1440, height:900, touch:false },
];
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const browser = await chromium.launch({ headless:true });

async function signature(page) {
  return page.evaluate(() => {
    const canvas=document.getElementById('game'), ctx=canvas.getContext('2d');
    const data=ctx.getImageData(0,0,canvas.width,canvas.height).data;
    const stride=Math.max(4,Math.floor((canvas.width*canvas.height)/20000))*4;
    let hash=2166136261>>>0; const colors=new Set();
    for(let i=0;i<data.length;i+=stride){
      const r=data[i],g=data[i+1],b=data[i+2],a=data[i+3];
      hash^=r;hash=Math.imul(hash,16777619)>>>0;hash^=g;hash=Math.imul(hash,16777619)>>>0;hash^=b;hash=Math.imul(hash,16777619)>>>0;
      colors.add(`${r>>3},${g>>3},${b>>3},${a>>5}`);
    }
    return {hash,colors:colors.size};
  });
}

try {
  for (const vp of viewports) {
    const context=await browser.newContext({viewport:{width:vp.width,height:vp.height},hasTouch:vp.touch,deviceScaleFactor:1});
    const page=await context.newPage();
    const errors=[];
    page.on('pageerror',e=>errors.push(`pageerror: ${e.message}`));
    page.on('console',m=>{if(m.type()==='error')errors.push(`console: ${m.text()}`);});

    let loaded=false,lastError;
    for(let attempt=1;attempt<=(live?48:1);attempt++){
      try{
        const sep=target.includes('?')?'&':'?';
        await page.goto(`${target}${sep}sourceArt47=0&art20=${Date.now()}-${attempt}`,{waitUntil:'domcontentloaded',timeout:15000});
        await page.waitForFunction(()=>Boolean(window.__BRIAR_GLENDebug?.getHollowDenArtState&&window.__BRIAR_GLENDebug?.getBuildInfo),{timeout:7000});
        loaded=true;break;
      }catch(error){lastError=error;if(live&&attempt<48)await sleep(5000);}
    }
    if(!loaded)throw new Error(`${vp.name}: Build 20+ art runtime unavailable: ${lastError?.message||'unknown'}`);

    await page.evaluate(()=>localStorage.removeItem('briar-glen-vslice-v1'));
    await page.reload({waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>Boolean(window.__BRIAR_GLENDebug?.getHollowDenArtState));

    const build=await page.evaluate(()=>window.__BRIAR_GLENDebug.getBuildInfo());
    if(Number.parseFloat(build.version)<20||build.saveKey!=='briar-glen-vslice-v1')throw new Error(`${vp.name}: incorrect Build 20+ metadata ${JSON.stringify(build)}`);

    await page.evaluate(()=>{const d=window.__BRIAR_GLENDebug;d.setHollowDenArtEnabled(true);d.teleport(1040,120);});
    await sleep(240);
    let state=await page.evaluate(()=>window.__BRIAR_GLENDebug.getHollowDenArtState());
    const baseline={...state.entityCounts};
    if(state.style!=='storybook-hollow-den-v1'||state.hollowMarkCount<160||state.denMarkCount<140)throw new Error(`${vp.name}: Build 20 detail budget incorrect ${JSON.stringify(state)}`);
    if(!state.zone.includes('COPPER')||state.frame.hollowGround<12||state.frame.hollowObjects<1||state.frame.hollowResources<1||state.frame.hollowEnemies<1||state.frame.ambient<2){
      throw new Error(`${vp.name}: Copper Hollow visual identity incomplete ${JSON.stringify(state)}`);
    }
    const hollowOn=await signature(page), hollowFrames=state.frames;
    await page.waitForFunction(before=>window.__BRIAR_GLENDebug.getHollowDenArtState().frames>=before+5,hollowFrames,{timeout:3000});
    state=await page.evaluate(()=>window.__BRIAR_GLENDebug.getHollowDenArtState());
    if(state.frames-hollowFrames<5)throw new Error(`${vp.name}: Hollow renderer cadence stalled`);
    if(JSON.stringify(state.entityCounts)!==JSON.stringify(baseline))throw new Error(`${vp.name}: Hollow renderer mutated entities`);

    await page.evaluate(()=>window.__BRIAR_GLENDebug.setHollowDenArtEnabled(false));
    await sleep(130);
    const hollowOffState=await page.evaluate(()=>window.__BRIAR_GLENDebug.getHollowDenArtState());
    const hollowOff=await signature(page);
    if(hollowOffState.frame.hollowGround!==0||hollowOffState.frame.hollowObjects!==0||hollowOffState.frame.hollowResources!==0||hollowOffState.frame.hollowEnemies!==0||hollowOffState.frame.ambient!==0)throw new Error(`${vp.name}: Hollow debug disable did not fall through ${JSON.stringify(hollowOffState.frame)}`);
    if(hollowOn.hash===hollowOff.hash)throw new Error(`${vp.name}: Hollow art produced no measurable Canvas delta`);

    await page.evaluate(()=>{const d=window.__BRIAR_GLENDebug;d.setHollowDenArtEnabled(true);d.teleport(1900,0);});
    await sleep(240);
    state=await page.evaluate(()=>window.__BRIAR_GLENDebug.getHollowDenArtState());
    if(!state.zone.includes('EMBERBACK')||state.frame.denGround<12||state.frame.denObjects<1||state.frame.denEnemies<1||state.frame.ambient<2)throw new Error(`${vp.name}: Emberback Den visual identity incomplete ${JSON.stringify(state)}`);
    const denOn=await signature(page),denFrames=state.frames;
    await page.waitForFunction(before=>window.__BRIAR_GLENDebug.getHollowDenArtState().frames>=before+5,denFrames,{timeout:3000});
    state=await page.evaluate(()=>window.__BRIAR_GLENDebug.getHollowDenArtState());
    if(state.frames-denFrames<5)throw new Error(`${vp.name}: Den renderer cadence stalled`);
    if(JSON.stringify(state.entityCounts)!==JSON.stringify(baseline))throw new Error(`${vp.name}: Den renderer mutated entities`);

    await page.evaluate(()=>window.__BRIAR_GLENDebug.setHollowDenArtEnabled(false));
    await sleep(130);
    const denOffState=await page.evaluate(()=>window.__BRIAR_GLENDebug.getHollowDenArtState());
    const denOff=await signature(page);
    if(denOffState.frame.denGround!==0||denOffState.frame.denObjects!==0||denOffState.frame.denEnemies!==0||denOffState.frame.ambient!==0)throw new Error(`${vp.name}: Den debug disable did not fall through ${JSON.stringify(denOffState.frame)}`);
    if(denOn.hash===denOff.hash)throw new Error(`${vp.name}: Den art produced no measurable Canvas delta`);

    await page.evaluate(()=>{const d=window.__BRIAR_GLENDebug;d.setHollowDenArtEnabled(true);d.setCameraShake(12);});
    await sleep(40);
    const feedbackAfter=await page.evaluate(()=>window.__BRIAR_GLENDebug.getFeedbackTuningState());
    if(feedbackAfter.renderedAmplitude>1.55||Math.hypot(feedbackAfter.frameX,feedbackAfter.frameY)>1.95)throw new Error(`${vp.name}: Build 20+ regressed gentle feedback ${JSON.stringify(feedbackAfter)}`);
    await page.evaluate(()=>window.__BRIAR_GLENDebug.setCameraShake(0));

    const overflow=await page.evaluate(()=>({sw:document.documentElement.scrollWidth,iw:innerWidth,sh:document.documentElement.scrollHeight,ih:innerHeight}));
    if(overflow.sw>overflow.iw+1||overflow.sh>overflow.ih+1)throw new Error(`${vp.name}: Build 20+ caused browser overflow ${JSON.stringify(overflow)}`);
    if(errors.length)throw new Error(`${vp.name}: runtime errors:\n${errors.join('\n')}`);
    console.log(`PASS ${vp.name}: Copper Hollow + Emberback Den visual identity active with gentle feedback preserved`);
    await context.close();
  }
} finally { await browser.close(); }
