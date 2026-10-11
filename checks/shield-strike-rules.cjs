const assert=require('assert/strict');const {Battle}=require('../enemy-battle.js');const world=require('../world.js');world.obstacles=[];
function fixture(x=1080,y=1000,dodge=0){const b=new Battle();b.wave=3;b.spawnTime=999;const h={x,y,row:0,z:0,state:'armed',dodgeTime:dodge};const e=b.spawn(h,2);Object.assign(e,{x:1000,y:1000,state:'wind',timer:.54,facing:0,cutFacing:0,age:2,knockX:0,knockY:0});return {b,h,e};}
{const {b,h,e}=fixture();const hp=b.hp;b.enemyStep(e,.02,h);assert(b.hp<hp);assert(b.pushTime>0);assert.equal(b.knockdown,0);assert(b.effects.some(f=>f.kind==='shield-cut'));const x=h.x;b.update(.04,h);assert(h.x>x);const after=b.hp;b.enemyStep(e,.02,h);assert.equal(b.hp,after);}
for(const [x,y,dodge]of [[920,1000,0],[1000,1140,0],[1080,1000,.1],[1140,1000,0]]){const {b,h,e}=fixture(x,y,dodge);const hp=b.hp;b.enemyStep(e,.02,h);assert.equal(b.hp,hp);assert.equal(b.pushTime,0);}
{const {b,h,e}=fixture();b.hurtEnemy(e,5,{x:900,y:1000});assert.equal(e.flash,.18);b.enemyStep(e,.04,h);assert(e.flash<.18);b.revive();}
console.log('PASS shield forward sector, rear/range/dodge safety, one hit, pushback without knockdown, red flash duration');
