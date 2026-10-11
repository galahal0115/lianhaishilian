const {app,BrowserWindow,Menu}=require('electron');
const path=require('node:path'),fs=require('node:fs');
const smoke=process.argv.includes('--smoke-test');
if(smoke){app.commandLine.appendSwitch('mute-audio');app.setPath('userData',path.join(app.getPath('temp'),'lianhaishilian-smoke'));}
if(!app.requestSingleInstanceLock()){app.quit();}else{
let win;
app.on('second-instance',()=>{if(win){if(win.isMinimized())win.restore();win.focus();}});
app.whenReady().then(()=>{
 Menu.setApplicationMenu(null);
 win=new BrowserWindow({width:1280,height:840,minWidth:800,minHeight:550,title:'恋还是练',backgroundColor:'#101815',show:!smoke,autoHideMenuBar:true,webPreferences:{nodeIntegration:false,contextIsolation:true,sandbox:true,offscreen:smoke,backgroundThrottling:!smoke,devTools:!app.isPackaged}});
 win.webContents.setWindowOpenHandler(()=>({action:'deny'}));
 win.webContents.on('will-navigate',(event,url)=>{if(!url.startsWith('file://'))event.preventDefault();});
 win.webContents.session.setPermissionRequestHandler((_wc,_permission,callback)=>callback(false));
 win.on('blur',()=>{if(!win.isDestroyed())win.webContents.setAudioMuted(true);});
 win.on('focus',()=>{if(!win.isDestroyed())win.webContents.setAudioMuted(smoke);});
 win.webContents.on('before-input-event',(event,input)=>{if(input.type==='keyDown'&&input.key==='F11'){event.preventDefault();win.setFullScreen(!win.isFullScreen());}});
 if(smoke){const errors=[];win.webContents.on('console-message',(_e,details)=>{if(details.level==='error')errors.push(details.message);});setTimeout(()=>{finish({ok:false,error:'desktop smoke timeout',errors});},20000).unref();win.webContents.on('did-finish-load',async()=>{try{const result=await win.webContents.executeJavaScript(`(async()=>{Object.defineProperty(document,'hidden',{get:()=>false});for(let i=0;i<100&&!window.gameDebug?.getState().ready;i++)await new Promise(r=>setTimeout(r,100));if(!gameDebug.getState().ready)throw Error('assets not ready');const must=(x,msg)=>{if(!x)throw Error(msg)};must(document.querySelector('.menu-preview img').naturalWidth>0,'menu artwork');GameShell.start('campaign');const b=Game.audioScene();b.finishWave();for(let i=0;i<50;i++)b.update(.04,gameDebug.getState());for(let i=0;i<50&&document.querySelectorAll('.reward-choices button').length!==3;i++)await new Promise(r=>setTimeout(r,100));must(b.phase==='reward','reward phase');must(document.querySelectorAll('.reward-choices button').length===3,'three choices');document.querySelector('.reward-choices button').click();must(b.wave===2&&b.phase==='fight','reward advances');GameShell.start('boss');must(b.level===20&&b.maxHp===378&&Math.abs(b.attack-84)<.01,'level 20 boost');b.update(.01,gameDebug.getState());must(b.enemies.some(e=>e.type===5&&e.hp===19500),'boss HP');Game.pause(false);window.dispatchEvent(new KeyboardEvent('keydown',{code:'KeyQ'}));window.dispatchEvent(new KeyboardEvent('keyup',{code:'KeyQ'}));for(let i=0;i<60&&gameDebug.getQ().emitted===0;i++)await new Promise(r=>setTimeout(r,100));must(gameDebug.getState().state==='qskill','Q flight');must(gameDebug.getQ().emitted>0,'Q swords '+JSON.stringify({h:gameDebug.getState(),paused:Game.paused,hidden:document.hidden}));GameShell.home();return {ok:true,ready:true,rewards:3,bossHP:19500,level:20,hp:378,attack:84,qFrames:gameDebug.getAtlasSummary().qFlight};})()`);finish({...result,errors});}catch(e){finish({ok:false,error:String(e),errors});}});}
 win.loadFile(path.join(__dirname,'index.html'));
});
function finish(result){if(process.env.LHL_TEST_OUTPUT)fs.writeFileSync(process.env.LHL_TEST_OUTPUT,JSON.stringify(result,null,2));app.exit(result.ok?0:1);}
app.on('window-all-closed',()=>app.quit());
}





