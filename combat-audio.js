/* Synthesized game effects: no network, downloaded sounds or audio dependencies. */
(function(){let ac,master,enabled=true,suspended=false,volume=.7;const recent={};
function unlock(){if(!ac){ac=new (window.AudioContext||window.webkitAudioContext)();master=ac.createGain();master.gain.value=enabled&&!suspended?.38*volume:0;master.connect(ac.destination);}if(ac.state==='suspended')ac.resume();}
window.addEventListener('pointerdown',unlock);window.addEventListener('keydown',unlock);
function tone(freq,end,duration,volume,type='sine',delay=0){const t=ac.currentTime+delay,o=ac.createOscillator(),g=ac.createGain();o.type=type;o.frequency.setValueAtTime(freq,t);o.frequency.exponentialRampToValueAtTime(Math.max(20,end),t+duration);g.gain.setValueAtTime(.001,t);g.gain.linearRampToValueAtTime(volume,t+.008);g.gain.exponentialRampToValueAtTime(.001,t+duration);o.connect(g);g.connect(master);o.start(t);o.stop(t+duration+.02);}
function noise(duration,volume,freq){const buffer=ac.createBuffer(1,Math.ceil(ac.sampleRate*duration),ac.sampleRate),data=buffer.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*(1-i/data.length)**2;const s=ac.createBufferSource(),f=ac.createBiquadFilter(),g=ac.createGain();s.buffer=buffer;f.type='lowpass';f.frequency.value=freq;g.gain.value=volume;s.connect(f);f.connect(g);g.connect(master);s.start();}
function play(name){if(!enabled||suspended||!ac||ac.state!=='running')return;const t=ac.currentTime;if(t-(recent[name]??-100)<(name==='hit'?.065:.08))return;recent[name]=t;
if(name==='attack'){noise(.14,.3,3800);tone(420,90,.12,.12,'triangle');}
if(name==='hit'){noise(.08,.25,1900);tone(170,65,.09,.12,'square');}
if(name==='hurt'){noise(.19,.32,1500);tone(240,65,.2,.22,'sawtooth');}
if(name==='blast'||name==='slam'){noise(.65,.7,950);tone(120,28,.55,.45);}
if(name==='charge'){tone(220,850,.5,.13,'triangle');tone(330,1300,.6,.09,'sine');}
if(name==='skill'){noise(.35,.3,5200);for(let i=0;i<4;i++)tone(850+i*190,180,.3,.13,'triangle',i*.06);}
if(name==='punch'){noise(.23,.4,1200);tone(150,35,.2,.3);}
if(name==='block'){tone(1250,450,.16,.14,'triangle');}
if(name==='wave'){for(let i=0;i<3;i++)tone([440,550,660][i],[440,550,660][i],.25,.1,'sine',i*.1);}}
window.CombatAudio={play,setSuspended(value){suspended=value;if(master)master.gain.value=enabled&&!suspended?.38*volume:0;},setVolume(v){volume=v;if(master)master.gain.value=enabled&&!suspended?.38*v:0;},setEnabled(value){enabled=value;if(master)master.gain.value=value&&!suspended?.38*volume:0;},getState:()=>({enabled,state:ac?.state||'locked'})};
})();
