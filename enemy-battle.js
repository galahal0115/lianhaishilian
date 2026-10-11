/* Enemy rules and telegraphs; artwork is supplied separately by enemy-atlas.js. */
(function(root){
'use strict';
const Base=typeof module==='undefined'?root.Battle:require('./battle.js').Battle;
const WORLD=typeof module==='undefined'?root.WORLD:require('./world.js');
const TYPES=[
 {name:'小兵',hp:22,speed:48,damage:8,xp:4,radius:14,art:'grunt',height:58},
 {name:'炸弹兵',hp:92,speed:67,damage:24,xp:12,radius:18,art:'bomber',height:73},
 {name:'刀盾兵',hp:165,speed:35,damage:25,xp:22,radius:23,art:'shield',height:66},
 {name:'旋转兵',hp:110,speed:31,damage:10,xp:16,radius:19,art:'spinner-a',height:61},
 {name:'旋转兵',hp:125,speed:36,damage:11,xp:18,radius:19,art:'spinner-b',height:64},
 {name:'奶熊',hp:19500,speed:56,damage:50,xp:250,radius:56,art:'boss',height:215}
];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
class EnemyBattle extends Base{
 get active(){return this.phase==='fight'||this.phase==='victory'||this.phase==='outro';}
 reset(){super.reset();Object.assign(this,{mode:'campaign',spawnCount:0,rewardsTaken:0,chest:null,finalBoss:null,outroTime:0,bullets:[],effects:[],events:[],bossSpawned:false,bossDefeated:false,knockdown:0,pushTime:0,pushVX:0,pushVY:0,knockVX:0,knockVY:0,hurtFlash:0,transition:0,waveBanner:3,plungeCooldown:0,plungeVulnerable:0});}
 spawn(hero,forced){
  const angle=this.rng()*Math.PI*2,distance=660+this.rng()*90,x=clamp(hero.x+Math.cos(angle)*distance,100,WORLD.width-100),y=clamp(hero.y+Math.sin(angle)*distance,110,WORLD.height-100);
  if(forced===undefined&&Math.hypot(x-hero.x,y-hero.y)<120)return;
  const pool=this.wave===1?[0,0,0,0,0,0,0,0,1,2,3,4]:this.wave===2?[0,0,0,0,1,1,2,3,4]:[0,0,1,1,2,2,3,4];
  const introductions=[0,0,1,0,2,0,3,0,4];
  const type=forced??(this.wave===1&&this.spawnCount<introductions.length?introductions[this.spawnCount]:pool[Math.floor(this.rng()*pool.length)]);if(forced===undefined)this.spawnCount++;
  const base=TYPES[type],strength=type===5?1+Math.max(0,this.wave-5)*.18:1.45*(1+.38*Math.pow(this.wave-1,1.15)),hp=Math.round(base.hp*strength);
  const e={id:++this.id,type,x,y,hp,maxHp:hp,speed:base.speed*(1+Math.min(.6,(this.wave-1)*.035)),damage:base.damage*(type===5?1:1.15*(1+(this.wave-1)*.22)),xp:base.xp,radius:base.radius,age:0,flash:0,knockX:0,knockY:0,facing:Math.atan2(hero.y-y,hero.x-x),state:'walk',timer:0,cooldown:1.8+this.rng(),turn:0,z:0};
  if(type===5){e.x=clamp(hero.x+220,150,WORLD.width-150);e.y=clamp(hero.y-180,180,WORLD.height-150);e.cooldown=1.1;this.bossSpawned=true;this.notice='第五关 · 奶熊：跳过音波，离开砸地红圈';this.noticeTime=5;}
  if(type===2)e.shieldHp=e.maxShield=60+this.wave*8;this.enemies.push(e);return e;
 }
 hurtEnemy(e,damage,source){
  if(e.hp<=0)return;
  if(e.type===5&&e.state==='leap')return;
  if(e.type===2&&e.shieldHp>0){const a=Math.atan2(source.y-e.y,source.x-e.x);if(Math.cos(a-e.facing)>.2){e.shieldHp=Math.max(0,e.shieldHp-damage);e.block=.2;if(!e.shieldHp){e.shieldBroken=true;this.float(e.x,e.y-65,'破盾','#ffe8a6');this.effects.push({kind:'dust',x:e.x,y:e.y,age:0,life:.6,radius:35,hit:true});this.events.push('block');}else{damage*=.12;this.float(e.x,e.y-65,'盾挡','#bce9ff');}}}
  const before=e.hp;super.hurtEnemy(e,damage,source);if(e.hp<before){e.flash=.18;this.events.push('hit');}if(e.hp<=0)this.effects.push({kind:'smoke',x:e.x,y:e.y,age:0,life:.7,radius:40,hit:true});
  if(e.type===5){e.knockX=e.knockY=0;if(e.hp<=0){this.bossDefeated=true;this.events.push('boss-stop');if(this.mode!=='endless')this.win(e);}}
 }
 hitHero(source,hero,launch=false){
  if(this.phase!=='fight'||hero.dodgeTime>0)return;
  const before=this.hp,energy=this.energy;super.contact(source,this.plungeVulnerable>0?{...hero,z:0}:hero);if(this.hp<before){this.hurtFlash=.38;this.events.push('hurt');}else if(this.energy<energy)this.events.push('block');
  if(launch&&this.hp<before&&this.active){const dx=hero.x-source.x,dy=hero.y-source.y,n=Math.hypot(dx,dy)||1;this.knockdown=1.15;this.knockVX=dx/n*260;this.knockVY=dy/n*260;hero.state='armed';hero.jumpPhase='ground';hero.jumpCount=0;hero.z=0;hero.vz=0;hero.queuedAttack=hero.queuedSkill=false;this.invincible=1.35;this.effects.push({kind:'dust',x:hero.x,y:hero.y,age:0,life:1.15,radius:45,hit:true});}
 }
 ring(x,y,radius,damage,kind='blast'){if(kind!=='sonic')this.events.push(kind);this.effects.push({kind,x,y,radius,damage,age:0,life:kind==='sonic'?1.65:.55,hit:false});}
 fire(e){
  const count=e.type===3?10:8,offset=e.turn*.49+(e.type===4?.22:0);
  for(let i=0;i<count&&this.bullets.length<260;i++){const angle=offset+i*Math.PI*2/count,speed=(e.type===3?98:128)+Math.min(35,this.wave*2);this.bullets.push({x:e.x,y:e.y-12,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,radius:5,damage:e.damage,life:5});}e.turn++;
 }
 enemyStep(e,dt,hero){
  const dx=hero.x-e.x,dy=hero.y-e.y,n=Math.hypot(dx,dy)||1;e.age+=dt;e.flash=Math.max(0,e.flash-dt);e.block=Math.max(0,(e.block||0)-dt);e.cooldown-=dt;e.timer+=dt;
  if((e.type===0||e.type===1||e.type===2)&&!e.announced&&n<500){e.announced=true;this.events.push({name:e.type===0?'grunt':e.type===1?'bomber':'shield',id:e.id,x:e.x,y:e.y});}
  let pace=e.age<.65?0:e.speed;
  if(e.type===2){if(e.state==='walk'){const delta=Math.atan2(Math.sin(Math.atan2(dy,dx)-e.facing),Math.cos(Math.atan2(dy,dx)-e.facing));e.facing+=clamp(delta,-dt*1.6,dt*1.6);if(n<125&&e.cooldown<=0){e.state='wind';e.timer=0;e.cutFacing=e.facing;}}
   if(e.state==='wind'){pace=0;if(e.timer>=.55){e.state='cut';e.timer=0;e.facing=e.cutFacing;this.effects.push({kind:'shield-cut',x:e.x,y:e.y,angle:e.cutFacing,radius:135,age:0,life:.25,hit:true});this.events.push('shield-cut');const angle=Math.atan2(dy,dx);if(n<135&&Math.cos(angle-e.cutFacing)>Math.cos(1.05)){const before=this.hp;this.hitHero(e,hero);if(this.hp<before&&this.phase==='fight'){const length=Math.hypot(dx,dy)||1;this.pushTime=.24;this.pushVX=dx/length*440;this.pushVY=dy/length*440;}}}}
   if(e.state==='cut'){pace=0;if(e.timer>.4){e.state='walk';e.cooldown=1.4;e.timer=0;}}
  }else if(e.type===1){e.facing=Math.atan2(dy,dx);if(e.state==='walk'&&n<52){e.state='fuse';e.timer=0;}
   if(e.state==='fuse'){pace=0;if(e.timer>=.55){this.ring(e.x,e.y,108,e.damage);e.hp=0;this.float(e.x,e.y-70,'爆炸','#ffb46d');return;}}
  }else if(e.type===3||e.type===4){if(n<150)pace=-e.speed*.45;else if(n<220)pace=0;if(e.cooldown<=0){e.state='fire';e.timer=0;this.fire(e);e.cooldown=e.type===3?1.65:1.95;}if(e.timer>.35)e.state='walk';}
  else if(e.type===5){
   if(e.state==='walk'&&e.cooldown<=0){e.state=['inhale','punchWind','crouch','punchWind'][e.turn%4];e.timer=0;e.turn++;e.facing=Math.atan2(dy,dx);e.startX=e.x;e.startY=e.y;}
   if(e.state!=='walk')pace=0;
   if(e.state==='punchWind'&&e.timer>.5){e.state='punch';e.timer=0;e.punchHit=false;this.events.push('punch');}
   if(e.state==='punch'){const p=clamp(e.timer/.28,0,1);e.x=clamp(e.startX+Math.cos(e.facing)*185*p,100,WORLD.width-100);e.y=clamp(e.startY+Math.sin(e.facing)*185*p,110,WORLD.height-100);if(!e.punchHit&&e.timer>.1){const d=Math.hypot(hero.x-e.x,hero.y-e.y),a=Math.atan2(hero.y-e.y,hero.x-e.x);if(d<195&&Math.cos(a-e.facing)>.25){this.hitHero({...e,damage:e.damage*1.15},hero,true);e.punchHit=true;}}if(e.timer>.48){e.state='recover';e.timer=0;}}
   if(e.state==='recover'&&e.timer>.45){e.state='walk';e.timer=0;e.cooldown=.65;}
   if(e.state==='inhale'&&e.timer>=.85){e.state='laugh';e.timer=0;e.pulses=0;this.events.push('boss-laugh');}
   if(e.state==='laugh'){if(e.pulses<3&&e.timer>=e.pulses*.62){this.ring(e.x,e.y,600,e.damage,'sonic');e.pulses++;}if(e.timer>2.25){e.state='walk';e.cooldown=1.1;e.timer=0;}}
   if(e.state==='crouch'&&e.timer>.6){e.state='leap';e.timer=0;e.startX=e.x;e.startY=e.y;e.targetX=clamp(hero.x,110,WORLD.width-110);e.targetY=clamp(hero.y,150,WORLD.height-110);}
   if(e.state==='leap'){const p=clamp(e.timer/.95,0,1);e.x=e.startX+(e.targetX-e.startX)*p;e.y=e.startY+(e.targetY-e.startY)*p;e.z=Math.sin(p*Math.PI)*155;if(p>=1){e.state='land';e.timer=0;e.z=0;this.ring(e.x,e.y,190,e.damage*1.25,'slam');}}
   if(e.state==='land'&&e.timer>.7){e.state='walk';e.timer=0;e.cooldown=1.1;}
  }else e.facing=Math.atan2(dy,dx);
  e.x=clamp(e.x+(dx/n*pace+e.knockX)*dt,100,WORLD.width-100);e.y=clamp(e.y+(dy/n*pace+e.knockY)*dt,110,WORLD.height-100);e.knockX*=Math.exp(-dt*10);e.knockY*=Math.exp(-dt*10);
  if(e.state!=='leap')WORLD.resolve(e);
  if(e.age>.65&&n<e.radius+15&&e.type===0)this.hitHero(e,hero);
 }
 win(boss){if(this.phase!=='fight')return;boss=boss||this.enemies.find(e=>e.type===5);if(!boss)return;this.phase='outro';this.outroTime=0;this.finalBoss={...boss,hp:0,state:'laugh',timer:0,age:2,z:0};this.enemies=this.enemies.filter(e=>e!==boss&&e.hp>0);this.bullets=[];this.effects=[];this.drops=[];this.knockdown=0;this.events.push('boss-finale');}
 updateOutro(dt){this.outroTime+=dt;const e=this.finalBoss;e.timer+=dt;e.age+=dt;for(const f of this.effects)f.age+=dt;this.effects=this.effects.filter(f=>f.age<f.life);const r=this.outroTime*800;this.enemies=this.enemies.filter(m=>{if(Math.hypot(m.x-e.x,m.y-e.y)>r)return true;this.effects.push({kind:'smoke',x:m.x,y:m.y,age:0,life:.9,radius:65,hit:true});return false;});if(this.outroTime<4.2&&Math.floor((this.outroTime-dt)*3)!==Math.floor(this.outroTime*3))this.effects.push({kind:'sonic',x:e.x,y:e.y,radius:1800,age:0,life:2.3,damage:0,hit:true});if(this.outroTime>=4.4&&!e.vanished){e.vanished=true;this.effects.push({kind:'smoke',x:e.x,y:e.y-65,age:0,life:1.3,radius:155,hit:true});}if(this.outroTime>=5.8){this.phase='victory';this.enemies=[];this.effects=[];this.chest={x:e.x,y:e.y,radius:43,hp:Infinity};WORLD.obstacles.push(this.chest);this.events.push('victory');}}
 melee(hero,combo,hits){super.melee(hero,combo,hits);const a=hero.attackAngle??[Math.PI/2,Math.PI,0,-Math.PI/2][hero.row],reach=combo===2?125:103;this.clearBullets(p=>{const dx=p.x-hero.x,dy=p.y-hero.y,n=Math.hypot(dx,dy);return n<reach&&(n<24||(dx*Math.cos(a)+dy*Math.sin(a))/n>.05);});}
 clearBullets(test){this.bullets=this.bullets.filter(p=>{if(!test(p))return true;this.effects.push({kind:'dust',x:p.x,y:p.y,age:0,life:.2,radius:14,hit:true});return false;});}
 slash(cut){super.slash(cut);const progress=1-Math.pow(1-Math.max(0,Math.min(1,(cut.max-cut.life)/.256)),2),dx=(cut.x2-cut.x1)*progress,dy=(cut.y2-cut.y1)*progress,den=dx*dx+dy*dy;if(den<1)return;this.clearBullets(p=>{const t=Math.max(0,Math.min(1,((p.x-cut.x1)*dx+(p.y-cut.y1)*dy)/den));return Math.hypot(p.x-cut.x1-t*dx,p.y-cut.y1-t*dy)<38;});}
 slam(hero){this.clearBullets(p=>Math.hypot(p.x-hero.x,p.y-hero.y)<100);for(const e of this.enemies)if(Math.hypot(e.x-hero.x,e.y-hero.y)<82+e.radius)this.hurtEnemy(e,this.attack*.22,hero);this.events.push('plunge');return true;}
 finishWave(){if(this.transition>0)return;for(const d of this.drops)if(d.type==='xp')this.gainXP(d.amount);for(const e of this.enemies)this.effects.push({kind:'smoke',x:e.x,y:e.y,age:0,life:1.1,radius:50,hit:true});this.drops=[];this.enemies=[];this.bullets=[];this.effects=this.effects.filter(f=>f.kind==='smoke');this.transition=1.5;this.knockdown=0;this.invincible=1.7;this.events.push('boss-stop');this.hp=Math.min(this.maxHp,this.hp+Math.ceil(this.maxHp*.25));this.energy=this.maxEnergy;}
 nextWave(){if(this.mode!=='endless'&&this.wave>=5){this.win();return;}this.wave++;this.waveKills=0;this.remaining=Math.min(60,35+(this.wave-1)*5);if(this.mode==='endless'){this.attack+=8;this.maxHp+=16;this.hp=Math.min(this.maxHp,this.hp+16);this.attackSpeed=Math.min(2.2*this.hasteMultiplier,this.attackSpeed+.05);this.armor+=.8;}this.bossSpawned=false;this.bossDefeated=false;this.spawnTime=1.4;this.waveBanner=3;this.notice='第 '+this.wave+' 关';this.noticeTime=3;this.events.push('wave');}
 revive(){if(this.phase!=='dead')return false;this.phase='fight';this.hp=this.maxHp;this.energy=this.maxEnergy;this.pushTime=this.pushVX=this.pushVY=this.knockdown=this.knockVX=this.knockVY=this.hurtFlash=0;this.invincible=2;this.events=[];this.notice='';this.noticeTime=0;return true;}
 choose(reward){if(this.phase!=='reward'||this.mode!=='campaign'||this.wave>4||!['haste','power','vigor'].includes(reward))return false;if(reward==='haste'){this.hasteMultiplier*=1.2;this.attackSpeed*=1.2;}if(reward==='power')this.attack*=1.2;if(reward==='vigor'){const old=this.maxHp;this.maxHp=Math.round(this.maxHp*1.2);this.hp=Math.min(this.maxHp,this.hp+this.maxHp-old);}this.rewardsTaken++;this.phase='fight';this.nextWave();return true;}
 challengeLevel20(){while(this.level<20)this.gainXP(this.needed-this.xp);this.attack*=1.5;this.maxHp=Math.round(this.maxHp*1.5);this.hp=this.maxHp;this.attackSpeed*=1.5;this.hasteMultiplier*=1.5;this.energy=this.maxEnergy;this.wave=5;this.notice='';this.noticeTime=0;}
 update(dt,hero){
  this.listener={x:hero.x,y:hero.y};if(!this.active)return;if(this.phase==='victory')return;if(this.phase==='outro'){this.updateOutro(dt);return;}this.time+=dt;this.hurtFlash=Math.max(0,this.hurtFlash-dt);this.waveBanner=Math.max(0,this.waveBanner-dt);this.plungeCooldown=Math.max(0,this.plungeCooldown-dt);this.plungeVulnerable=Math.max(0,this.plungeVulnerable-dt);
  if(this.transition>0){for(const f of this.effects)f.age+=dt;this.effects=this.effects.filter(f=>f.age<f.life);this.transition=Math.max(0,this.transition-dt);if(!this.transition){if(this.mode==='campaign'&&this.wave<=4)this.phase='reward';else this.nextWave();}return;}this.noticeTime=Math.max(0,this.noticeTime-dt);this.invincible=Math.max(0,this.invincible-dt);this.energy=Math.min(this.maxEnergy,this.energy+dt*(['guard','charge','qskill'].includes(hero.state)?0:10));
  if(this.pushTime>0){const step=Math.min(dt,this.pushTime);hero.x=clamp(hero.x+this.pushVX*step,100,WORLD.width-100);hero.y=clamp(hero.y+this.pushVY*step,110,WORLD.height-100);WORLD.resolve(hero);this.pushTime=Math.max(0,this.pushTime-dt);this.pushVX*=Math.exp(-dt*5);this.pushVY*=Math.exp(-dt*5);}
  if(this.knockdown>0){this.knockdown=Math.max(0,this.knockdown-dt);hero.x=clamp(hero.x+this.knockVX*dt,100,WORLD.width-100);hero.y=clamp(hero.y+this.knockVY*dt,110,WORLD.height-100);this.knockVX*=Math.exp(-dt*5);this.knockVY*=Math.exp(-dt*5);}
  for(const a of this.numbers){a.life-=dt;a.y-=24*dt;}this.numbers=this.numbers.filter(a=>a.life>0);
  if(this.mode==='endless'){this.remaining=Math.max(0,this.remaining-dt);if(!this.enemies.some(e=>e.type===5)&&this.time>(this.nextBoss||0)){this.spawn(hero,5);this.nextBoss=this.time+45;}if(this.remaining<=0)this.nextWave();}else if(this.wave===5){if(!this.bossSpawned)this.spawn(hero,5);if(this.bossDefeated){this.win();return;}}else{this.remaining=Math.max(0,this.remaining-dt);if(this.remaining<=0){this.finishWave();return;}}
  this.spawnTime-=dt;if(this.spawnTime<=0){this.spawnTime=this.wave===5&&this.mode!=='endless'?3.8:Math.max(.3,1.18-this.wave*.13);const count=this.wave===5&&this.mode!=='endless'?2:Math.min(6,this.wave);for(let i=0;i<count&&this.enemies.length<90;i++)this.spawn(hero);}
  for(const e of this.enemies){if(e.hp>0)this.enemyStep(e,dt,hero);if(!this.active)break;}this.enemies=this.enemies.filter(e=>e.hp>0);
  for(const p of this.bullets){p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt;if(Math.hypot(p.x-hero.x,p.y-hero.y)<18&&(hero.z<=22||this.plungeVulnerable>0)){this.hitHero(p,hero);p.life=0;}}this.bullets=this.bullets.filter(p=>p.life>0&&p.x>80&&p.x<WORLD.width-80&&p.y>90&&p.y<WORLD.height-80);
  for(const f of this.effects){f.age+=dt;if(f.kind==='smoke'||f.kind==='dust'||f.kind==='shield-cut')continue;const n=Math.hypot(hero.x-f.x,hero.y-f.y),r=f.kind==='sonic'?f.radius*f.age/f.life:f.radius;if(!f.hit&&(f.kind==='sonic'?Math.abs(n-r)<22:n<r)&&(hero.z<=22||this.plungeVulnerable>0)){this.hitHero(f,hero,f.kind!=='sonic');f.hit=true;}}this.effects=this.effects.filter(f=>f.age<f.life);
  for(let i=0;i<this.enemies.length;i++)for(let j=i+1;j<this.enemies.length;j++){const a=this.enemies[i],b=this.enemies[j],dx=b.x-a.x,dy=b.y-a.y,n=Math.hypot(dx,dy)||1,gap=(a.radius+b.radius)*.8;if(n<gap){const p=(gap-n)*.12;a.x-=dx/n*p;a.y-=dy/n*p;b.x+=dx/n*p;b.y+=dy/n*p;}}
  if(this.active)this.drops=this.drops.filter(d=>{const dx=hero.x-d.x,dy=hero.y-d.y,n=Math.hypot(dx,dy);if(n<22){if(d.type==='xp')this.gainXP(d.amount);else this.hp=Math.min(this.maxHp,this.hp+d.amount);return false;}if(n<105){d.x+=dx/n*Math.min(n,330*dt);d.y+=dy/n*Math.min(n,330*dt);}return true;});
 }
 snapshot(){return {...super.snapshot(),mode:this.mode,chest:this.chest,bullets:this.bullets.map(p=>({...p})),knockdown:this.knockdown,bossDefeated:this.bossDefeated,transition:this.transition,hurtFlash:this.hurtFlash,plungeCooldown:this.plungeCooldown};}
}
root.Battle=EnemyBattle;root.ENEMY_TYPES=TYPES;if(typeof module!=='undefined')module.exports={Battle:EnemyBattle,TYPES};
})(typeof window==='undefined'?globalThis:window);
