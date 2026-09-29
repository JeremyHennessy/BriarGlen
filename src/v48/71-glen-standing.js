(() => {
  'use strict';

  // Build 42: make the original "useful and known" fantasy visible without adding a new grind.
  // Standing is derived from work the player already does: Board jobs, response orders,
  // repeat clients, masterwork finishing and the first named encounter.
  const runtime=window.__BRIAR_GLEN_RUNTIME,debug=window.__BRIAR_GLENDebug;
  if(!runtime||!debug)return;

  if(!progress.glenStanding42||typeof progress.glenStanding42!=='object')progress.glenStanding42={};
  const memory=progress.glenStanding42;
  const baselineEntities={objects:worldObjects.length,resources:resources.length,enemies:enemies.length};

  function finite(value){const n=Number(value);return Number.isFinite(n)?Math.max(0,n):0;}
  function deeds(){
    const board=debug.getBoardState?.();
    const contracts=Math.max(finite(board?.completed),finite(progress.boardContractsCompleted));
    const response=progress.wardenResponse32||{};
    const responses=finite(response.fulfilled);
    const traits=Object.values(progress.specialistTraits||{}).filter(Boolean).length;
    const repeatRecord=window.__BRIAR_GLEN_SPECIALIST_ECONOMY38?.record?.(response.completedBySource||{});
    const repeatClients=Array.isArray(repeatRecord?.proven)?repeatRecord.proven.length:0;
    return{contracts,responses,traits,repeatClients,emberback:!!progress.bossDefeated};
  }

  function standing(){
    const d=deeds();
    let rank=0,title='Unknown Apprentice';
    if(d.emberback||d.contracts>=1){rank=1;title='Road Warden';}
    if(d.responses>=1||d.contracts>=3){rank=2;title='Known Hand';}
    if(d.traits>=1&&(d.responses>=1||d.repeatClients>=1)){rank=3;title='Trusted Specialist';}
    if(d.traits>=1&&d.responses>=3&&d.repeatClients>=2){rank=4;title='Briar Glen Mainstay';}

    let knownFor='Learning the work';
    if(d.repeatClients>=1&&d.traits>=1)knownFor='Specialist supply work';
    else if(d.traits>=1)knownFor='Finished masterwork';
    else if(d.responses>=1)knownFor='Reliable town supply';
    else if(d.contracts>=1)knownFor='Contract Board work';
    else if(d.emberback)knownFor='Opening the Emberback road';

    const next=[
      'Help on the road, through the Board, or against Emberback',
      'Turn field work into a town response order',
      'Finish a masterwork path and make your work distinctive',
      'Build repeat work into dependable local trade',
      'Keep choosing the work that defines your place here',
    ][rank];

    return{rank,title,knownFor,next,deeds:d};
  }

  function isHome(){
    return /BRIAR GLEN/i.test(zoneFor(player.x,player.y)?.name||'');
  }

  let wasHome=isHome();
  const initial=standing();
  if(!Number.isFinite(Number(memory.lastAnnouncedRank))){
    memory.lastAnnouncedRank=initial.rank>0?initial.rank-1:0;
  }
  if(!Number.isFinite(Number(memory.homecomings)))memory.homecomings=0;

  function renderJournal(){
    const grid=document.getElementById('journal35-economy');
    if(!grid)return;
    const s=standing();
    const rows=[
      ['standing','Standing',s.title],
      ['known','Known for',s.knownFor],
      ['next','Next proof',s.next],
    ];
    for(const [key,label,value] of rows){
      let row=grid.querySelector(`[data-glen-standing="${key}"]`);
      if(!row){
        row=document.createElement('div');
        row.dataset.glenStanding=key;
        row.innerHTML='<b></b><small></small>';
        grid.prepend(row);
      }
      row.querySelector('b').textContent=label;
      row.querySelector('small').textContent=value;
    }
  }

  function homecoming(){
    const home=isHome();
    if(home&&!wasHome){
      memory.homecomings=finite(memory.homecomings)+1;
      const s=standing();
      if(s.rank>finite(memory.lastAnnouncedRank)){
        memory.lastAnnouncedRank=s.rank;
        toast(`Briar Glen knows your work — ${s.title}`);
        saveGame();
      }
    }
    wasHome=home;
  }

  runtime.registerHook('afterUpdate','build42-glen-standing-homecoming',homecoming,1760);
  runtime.registerHook('afterUpdateUI','build42-glen-standing-journal',renderJournal,1760);

  debug.getGlenStandingState=()=>{
    const s=standing();
    return{
      ...s,
      lastAnnouncedRank:finite(memory.lastAnnouncedRank),
      homecomings:finite(memory.homecomings),
      home:isHome(),
      baselineEntities:{...baselineEntities},
      entityCounts:{objects:worldObjects.length,resources:resources.length,enemies:enemies.length},
    };
  };
  debug.refreshGlenStanding=()=>{renderJournal();return debug.getGlenStandingState();};

  renderJournal();
})();