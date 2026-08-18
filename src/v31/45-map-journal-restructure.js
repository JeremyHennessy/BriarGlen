(() => {
  'use strict';
  const runtime=window.__BRIAR_GLEN_RUNTIME,debug=window.__BRIAR_GLENDebug;
  const panel=document.getElementById('warden-overlay');
  const side=document.querySelector('.map-sidecard');
  const columns=document.querySelector('#warden-journal-view .journal-columns');
  if(!runtime||!debug||!panel||!side||!columns)return;
  const style=document.createElement('link');style.rel='stylesheet';style.href='styles-v35.css';document.head.appendChild(style);
  panel.classList.add('warden35');
  side.insertAdjacentHTML('beforeend','<div id="map35-destination"></div><div id="map35-regions" class="map35-list"></div><div class="eyebrow map35-route-title">ROUTES</div><div id="map35-routes" class="map35-routes"></div>');
  const record=document.createElement('section');record.id='journal35-record';record.className='journal35-record';record.innerHTML='<section class="journal-card"><div class="eyebrow">REGIONAL PROGRESS</div><div id="journal35-regions" class="journal35-grid"></div></section><section class="journal-card"><div class="eyebrow">SPECIALIST TRAITS</div><div id="journal35-traits" class="journal35-grid"></div></section><section class="journal-card"><div class="eyebrow">ECONOMY MILESTONES</div><div id="journal35-economy" class="journal35-grid"></div></section>';
  columns.before(record);
  const REGIONS=[
    ['briar','Briar Glen','Briarleaf • Rowan supplies','—','Field Medicine'],
    ['meadow','Meadow Road','Briarleaf • Boar Tusks','—','Hollow Patrol'],
    ['hollow','Copper Hollow','Copper Ore • Deepvein Iron','—','Copper Order'],
    ['den','Emberback Den','Copper Ore','Emberback','Cull the Briar'],
    ['grove','Mooncap Grove','Mooncaps • Grove wood','Grovekeeper','Medicine supply'],
    ['fen','Mosswater Fen','Mossglass','Drowned Warden','Mosswater Survey'],
    ['stonepine','Stonepine Reach','Ironpine Resin','Quarry Sentinel','Quarry Patrol'],
  ];
  const ROUTES=[['Greenway','briar','meadow'],['Copper Road','meadow','hollow'],['Ember Track','hollow','den'],['Grove Trail','meadow','grove'],['Old Rootway','rootway','rootway'],['Fen Crossing','fen','fen'],['Timberline Pass','stonepine','stonepine']];
  const discovered=key=>key==='rootway'?!!progress.mapDiscoveries?.rootway:!!progress.mapDiscoveries?.[key];
  function destination(){const text=(objectiveText?.()||'').toLowerCase();if(text.includes('stonepine')||text.includes('quarry')||text.includes('resin'))return'Stonepine Reach';if(text.includes('fen')||text.includes('mosswater')||text.includes('mossglass'))return'Mosswater Fen';if(text.includes('grove')||text.includes('mooncap'))return'Mooncap Grove';if(text.includes('ember')||text.includes('den'))return'Emberback Den';if(text.includes('hollow')||text.includes('copper')||text.includes('alden'))return'Copper Hollow';if(text.includes('rowan')||text.includes('board')||text.includes('briar glen'))return'Briar Glen';return zoneFor(player.x,player.y).name;}
  function traits(){const names={forceful:'Forceful',swift:'Swift'};return['sword','bow','staff'].map(w=>[w[0].toUpperCase()+w.slice(1),names[progress.specialistTraits?.[w]]||'Not finished']);}
  function economy(){return[['Board jobs',progress.boardContractsCompleted||0],['Rowan market',progress.market14?.purchases||progress.stonepineSupply?.purchases? 'Engaged':'Not engaged'],['Warden responses',progress.wardenResponsesCompleted||progress.responseOrdersCompleted||0],['Stonepine patrols',progress.stonepineWork?.completed||0]];}
  function render(){
    const dest=destination();document.getElementById('map35-destination').innerHTML=`<div class="eyebrow">OBJECTIVE DESTINATION</div><strong>${dest}</strong>`;
    document.getElementById('map35-regions').innerHTML=REGIONS.map(([key,name,res,boss,contract])=>`<article class="map35-region ${discovered(key)?'charted':'unknown'}"><b>${discovered(key)?name:'Undiscovered region'}</b><small>${discovered(key)?`${res}<br>Boss: ${boss} • Contract: ${contract}`:'Routes and resources uncharted'}</small></article>`).join('');
    document.getElementById('map35-routes').innerHTML=ROUTES.map(([name,a,b])=>{const open=discovered(a)&&discovered(b);return`<span class="${open?'open':'closed'}">${open?'●':'○'} ${name}</span>`}).join('');
    document.getElementById('journal35-regions').innerHTML=REGIONS.map(([key,name,res,boss])=>`<div><b>${discovered(key)?name:'Undiscovered'}</b><small>${discovered(key)?`${res} • ${boss==='—'?'No boss recorded':boss}`:'No field notes'}</small></div>`).join('');
    document.getElementById('journal35-traits').innerHTML=traits().map(([a,b])=>`<div><b>${a}</b><small>${b}</small></div>`).join('');
    document.getElementById('journal35-economy').innerHTML=economy().map(([a,b])=>`<div><b>${a}</b><small>${b}</small></div>`).join('');
  }
  const baseOpenMap=debug.openMap,baseOpenJournal=debug.openJournal;debug.openMap=()=>{const result=baseOpenMap();render();return result};debug.openJournal=()=>{const result=baseOpenJournal();render();return result};
  debug.getMapJournal35State=()=>({destination:destination(),regions:REGIONS.map(([key,name,resources,boss,contract])=>({key,name,discovered:discovered(key),resources,boss,contract})),routes:ROUTES.map(([name,a,b])=>({name,discovered:discovered(a)&&discovered(b)})),traits:Object.fromEntries(traits()),economy:Object.fromEntries(economy()),cssLoaded:[...document.styleSheets].some(s=>(s.href||'').includes('styles-v35.css'))});
  runtime.registerHook('afterUpdateUI','build35-map-journal-render',()=>{if(!panel.hidden)render()},1700);render();
})();
