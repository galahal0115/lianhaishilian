/* Combat simulation is independent of artwork so enemy models can be replaced. */
(function(root){
'use strict';
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const TYPES=[
 {name:'苔团',hp:24,speed:43,damage:8,xp:4,radius:15,color:'#8ec96a'},
 {name:'夜翼',hp:18,speed:78,damage:7,xp:3,radius:12,color:'#ae8ddd'},
 {name:'甲虫',hp:58,speed:31,damage:13,xp:8,radius:19,color:'#dc9970'}
];
class Battle {
 constructor(rng=Math.random){this.rng=rng;this.reset();}
 reset(){Object.assign(this,{phase:'fight',wave:1,remaining:35,spawnTime:1.5,enemies:[],drops:[],numbers:[],kills:0,waveKills:0,id:0,level:1,xp:0,needed:12,hp:100,maxHp:100,energy:100,maxEnergy:100,attack:18,attackSpeed:1,hasteMultiplier:1,armor:2,invincible:0,time:0,notice:'撑过 35 秒，收集晶石提升等级',noticeTime:4});}
 get active(){return this.phase==='fight';}
 get cost(){return [0,15,30,50];}
 canSkill(){return this.energy>=15;}
 spendSkill(tier){while(tier>1&&this.energy<this.cost[tier])tier--;if(!this.canSkill())return 0;this.energy-=this.cost[tier];return tier;}
 float(){/* Floating combat text is disabled; hits use visual/audio feedback. */}
 gainXP(amount){this.xp+=amount;while(this.xp>=this.needed){this.xp-=this.needed;this.level++;this.needed=Math.ceil(12*Math.pow(1.32,this.level-1));this.maxHp+=8;this.hp=Math.min(this.maxHp,this.hp+20);this.attack+=2;this.attackSpeed=Math.min(2.2*this.hasteMultiplier,this.attackSpeed+.025*this.hasteMultiplier);this.notice='升级！Lv.'+this.level+' · 生命 +8 / 攻击 +2 / 攻速提升';this.noticeTime=3;}}
 spawn(hero){
  const side=Math.floor(this.rng()*4),x=side===0?66:side===1?894:90+this.rng()*780,y=side===2?136:side===3?546:155+this.rng()*370;
  if(Math.hypot(x-hero.x,y-hero.y)<120){this.spawnTime=.2;return;}
  const pool=this.wave===1?[0]:this.wave===2?[0,1]:this.wave%3===0?[1,2]:[0,1,2];
  const type=pool[Math.floor(this.rng()*pool.length)],base=TYPES[type],strength=1+.24*Math.pow(this.wave-1,1.12),hp=Math.round(base.hp*strength);
  this.enemies.push({id:++this.id,type,x,y,hp,maxHp:hp,speed:base.speed*(1+Math.min(.65,(this.wave-1)*.04)),damage:base.damage*(1+(this.wave-1)*.12),xp:base.xp,radius:base.radius,age:0,flash:0,knockX:0,knockY:0});
 }
 hurtEnemy(e,damage,source){
  if(e.hp<=0)return;e.hp-=damage;e.flash=.13;this.float(e.x,e.y-28,Math.round(damage));
  const dx=e.x-source.x,dy=e.y-source.y,n=Math.hypot(dx,dy)||1;e.knockX=dx/n*130;e.knockY=dy/n*130;
  if(e.hp<=0){this.kills++;this.waveKills++;this.drops.push({x:e.x,y:e.y,type:'xp',amount:e.xp});if(this.rng()<.10)this.drops.push({x:e.x+9,y:e.y,type:'heal',amount:12});}
 }
 melee(hero,combo,hit){
  const [vx,vy]=Number.isFinite(hero.attackAngle)?[Math.cos(hero.attackAngle),Math.sin(hero.attackAngle)]:[[0,1],[-1,0],[1,0],[0,-1]][hero.row],reach=combo===2?110:88;
  for(const e of this.enemies){const dx=e.x-hero.x,dy=e.y-hero.y,n=Math.hypot(dx,dy);if(e.hp>0&&!hit.has(e.id)&&n<reach+e.radius&&(n<24||(dx*vx+dy*vy)/n>.05)){hit.add(e.id);this.hurtEnemy(e,this.attack*[1,1.15,1.6][combo],hero);}}
 }
 slam(hero){for(const e of this.enemies)if(Math.hypot(e.x-hero.x,e.y-hero.y)<125+e.radius)this.hurtEnemy(e,this.attack*2.2,hero);}
 slash(cut){
  const p=1-Math.pow(1-clamp((cut.max-cut.life)/.256,0,1),2),dx=(cut.x2-cut.x1)*p,dy=(cut.y2-cut.y1)*p,den=dx*dx+dy*dy;
  if(den<1)return;cut.hits??=new Set();
  for(const e of this.enemies){if(e.hp<=0||cut.hits.has(e.id))continue;const u=clamp(((e.x-cut.x1)*dx+(e.y-17-cut.y1)*dy)/den,0,1);if(Math.hypot(e.x-cut.x1-dx*u,e.y-17-cut.y1-dy*u)<e.radius+18){cut.hits.add(e.id);this.hurtEnemy(e,this.attack*(.65+cut.tier*.15)*1.45,{x:cut.x1,y:cut.y1});}}
 }
 contact(e,hero){
  if(this.invincible>0||hero.z>22||hero.state==='skill')return;
  const [vx,vy]=[[0,1],[-1,0],[1,0],[0,-1]][hero.row],dx=e.x-hero.x,dy=e.y-hero.y,n=Math.hypot(dx,dy)||1;
  if(hero.state==='guard'&&(dx*vx+dy*vy)/n>.1&&this.energy>=8){this.energy-=8;this.invincible=.22;this.float(hero.x,hero.y-75,'格挡','#9df5ef');e.knockX=dx/n*210;e.knockY=dy/n*210;return;}
  const damage=Math.max(1,Math.round(e.damage*100/(100+this.armor*5)));this.hp=Math.max(0,this.hp-damage);this.invincible=.65;this.float(hero.x,hero.y-85,'−'+damage,'#ffaba6');if(this.hp===0){this.phase='dead';this.notice='本次旅途结束';}
 }
 finishWave(){for(const d of this.drops)if(d.type==='xp')this.gainXP(d.amount);this.drops=[];this.enemies=[];this.phase='reward';this.hp=Math.min(this.maxHp,this.hp+Math.ceil(this.maxHp*.2));this.energy=this.maxEnergy;this.notice='第 '+this.wave+' 波完成 · 恢复 20% 生命，能量回满';}
 choose(reward){if(this.phase!=='reward'||!['power','vigor','haste'].includes(reward))return false;
  if(reward==='power')this.attack+=6;if(reward==='vigor'){this.maxHp+=25;this.hp=Math.min(this.maxHp,this.hp+25);this.armor+=1;}if(reward==='haste')this.attackSpeed=Math.min(2.2,this.attackSpeed+.12);
  this.wave++;this.waveKills=0;this.remaining=Math.min(60,35+(this.wave-1)*5);this.spawnTime=1.2;this.phase='fight';this.notice='第 '+this.wave+' 波 · '+(this.wave===2?'夜翼加入':this.wave===3?'甲虫加入':'敌人更强，守住小庭');this.noticeTime=3;return true;
 }
 update(dt,hero){
  if(!this.active)return;this.time+=dt;this.remaining=Math.max(0,this.remaining-dt);this.noticeTime=Math.max(0,this.noticeTime-dt);this.invincible=Math.max(0,this.invincible-dt);
  this.energy=Math.min(this.maxEnergy,this.energy+dt*(hero.state==='guard'?0:hero.state==='charge'?0:10));
  for(const n of this.numbers){n.life-=dt;n.y-=dt*24;}this.numbers=this.numbers.filter(n=>n.life>0);
  if(this.remaining<=0){this.finishWave();return;}
  this.spawnTime-=dt;if(this.spawnTime<=0){this.spawnTime=Math.max(.28,1.1-this.wave*.065);const count=Math.min(4,1+Math.floor((this.wave-1)/3));for(let i=0;i<count&&this.enemies.length<90;i++)this.spawn(hero);}
  for(const e of this.enemies){if(e.hp<=0)continue;e.age+=dt;e.flash=Math.max(0,e.flash-dt);const dx=hero.x-e.x,dy=hero.y-e.y,n=Math.hypot(dx,dy)||1,pace=e.age<.45?0:e.speed;
   e.x=clamp(e.x+(dx/n*pace+e.knockX)*dt,62,898);e.y=clamp(e.y+(dy/n*pace+e.knockY)*dt,130,550);e.knockX*=Math.exp(-dt*10);e.knockY*=Math.exp(-dt*10);
   if(e.age>.45&&n<e.radius+15)this.contact(e,hero);if(!this.active)break;
  }
  this.enemies=this.enemies.filter(e=>e.hp>0);
  for(let i=0;i<this.enemies.length;i++)for(let j=i+1;j<this.enemies.length;j++){const a=this.enemies[i],b=this.enemies[j],dx=b.x-a.x,dy=b.y-a.y,n=Math.hypot(dx,dy)||.1,gap=(a.radius+b.radius)*.8;if(n<gap){const push=(gap-n)*.15;a.x-=dx/n*push;a.y-=dy/n*push;b.x+=dx/n*push;b.y+=dy/n*push;}}
  this.drops=this.drops.filter(d=>{const dx=hero.x-d.x,dy=hero.y-d.y,n=Math.hypot(dx,dy);if(n<22){if(d.type==='xp')this.gainXP(d.amount);else this.hp=Math.min(this.maxHp,this.hp+d.amount);return false;}if(n<105){d.x+=dx/n*Math.min(n,330*dt);d.y+=dy/n*Math.min(n,330*dt);}return true;});
 }
 snapshot(){return {phase:this.phase,wave:this.wave,remaining:this.remaining,hp:this.hp,maxHp:this.maxHp,energy:this.energy,maxEnergy:this.maxEnergy,attack:this.attack,attackSpeed:this.attackSpeed,armor:this.armor,level:this.level,xp:this.xp,needed:this.needed,kills:this.kills,enemies:this.enemies.map(e=>({...e})),drops:this.drops.map(d=>({...d}))};}
}
root.Battle=Battle;root.ENEMY_TYPES=TYPES;if(typeof module!=='undefined')module.exports={Battle,TYPES};
})(typeof window==='undefined'?globalThis:window);
