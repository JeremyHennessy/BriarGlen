(() => {
  'use strict';
  const runtime=window.__BRIAR_GLEN_RUNTIME,debug=window.__BRIAR_GLENDebug;
  if(!runtime?.registerHook||!debug?.getWorldLayoutV2State)return;

  const start=performance.now()/1000;
  const states=new WeakMap();
  let engagements=0;

  function hash(npc){
    const text=`${npc?.name||npc?.type||'npc'}|${Math.round(npc?.x||0)}|${Math.round(npc?.y||0)}`;
    let h=2166136261>>>0;for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619)>>>0;}return h>>>0;
  }
  function stateFor(npc){
    if(states.has(npc))return states.get(npc);
    const s={releaseAt:start+.35+(hash(npc)%6)*.27,counted:false};states.set(npc,s);return s;
  }

  // Runs just after World Layout V2's own beforeUpdate hook. That hook restores each NPC's
  // canonical base speed first; this hook then applies only the short deterministic start idle.
  runtime.registerHook('beforeUpdate','build43-npc-initial-stagger',()=>{
    const layout=debug.getWorldLayoutV2State?.();
    if(!layout?.enabled)return;
    const now=performance.now()/1000;
    for(const npc of worldObjects.filter(o=>o.type==='npc')){
      const s=stateFor(npc);
      if(now<s.releaseAt){
        npc.speed=0;
        if(!s.counted){s.counted=true;engagements++;}
      }
    }
  },2460);

  const priorGet=debug.getWorldLayoutV2State;
  debug.getWorldLayoutV2State=()=>{
    const value=priorGet();
    return {...value,npcIdles:(value.npcIdles||0)+engagements,initialNpcIdles:engagements};
  };
  debug.getNpcInitialStaggerState=()=>({engagements,npcs:worldObjects.filter(o=>o.type==='npc').length});
})();
