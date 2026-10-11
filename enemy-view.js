(function(){
'use strict';
const images={};for(const [name,entry] of Object.entries(window.ENEMY_ATLAS||{})){const im=new Image();im.src=entry.src;images[name]=im;}
/* Legacy player disabled; unified audio owns all voices.
const laugh=new Audio('assets/enemies-v1/boss-laugh.wav');laugh.preload='auto';laugh.volume=.65;let sound=true,unlocked=false;
const unlock=()=>{if(unlocked)return;unlocked=true;laugh.muted=true;const p=laugh.play();if(p)p.then(()=>{laugh.pause();laugh.currentTime=0;laugh.muted=false;}).catch(()=>{unlocked=false;laugh.muted=false;});};
window.addEventListener('pointerdown',unlock);window.addEventListener('keydown',unlock);

const button=document.querySelector('#sound-toggle');if(button)button.onclick=()=>{sound=!sound;window.CombatAudio?.setEnabled(sound);button.textContent=sound?'音效：开':'音效：关';if(!sound)laugh.pause();};
*/
function soundEvents(battle){for(const ev of battle.events.splice(0))window.CombatAudio?.play(ev);window.CombatAudio?.scene(battle);}
function frame(e){const phase=Math.floor(e.age*9)%4,dir=Math.abs(Math.cos(e.facing))>.65?(Math.cos(e.facing)>0?3:1):Math.sin(e.facing)>0?0:2;
 if(e.type===5)return e.state==='inhale'?4:e.state==='laugh'?5+Math.floor(e.timer*6)%3:e.state==='crouch'?8:e.state==='leap'?(e.timer<.48?9:10):e.state==='land'?11:phase;
 if(e.type===2)return dir+(e.state==='wind'||e.state==='cut'?4:0);
 if(e.type===3||e.type===4)return Math.floor(e.age*11)%8;
 return phase+(Math.sin(e.facing)<-.35?4:0);
}
const redFrames=new Map();
function redFrame(im,f,art){const key=art+':'+f.x+':'+f.y;let c=redFrames.get(key);if(!c){c=document.createElement('canvas');c.width=f.w;c.height=f.h;const g=c.getContext('2d');g.drawImage(im,f.x,f.y,f.w,f.h,0,0,f.w,f.h);g.globalCompositeOperation='source-in';g.fillStyle='#ff263e';g.fillRect(0,0,f.w,f.h);redFrames.set(key,c);}return c;}
function drawEnemy(ctx,e){const t=ENEMY_TYPES[e.type],punch=e.type===5&&['punchWind','punch','recover'].includes(e.state),art=punch?'boss-punch':t.art,a=ENEMY_ATLAS[art],im=images[art];if(!a||!im?.complete||!im.naturalWidth)return;
 const side=punch&&Math.abs(Math.cos(e.facing))>.6,pi=(side?4:0)+(e.state==='punchWind'?0:e.state==='recover'?3:Math.min(3,1+Math.floor(e.timer/.13))),f=a.frames[(punch?pi:frame(e))%a.frames.length],s=t.height/a.baseHeight,w=f.w*s,h=f.h*s;ctx.save();ctx.imageSmoothingEnabled=false;ctx.globalAlpha=Math.min(1,e.age/.5);
 ctx.fillStyle='#182c3555';ctx.beginPath();ctx.ellipse(e.x,e.y,e.radius,6,0,0,Math.PI*2);ctx.fill();
 const bob=e.state==='walk'?Math.sin(e.age*12)*1.5:0;ctx.save();if(side&&Math.cos(e.facing)<0){ctx.translate(e.x*2,0);ctx.scale(-1,1);}ctx.drawImage(im,f.x,f.y,f.w,f.h,Math.round(e.x-w/2),Math.round(e.y-h-(e.z||0)+bob),Math.round(w),Math.round(h));if(e.flash>0){ctx.globalAlpha*=.58*Math.min(1,e.flash/.06);ctx.drawImage(redFrame(im,f,art),Math.round(e.x-w/2),Math.round(e.y-h-(e.z||0)+bob),Math.round(w),Math.round(h));}ctx.restore();
 if(e.flash>0||e.block>0){ctx.strokeStyle=e.block>0?'#bbeaff':'#fff5cf';ctx.lineWidth=2;for(let i=0;i<5;i++){const a=i*1.256;ctx.beginPath();ctx.moveTo(e.x+Math.cos(a)*15,e.y-h*.45+Math.sin(a)*15);ctx.lineTo(e.x+Math.cos(a)*25,e.y-h*.45+Math.sin(a)*25);ctx.stroke();}}
 ctx.restore();if(e.type===2){ctx.fillStyle=e.shieldBroken?'#d7af77':'#a4dcee';ctx.font='10px PixelGame';ctx.textAlign='center';if(!e.shieldBroken&&e.shieldHp<e.maxShield){ctx.fillStyle='#151a24';ctx.fillRect(e.x-18,e.y-h-16,36,3);ctx.fillStyle='#a4dcee';ctx.fillRect(e.x-18,e.y-h-16,36*e.shieldHp/e.maxShield,3);}}if(e.hp<e.maxHp&&e.type!==5){ctx.fillStyle='#20312bcc';ctx.fillRect(e.x-18,e.y-h-9,36,4);ctx.fillStyle='#f1b384';ctx.fillRect(e.x-18,e.y-h-9,36*Math.max(0,e.hp/e.maxHp),4);}
}
function ground(ctx,b){ctx.save();for(const e of b.enemies){
 if(e.state==='fuse'){const p=e.timer/.55;ctx.fillStyle='#f56b3555';ctx.beginPath();ctx.ellipse(e.x,e.y,30+p*30,10+p*12,0,0,6.28);ctx.fill();for(let i=0;i<12;i++){const a=i*.524+e.timer*4;ctx.fillStyle=i%2?'#ffe2a4':'#ff503c';ctx.fillRect(e.x+Math.cos(a)*(20+p*28),e.y-18+Math.sin(a)*15,3,6);}}
 if(e.type===2&&e.state==='wind'){ctx.fillStyle='#ef79484d';ctx.beginPath();ctx.moveTo(e.x,e.y);ctx.arc(e.x,e.y,135,e.cutFacing-1.05,e.cutFacing+1.05);ctx.closePath();ctx.fill();}
 if(e.state==='punchWind'){ctx.save();ctx.translate(e.x,e.y);ctx.rotate(e.facing);ctx.fillStyle='#e7594348';ctx.fillRect(0,-45,280,90);ctx.strokeStyle='#ffaf85';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(220,-20);ctx.lineTo(250,0);ctx.lineTo(220,20);ctx.stroke();ctx.restore();}
 if(e.type===5&&['crouch','leap'].includes(e.state)){const x=e.state==='leap'?e.targetX:e.x,y=e.state==='leap'?e.targetY:e.y;ctx.fillStyle='#e7483833';ctx.beginPath();ctx.arc(x,y,145,0,6.28);ctx.fill();ctx.strokeStyle='#eb9c78';ctx.lineWidth=3;for(let i=0;i<8;i++){const a=i*Math.PI/4;ctx.beginPath();ctx.moveTo(x+Math.cos(a)*125,y+Math.sin(a)*125);ctx.lineTo(x+Math.cos(a)*145,y+Math.sin(a)*145);ctx.stroke();}}
 }ctx.restore();}
function puff(ctx,x,y,r,color){ctx.fillStyle=color;ctx.beginPath();ctx.arc(x,y,r,0,6.28);ctx.fill();}
function burst(ctx,f){const p=f.age/f.life,smoke=f.kind==='smoke'||f.kind==='dust',n=smoke?12:25;for(let i=0;i<n;i++){const a=i*2.399,spread=(.12+p*.9)*f.radius*(.4+(i%5)*.15),x=f.x+Math.cos(a)*spread,y=f.y+Math.sin(a)*spread*.6-p*(smoke?35:50);ctx.globalAlpha=(1-p)*(smoke?.7:1);if(smoke)puff(ctx,x,y,8+p*(9+i%5),i%2?'#85958a':'#566966');else{const r=(1-p)*(14+i%7);puff(ctx,x,y,r,i%3===0?'#fff0ae':i%3===1?'#ffae42':'#ed5337');ctx.fillStyle='#fff6cb';ctx.fillRect(x+Math.cos(a)*p*55,y+Math.sin(a)*p*50,3,3);}}if(!smoke&&p<.22){ctx.globalAlpha=(1-p/.22)*.8;puff(ctx,f.x,f.y-12,35+p*90,'#fff1c4');}}
function effects(ctx,b){ctx.save();for(const f of b.effects){if(f.kind==='shield-cut'){const p=f.age/f.life;ctx.save();ctx.translate(f.x,f.y);ctx.rotate(f.angle);ctx.globalAlpha=(1-p)*.85;ctx.fillStyle='#ffaf5845';ctx.beginPath();ctx.moveTo(0,0);ctx.arc(0,0,f.radius,-1.05,1.05);ctx.closePath();ctx.fill();for(let i=0;i<3;i++){ctx.strokeStyle=['#ffeab3','#ffad59','#fff9e8'][i];ctx.lineWidth=[9,5,2][i];ctx.beginPath();ctx.arc(0,0,f.radius-12-i*8,-1.05+p*.8,Math.min(1.05,-.5+p*3));ctx.stroke();}ctx.restore();continue;}if(f.kind!=='sonic'){burst(ctx,f);continue;}const p=f.age/f.life,r=f.radius*p;ctx.globalAlpha=(1-p)*.85;ctx.strokeStyle='#ffe7a5';ctx.lineWidth=5;ctx.beginPath();ctx.arc(f.x,f.y,r,0,6.28);ctx.stroke();ctx.strokeStyle='#fff9d3';ctx.lineWidth=1;ctx.beginPath();ctx.arc(f.x,f.y,Math.max(0,r-12),0,6.28);ctx.stroke();}
 ctx.globalAlpha=1;for(const p of b.bullets){const n=Math.hypot(p.vx,p.vy)||1;for(let j=3;j>0;j--){ctx.globalAlpha=.13*(4-j);puff(ctx,p.x-p.vx/n*j*5,p.y-p.vy/n*j*5,6-j,'#fc4268');}ctx.globalAlpha=1;puff(ctx,p.x,p.y,9,'#c52b4940');puff(ctx,p.x,p.y,6,'#8c183c');puff(ctx,p.x,p.y,4.8,'#ff405e');puff(ctx,p.x-1,p.y-1.5,2.4,'#ffd6c4');puff(ctx,p.x-1.5,p.y-2,1,'#fffaf0');}ctx.restore();}
function hud(ctx,b,w,h){if(window.Game?.paused)return;ctx.save();const boss=b.enemies.find(e=>e.type===5);if(boss){ctx.fillStyle='#211c28ed';ctx.fillRect(w/2-165,14,330,28);ctx.fillStyle='#dc6f58';ctx.fillRect(w/2-160,34,320*Math.max(0,boss.hp/boss.maxHp),4);ctx.fillStyle='#ffe8c1';ctx.font='12px PixelGame';ctx.textAlign='center';ctx.fillText('奶熊  '+Math.ceil(boss.hp)+' / '+boss.maxHp,w/2,28);}
if(b.waveBanner>0&&b.mode==='campaign'&&b.phase==='fight'){ctx.globalAlpha=Math.min(1,b.waveBanner);ctx.textAlign='center';ctx.font='bold 26px PixelGame';ctx.fillStyle='#f0debc';ctx.shadowColor='#101c1b';ctx.shadowBlur=8;ctx.fillText('第 '+b.wave+' 关',w/2,90);}
ctx.restore();}
window.EnemyView={drawEnemy,ground,effects,hud,soundEvents};
})();
