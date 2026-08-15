(() => {
  'use strict';

  // Build 17's custom enemies still use the verified base bite windup at close range.
  // Resolve that small inherited state here without reaching back into a private wrapper.
  const build17UpdateEnemy = updateEnemy;
  updateEnemy = function build17MeleeResolution(e, dt) {
    const stoneType = e && ['ridgehorn','quarrysentinel'].includes(e.type);
    const customBusy = !!e?.__stonepine?.mode;
    if (stoneType && !e.dead && !customBusy && e.pendingAttack === 'bite' && e.windup > 0) {
      e.attackCd = Math.max(0, e.attackCd - dt);
      e.specialCd = Math.max(0, e.specialCd - dt);
      e.hurt = Math.max(0, e.hurt - dt);
      if (e.__stonepine) e.__stonepine.cooldown = Math.max(0, (e.__stonepine.cooldown || 0) - dt);
      e.windup -= dt;
      if (e.windup <= 0) {
        e.windup = 0;
        e.pendingAttack = null;
        if (dist(e, player) <= e.attackRange + player.radius + 15) damagePlayer(e.damage, e);
      }
      return;
    }
    return build17UpdateEnemy(e, dt);
  };
})();
