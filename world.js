(function(root){
const WORLD={width:2400,height:1800,margin:100,zoom:.76,obstacles:[]};
WORLD.resolve=function(body){for(const o of this.obstacles){if(o.hp<=0)continue;let dx=body.x-o.x,dy=body.y-o.y,n=Math.hypot(dx,dy),r=(o.radius||15)+(body.radius||13);if(n<r){if(n<.01){dx=1;dy=0;n=1;}body.x=o.x+dx/n*r;body.y=o.y+dy/n*r;}}};
WORLD.create=function(){const c=document.createElement('canvas');c.width=this.width;c.height=this.height;const g=c.getContext('2d');let seed=7124;const rnd=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);const rect=(x,y,w,h,color)=>{g.fillStyle=color;g.fillRect(Math.round(x/3)*3,Math.round(y/3)*3,w,h);};
rect(0,0,c.width,c.height,'#423c37');
for(let i=0;i<650;i++){const x=rnd()*c.width,y=rnd()*c.height;g.fillStyle=['#493f37','#4e4439','#3d3935','#514637'][i%4];g.beginPath();g.ellipse(x,y,25+rnd()*90,12+rnd()*45,0,0,6.28);g.fill();}
for(let i=0;i<15000;i++)rect(rnd()*c.width,rnd()*c.height,3+rnd()*5,3,['#5d5040','#302f2d','#655744','#4a4338'][i%4]);
for(let i=0;i<190;i++){const x=130+rnd()*(c.width-260),y=130+rnd()*(c.height-260);g.strokeStyle='#292c2a';g.lineWidth=2;g.beginPath();g.moveTo(x,y);g.lineTo(x+14,y+4);g.lineTo(x+20,y-2);g.lineTo(x+34,y+7);g.stroke();}
function tree(x,y,s){g.save();g.translate(x,y);g.scale(s,s);g.fillStyle='#171e1dcc';g.beginPath();g.ellipse(0,5,45,13,0,0,6.28);g.fill();g.strokeStyle='#202626';g.lineCap='square';g.lineJoin='miter';g.lineWidth=17;g.beginPath();g.moveTo(-17,5);g.lineTo(0,-12);g.lineTo(-4,-59);g.lineTo(7,-103);g.lineTo(1,-140);g.moveTo(2,-65);g.lineTo(-30,-88);g.lineTo(-44,-122);g.moveTo(4,-89);g.lineTo(35,-116);g.lineTo(43,-153);g.stroke();g.strokeStyle='#514b43';g.lineWidth=5;g.beginPath();g.moveTo(-3,0);g.lineTo(1,-54);g.lineTo(10,-101);g.moveTo(1,-56);g.lineTo(-26,-88);g.stroke();g.strokeStyle='#262d2b';g.lineWidth=6;g.beginPath();g.moveTo(-31,-90);g.lineTo(-65,-104);g.lineTo(-73,-121);g.moveTo(32,-115);g.lineTo(66,-112);g.lineTo(77,-132);g.moveTo(3,-122);g.lineTo(-22,-153);g.stroke();g.fillStyle='#65736a';g.fillRect(4,-37,3,13);g.restore();}
for(let x=40;x<c.width;x+=100){tree(x,70+rnd()*55,.8+rnd()*.6);tree(x,c.height-20-rnd()*25,1+rnd()*.5);}
for(let y=180;y<c.height-120;y+=105){tree(30+rnd()*30,y,1+rnd()*.5);tree(c.width-25-rnd()*25,y,1+rnd()*.5);}
// Sparse groves frame the starting clearing and provide landmarks while travelling.
this.obstacles=[];
for(let i=0;i<180;i++){const x=110+rnd()*(c.width-220),y=120+rnd()*(c.height-240);rect(x,y,12,5,'#2d3330');rect(x+3,y-4,8,5,'#62675a');if(i%3===0){rect(x-4,y-10,2,12,'#727360');rect(x+8,y-12,2,14,'#575f50');}}
return c;};root.WORLD=WORLD;if(typeof module!=='undefined')module.exports=WORLD;
})(typeof window==='undefined'?globalThis:window);
