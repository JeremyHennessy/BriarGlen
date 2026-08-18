(() => {
  'use strict';
  const runtime=window.__BRIAR_GLEN_RUNTIME,debug=window.__BRIAR_GLENDebug;if(!runtime||!debug?.getWardenResponseState)return;
  const style=document.createElement('link');style.rel='stylesheet';style.href='styles-v38.css';document.head.appendChild(style);document.documentElement.dataset.build38Economy='true';
  const FAMILIES=Object.freeze({
    copper_order:Object.freeze({family:'Hollow maintenance',title:'Hollow Maintenance Refit',note:'Alden trusts repeat Warden work with a larger repair batch and accepts reclaimed low-tier stock.',preferred:Object.freeze({weapon:'sword',trait:'forceful',label:'Quarry Edge',standard:'ore',alternate:'ore'}),options:Object.freeze([
      Object.freeze({id:'workshop',label:'Workshop stock',req:Object.freeze({oil:1,ore:3,hide:1}),reward:Object.freeze({coins:120,iron:1,binding:1})}),
      Object.freeze({id:'reclaimed',label:'Reclaimed field stock',req:Object.freeze({oil:1,ore:5,herb:2}),reward:Object.freeze({coins:120,iron:1,binding:1})}),
    ])}),
    field_medicine:Object.freeze({family:'Field medicine',title:'Road Apothecary Batch',note:'Mira’s repeat order can use concentrated medicine or a larger bundle of common field plants.',preferred:Object.freeze({weapon:'staff',trait:'swift',label:'Mooncap Wrap',standard:'tonic',alternate:'tonic'}),options:Object.freeze([
      Object.freeze({id:'concentrated',label:'Concentrated medicine',req:Object.freeze({tonic:3,mooncap:2}),reward:Object.freeze({coins:110,binding:2})}),
      Object.freeze({id:'field_bundle',label:'Field-plant bundle',req:Object.freeze({tonic:2,herb:4,mooncap:1}),reward:Object.freeze({coins:110,binding:2})}),
    ])}),
    mosswater_survey:Object.freeze({family:'Fen preparation',title:'Fen Expedition Stores',note:'Repeat survey work opens a choice between treated Warden stores and a larger low-tier forage bundle.',preferred:Object.freeze({weapon:'bow',trait:'swift',label:'Briar Weave',standard:'oil',alternate:'herb'}),options:Object.freeze([
      Object.freeze({id:'treated',label:'Treated stores',req:Object.freeze({oil:2,mossglass:1,tonic:1}),reward:Object.freeze({coins:135,resin:2,binding:1})}),
      Object.freeze({id:'foraged',label:'Foraged preparation',req:Object.freeze({oil:1,mossglass:1,herb:3,mooncap:2}),reward:Object.freeze({coins:135,resin:2,binding:1})}),
    ])}),
  });
  const clone=value=>Object.fromEntries(Object.entries(value||{}));
  function plan({sourceId,base,completed,traits}){const def=FAMILIES[sourceId];if(!def||completed<1)return base;const preferred=traits?.[def.preferred.weapon]===def.preferred.trait;const options=def.options.map((entry,index)=>{const req=clone(entry.req),key=index?def.preferred.alternate:def.preferred.standard;if(preferred&&req[key]>0)req[key]=Math.max(0,req[key]-1);return{id:entry.id,label:entry.label,req,reward:clone(entry.reward),traitNote:preferred?`${def.preferred.label} saves 1 ${key==='ore'?'Copper':key==='tonic'?'Healing Tonic':key==='oil'?'Warden Oil':'Briarleaf'}`:null};});return{advanced:true,family:def.family,title:def.title,note:def.note,options};}
  function record(counts={}){const proven=Object.entries(FAMILIES).filter(([id])=>Number(counts[id]||0)>0).map(([,def])=>def.family);return{proven,summary:proven.length?proven.join(' • '):'No repeat clients yet'};}
  window.__BRIAR_GLEN_SPECIALIST_ECONOMY38=Object.freeze({plan,record,families:FAMILIES});
  debug.getSpecialistEconomyState=()=>{const response=debug.getWardenResponseState(),history=response.completedBySource||{};return{record:record(history),history:{...history},active:response.active,oneActiveOrder:response.active?1:0,currency:'coins',schema:1,entityCounts:{objects:worldObjects.length,resources:resources.length,enemies:enemies.length},cssLoaded:[...document.styleSheets].some(s=>(s.href||'').includes('styles-v38.css'))};};
})();
