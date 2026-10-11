(function(){
'use strict';
window.createBattleView=function(battle,onContinue,onRestart){
 const panel=document.querySelector('#battle-panel'),hud=document.querySelector('#battle-hud');let lastPhase='';
 const set=(id,value)=>{document.getElementById(id).textContent=value;};
 function update(){
  set('hp-text',Math.ceil(battle.hp)+' / '+battle.maxHp);set('energy-text',Math.floor(battle.energy)+' / '+battle.maxEnergy);
  document.querySelector('#hp-fill').style.width=battle.hp/battle.maxHp*100+'%';document.querySelector('#energy-fill').style.width=battle.energy/battle.maxEnergy*100+'%';document.querySelector('#xp-fill').style.width=battle.xp/battle.needed*100+'%';
  if(window.EnemyView)EnemyView.soundEvents(battle);
  set('level-text','Lv. '+battle.level);set('xp-text',battle.xp+' / '+battle.needed);document.querySelector('.wave-hud').hidden=battle.mode!=='campaign'||battle.phase!=='fight';set('wave-text','第 '+battle.wave+' 关');set('wave-time',battle.wave===5?'奶熊':Math.ceil(battle.remaining)+' 秒');set('kill-text','击败 '+battle.kills);
  set('stats-text','攻击 '+battle.attack+' · 攻速 '+battle.attackSpeed.toFixed(2)+'× · 护甲 '+battle.armor);
  const notice=document.querySelector('#battle-notice');notice.textContent=battle.notice;notice.hidden=battle.noticeTime<=0||!battle.active;
  if(battle.phase==='cinematic'||battle.phase==='complete'){panel.hidden=true;return;}if(lastPhase===battle.phase)return;lastPhase=battle.phase;panel.replaceChildren();panel.hidden=battle.active;hud.classList.toggle('hurt',battle.phase==='dead');if(battle.active)return;
  const card=document.createElement('div');card.className='result-card'+(battle.phase==='reward'?' reward-card':'');panel.append(card);
  const kicker=document.createElement('div');kicker.className='eyebrow';kicker.textContent=battle.phase==='reward'?'A MOMENT TO GROW':'THE GARDEN REMEMBERS';card.append(kicker);
  const title=document.createElement('h2');title.textContent=battle.phase==='reward'?'第 '+battle.wave+' 关完成':battle.phase==='complete'?(battle.mode==='boss'?'奶熊已击败':'五关完成'):'旅途暂歇';card.append(title);
  const info=document.createElement('p');info.textContent=battle.phase==='reward'?'选择一项永久强化，进入下一关。':'到达第 '+battle.wave+' 波 · 等级 '+battle.level+' · 击败 '+battle.kills+' 只小怪';card.append(info);
  const choices=document.createElement('div');choices.className='reward-choices';card.append(choices);
  const options=battle.phase==='reward'?[['haste','攻速 +20%','普通攻击更快'],['power','攻击 +20%','普攻与技能伤害提升'],['vigor','生命 +20%','提高生命上限并补足新增生命']]:battle.phase==='dead'?[['revive','重生','恢复生命，保留当前战斗'],['home','返回主菜单','']]:[['restart','再来一次','重新开始'],['home','返回主菜单','']];
  for(const [id,label,desc]of options){const button=document.createElement('button'),strong=document.createElement('strong'),small=document.createElement('span');strong.textContent=label;small.textContent=desc;button.append(strong,small);button.onclick=()=>{if(['haste','power','vigor'].includes(id))window.Game.reward(id);else if(id==='revive')window.Game.revive();else if(id==='restart')onRestart();else window.GameShell.home();update();};choices.append(button);}

 }
 function drawDrops(ctx){for(const d of battle.drops){ctx.save();ctx.translate(d.x,d.y-6);ctx.fillStyle=d.type==='xp'?'#9af5df':'#ff999f';ctx.strokeStyle=d.type==='xp'?'#367b73':'#813e58';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(0,-7);ctx.lineTo(5,0);ctx.lineTo(0,7);ctx.lineTo(-5,0);ctx.closePath();ctx.fill();ctx.stroke();ctx.fillStyle='#ffffffaa';ctx.fillRect(-1,-4,2,3);ctx.restore();}}
 function drawEnemy(ctx,e){const bob=Math.sin(e.age*7+e.id)*2;ctx.save();ctx.globalAlpha=Math.min(1,e.age/.45);ctx.translate(Math.round(e.x),Math.round(e.y));ctx.fillStyle='#20362d55';ctx.beginPath();ctx.ellipse(0,0,e.radius,5,0,0,Math.PI*2);ctx.fill();ctx.translate(0,-12+bob);ctx.lineWidth=2;ctx.strokeStyle='#283c39';ctx.fillStyle=e.flash>0?'#fff9dc':ENEMY_TYPES[e.type].color;
  if(e.type===0){ctx.beginPath();ctx.moveTo(-17,8);ctx.quadraticCurveTo(-18,-15,0,-15);ctx.quadraticCurveTo(18,-15,17,8);ctx.quadraticCurveTo(0,15,-17,8);ctx.fill();ctx.stroke();ctx.fillStyle='#d0ec9d';ctx.fillRect(-9,-7,6,3);}
  else if(e.type===1){const flap=Math.sin(e.age*18)*7;ctx.beginPath();ctx.moveTo(-5,-5);ctx.lineTo(-28,-14+flap);ctx.lineTo(-19,6);ctx.lineTo(-8,3);ctx.lineTo(0,10);ctx.lineTo(8,3);ctx.lineTo(19,6);ctx.lineTo(28,-14+flap);ctx.lineTo(5,-5);ctx.closePath();ctx.fill();ctx.stroke();ctx.beginPath();ctx.ellipse(0,-1,9,12,0,0,Math.PI*2);ctx.fill();ctx.stroke();}
  else{for(const sign of [-1,1])for(let i=0;i<3;i++){ctx.beginPath();ctx.moveTo(sign*12,-8+i*7);ctx.lineTo(sign*(23+(i%2)*3),-12+i*10);ctx.stroke();}ctx.beginPath();ctx.ellipse(0,0,18,20,0,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.beginPath();ctx.moveTo(0,-18);ctx.lineTo(0,18);ctx.stroke();}
  ctx.fillStyle='#243531';ctx.fillRect(-6,-1,3,4);ctx.fillRect(4,-1,3,4);ctx.fillStyle='#fff5dc';ctx.fillRect(-6,-1,1,1);ctx.fillRect(4,-1,1,1);ctx.restore();
  if(e.hp<e.maxHp){ctx.fillStyle='#20312bcc';ctx.fillRect(e.x-17,e.y-e.radius*2-13,34,4);ctx.fillStyle='#f1b384';ctx.fillRect(e.x-17,e.y-e.radius*2-13,34*Math.max(0,e.hp/e.maxHp),4);}
 }
 function drawEnemies(ctx,y,front){if(front&&battle.phase==='outro'&&!battle.finalBoss.vanished)EnemyView.drawEnemy(ctx,battle.finalBoss);if(!front&&window.EnemyView)EnemyView.ground(ctx,battle);for(const e of [...battle.enemies].sort((a,b)=>a.y-b.y))if((e.y>y)===front)(window.EnemyView?EnemyView.drawEnemy:drawEnemy)(ctx,e);if(front&&window.EnemyView)EnemyView.effects(ctx,battle);}
 function drawNumbers(ctx){ctx.save();ctx.font='bold 15px PixelGame';ctx.textAlign='center';for(const n of battle.numbers){ctx.globalAlpha=Math.min(1,n.life*3);ctx.strokeStyle='#172b2b';ctx.lineWidth=3;ctx.strokeText(n.text,n.x,n.y);ctx.fillStyle=n.color;ctx.fillText(n.text,n.x,n.y);}ctx.restore();}
 return {update,drawDrops,drawEnemies,drawNumbers};
};
})();

