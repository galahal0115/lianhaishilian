(() => {
'use strict';
const canvas=document.querySelector('#game'),ctx=canvas.getContext('2d');
const W=960,H=600,keys=new Set(),heldPointers=new Map(),mouse=new Set();
const valid=new Set(['KeyW','KeyA','KeyS','KeyD','Space','KeyE','KeyF','KeyQ']);
const sheet=new Image(),combat={},effectImages={},effectFrames={};
let ready=false,previous=0,elapsed=0,lastStatus='',aim=null,step=0;
const initial=()=>({x:480,y:330,row:0,moving:false,clock:0,state:'unarmed',actionTime:0,quiet:0,queuedAttack:false,queuedSkill:false,reverse:false,attacks:0,skills:0,cooldown:0,qCooldown:0,z:0,vz:0,jumpCount:0,jumpPhase:'ground',jumpTime:0,flipRow:0,chargeTime:0,tier:1,slashCount:0,emitted:0,combo:0,comboUntil:0,attackOrigin:null,dodgeTime:0,dodgeCooldown:0,attackAngle:null});
const hero=initial(),trails=[],ghosts=[];let paused=!new URLSearchParams(location.search).has('character')&&!new URLSearchParams(location.search).has('trial'),mode='campaign';
const characterOnly=new URLSearchParams(location.search).has('character');
let zoom=characterOnly?1:WORLD.zoom,worldW=characterOnly?W:WORLD.width,worldH=characterOnly?H:WORLD.height;
if(!characterOnly){hero.x=worldW/2;hero.y=worldH/2;}
const camera={x:hero.x-W/zoom/2,y:hero.y-H/zoom/2};
const battle=new Battle();
const trial=new URLSearchParams(location.search).get('trial');
function prepareTrial(){if(characterOnly||!['boss','enemies'].includes(trial))return;battle.wave=trial==='boss'?5:4;battle.hp=battle.maxHp=350;battle.attack=70;battle.attackSpeed=1.3;battle.level=10;battle.remaining=60;battle.notice='试战模式 · '+(trial==='boss'?'第五关 Boss':'五类敌人');battle.noticeTime=5;if(trial==='enemies')for(let t=0;t<5;t++)battle.spawn(hero,t);}
prepareTrial();
function resumeWave(){QSkill.reset();clearInput();Object.assign(hero,initial());if(!characterOnly){hero.x=worldW/2;hero.y=worldH/2;}camera.x=Math.max(0,hero.x-W/zoom/2);camera.y=Math.max(0,hero.y-H/zoom/2);trails.length=ghosts.length=0;step=0;canvas.focus();}
function restart(){startMode(mode);}
function startMode(value){mode=value;battle.reset();WORLD.resetTrees();battle.mode=value;resumeWave();if(value==='boss')battle.challengeLevel20();else if(value==='endless'){battle.wave=4;battle.hp=battle.maxHp=270;battle.attack=83;battle.attackSpeed=1.565;battle.level=11;battle.armor=6.5;battle.remaining=60;for(let t=0;t<5;t++)battle.spawn(hero,t);}paused=false;CombatAudio.stopEffects?.();}
function revive(){if(!battle.revive())return false;const keep={x:hero.x,y:hero.y,row:hero.row,clock:hero.clock,cooldown:hero.cooldown,qCooldown:hero.qCooldown};QSkill.reset();clearInput();Object.assign(hero,initial(),keep,{state:'armed'});trails.length=ghosts.length=0;paused=false;CombatAudio.stopEffects();CombatAudio.scene(battle);canvas.focus();return true;}
function openChest(){if(paused||battle.phase!=='victory'||!battle.chest||Math.hypot(hero.x-battle.chest.x,hero.y-battle.chest.y)>95)return;clearInput();battle.phase='cinematic';paused=true;window.GameShell.victoryVideo();}
window.Game={start:startMode,revive,reward(value){if(!battle.choose(value))return false;clearInput();QSkill.reset();hero.z=hero.vz=0;hero.jumpPhase="ground";hero.jumpCount=0;enter("armed");hero.quiet=0;trails.length=ghosts.length=0;CombatAudio.stopEffects();canvas.focus();return true;},openChest,finishVideo(){battle.phase='complete';},audioScene:()=>battle,pause(value){paused=value;clearInput();CombatAudio.pauseEffects?.(value);},get paused(){return paused;},get mode(){return mode;}};
const battleView=createBattleView(battle,resumeWave,restart);
function strike(){const s=strikes[hero.combo],rate=characterOnly?1:battle.attackSpeed;return {...s,total:s.total/rate,wind:s.wind/rate,active:s.active/rate};}
const garden=WORLD.create();WORLD.resetTrees();
const durations={summon:.24,release:.14,sheathe:.35};
const strikes=[{total:.32,wind:.102,active:.077,distance:9},{total:.34,wind:.109,active:.081,distance:15},{total:.42,wind:.168,active:.092,distance:62}];
const comboMemory=.75,inputBuffer=.30;
const attackDirections=['down','left','right','up'];
const frameStarts=[0,.08,.20,.32,.42,.56,.72,.88];
const held=code=>keys.has(code)||mouse.has(code)||[...heldPointers.values()].includes(code);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const facing=(dx,dy)=>Math.abs(dx)>Math.abs(dy)?(dx>0?2:1):(dy>0?0:3);
function enter(state){const previousState=hero.state;hero.state=state;hero.actionTime=0;hero.reverse=false;
 if(state==='attack'){steerAttack();CombatAudio.play('attack');
 hero.combo=previousState==='attack'||(hero.comboUntil>0&&hero.clock<=hero.comboUntil)?(hero.combo+1)%3:0;hero.queuedAttack=false;hero.attacks++;hero.quiet=0;
 hero.attackOrigin={x:hero.x,y:hero.y};hero.attackEase=0;hero.hitEnemies=new Set();hero.moving=false;
 }
 if(state==='charge'){CombatAudio.play('charge');hero.queuedSkill=false;hero.queuedAttack=false;hero.comboUntil=0;hero.chargeTime=0;hero.quiet=0;hero.moving=false;}
 if(state==='skill'){CombatAudio.play('skill');hero.tier=hero.chargeTime>=1.6?3:hero.chargeTime>=.7?2:1;if(!characterOnly){hero.tier=battle.spendSkill(hero.tier);if(!hero.tier){hero.queuedSkill=false;enter('armed');return;}}hero.slashCount=[2,5,10][hero.tier-1];hero.emitted=0;hero.skills++;hero.cooldown=6;hero.moving=false;}
}
function attack(){if(!paused&&hero.dodgeTime<=0&&ready&&!battle.knockdown&&(characterOnly||battle.active)&&!['qskill','skill','charge','plunge'].includes(hero.state)){
 if(hero.z>0){hero.jumpPhase='plunge';hero.jumpTime=0;hero.vz=Math.min(hero.vz,80);hero.queuedAttack=false;hero.queuedSkill=false;hero.jumpCount=2;enter('plunge');return;}
 if(hero.state==='attack'&&strike().total-hero.actionTime>inputBuffer)return;
 hero.queuedAttack=true;hero.quiet=0;if(hero.state==='sheathe')hero.reverse=true;
}}
 function skill(){if(!paused&&hero.dodgeTime<=0&&ready&&!battle.knockdown&&(characterOnly||battle.active&&battle.canSkill())&&hero.cooldown<=0&&!['qskill','skill','charge'].includes(hero.state)){hero.queuedSkill=true;if(hero.state==='sheathe')hero.reverse=true;}}
function jump(){
 if(paused||hero.dodgeTime>0||!ready||battle.knockdown||(!characterOnly&&!battle.active)||['qskill','attack','charge','skill','summon','sheathe','plunge'].includes(hero.state))return;
 if(hero.jumpPhase==='land'){hero.jumpPhase='air';hero.jumpTime=0;hero.jumpCount=1;hero.z=.1;hero.vz=445;}
 else if(hero.jumpPhase==='ground'){hero.jumpPhase='anticipate';hero.jumpTime=0;hero.jumpCount=1;}
 else if(hero.z>0&&hero.jumpCount===1){hero.jumpCount=2;hero.jumpPhase='flip';hero.jumpTime=0;hero.flipRow=hero.row;hero.vz=410;}
}
function steerAttack(){const directions={KeyW:3,KeyA:1,KeyS:0,KeyD:2};for(const code of keys)if(code in directions)hero.row=directions[code];const angles=[Math.PI/2,Math.PI,0,-Math.PI/2],base=angles[hero.row];hero.attackAngle=base;if(characterOnly)return;let best=null,score=Infinity;for(const e of battle.enemies){if(e.hp<=0)continue;const dx=e.x-hero.x,dy=e.y-hero.y,d=Math.hypot(dx,dy),a=Math.atan2(dy,dx),delta=Math.atan2(Math.sin(a-base),Math.cos(a-base));if(d<135&&Math.abs(delta)<.52&&d+Math.abs(delta)*80<score){score=d+Math.abs(delta)*80;best=delta;}}if(best!==null)hero.attackAngle=base+clamp(best,-.22,.22);}
function dodge(){if(paused||!ready||battle.knockdown||!battle.active||hero.dodgeCooldown>0||['qskill','skill','plunge'].includes(hero.state))return;steerAttack();let dx=Number(held('KeyD'))-Number(held('KeyA')),dy=Number(held('KeyS'))-Number(held('KeyW'));if(!dx&&!dy)[dx,dy]=[[0,1],[-1,0],[1,0],[0,-1]][hero.row];const n=Math.hypot(dx,dy);hero.dodgeVX=dx/n;hero.dodgeVY=dy/n;hero.dodgeTime=.19;hero.dodgeCooldown=1;hero.queuedAttack=hero.queuedSkill=false;enter('armed');CombatAudio.play('dodge');}
function press(code){if(paused)return;if(code==='KeyQ'){if(ready)QSkill.cast(hero,battle,characterOnly);return;}if(code==='KeyF'){openChest();return;}if(code==='Attack')attack();if(code==='KeyE')skill();if(code==='Space')jump();}
function paintKeys(){document.querySelectorAll('[data-key]').forEach(e=>e.classList.toggle('active',held(e.dataset.key)));}
function clearInput(){keys.clear();heldPointers.clear();mouse.clear();hero.queuedAttack=false;hero.queuedSkill=false;aim=null;paintKeys();}
window.addEventListener('keydown',e=>{if(!valid.has(e.code)||e.ctrlKey||e.metaKey||e.altKey)return;e.preventDefault();if(!keys.has(e.code)&&!e.repeat)press(e.code);keys.add(e.code);paintKeys();});
window.addEventListener('keyup',e=>{if(valid.has(e.code)){e.preventDefault();keys.delete(e.code);paintKeys();}});
window.addEventListener('blur',clearInput);document.addEventListener('visibilitychange',()=>{if(document.hidden){clearInput();previous=0;}});
function updateAim(e){const b=canvas.getBoundingClientRect();aim={x:(e.clientX-b.left)/b.width*W/zoom+camera.x,y:(e.clientY-b.top)/b.height*H/zoom+camera.y};}
canvas.addEventListener('pointermove',e=>{if(e.pointerType==='mouse')updateAim(e);});
canvas.addEventListener('mousedown',e=>{canvas.focus();e.preventDefault();updateAim(e);if(e.button===0){mouse.add('Attack');attack();}if(e.button===2)dodge();paintKeys();});
window.addEventListener('mouseup',e=>{if(e.button===0)mouse.delete('Attack');if(e.button===2)mouse.delete('Guard');paintKeys();});
canvas.addEventListener('pointercancel',clearInput);canvas.addEventListener('contextmenu',e=>e.preventDefault());
document.querySelectorAll('button[data-key]').forEach(b=>{
 b.addEventListener('pointerdown',e=>{e.preventDefault();b.setPointerCapture(e.pointerId);heldPointers.set(e.pointerId,b.dataset.key);press(b.dataset.key);paintKeys();});
 for(const event of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(event,e=>{heldPointers.delete(e.pointerId);paintKeys();});
});
document.querySelector('#reset').addEventListener('click',restart);
function resolve(){if(hero.jumpPhase!=='ground'){enter('armed');return;}if(hero.queuedSkill&&hero.cooldown<=0)enter('charge');else if(hero.queuedAttack)enter('attack');else enter('armed');}
function update(dt){
 if(!characterOnly){battle.update(dt,hero);if(!battle.active||battle.phase==='outro'){QSkill.reset();if(hero.state==='qskill'){CombatAudio.play('qend');hero.state='armed';hero.z=0;}clearInput();hero.moving=false;return;}WORLD.updateObjects(dt,hero,battle);for(const cut of trails)if(cut.tier){battle.slash(cut);WORLD.slashTrees(cut,battle);}}
 hero.dodgeCooldown=Math.max(0,hero.dodgeCooldown-dt);hero.clock+=dt;hero.cooldown=Math.max(0,hero.cooldown-dt);hero.actionTime+=dt;
 for(const list of [trails,ghosts]){for(const t of list)t.life-=dt;for(let i=list.length-1;i>=0;i--)if(list[i].life<=0)list.splice(i,1);}
 if(QSkill.update(dt,hero,battle,Number(held('KeyD'))-Number(held('KeyA')),Number(held('KeyS'))-Number(held('KeyW')),characterOnly))return;
 if(!characterOnly&&battle.knockdown>0){hero.moving=false;hero.queuedAttack=hero.queuedSkill=false;return;}
 if(hero.dodgeTime>0){hero.dodgeTime=Math.max(0,hero.dodgeTime-dt);hero.x=clamp(hero.x+hero.dodgeVX*760*dt,100,worldW-100);hero.y=clamp(hero.y+hero.dodgeVY*760*dt,110,worldH-100);hero.moving=true;step+=dt*35;ghosts.push({x:hero.x,y:hero.y,z:hero.z,row:hero.row,column:0,time:hero.clock,life:.15});return;}
 hero.jumpTime+=dt;
 if(hero.jumpPhase==='anticipate'&&hero.jumpTime>=.09){hero.vz=445;hero.z=.1;hero.jumpPhase='air';hero.jumpTime=0;}
 if(hero.z>0){if(hero.jumpPhase==='plunge'&&hero.jumpTime>=.07)hero.vz=Math.min(hero.vz,-680);hero.vz-=1050*dt;hero.z+=hero.vz*dt;
  if(hero.jumpPhase==='flip'&&hero.jumpTime>=.5){hero.jumpPhase='air';hero.jumpTime=0;}
  if(hero.z<=0){const smash=hero.jumpPhase==='plunge';hero.z=0;hero.vz=0;hero.jumpCount=0;hero.jumpPhase='land';hero.jumpTime=0;if(smash){if(!characterOnly){battle.slam(hero);for(const t of WORLD.trees)if(t.hp>0&&Math.hypot(t.x-hero.x,t.y-hero.y)<104)WORLD.hitTree(t,battle);}trails.push({impact:true,x:hero.x,y:hero.y,life:.5,max:.5});enter('armed');hero.quiet=0;}}
 }else if(hero.jumpPhase==='land'&&hero.jumpTime>=.18){hero.jumpPhase='ground';hero.jumpTime=0;}
 const grounded=hero.jumpPhase==='ground';
 if(grounded&&hero.state==='unarmed'&&(hero.queuedAttack||hero.queuedSkill))enter('summon');
 else if(grounded&&hero.state==='armed'){
  if(hero.queuedSkill||hero.queuedAttack)resolve();
  else{hero.quiet+=dt;if(hero.quiet>=2)enter('sheathe');}
 }
 const state=hero.state;
 if(state==='charge'){
  hero.chargeTime=Math.min(2.4,hero.chargeTime+dt);hero.moving=false;
  if(!held('KeyE'))enter('skill');return;
 }
 if(state==='skill'){
  const interval=hero.tier===3?.085:.12;
  while(hero.emitted<hero.slashCount&&hero.actionTime>=.08+hero.emitted*interval){
   const i=hero.emitted++,angle=i*2.399+hero.row*.7,cx=clamp(hero.x+Math.cos(angle)*135,100,worldW-100),cy=clamp(hero.y-35+Math.sin(angle)*105,110,worldH-100),r=150+hero.tier*36,rot=angle+.7;
   const cut={x1:cx-Math.cos(rot)*r,y1:cy-Math.sin(rot)*r*.55,x2:cx+Math.cos(rot)*r,y2:cy+Math.sin(rot)*r*.55,life:.6,max:.6,tier:hero.tier};
   trails.push(cut);ghosts.push({...cut,dash:true,row:facing(cut.x2-cut.x1,cut.y2-cut.y1),life:.32,max:.32});
  }
  if(hero.actionTime>=.08+hero.slashCount*interval+.25){enter('armed');hero.quiet=0;}return;
 }
 if(state==='sheathe'){
  if(hero.queuedAttack||hero.queuedSkill)hero.reverse=true;
  if(hero.reverse)hero.actionTime-=2*dt;
  if(hero.reverse&&hero.actionTime<=0)resolve();else if(hero.actionTime>=durations.sheathe)enter('unarmed');
 }else if(state==='attack'){
  steerAttack();
  const {total,wind,active,distance}=strike(),q=clamp((hero.actionTime-wind)/active,0,1),ease=1-Math.pow(1-q,3),v=[Math.cos(hero.attackAngle),Math.sin(hero.attackAngle)];
  const advance=distance*Math.max(0,ease-(hero.attackEase||0));hero.attackEase=ease;hero.x=clamp(hero.x+v[0]*advance,100,worldW-100);hero.y=clamp(hero.y+v[1]*advance,110,worldH-100);hero.moving=false;
  if(!characterOnly&&hero.actionTime>=wind&&hero.actionTime<=wind+active){battle.melee(hero,hero.combo,hero.hitEnemies);WORLD.meleeTrees(hero,hero.combo,hero.hitEnemies,battle);}
  if(hero.combo===2&&q>0&&q<1&&(ghosts.length===0||hero.clock-ghosts[ghosts.length-1].time>.025))ghosts.push({x:hero.x,y:hero.y,z:0,row:hero.row,column:currentPose().column,time:hero.clock,life:.16});
  if(hero.actionTime>=total){const overflow=hero.actionTime-total;hero.quiet=0;hero.comboUntil=hero.clock+comboMemory;resolve();if(hero.state==='attack')hero.actionTime=overflow;}return;
 }else if(['summon','release'].includes(state)&&hero.actionTime>=durations[state]){hero.quiet=0;resolve();}
 if(['attack','charge','skill','plunge','summon','sheathe'].includes(hero.state)){hero.moving=false;return;}
 let dx=Number(held('KeyD'))-Number(held('KeyA')),dy=Number(held('KeyS'))-Number(held('KeyW'));const n=Math.hypot(dx,dy),ox=hero.x,oy=hero.y;
 if(n){dx/=n;dy/=n;const speed=235;hero.x=clamp(hero.x+dx*speed*dt,100,worldW-100);hero.y=clamp(hero.y+dy*speed*dt,110,worldH-100);}
 hero.moving=Math.hypot(hero.x-ox,hero.y-oy)>.001;if(hero.moving){step+=Math.hypot(hero.x-ox,hero.y-oy)/13;if(hero.jumpPhase!=='flip')hero.row=facing(dx,dy);}
}

function currentPose(){
 const s=hero.state,t=hero.actionTime;if(s==='qskill')return {kind:'qFlight',column:QSkill.pose(t)};
 if(s==='plunge')return hero.jumpTime<.07?{kind:'jumpArmed',column:4}:{kind:'combo'+attackDirections[hero.row],column:hero.jumpTime<.13?18:20};
 if(hero.jumpPhase==='flip')return {kind:'flip'+attackDirections[hero.flipRow],column:Math.min(11,Math.floor(hero.jumpTime/.5*12))};
 if(hero.jumpPhase!=='ground'){
  let col=hero.jumpPhase==='anticipate'?1:hero.jumpPhase==='land'?(hero.jumpTime<.10?6:7):hero.vz>280?2:hero.vz>70?3:hero.vz>-100?4:5;
  return {kind:s==='unarmed'?'jump':'jumpArmed',column:col};
 }
 if(s==='charge')return {kind:'charge'+attackDirections[hero.row],column:Math.min(4,Math.floor(hero.chargeTime/.18))};
 if(s==='skill'){const end=.08+hero.slashCount*(hero.tier===3?.085:.12)+.25;return {kind:'charge'+attackDirections[hero.row],column:t<.12?5:t<end-.14?6:7};}
 if(s==='attack'){const p=t/strike().total;return {kind:'combo'+attackDirections[hero.row],column:hero.combo*8+Math.max(0,frameStarts.findLastIndex(start=>p>=start))};}
 if(s==='summon'||s==='sheathe')return {kind:'draw',column:clamp(Math.floor((s==='summon'?t/durations.summon:1-t/durations.sheathe)*6),0,5)};
 // The approved new front sheet has distinct left contact, passing and right
 // contact poses. Use whole frames; the side cycles retain their original art.
 if(hero.moving&&hero.row===0){const cycle=[0,5,2,1,4,6];return {kind:s==='unarmed'?'frontEmpty':'frontArmed',column:cycle[Math.floor(step*.75)%cycle.length]};}
 if(hero.moving&&hero.row===3&&s!=='unarmed'){const cycle=[1,2,4,3,5,6,8,7];return {kind:'backArmed',column:cycle[Math.floor(step)%8]};}
 if(!hero.moving&&(hero.row===1||hero.row===2))return {kind:'draw',column:s==='unarmed'?0:5};
 const cycle=[1,2,3,4,5,6,7,8];
 return {kind:s==='unarmed'?'walk':'armedWalk',column:hero.moving?cycle[Math.floor(step)%8]:0};
}
function frameFor(pose,row){const entry=window.COMBAT_ATLAS[pose.kind];return combat[pose.kind][/^(combo|flip|charge|front|back)/.test(pose.kind)?pose.column:row*entry.columns+pose.column];}

function renderFrame(f,x,y,opacity=1){ctx.save();ctx.globalAlpha=opacity;ctx.filter=f.filter||'none';ctx.drawImage(f.canvas,Math.round(x-f.ax*f.scale),Math.round(y-f.ay*f.scale),Math.round(f.canvas.width*f.scale),Math.round(f.canvas.height*f.scale));ctx.restore();}
function renderHero(pose,x,y,row){const f=frameFor(pose,row);renderFrame(f,x,y,!characterOnly&&battle.invincible>0&&Math.floor(hero.clock*18)%2?.55:1);if(!characterOnly&&battle.hurtFlash>0){if(!f.red){f.red=document.createElement('canvas');f.red.width=f.canvas.width;f.red.height=f.canvas.height;const g=f.red.getContext('2d');g.drawImage(f.canvas,0,0);g.globalCompositeOperation='source-in';g.fillStyle='#ff4149';g.fillRect(0,0,f.red.width,f.red.height);}ctx.save();ctx.globalAlpha=.65*battle.hurtFlash/.38;ctx.drawImage(f.red,Math.round(x-f.ax*f.scale),Math.round(y-f.ay*f.scale),Math.round(f.canvas.width*f.scale),Math.round(f.canvas.height*f.scale));ctx.restore();}}
function fx(kind,index,x,y,w,h,rotation=0){const im=effectFrames[kind]?.[index];if(!im)return;ctx.save();ctx.translate(x,y);ctx.rotate(rotation);ctx.drawImage(im,-w/2,-h/2,w,h);ctx.restore();}
function prepareEffects(kind,im){
 effectFrames[kind]=Array.from({length:18},(_,i)=>{
  const row=Math.floor(i/6),cw=im.width/6,ch=im.height/3;
  const y=kind==='shield'?[55,410,665][row]/1024*im.height:row*ch;
  const h=kind==='shield'?[315,245,330][row]/1024*im.height:ch;
  const c=document.createElement('canvas');c.width=Math.ceil(cw);c.height=Math.ceil(h);const g=c.getContext('2d');
  g.drawImage(im,i%6*cw,y,cw,h,0,0,c.width,c.height);
  // Soft runtime texture boundaries hide neighboring glow at sheet-cell edges.
  g.globalCompositeOperation='destination-in';
  for(const horizontal of [true,false]){const n=horizontal?c.width:c.height,gradient=g.createLinearGradient(0,0,horizontal?n:0,horizontal?0:n);gradient.addColorStop(0,'transparent');gradient.addColorStop(.10,'white');gradient.addColorStop(.90,'white');gradient.addColorStop(1,'transparent');g.fillStyle=gradient;g.fillRect(0,0,c.width,c.height);}
  return c;
 });
}

function drawComboFx(){
 if(hero.state!=='attack')return;
 const {wind,active}=strike(),p=(hero.actionTime-wind)/active;if(p<0||p>2.4)return;
 const fade=clamp(1-(p-1)/1.4,0,1),angles=[Math.PI/2,Math.PI,0,-Math.PI/2],angle=angles[hero.row];
 ctx.save();ctx.translate(hero.x,hero.y-hero.z-43);ctx.rotate(angle);ctx.globalAlpha=fade;
 const reverse=hero.combo===1?-1:1,r=hero.combo===2?78:59;
 const end=-1.3+2.6*clamp(p,0,1),begin=Math.max(-1.3,end-1.8);
 // Tapered crescent follows the active cut instead of a static circular ring.
 for(let layer=0;layer<3;layer++){
 ctx.fillStyle=['#8573d944','#72eae5bb','#f2fffa'][layer];const width=[15,8,3][layer];ctx.beginPath();
 for(let j=0;j<=20;j++){const u=j/20,a=(begin+(end-begin)*u)*reverse,rr=r+Math.sin(u*Math.PI)*width;const x=4+Math.cos(a)*rr,y=Math.sin(a)*rr*.68;j?ctx.lineTo(x,y):ctx.moveTo(x,y);}
 for(let j=20;j>=0;j--){const u=j/20,a=(begin+(end-begin)*u)*reverse;ctx.lineTo(4+Math.cos(a)*r,Math.sin(a)*r*.68);}ctx.closePath();ctx.fill();}
 for(let i=0;i<5;i++){const a=(end-.18*i)*reverse,rr=r+8+(1-fade)*(20+i*3);ctx.fillStyle=i%2?'#bdfdf2':'#c5a0ff';ctx.fillRect(Math.cos(a)*rr,Math.sin(a)*rr*.68,2,2);}
 if(hero.combo===2){ctx.fillStyle='#efffffe0';ctx.beginPath();ctx.moveTo(20,0);ctx.lineTo(48,-3*fade);ctx.lineTo(110,0);ctx.lineTo(48,3*fade);ctx.closePath();ctx.fill();}
 ctx.restore();
}
function draw(){
 ctx.save();ctx.imageSmoothingEnabled=false;ctx.fillStyle='#242b29';ctx.fillRect(0,0,W,H);ctx.save();ctx.scale(zoom,zoom);ctx.translate(-camera.x,-camera.y);ctx.drawImage(garden,0,0);if(!ready){ctx.restore();ctx.restore();return;}
 if(!characterOnly){WORLD.drawObjects(ctx,hero.y,false,battle);battleView.drawDrops(ctx);battleView.drawEnemies(ctx,hero.y,false);}
 if(['charge','skill'].includes(hero.state)){ctx.fillStyle='#21123535';ctx.fillRect(camera.x,camera.y,W/zoom,H/zoom);}
 QSkill.back(ctx,hero);
 if(hero.state==='charge'){
  const q=hero.chargeTime/2.4;ctx.save();ctx.globalAlpha=.25+q*.6;
  fx('slash',Math.min(2,Math.floor(hero.chargeTime/.7))*6+Math.floor(hero.clock*10)%6,hero.x,hero.y-45,100+q*100,100+q*100);
  ctx.strokeStyle=q>.66?'#ffe6af':'#b5efff';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(hero.x,hero.y,30+q*35,10+q*10,0,0,Math.PI*2);ctx.stroke();ctx.restore();
 }
 for(const t of trails){if(t.tier){ctx.save();ctx.globalAlpha=clamp(t.life/t.max,0,1);fx('slash',(t.tier-1)*6+Math.min(5,Math.floor((1-t.life/t.max)*6)),(t.x1+t.x2)/2,(t.y1+t.y2)/2,360+t.tier*90,210+t.tier*45,Math.atan2(t.y2-t.y1,t.x2-t.x1));ctx.restore();}}
 for(const t of trails){if(t.impact){const p=1-t.life/t.max;ctx.save();ctx.globalAlpha=1-p;ctx.strokeStyle='#b9fff1';ctx.lineWidth=4*(1-p)+1;ctx.beginPath();ctx.ellipse(t.x,t.y,20+p*110,8+p*38,0,0,Math.PI*2);ctx.stroke();fx('slash',12+Math.min(5,Math.floor(p*6)),t.x,t.y-15,130+p*80,85+p*40);ctx.restore();continue;}ctx.save();ctx.globalAlpha=Math.max(0,t.life/t.max);ctx.lineCap='round';ctx.strokeStyle='#704ed577';ctx.lineWidth=18;ctx.beginPath();ctx.moveTo(t.x1,t.y1);const cutProgress=1-Math.pow(1-clamp((t.max-t.life)/.256,0,1),2);ctx.lineTo(t.x1+(t.x2-t.x1)*cutProgress,t.y1+(t.y2-t.y1)*cutProgress);ctx.stroke();ctx.strokeStyle='#80eee9';ctx.lineWidth=5;ctx.stroke();ctx.strokeStyle='#fff9ff';ctx.lineWidth=2;ctx.stroke();
 const dx=t.x2-t.x1,dy=t.y2-t.y1,n=Math.hypot(dx,dy)||1;
 for(let i=1;i<=7;i++){const q=i/8,spread=(1-t.life/t.max)*30,px=t.x1+dx*q-dy/n*spread*(i%2?1:-1),py=t.y1+dy*q+dx/n*spread*(i%2?1:-1);ctx.fillStyle=i%2?'#b1fff8':'#b697ff';ctx.beginPath();ctx.moveTo(px,py-5);ctx.lineTo(px+2,py);ctx.lineTo(px,py+5);ctx.lineTo(px-2,py);ctx.fill();}
 ctx.restore();}
 for(const g of ghosts){if(g.dash){const p=clamp((1-g.life/g.max)/.8,0,1),v=1-Math.pow(1-p,2),f=combat['combo'+attackDirections[g.row]][18+Math.min(3,Math.floor(p*4))];for(let j=3;j>=0;j--){const q=Math.max(0,v-j*.10);renderFrame(f,g.x1+(g.x2-g.x1)*q,g.y1+(g.y2-g.y1)*q+43,(j===0?.65:.16)*Math.min(1,g.life/.08));}}else renderFrame(combat['combo'+attackDirections[g.row]][g.column??20],g.x,g.y-g.z,Math.max(0,g.life/.24)*.25);}
 ctx.fillStyle='#263d3245';ctx.beginPath();ctx.ellipse(hero.x,hero.y-2,23*(1-hero.z/240),7*(1-hero.z/240),0,0,Math.PI*2);ctx.fill();
 
 if(!characterOnly&&battle.knockdown>0){const t=1.15-battle.knockdown,lift=t<.5?Math.sin(t/.5*Math.PI)*50:0,tilt=battle.knockdown<.25?battle.knockdown/.25:Math.min(1,t/.15);ctx.save();ctx.translate(hero.x,hero.y-22-lift);ctx.rotate(tilt*Math.PI*.43);renderHero({kind:'armedWalk',column:0},0,42,hero.row);ctx.restore();}
 else renderHero(currentPose(),hero.x,hero.y-hero.z+(hero.z===0&&!hero.moving?Math.sin(hero.clock*2.5)*.5:0),hero.row);
 if(!characterOnly&&battle.knockdown>0){ctx.save();for(let i=0;i<3;i++){const a=hero.clock*5+i*2.094,x=hero.x+Math.cos(a)*24,y=hero.y-38+Math.sin(a)*7;ctx.fillStyle='#ffe6a0';ctx.beginPath();ctx.moveTo(x,y-5);ctx.lineTo(x+2,y-1);ctx.lineTo(x+5,y);ctx.lineTo(x+2,y+2);ctx.lineTo(x,y+5);ctx.lineTo(x-2,y+1);ctx.lineTo(x-5,y);ctx.lineTo(x-2,y-2);ctx.closePath();ctx.fill();}ctx.restore();}
 if(hero.jumpPhase==='flip'&&hero.state!=='unarmed'){
  const fade=Math.max(0,1-hero.jumpTime/.10)+Math.max(0,(hero.jumpTime-.42)/.08);
  ctx.save();ctx.globalAlpha=clamp(fade,0,1);ctx.strokeStyle='#c7b5ff';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(hero.x,hero.y-hero.z-45,27,12,hero.jumpTime*8,0,Math.PI*2);ctx.stroke();ctx.restore();
 }
 if(hero.state==='charge'){
  const x=hero.x-36,y=hero.y+15;ctx.fillStyle='#172c32dd';ctx.fillRect(x-2,y-2,76,10);ctx.fillStyle=hero.chargeTime>=1.6?'#ffe2a3':hero.chargeTime>=.7?'#c5a7fb':'#9de8e2';ctx.fillRect(x,y,72*Math.min(1,hero.chargeTime/1.6),6);
  ctx.fillStyle='#fff9';ctx.fillRect(x+72*.7/1.6,y,1,6);
 }
 
 drawComboFx();
 if(hero.state==='summon'||hero.state==='sheathe'){
 const p=hero.actionTime/durations[hero.state],side=hero.row===0||hero.row===1?-1:1;
 ctx.save();ctx.globalAlpha=Math.sin(clamp(p,0,1)*Math.PI);ctx.strokeStyle='#b9fff2';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(hero.x+side*19,hero.y-hero.z-30,9,18,side*.5,0,Math.PI*2);ctx.stroke();ctx.restore();
 }
 if(!characterOnly){WORLD.drawObjects(ctx,hero.y,true,battle);battleView.drawEnemies(ctx,hero.y,true);battleView.drawNumbers(ctx);battleView.update();}
 QSkill.front(ctx);
 ctx.restore();if(!characterOnly)EnemyView.hud(ctx,battle,W,H);
 document.querySelectorAll('[data-key="KeyE"]').forEach(b=>{if(b.tagName==='BUTTON'){b.disabled=hero.cooldown>0||(!characterOnly&&!battle.canSkill());b.textContent=hero.cooldown>0?'E '+hero.cooldown.toFixed(1)+'s':'E 次元斩';}});
 ctx.fillStyle='#ece4bd';ctx.font='12px PixelGame';ctx.textAlign='left';if(!paused&&!characterOnly)ctx.fillText('Q '+(hero.qCooldown>0?Math.ceil(hero.qCooldown)+'s':'剑雨')+'   E '+(hero.cooldown>0?Math.ceil(hero.cooldown)+'s':'次元斩'),14,H-16);
 ctx.restore();
}
function loadImage(src){return new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=()=>reject(Error('无法加载 '+src));im.src=src;});}
async function load(){try{
 await Promise.all(Object.entries(window.COMBAT_ATLAS).map(async([kind,entry])=>{
 const im=await loadImage(entry.src),cal={scale:entry.scale,filter:'none'};combat[kind]=entry.frames.map(f=>{
 let x0=im.width,y0=im.height,x1=0,y1=0;for(let i=0;i<f.runs.length;i+=3){const[x,y,n]=f.runs.slice(i,i+3);x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x+n);y1=Math.max(y1,y+1);}
 const c=document.createElement('canvas');c.width=x1-x0;c.height=y1-y0;const g=c.getContext('2d');for(let i=0;i<f.runs.length;i+=3){const x=f.runs[i],y=f.runs[i+1],n=f.runs[i+2];g.drawImage(im,x,y,n,1,x-x0,y-y0,n,1);}
 return {canvas:c,ax:f.ax-x0,ay:f.ay-y0,scale:cal.scale,filter:cal.filter};});
 }));
 // Side walks retain the original sheets; currentPose selects the new front art.
 // Shared standing bookends keep body size and palette stable between animations.
 for(let row=0;row<4;row++){
  for(const col of [0,7,8,15,16,23])combat['combo'+attackDirections[row]][col]=combat.armedWalk[row*9];

 }
 combat.chargedown[4]=combat.chargeHold[0];
 // A flip rotates about the torso rather than an inverted foot anchor.
 for(const dir of attackDirections)for(const f of combat['flip'+dir]){f.ax=f.canvas.width/2;f.ay=f.canvas.height/2+46/f.scale;}
 [effectImages.shield,effectImages.slash]=await Promise.all([loadImage('assets/character-v12/shield-fx.png'),loadImage('assets/character-v12/slash-fx.png')]);
 for(const kind of ['shield','slash'])prepareEffects(kind,effectImages[kind]);

 if(characterOnly){document.querySelector('#battle-hud').hidden=true;document.querySelector('.wave-hud').hidden=true;document.querySelector('.combat-summary').hidden=true;document.querySelector('#battle-notice').hidden=true;}
 const portrait=document.createElement('canvas');portrait.id='portrait-image';portrait.width=48;portrait.height=48;const portraitFrame=frameFor({kind:'walk',column:0},0),pg=portrait.getContext('2d');pg.imageSmoothingEnabled=false;pg.drawImage(portraitFrame.canvas,0,0,portraitFrame.canvas.width,portraitFrame.canvas.height*.48,0,0,48,48);document.querySelector('#portrait-image').replaceWith(portrait);
 ready=true;canvas.focus();
 }catch(e){const el=document.querySelector('#error');el.style.display='block';el.textContent=e.message;}}
function loop(time){const dt=previous?Math.min((time-previous)/1000,.04):0;previous=time;if(!document.hidden){elapsed+=dt;if(ready&&!paused)update(dt);if(!characterOnly&&(hero.z<15||battle.chest))WORLD.resolve(hero);zoom+=((battle.phase==='outro'?1.3:WORLD.zoom)-zoom)*(1-Math.exp(-dt*2));const focus=battle.phase==='outro'?{x:battle.finalBoss.x,y:battle.finalBoss.y-70}:hero;const targetX=clamp(focus.x-W/zoom/2,0,Math.max(0,worldW-W/zoom)),targetY=clamp(focus.y-H/zoom/2,0,Math.max(0,worldH-H/zoom));camera.x+=(targetX-camera.x)*(1-Math.exp(-dt*8));camera.y+=(targetY-camera.y)*(1-Math.exp(-dt*8));}draw();requestAnimationFrame(loop);}
window.gameDebug={getQ:()=>QSkill.debug(),getBattle:()=>battle.snapshot(),getCamera:()=>({...camera,zoom,worldW,worldH}),getState:()=>({...hero,ready,step,trails:trails.length,dashGhosts:ghosts.filter(g=>g.dash).length,impacts:trails.filter(t=>t.impact).length}),getFrame:()=>currentPose(),getAtlasSummary:()=>Object.fromEntries(Object.entries(combat).map(([k,v])=>[k,v.length])),getScales:()=>Object.fromEntries(Object.entries(window.COMBAT_ATLAS).map(([k,v])=>[k,v.scale])),getFramePreview:(kind,row,column)=>{
 const f=frameFor({kind,column},row),c=document.createElement('canvas');c.width=200;c.height=180;const g=c.getContext('2d');g.imageSmoothingEnabled=false;g.drawImage(f.canvas,Math.round(100-f.ax*f.scale),Math.round(160-f.ay*f.scale),Math.round(f.canvas.width*f.scale),Math.round(f.canvas.height*f.scale));return c.toDataURL();
}};
load();requestAnimationFrame(loop);
})();

