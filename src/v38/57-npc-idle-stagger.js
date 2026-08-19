(() => {
  'use strict';
  const runtime=window.__BRIAR_GLEN_RUNTIME,debug=window.__BRIAR_GLENDebug;
  if(!runtime?.registerHook||!debug?.getWorldLayoutV2State)return;

  const start=performance.now()/1000;
  const states=new WeakMap();
  let engagements=0;

  function stateFor(npc,index){
    if(states.has(npc))return states.get(npc);
    // Keep one lead villager moving immediately so the settlement never presents as frozen.
    // Remaining villagers enter short staggered pauses, avoiding synchronized first-step motion.
    const releaseAt=index===0?start:start+.34+(index-1)*.24;
    const s={releaseAt,counted:false};states.set(npc,s);return s;
  }

  // Runs just after World Layout V2's own beforeUpdate hook. That hook restores each NPC's
  // canonical base speed first; this hook then applies only the short deterministic start idle.
  runtime.registerHook('beforeUpdate','build43-npc-initial-stagger',()=>{
    const layout=debug.getWorldLayoutV2State?.();
    if(!layout?.enabled)return;
    const now=performance.now()/1000;
    const npcs=worldObjects.filter(o=>o.type==='npc');
    npcs.forEach((npc,index)=>{
      const s=stateFor(npc,index);
      if(now<s.releaseAt){
        npc.speed=0;
        if(!s.counted){s.counted=true;engagements++;}
      }
    });
  },2460);

  const priorGet=debug.getWorldLayoutV2State;
  debug.getWorldLayoutV2State=()=>{
    const value=priorGet();
    return {...value,npcIdles:(value.npcIdles||0)+engagements,initialNpcIdles:engagements};
  };
  debug.getNpcInitialStaggerState=()=>({engagements,npcs:worldObjects.filter(o=>o.type==='npc').length,leadMovesImmediately:true});
})();
