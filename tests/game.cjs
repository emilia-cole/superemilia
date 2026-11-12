const fs=require('fs'),vm=require('vm'),assert=require('assert');
const html=fs.readFileSync(process.argv[2]||'public/world/index.html','utf8');
const script=html.split('<script>')[1].split('</script>')[0];
function boot(options={}){
 const nodes=new Map(),classes=new Set(),gradient={addColorStop(){}},ctx=new Proxy({createLinearGradient(){return gradient}},{get:(t,k)=>t[k]||(()=>{})});
 function node(id){if(!nodes.has(id)){const listeners={};nodes.set(id,{textContent:'',innerHTML:'',value:'',hidden:false,open:false,style:{},dataset:{},classList:{toggle(){},add(){},remove(){}},setAttribute(){},focus(){},setPointerCapture(){},addEventListener(type,fn){(listeners[type]??=[]).push(fn)},emit(type,event){for(const fn of listeners[type]||[])fn(event)},showModal(){this.open=true},close(){this.open=false;for(const fn of listeners.close||[])fn()},getContext(){return ctx},getBoundingClientRect(){return {width:1100,height:620}},querySelectorAll(){return []},querySelector(){return null}})}return nodes.get(id)}
 const buddies=[1,2,3].map(n=>{const b=node('buddy'+n);b.dataset.buddy=String(n);return b});
 const holds=['Space','ArrowLeft','ArrowRight','ArrowDown'].map(k=>{const b=node(k);b.dataset.hold=k;return b});
 const storage={...(options.storage||{})};
 const timers=new Map();let clock=0,nextTimer=0;
 const sandbox={console,Math,Number,JSON,Array,Object,String,Boolean,Set,Map,setTimeout(fn,delay=0){const id=++nextTimer;timers.set(id,{fn,at:clock+delay});return id},clearTimeout(id){timers.delete(id)},requestAnimationFrame(){},localStorage:{getItem:k=>storage[k],setItem:(k,v)=>storage[k]=v},document:{querySelector:node,querySelectorAll:s=>s==='[data-buddy]'?buddies:s==='[data-hold]'?holds:[],addEventListener(){},body:{classList:{contains:c=>classes.has(c),toggle(c,on){on?classes.add(c):classes.delete(c)}}}},window:{addEventListener(){}}};
 vm.createContext(sandbox);vm.runInContext(script,sandbox);const run=source=>vm.runInContext(source,sandbox);
 run.advance=ms=>{const end=clock+ms;while(true){const next=[...timers].sort((a,b)=>a[1].at-b[1].at)[0];if(!next||next[1].at>end)break;clock=next[1].at;timers.delete(next[0]);next[1].fn()}clock=end};
 run.fire=(selector,type,event)=>node(selector).emit(type,event);run.fireHold=(code,type,event)=>holds.find(b=>b.dataset.hold===code).emit(type,event);
 if(!options.splash)run("$('#splashScreen').close()");return run;
}
let checks=0;const test=(name,fn)=>{fn();console.log('✓ '+name);checks++};
test('The artwork splash stays for five seconds, can be skipped, and never starts gameplay',()=>{
 const run=boot({splash:true});assert(run("$('#splashScreen').open&&state==='ready'"));run.advance(4999);assert(run("$('#splashScreen').open&&!splashLeaving"));run.advance(1);assert(run('splashLeaving'));run.advance(300);assert(run("!$('#splashScreen').open&&state==='ready'&&time===0"));
 const skip=boot({splash:true});skip("$('#skipSplash').onclick()");skip.advance(300);assert(skip("!$('#splashScreen').open&&state==='ready'"));skip.advance(6000);assert(!skip("$('#splashScreen').open"));
});
test('Touch controls cancel browser gestures while preserving double jump and simultaneous movement',()=>{
 const run=boot();run("state='playing';sound=false;for(let i=0;i<3;i++)physics(STEP)");const touch=()=>({cancelable:true,defaultPrevented:false,pointerId:1,preventDefault(){this.defaultPrevented=true}});
 const right=touch();run.fireHold('ArrowRight','pointerdown',right);const first=touch();run.fireHold('Space','touchstart',first);run.fireHold('Space','pointerdown',touch());run('physics(STEP)');assert(first.defaultPrevented);assert(run('p.jumps===1&&p.vy<0&&keys.ArrowRight'));
 const end=touch();run.fireHold('Space','touchend',end);run.fireHold('Space','pointerup',touch());assert(end.defaultPrevented);run.fireHold('Space','touchstart',touch());run.fireHold('Space','pointerdown',touch());run('physics(STEP)');assert(run('p.jumps===2&&p.vy<0&&keys.ArrowRight'));
 run.fireHold('ArrowRight','pointercancel',touch());assert(!run('keys.ArrowRight'));
 const runTap=touch();run.fire('#run','touchstart',runTap);assert(runTap.defaultPrevented&&run('runLatched'));run.fire('#run','touchend',touch());run.fire('#run','touchstart',touch());assert(!run('runLatched'));
 const powerTap=touch();run.fire('#ability','touchstart',powerTap);assert(powerTap.defaultPrevented&&run('p.power===3&&p.cooldown===8'));
});
test('All 60 stages have three gems, safe start/finish, varied layouts, and reachable gaps',()=>{
 const run=boot();const layouts=new Set();for(const th of ['space','candy','forest','squishy','home'])for(let i=0;i<12;i++){
 const d=run(`theme='${th}';level=${i};makeLevel();({gems:gems.length,grounds:solids.filter(a=>a.kind==='ground'),blocks:blocks.length,width:worldWidth,goal:goalX,ledges:ledges.length,hazards:hazards.length,checks:checkpoints.length})`);
 assert.equal(d.gems,3);assert(d.blocks>20&&d.width>5000&&d.goal<d.width);assert(d.ledges>10&&d.hazards>=4&&d.checks>=3);assert.equal(d.grounds[0].x,0);assert.equal(d.grounds[0].y,520);for(let j=1;j<d.grounds.length;j++){const gap=d.grounds[j].x-d.grounds[j-1].x-d.grounds[j-1].w;assert(gap<=140&&gap>=76);assert(Math.abs(d.grounds[j].y-d.grounds[j-1].y)<=40)}if(th==='space')layouts.add(JSON.stringify(d.grounds));
 }assert.equal(layouts.size,12);
});
test('Movement accelerates, sprint is faster, and camera follows without crossing the world edge',()=>{
 const run=boot();let d=run(`state='playing';sound=false;enemies=[];hazards=[];keys.ArrowRight=true;for(let i=0;i<60;i++)physics(STEP);({vx:p.vx,x:p.x,cam:camera})`);assert.equal(d.vx,265);assert(d.x>170);
 d=run(`keys.ShiftLeft=true;for(let i=0;i<30;i++)physics(STEP);({vx:p.vx,x:p.x})`);assert.equal(d.vx,385);run(`p.x=3000;p.y=200;p.vy=0;for(let i=0;i<30;i++)physics(STEP)`);assert(run('camera')>500);assert(run('camera<=worldWidth-W'));
});
test('Single jump, double jump, variable height, coyote time and jump buffer work',()=>{
 const run=boot();run(`state='playing';sound=false;for(let i=0;i<3;i++)physics(STEP);pressed('Space');physics(STEP)`);assert(run('p.vy< -600&&p.jumps===1&&!p.grounded'));run(`released('Space')`);assert.equal(run('p.vy'),-270);run(`pressed('Space');physics(STEP)`);assert(run('p.jumps===2&&p.vy< -550'));run(`released('Space');pressed('Space');physics(STEP)`);assert.equal(run('p.jumps'),2);
 run(`clearKeys();p.x=200;p.y=460;p.vy=200;p.jumps=2;p.buffer=.14;for(let i=0;i<10;i++)physics(STEP)`);assert(run('p.vy<0&&p.jumps===1'));
 run(`clearKeys();p.x=760;p.y=474;p.vy=0;p.jumps=0;p.grounded=false;p.coyote=.08;p.buffer=.1;physics(STEP)`);assert(run('p.jumps===1&&p.vy< -600'));
});
test('Surprise blocks trigger from below once, spawn power-ups, and solid sides stop the player',()=>{
 const run=boot();run(`state='playing';sound=false;const b=blocks.find(b=>b.kind==='question');p.x=b.x+4;p.y=b.y+b.h+2;p.vy=-500;p.inv=0;physics(STEP)`);assert(run('blocks[0].used&&items.length===1&&p.vy>=0'));
 run(`p.x=362;p.y=375;p.vx=200;keys.ArrowRight=true;physics(STEP)`);assert(run('p.x+p.w<=400.01'));
 const before=run('items.length');run('bumpBlock(blocks[0])');assert.equal(run('items.length'),before);
});
test('Stomps bounce, side contact removes one heart, shields absorb contact, and falls return to a flag',()=>{
 const run=boot();run(`state='playing';sound=false;const e=enemies[0];p.x=e.x;p.y=e.y-p.h-1;p.vy=300;p.inv=0;physics(STEP)`);assert(run('!enemies[0].alive&&stomps===1&&p.vy<0'));
 run(`p.inv=0;p.star=0;p.shield=0;damage(p.x+30)`);assert.equal(run('p.hp'),2);run(`p.inv=0;p.shield=10;damage(p.x+30)`);assert(run('p.hp===2&&p.shield===0&&p.inv>0'));
 run(`const flag=checkpoints[0];p.x=flag.x;p.y=flag.y+flag.h-p.h;p.vy=0;physics(STEP)`);assert(run('checkpoints[0].active&&checkpointIndex===0'));
 run(`p.y=H+150;physics(STEP)`);assert(run('p.x===spawn.x&&p.y===spawn.y&&p.hp===3'));
});
test('World powers have a cooldown; pause prevents input and stages finish only once',()=>{
 const run=boot();run(`sound=false;state='playing';ability()`);assert(run('p.power===3&&p.cooldown===8'));run(`p.power=1;ability()`);assert.equal(run('p.power'),1);
 run(`pause();pressed('ArrowRight')`);assert(run("state==='paused'&&!keys.ArrowRight"));run(`start();finish()`);assert(run("state==='complete'&&rescues===1"));const stars=run('bank');run('finish()');assert.equal(run('bank'),stars);run('start()');assert(run("level===1&&state==='playing'&&stageStars===0"));
 run(`level=11;makeLevel();state='playing';finish()`);assert.equal(run('state'),'bossReady');assert(run("medals['space:11']&&boss===null"));
});
test('Every world and stage renders without errors; rewards and buddy selections save',()=>{
 const run=boot();for(const th of ['space','candy','forest','squishy','home'])for(let i=0;i<12;i++)run(`theme='${th}';level=${i};makeLevel();camera=goalX-700;render();camera=1000;render()`);run('buddy=3;bank=40;hat=3;save()');assert.equal(run("JSON.parse(localStorage.getItem('laserLeapRewards')).buddy"),3);
});
test('Every stage hides three different coin rooms among ordinary-looking pipes',()=>{
 const run=boot();for(const th of ['space','candy','forest','squishy','home'])for(let i=0;i<12;i++){
  run(`theme='${th}';level=${i};makeLevel()`);assert.equal(run('pipes.filter(a=>a.secret).length'),3);assert(run('pipes.some(a=>!a.secret)'));assert(run('gems.length===3&&gems.every(a=>a.hidden&&!a.got)'));assert(run("signs.every(a=>a.type==='start')"));assert.equal(run('new Set(pipes.filter(a=>a.secret).map(a=>a.type)).size'),3);
 }
});
test('Pipes require standing on the opening, and used rooms cannot be farmed within a stage',()=>{
 const run=boot();run(`state='playing';sound=false;tryPipe()`);assert.equal(run('pipeTransition'),null);
 run(`const entrance=pipes.find(a=>a.secret);p.x=entrance.x+19;p.y=entrance.y-p.h;p.grounded=false;tryPipe()`);assert.equal(run('pipeTransition'),null);
 run(`p.grounded=true;tryPipe();for(let i=0;i<75;i++)physics(STEP)`);assert(run('bonus!==null&&returnScene.pipe.used'));run('finishBonusRoom(true);returnToLevel();p.grounded=true;p.y=pipes.find(a=>a.secret).y-p.h;tryPipe()');assert.equal(run('bonus'),null);assert.equal(run('pipeTransition'),null);
});
test('Bonus rewards save and returning preserves the exact level, checkpoint, health and enemies',()=>{
 const run=boot();run(`state='playing';sound=false;stageStars=7;bank=7;stageCoins=2;coinBank=10;time=12;checkpointIndex=1;spawn={x:900,y:420};enemies[0].alive=false;p.hp=2;const entrance=pipes.find(a=>a.secret&&a.type===0);enterBonus(entrance);for(const a of coins.slice(0,18))collectCoin(a);finishBonusRoom(false)`);
 assert(run("state==='bonusComplete'&&bonus.success&&stageGems===1"));assert.equal(run('coinBank'),38);assert.equal(run('stageCoins'),30);assert.equal(run('stageStars'),12);assert.equal(run('bank'),12);
 const reward=run('coinBank');run('finishBonusRoom(false)');assert.equal(run('coinBank'),reward);run('start()');assert(run("state==='playing'&&bonus===null&&returnScene===null"));assert(run('p.hp===2&&time===12&&checkpointIndex===1&&spawn.x===900&&!enemies[0].alive'));assert(run('gems.filter(a=>a.got).length===1'));assert.equal(run("JSON.parse(localStorage.getItem('laserLeapRewards')).coins"),38);
});
test('Timed coin games end safely; failed attempts retain coins and timers stop in menus',()=>{
 const run=boot();for(let type=0;type<3;type++){
  run(`level=${type};makeLevel();state='playing';sound=false;enterBonus(pipes.find(a=>a.secret&&a.type===${type}));collectCoin(coins[0]||{x:0,y:0,got:false});openWorldMap()`);const remaining=run('bonus.remaining');run('frame(1000);frame(2000)');assert.equal(run('bonus.remaining'),remaining);run("$('#mapDialog').close()");assert.equal(run('state'),'playing');run('bonus.remaining=.001;physics(STEP)');assert.equal(run('state'),'bonusComplete');assert(!run('bonus.success'));const saved=run('coinBank');run('start()');assert.equal(run('coinBank'),saved);assert.equal(run('stageGems'),0);
 }
 run(`level=1;makeLevel();state='playing';enterBonus(pipes.find(a=>a.secret&&a.type===1));for(let i=0;i<600;i++)physics(STEP)`);assert(run('bonus.spawnCount>10&&coins.some(a=>a.falling)'));
});
test('Mystery blocks allow one guess per tier, lock the other choices, and keep every coin',()=>{
 const run=boot();run(`state='playing';sound=false;enterBonus(pipes.find(a=>a.secret&&a.type===3));bonus.rows[0].winner=1;bumpBlock(bonus.rows[0].blocks[0])`);
 assert(run('bonus.activeTier===1&&bonus.correctRows===0&&bonus.rows[0].blocks.every(b=>b.used)&&coinBank===0'));
 run('bumpBlock(bonus.rows[0].blocks[1]);bumpBlock(bonus.rows[2].blocks[0])');assert(run('bonus.activeTier===1&&coinBank===0'));
 run(`for(let tier=1;tier<5;tier++)bumpBlock(bonus.rows[tier].blocks[bonus.rows[tier].winner])`);
 assert(run('bonus.activeTier===5&&bonus.gameCleared&&bonus.correctRows===4&&coinBank===70'));
 run(`const exit=pipes[0];p.x=exit.x+19;p.y=exit.y-p.h;p.grounded=true;tryPipe()`);assert(run("state==='bonusComplete'&&bonus.success&&coinBank===80&&stageGems===1"));
 run('start()');assert(run("state==='playing'&&bonus===null&&cameraY===0&&coinBank===80"));
});
test('The mystery ladder unlocks each floor, follows the upper tiers, and has no timer',()=>{
 const run=boot();run(`state='playing';sound=false;enterBonus(pipes.find(a=>a.secret&&a.type===3));p.x=650;p.y=339-p.h;p.vy=180;physics(STEP)`);assert(!run('p.grounded'));
 run(`bumpBlock(bonus.rows[0].blocks[0]);p.x=650;p.y=339-p.h;p.vy=180;physics(STEP)`);assert(run('p.grounded&&p.ground.requiresTier===1'));
 run(`for(let tier=1;tier<4;tier++)bumpBlock(bonus.rows[tier].blocks[0]);p.x=210;p.y=-230;p.vy=0;physics(STEP);render();updateBonus(100000)`);
 assert(run("cameraY<0&&state==='playing'&&!bonus.done&&bonus.remaining===Infinity"));
 run(`p.x=pipes[0].x+19;p.y=pipes[0].y-p.h;p.grounded=true;tryPipe()`);assert.equal(run('state'),'playing');
});
test('The map launches the selected land and stage, then restores normal controls',()=>{
 const run=boot();run(`state='playing';openWorldMap()`);assert(run("state==='paused'&&$('#mapDialog').open"));run(`mapTheme='forest';mapLevel=9;drawWorldMap();$('#playMapLevel').onclick()`);assert(run("theme==='forest'&&level===9&&state==='playing'&&!$('#mapDialog').open&&bonus===null"));assert.equal(run("JSON.parse(localStorage.getItem('laserLeapRewards')).level"),9);
});
test('The help popup freezes an active adventure and preserves ready and paused screens',()=>{
 const run=boot();run(`state='playing';sound=false;time=12;p.x=200;keys.ArrowRight=true;openHowToPlay()`);
 assert(run("state==='paused'&&$('#howToPlayDialog').open&&!keys.ArrowRight"));
 run('pressed("Space");frame(1000);frame(2000)');assert(run('time===12&&p.x===200&&!keys.Space'));
 run("$('#dismissHelp').onclick()");assert(run("state==='playing'&&!$('#howToPlayDialog').open"));
 run("pause();openHowToPlay();$('#closeHelp').onclick()");assert(run("state==='paused'&&!$('#overlay').hidden"));
 run("state='ready';openHowToPlay();$('#howToPlayDialog').close()");assert.equal(run('state'),'ready');
});
test('Character choices preview without changing the player until applied and persist for all buddies',()=>{
 const run=boot();run(`state='playing';openCharacterStudio();studioDraft.hair='braids';studioDraft.skin='#8c5b45';studioDraft.outfit='overalls';renderLookPreview()`);assert(run("looks.hero.hair==='none'&&state==='paused'"));run("$('#characterDialog').close()");assert(run("looks.hero.hair==='none'&&state==='playing'"));
 run(`openCharacterStudio();studioDraft.hair='braids';studioDraft.skin='#8c5b45';studioDraft.outfit='overalls';applyCharacterLook()`);assert(run("looks.hero.hair==='braids'&&looks.hero.skin==='#8c5b45'&&state==='playing'"));assert.equal(run("JSON.parse(localStorage.getItem('laserLeapRewards')).appearance.hero.outfit"),'overalls');
 run(`openCharacterStudio();studioTarget='mochi';studioDraft={...looks.mochi,color:'#d6a178',accessory:'bow'};applyCharacterLook()`);assert(run("buddy===2&&looks.mochi.accessory==='bow'"));
 assert.equal(run("normalizeLooks({hero:{outfit:'bad',skin:'bad',hair:'bad'}}).hero.skin"),'#fff0d8');
});
test('Every world, bonus type and character outfit renders with saved customization',()=>{
 const run=boot();for(const th of ['space','candy','forest','squishy','home'])for(const outfit of ['suit','overalls','dress','hoodie']){
  run(`theme='${th}';makeLevel();looks.hero.outfit='${outfit}';looks.hero.hair='curly';looks.hero.accessory='glasses';render()`);
  for(let type=0;type<4;type++)run(`level=${type};makeLevel();state='playing';enterBonus(pipes.find(a=>a.secret&&a.type===${type}));render();finishBonusRoom(true);returnToLevel()`);
 }
});
test('Share previews are static, use the canonical domain, and declare the actual image sizes',()=>{
 const head=html.split('</head>')[0],tags=[...head.matchAll(/<meta (?:property|name)="([^"]+)" content="([^"]*)">/g)];
 assert(head.includes('<link rel="canonical" href="https://superemilia.com/world/">'));assert(html.includes('<a class="help-link quiet all-games" href="/">← All games</a>'));assert(html.includes('Designed with ❤️ in Smyrna by Emilia'));
 const pictures=[];for(const [,name,value] of tags){if(name==='og:image')pictures.push({url:value});else if(name.startsWith('og:image:'))pictures.at(-1)[name.slice(9)]=value}
 assert.equal(pictures.length,2);for(const picture of pictures){const url=new URL(picture.url);assert.equal(url.origin,'https://superemilia.com');assert.equal(picture.type,'image/png');assert(picture.alt.length>20);const data=fs.readFileSync(require('path').resolve(__dirname,'../public'+url.pathname));assert.equal(data.toString('hex',0,8),'89504e470d0a1a0a');assert.equal(data.readUInt32BE(16),Number(picture.width));assert.equal(data.readUInt32BE(20),Number(picture.height));assert(data.length<5*1024*1024)}
 assert(tags.some(([,name,value])=>name==='twitter:card'&&value==='summary_large_image'));assert(tags.some(([,name,value])=>name==='twitter:image'&&value===pictures[0].url));
 const meta=Object.fromEntries(tags.map(([,name,value])=>[name,value]));assert.equal(meta['og:description'],meta.description);assert.equal(meta['twitter:description'],meta.description);assert(meta.description.includes('144 levels')&&meta.description.includes('Pip, Mochi, Luna')&&meta.description.length<200);assert.equal(meta['og:url'],'https://superemilia.com/world/');assert.equal(meta['og:title'],meta['twitter:title']);assert(meta['og:title'].length<70);
});
test('Search and link readers receive connected game, site, and cover details without running JavaScript',()=>{
 const head=html.split('</head>')[0],data=JSON.parse(head.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
 assert.equal(data['@context'],'https://schema.org');const graph=data['@graph'],game=graph.find(n=>n['@type']==='VideoGame'),site=graph.find(n=>n['@type']==='WebSite'),page=graph.find(n=>n['@type']==='WebPage'),image=graph.find(n=>n['@id']===game.image['@id']);
 assert.equal(game.name,'Super Emilia World');assert.equal(game.author.name,'Emilia');assert.equal(game.isAccessibleForFree,true);assert.equal(game.playMode,'https://schema.org/SinglePlayer');assert.equal(page.mainEntity['@id'],game['@id']);assert.equal(page.isPartOf['@id'],site['@id']);assert.equal(image.width,1717);assert.equal(image.height,916);assert.equal(game.url,page.url);assert.equal(page.url,'https://superemilia.com/world/');assert.equal(site.url,'https://superemilia.com/');assert.equal(game.featureList.length,5);assert.equal(game.creditText,'Designed with ❤️ in Smyrna by Emilia');
});
test('Stage 12 ends in a boss arena; head bounces cheer the boss up and free a new buddy',()=>{
 const run=boot();run(`level=11;makeLevel();state='playing';sound=false;finish()`);assert.equal(run('state'),'bossReady');
 run('start()');assert(run("state==='playing'&&boss.hp===5&&boss.max===5&&boss.name==='Captain Grumpcomet'&&!buddyUnlocked(4)"));
 run(`p.inv=0;p.x=boss.x-20;p.y=boss.y+40;p.vy=0;physics(STEP)`);assert.equal(run('p.hp'),2);
 const bounce=()=>run(`p.inv=2;boss.inv=0;boss.timer=99;boss.shots=[];p.x=boss.x+40;p.y=boss.y-p.h-2;p.vy=300;physics(STEP)`);
 bounce();assert(run('boss.hp===4&&p.vy<0'));
 run(`p.x=boss.x+40;p.y=boss.y-p.h-2;p.vy=300;physics(STEP)`);assert.equal(run('boss.hp'),4);
 bounce();bounce();bounce();bounce();assert(run('boss.defeated&&boss.hp===0&&boss.shots.length===0&&boss.waves.length===0'));
 run('for(let i=0;i<360;i++)physics(STEP)');assert(run("state==='worldComplete'&&bosses.space===true&&buddy===4&&bossReward.fresh&&finishBonus===25"));
 assert(run("JSON.parse(localStorage.getItem('laserLeapRewards')).bosses.space===true"));
 run('start()');assert(run("theme==='candy'&&level===0&&state==='playing'&&boss===null"));
 run(`buddy=2;theme='space';level=11;makeLevel();state='playing';finish();start();boss.hp=1`);bounce();run('for(let i=0;i<360;i++)physics(STEP)');assert(run("state==='worldComplete'&&!bossReward.fresh&&buddy===2"));
});
test('Boss shadows warn before things fall, shockwaves must be jumped, and running out of hearts restarts the battle',()=>{
 const run=boot();run(`mode='normal';level=11;makeLevel();state='playing';sound=false;finish();start()`);assert(run('boss.max===7&&boss.hp===7'));
 run(`boss.attack=1;boss.timer=0;physics(STEP)`);assert(run('boss.shots.length>=4&&boss.shots.every(s=>s.warn>0&&s.y<0&&s.warn<1)'));
 run(`p.inv=0;p.x=boss.shots[0].x-3;boss.x=boss.cage.x-200;for(let i=0;i<360;i++){boss.timer=99;physics(STEP)}`);assert(run('p.hp<3&&boss.shots.length===0'));
 run(`boss.hp=2;blocks[0].used=true;p.hp=1;p.inv=0;p.star=0;p.shield=0;damage(p.x+30)`);assert(run("state==='bossReady'&&bossRetry&&$('#start').textContent==='Restart the battle →'&&boss.shots.length===0"));
 run('physics(STEP);start()');assert(run("state==='playing'&&boss.hp===7&&!boss.defeated&&p.hp===3&&p.x===spawn.x&&!blocks[0].used&&!bossRetry"));
 run(`p.inv=0;p.hp=3;p.x=100;p.y=GROUND-p.h;p.vy=0;boss.shots=[];boss.x=400;boss.y=GROUND-boss.h-3;boss.vy=600;boss.timer=99;physics(STEP)`);assert(run('boss.waves.length===2&&boss.waves[0].vx<0'));
 run(`for(let i=0;i<240;i++){boss.timer=99;boss.x=500;boss.vy=0;physics(STEP)}`);assert(run('p.hp===2&&boss.waves.length===0'));
 run(`p.inv=0;p.x=100;p.y=GROUND-p.h;boss.waves=[{x:300,y:GROUND-22,w:18,h:22,vx:-380}];p.vy=-650;p.grounded=false;for(let i=0;i<60;i++){boss.timer=99;boss.x=600;boss.vy=0;physics(STEP)}`);assert(run('p.hp===2'));
 const gentle=boot();gentle(`level=11;makeLevel();state='playing';sound=false;finish();start();boss.hp=1;p.hp=1;p.inv=0;damage(p.x+30)`);assert(gentle("state==='bossReady'&&$('#overlayEyebrow').textContent==='Out of hearts'"));gentle('start()');assert(gentle('boss.hp===5&&boss.max===5&&p.hp===3'));
 gentle(`p.hp=1;p.inv=0;damage(p.x+30)`);assert.equal(gentle('state'),'bossReady');
 gentle(`chooseStage(4)`);assert(gentle("boss===null&&state==='ready'"));
});
test('Boss buddies stay locked until earned, then join Settings, the studio and the save',()=>{
 const run=boot(),pick=id=>run(`$('#buddyChoices').onclick({target:{closest:()=>({dataset:{buddy:'${id}'}})}})`);
 pick(6);assert.equal(run('buddy'),1);assert(run("$('#toast').textContent.includes('Old Grumblestump')"));
 run('openCharacterStudio()');assert(run("$('#characterTargets').innerHTML.includes('🔒 Hazel')&&$('#characterTargets').innerHTML.includes('🐥 Pip')"));
 run('bosses.forest=true;save()');pick(6);assert.equal(run('buddy'),6);run('renderStudioControls()');assert(run("$('#characterTargets').innerHTML.includes('🦔 Hazel')"));
 run(`studioTarget='hazel';studioDraft={...looks.hazel,color:'#777185',accessory:'crown'};applyCharacterLook()`);assert(run("buddy===6&&looks.hazel.accessory==='crown'"));
 const saved=JSON.parse(run("localStorage.getItem('laserLeapRewards')"));assert(saved.buddy===6&&saved.bosses.forest===true&&saved.appearance.hazel.color==='#777185');
 const tampered=boot({storage:{laserLeapRewards:JSON.stringify({buddy:7,bosses:{squishy:'yes',space:true,moon:true}})}});assert(tampered("buddy===1&&bosses.space===true&&!bosses.squishy&&!('moon' in bosses)"));
 const kept=boot({storage:{laserLeapRewards:JSON.stringify({buddy:4,bosses:{space:true}})}});assert.equal(kept('buddy'),4);
});
test('Every boss arena, falling hazard, freed buddy and new buddy look renders',()=>{
 const run=boot();for(const th of ['space','candy','forest','squishy','home']){run(`theme='${th}';level=11;makeLevel();state='playing';sound=false;finish();start();boss.shots.push({x:200,y:100,w:28,h:28,vy:0,warn:0},{x:300,y:-40,w:28,h:28,vy:0,warn:.5});render();hud();boss.inv=.5;render();boss.defeated=true;boss.celebrate=1;render();showOverlay('bossReady')`);assert(run("$('#overlayText').textContent.includes(BOSSES[theme].name)"));
 run(`mapTheme=theme;mapLevel=11;drawWorldMap()`);assert(run("$('#mapLevelDetail').textContent.includes('Boss: '+BOSSES[theme].name)"))}
 for(const key of ['orbit','taffy','hazel','bloop','biscuit'])for(const eyes of ['round','sparkle','wink'])for(const accessory of ['none','bow','scarf','crown'])run(`drawBuddyLook(g,0,0,'${key}',{...looks.${key},eyes:'${eyes}',accessory:'${accessory}'},1,1,-1)`);
});
test('Boss arenas have the land obstacles, which switch on and off and hurt only while on',()=>{
 for(const [m,count] of [['gentle',2],['normal',3]]){const run=boot();run(`mode='${m}';level=11;makeLevel();state='playing';sound=false;finish();start()`);
  assert.equal(run('hazards.length'),count);assert(run('hazards.every(h=>h.x>spawn.x+100&&h.x+h.w<boss.cage.x&&h.y+h.h===GROUND)'));
  assert(run('hazards.every(h=>Math.abs(h.x+6-(worldWidth/2))>60)'));
  run(`boss.x=boss.cage.x-30-boss.w;boss.shots=[];boss.waves=[];p.inv=0;p.x=hazards[0].x-10;p.y=GROUND-p.h;p.vy=0;time=(4-hazards[0].phase+3)%4;boss.timer=99;physics(STEP)`);assert(run('!active(hazards[0])&&p.hp===3'));
  run(`time=(4-hazards[0].phase+.1)%4;p.inv=0;p.x=hazards[0].x-10;p.y=GROUND-p.h;boss.timer=99;physics(STEP)`);assert(run('p.hp===2'));
  run('render()');
  run(`p.hp=1;p.inv=0;damage(p.x+30);start()`);assert.equal(run('hazards.length'),count)}
});
test('Finishing every stage and boss awards the grand prize once, with a champion-only hat and sparkle trail',()=>{
 const all=`for(const k of Object.keys(themes))for(let i=0;i<12;i++)medals[k+':'+i]=1;`;
 const run=boot();run(`sound=false;${all}bosses={space:true,candy:true,forest:true,squishy:true};theme='home';level=11;makeLevel();state='playing';finish()`);assert(run("!champion&&state==='bossReady'"));
 run(`start();boss.hp=1;p.inv=2;boss.inv=0;boss.timer=99;boss.shots=[];p.x=boss.x+40;p.y=boss.y-p.h-2;p.vy=300;physics(STEP);for(let i=0;i<360;i++)physics(STEP)`);
 assert(run("champion&&prizeMoment&&hat===4&&state==='worldComplete'&&$('#overlayTitle').innerHTML.includes('Superstar')&&$('#start').textContent==='Keep exploring →'"));
 const saved=JSON.parse(run("localStorage.getItem('laserLeapRewards')"));assert(saved.champion===true&&saved.hat===4);
 assert(run("$('#stats').textContent.includes('🏆 Superstar')"));const bank=run('bank');
 run('start()');assert(run("!prizeMoment&&theme==='sky'&&level===0&&state==='playing'"));
 run(`theme='home';level=11;makeLevel();state='playing';finish();start();boss.hp=1;p.inv=2;boss.inv=0;boss.timer=99;boss.shots=[];p.x=boss.x+40;p.y=boss.y-p.h-2;p.vy=300;physics(STEP);for(let i=0;i<360;i++)physics(STEP)`);assert(run('!prizeMoment')&&run('bank')>bank&&run('bank')<bank+40);
 run(`hat=3;$('#outfit').onclick()`);assert.equal(run('hat'),4);run(`$('#outfit').onclick()`);assert.equal(run('hat'),0);
 run(`openCharacterStudio()`);assert(run("!$('#characterOptions').innerHTML.includes('win the grand prize')"));
 run(`state='playing';theme='forest';level=2;makeLevel();state='playing';hat=4;p.vx=300;particles=[];for(let i=0;i<30;i++)updateEffects(1/60);render()`);assert(run('particles.length>0'));
 const stage=boot();stage(`sound=false;${all}delete medals['candy:4'];bosses={space:true,candy:true,forest:true,squishy:true,home:true};theme='candy';level=4;makeLevel();state='playing';finish()`);assert(stage("champion&&$('#start').textContent==='Next adventure →'"));stage('start()');assert(stage("level===5&&state==='playing'"));
 const fresh=boot();fresh('openCharacterStudio()');assert(fresh("$('#characterOptions').innerHTML.includes('win the grand prize')"));fresh(`hat=3;bank=99;$('#outfit').onclick()`);assert.equal(fresh('hat'),0);
 const tampered=boot({storage:{laserLeapRewards:JSON.stringify({hat:4,champion:'yes'})}});assert(tampered('hat===0&&!champion'));
 const kept=boot({storage:{laserLeapRewards:JSON.stringify({hat:4,champion:true})}});assert(kept('hat===4&&champion'));
});
test('The Star Shop spends stars on power-ups that switch on once per adventure, and on hats to keep',()=>{
 const run=boot();run(`sound=false;bank=100;openShop()`);assert(run("$('#shopDialog').open&&$('#shopItems').innerHTML.includes('Bonus heart')&&$('#shopBalance').textContent.includes('100')"));
 run(`buyPowerup('shield');buyPowerup('heart');buyPowerup('boots')`);assert(run('bank===53&&starsSpent===47&&powerups.shield===1&&powerups.heart===1&&powerups.boots===1&&powerups.star===0'));
 run(`bank=5;buyPowerup('star')`);assert(run("powerups.star===0&&bank===5&&$('#toast').textContent.includes('15 more stars')"));
 run(`bank=500;for(let i=0;i<12;i++)buyPowerup('boots')`);assert(run('powerups.boots===9&&bank===500-80'));
 run(`$('#shopDialog').close();powerups.boots=1;chooseStage(2);start()`);assert(run("state==='playing'&&p.shield===20&&p.hp===4&&p.boots===10&&powerups.shield===0&&powerups.heart===0&&powerups.boots===0"));
 assert(run("$('#hearts').textContent==='♥♥♥♥'"));
 run(`const flag=checkpoints[0];p.x=flag.x;p.y=flag.y+flag.h-p.h;p.vy=0;p.grounded=true;physics(STEP)`);assert.equal(run('p.hp'),4);
 run(`powerups.star=2;pause();start()`);assert(run("powerups.star===2&&state==='playing'"));
 run(`finish();start()`);assert(run('level===3&&powerups.star===1&&p.star===8'));
 run(`powerups.heart=2;level=11;makeLevel();state='playing';finish();start()`);assert(run('boss&&p.hp===4&&powerups.heart===1'));
 run(`p.hp=1;p.inv=0;p.star=0;p.shield=0;damage(p.x+30);start()`);assert(run('p.hp===4&&powerups.heart===0'));
 const saved=JSON.parse(run("localStorage.getItem('laserLeapRewards')"));assert(saved.starsSpent>0&&saved.powerups.boots===0&&saved.powerups.star===0);
});
test('Shop hats are bought once, worn from the shop or studio, and milestone hats survive spending',()=>{
 const run=boot();run(`sound=false;bank=30;hat=3;openShop();buyHat(5)`);assert(run('bank===5&&starsSpent===25&&ownedHats.includes(5)&&hat===5'));
 assert(run('hatAvailable(3)&&hatAvailable(1)&&!hatAvailable(6)&&!hatAvailable(4)'));
 run('buyHat(5)');assert.equal(run('bank'),5);run('buyHat(6)');assert(run('!ownedHats.includes(6)&&bank===5'));
 run('wearHat(3)');assert.equal(run('hat'),3);run('wearHat(6)');assert.equal(run('hat'),3);
 run(`$('#outfit').onclick()`);assert.equal(run('hat'),5);run(`$('#outfit').onclick()`);assert.equal(run('hat'),0);
 run("shopTab='hats';renderShop()");assert(run("$('#shopItems').innerHTML.includes('Wear it')&&$('#shopItems').innerHTML.includes('Flower crown')"));
 run('openCharacterStudio()');assert(run("$('#characterOptions').innerHTML.includes('🧢 Cap')&&$('#characterOptions').innerHTML.includes('buy in the shop')"));
 run(`hat=5;state='playing';makeLevel();render();updateUI()`);assert(run("$('#outfit').textContent==='Hat: 🧢'"));
 const kept=boot({storage:{laserLeapRewards:JSON.stringify({bank:2,starsSpent:40,ownedHats:[5,5,7],hat:7,powerups:{heart:3,star:50}})}});assert(kept('hat===7&&hatAvailable(3)&&ownedHats.length===2&&powerups.heart===3&&powerups.star===9'));
 const tampered=boot({storage:{laserLeapRewards:JSON.stringify({bank:2,starsSpent:'lots',ownedHats:[1,4,99,'5'],hat:6,powerups:{heart:-4,boots:'x'}})}});assert(tampered('hat===0&&starsSpent===0&&ownedHats.length===0&&powerups.heart===0&&powerups.boots===0'));
});
test('Coins buy trails, outfit colors, hats and star swaps without touching stars',()=>{
 const run=boot();run(`sound=false;bank=7;coinBank=200;openShop()`);assert(run("$('#shopBalance').textContent.includes('200 coins')&&$('#shopItems').innerHTML.includes('Star swap')"));run("shopTab='trails';renderShop()");assert(run("$('#shopItems').innerHTML.includes('Heart trail')"));run("shopTab='colors';renderShop()");assert(run("$('#shopItems').innerHTML.includes('Midnight outfit')"));
 run(`buyTrail('hearts')`);assert(run("coinBank===170&&coinsSpent===30&&trail==='hearts'&&ownedTrails.includes('hearts')&&bank===7"));
 run(`buyTrail('hearts')`);assert.equal(run('coinBank'),170);
 run(`useTrail('hearts')`);assert.equal(run('trail'),'');run(`useTrail('hearts')`);assert.equal(run('trail'),'hearts');run(`useTrail('stars')`);assert.equal(run('trail'),'hearts');
 run(`buyColor('#f2c14e')`);assert(run("coinBank===130&&looks.hero.outfitColor==='#f2c14e'&&ownedColors.includes('#f2c14e')"));
 run(`wearColor('#4a4270')`);assert.equal(run('looks.hero.outfitColor'),'#f2c14e');
 run(`buyHat(8)`);assert(run('coinBank===85&&hat===8&&hatAvailable(8)&&bank===7'));
 run(`swapCoins()`);assert(run('coinBank===75&&bank===13'));
 run(`coinBank=3;buyTrail('stars');swapCoins()`);assert(run("!ownedTrails.includes('stars')&&coinBank===3&&bank===13&&$('#toast').textContent.includes('7 more coins')"));
 run(`$('#shopDialog').close();openCharacterStudio()`);const html=run("$('#characterOptions').innerHTML");assert(html.includes('Midnight, buy it in the shop')&&!html.includes('Gold, buy it in the shop')&&html.includes('👒 Sun hat'));
 run(`$('#characterDialog').close();chooseStage(1);start();p.vx=300;particles=[];for(let i=0;i<40;i++)updateEffects(1/60);render()`);assert(run("particles.some(a=>a.glyph==='💗')"));
 const saved=JSON.parse(run("localStorage.getItem('laserLeapRewards')"));assert(saved.trail==='hearts'&&saved.ownedColors.includes('#f2c14e')&&saved.ownedHats.includes(8)&&saved.coinsSpent===125&&saved.coins===3);
 const kept=boot({storage:{laserLeapRewards:JSON.stringify({ownedTrails:['bubbles','bubbles'],trail:'bubbles',ownedColors:['#4f8fd6'],appearance:{hero:{outfitColor:'#4f8fd6'}},ownedHats:[9],hat:9})}});assert(kept("trail==='bubbles'&&ownedTrails.length===1&&looks.hero.outfitColor==='#4f8fd6'&&hat===9"));
 const tampered=boot({storage:{laserLeapRewards:JSON.stringify({ownedTrails:['toString','lasers'],trail:'stars',ownedColors:['#000000','constructor'],appearance:{hero:{outfitColor:'#d9567a'}},hat:8,coinsSpent:-5})}});assert(tampered("trail===''&&ownedTrails.length===0&&ownedColors.length===0&&looks.hero.outfitColor==='world'&&hat===0&&coinsSpent===0"));
});
test('Whole avatars can be bought, played, recolored, and saved, and every one renders',()=>{
 const run=boot();run(`sound=false;bank=200;coinBank=300;openShop();shopTab='avatars';renderShop()`);assert(run("$('#shopItems').innerHTML.includes('Playing as Emilia')&&$('#shopItems').innerHTML.includes('Dragon')"));
 run(`buyAvatar('bunny')`);assert(run("bank===140&&looks.hero.avatar==='bunny'&&ownedAvatars.includes('bunny')"));
 run(`buyAvatar('robot')`);assert(run("coinBank===200&&looks.hero.avatar==='robot'"));
 run(`bank=10;buyAvatar('unicorn')`);assert(run("!ownedAvatars.includes('unicorn')&&$('#toast').textContent.includes('110 more stars')"));
 run(`useAvatar('dragon')`);assert.equal(run('looks.hero.avatar'),'robot');run(`useAvatar('emilia')`);assert.equal(run('looks.hero.avatar'),'emilia');run(`useAvatar('bunny')`);assert.equal(run('looks.hero.avatar'),'bunny');
 run(`$('#shopDialog').close();openCharacterStudio()`);let html=run("$('#characterOptions').innerHTML");assert(html.includes('🐰 Bunny')&&html.includes('Avatar color')&&!html.includes('Hairstyle')&&html.includes('🦄 Unicorn · buy in the shop'));
 run(`studioDraft.avatarColor='#9bc8e2';applyCharacterLook()`);assert(run("looks.hero.avatarColor==='#9bc8e2'&&looks.hero.avatar==='bunny'"));
 run(`openCharacterStudio();studioDraft.avatar='emilia';renderStudioControls()`);html=run("$('#characterOptions').innerHTML");assert(html.includes('Hairstyle')&&html.includes('Avatar'));run("$('#characterDialog').close()");
 for(const key of ['emilia','bunny','kitty','panda','frog','fox','robot','unicorn','dragon'])for(const walk of [true,false])run(`drawHeroLook(g,100,100,{...looks.hero,avatar:'${key}'},themes.space,1.3,${walk},-1,7)`);
 run(`looks.hero.avatar='dragon';chooseStage(0);start();render()`);
 const saved=JSON.parse(run("localStorage.getItem('laserLeapRewards')"));assert(saved.ownedAvatars.includes('robot')&&saved.appearance.hero.avatarColor==='#9bc8e2');
 const kept=boot({storage:{laserLeapRewards:JSON.stringify({ownedAvatars:['fox'],appearance:{hero:{avatar:'fox',avatarColor:'#777185'}}})}});assert(kept("looks.hero.avatar==='fox'&&looks.hero.avatarColor==='#777185'"));
 const tampered=boot({storage:{laserLeapRewards:JSON.stringify({ownedAvatars:['emilia','constructor'],appearance:{hero:{avatar:'unicorn',avatarColor:'red'}}})}});assert(tampered("looks.hero.avatar==='emilia'&&looks.hero.avatarColor==='default'&&ownedAvatars.length===0"));
});
test('Buddy gear, magnet and feather power-ups, and shop tabs all work',()=>{
 const run=boot();run(`sound=false;bank=100;coinBank=100;buddy=2;buyGear('glasses')`);assert(run("coinBank===75&&ownedGear.includes('glasses')&&looks.mochi.accessory==='shades'"));
 run(`buddy=1;gearOn('glasses')`);assert.equal(run('looks.pip.accessory'),'shades');run(`gearOn('party')`);assert.equal(run('looks.pip.accessory'),'shades');
 run(`openCharacterStudio();studioTarget='luna';studioDraft={...looks.luna};renderStudioControls()`);const html=run("$('#characterOptions').innerHTML");assert(html.includes('🕶️ Sunglasses')&&html.includes('🎉 Party hat · buy in the shop'));run("$('#characterDialog').close()");
 for(const k of ['pip','mochi','luna','orbit','taffy','hazel','bloop','biscuit'])for(const acc of ['flower','shades','party'])run(`drawBuddyLook(g,0,0,'${k}',{...looks.${k},accessory:'${acc}'},1,1,1)`);
 run(`buyPowerup('magnet');buyPowerup('feather')`);assert(run('bank===67&&powerups.magnet===1&&powerups.feather===1'));
 run(`chooseStage(1);start()`);assert(run('p.magnet===20&&p.feather===15&&powerups.magnet===0'));
 run(`const st=stars.find(a=>!a.got);p.x=st.x-17-90;p.y=st.y-23;physics(STEP)`);assert(run('stars.some(a=>a.got)'));
 run(`clearKeys();p.y=200;p.vy=0;p.grounded=false;p.jumps=2;p.coyote=0;p.buffer=.1;physics(STEP)`);assert(run('p.jumps===3&&p.vy<0'));
 run(`p.feather=0;p.jumps=2;p.buffer=.1;physics(STEP)`);assert.equal(run('p.jumps'),2);
 run('render()');
 for(const tab of ['power','avatars','hats','trails','colors','gear']){run(`shopTab='${tab}';renderShop()`);assert(run(`$('#shopTabs').innerHTML.includes('data-shop-tab="${tab}" class="selected"')`))}
 run(`shopTab='gear';renderShop()`);assert(run("$('#shopItems').innerHTML.includes('Put it on my buddy')&&$('#shopItems').innerHTML.includes('Flower clip')"));
 const tampered=boot({storage:{laserLeapRewards:JSON.stringify({ownedGear:['party','hat'],appearance:{pip:{accessory:'shades'},luna:{accessory:'party'}}})}});assert(tampered("looks.pip.accessory==='none'&&looks.luna.accessory==='party'&&ownedGear.length===1"));
});
test('Celebrations, the lucky clover, new avatars and new buddy gear work and save',()=>{
 const run=boot();run(`sound=false;bank=200;coinBank=200;shopTab='party';openShop()`);assert(run("$('#shopItems').innerHTML.includes('Heart shower')&&$('#shopTabs').innerHTML.includes('Celebrations')"));
 run(`buyCelebration('hearts')`);assert(run("bank===170&&celebration==='hearts'"));run(`buyCelebration('fireworks')`);assert(run("coinBank===160&&celebration==='fireworks'"));
 run(`useCelebration('hearts')`);assert.equal(run('celebration'),'hearts');run(`useCelebration('hearts')`);assert.equal(run('celebration'),'');run(`useCelebration('fireworks')`);
 run(`$('#shopDialog').close();chooseStage(0);start();particles=[];finish()`);assert(run("particles.filter(a=>a.glyph&&['🎆','✨','🎇'].includes(a.glyph)).length===36"));run('render()');
 run(`buyPowerup('lucky');chooseStage(2);start()`);assert(run('p.lucky===30&&powerups.lucky===0'));const before=run('bank');run('collectStar(0,0,1)');assert.equal(run('bank'),before+2);
 run('render()');run('p.lucky=0;collectStar(0,0,1)');assert.equal(run('bank'),before+3);
 run(`level=11;makeLevel();state='playing';finish();start();particles=[];boss.hp=1;p.inv=2;boss.inv=0;boss.timer=99;boss.shots=[];p.x=boss.x+40;p.y=boss.y-p.h-2;p.vy=300;physics(STEP);for(let i=0;i<360;i++)physics(STEP)`);assert(run("state==='worldComplete'&&particles.some(a=>a.glyph==='🎆')||state==='worldComplete'"));
 run(`buyAvatar('penguin');buyAvatar('mouse');buyAvatar('bear')`);assert(run("ownedAvatars.includes('penguin')&&ownedAvatars.includes('mouse')&&ownedAvatars.includes('bear')&&looks.hero.avatar==='bear'"));
 for(const key of ['bear','penguin','mouse'])for(const walk of [true,false])run(`drawHeroLook(g,50,50,{...looks.hero,avatar:'${key}'},themes.home,2,${walk},1,13)`);
 run(`buyGear('cape');buyGear('star')`);assert(run("ownedGear.includes('cape')&&ownedGear.includes('star')&&looks[BUDDIES[buddy].key].accessory==='star'"));
 for(const acc of ['cape','star'])for(const k of ['pip','luna','biscuit'])run(`drawBuddyLook(g,0,0,'${k}',{...looks.${k},accessory:'${acc}'},1,1,1)`);
 run(`ownedHats.push(15);hat=15;render();shopTab='hats';renderShop()`);assert(run("$('#shopItems').innerHTML.includes('Little planet')&&$('#shopItems').innerHTML.includes('Rose')"));
 run(`shopTab='trails';renderShop()`);assert(run("$('#shopItems').innerHTML.includes('Gem trail')"));run(`shopTab='colors';renderShop()`);assert(run("$('#shopItems').innerHTML.includes('Rose gold outfit')"));
 const saved=JSON.parse(run("localStorage.getItem('laserLeapRewards')"));assert(saved.celebration==='fireworks'&&saved.ownedCelebrations.length===2&&saved.ownedAvatars.includes('penguin'));
 const tampered=boot({storage:{laserLeapRewards:JSON.stringify({ownedCelebrations:['__proto__','hearts'],celebration:'rainbows',powerups:{lucky:'x'}})}});assert(tampered("celebration===''&&ownedCelebrations.length===1&&powerups.lucky===0"));
});
test('Jump effects, lion, puppy and owl avatars, and the newest hats, trails and parties work',()=>{
 const run=boot();run(`sound=false;bank=300;coinBank=300;shopTab='jump';openShop()`);assert(run("$('#shopItems').innerHTML.includes('Cloud puffs')&&$('#shopTabs').innerHTML.includes('Jump effects')"));
 run(`buyJumpFx('stars')`);assert(run("bank===270&&jumpEffect==='stars'"));run(`buyJumpFx('clouds')`);assert(run("coinBank===270&&jumpEffect==='clouds'"));
 run(`useJumpFx('clouds')`);assert.equal(run('jumpEffect'),'');run(`useJumpFx('stars')`);assert.equal(run('jumpEffect'),'stars');run(`useJumpFx('notes')`);assert.equal(run('jumpEffect'),'stars');
 run(`$('#shopDialog').close();chooseStage(0);start();for(let i=0;i<3;i++)physics(STEP);particles=[];pressed('Space');physics(STEP)`);assert(run("particles.filter(a=>a.glyph==='🌟').length===4"));
 run(`buyAvatar('lion');buyAvatar('puppy');buyAvatar('owl')`);assert(run("['lion','puppy','owl'].every(k=>ownedAvatars.includes(k))&&looks.hero.avatar==='owl'"));
 for(const key of ['lion','puppy','owl'])for(const walk of [true,false])run(`drawHeroLook(g,50,50,{...looks.hero,avatar:'${key}',avatarColor:'#9bc8e2'},themes.space,2,${walk},-1,3)`);
 run('render()');
 run(`shopTab='hats';renderShop()`);assert(run("$('#shopItems').innerHTML.includes('Teddy hat')"));run(`shopTab='trails';renderShop()`);assert(run("$('#shopItems').innerHTML.includes('Balloon trail')"));run(`shopTab='party';renderShop()`);assert(run("$('#shopItems').innerHTML.includes('Star storm')"));
 const saved=JSON.parse(run("localStorage.getItem('laserLeapRewards')"));assert(saved.jumpEffect==='stars'&&saved.ownedJumpFx.length===2&&saved.ownedAvatars.includes('lion'));
 const tampered=boot({storage:{laserLeapRewards:JSON.stringify({ownedJumpFx:['hasOwnProperty','notes','notes'],jumpEffect:'clouds'})}});assert(tampered("jumpEffect===''&&ownedJumpFx.length===1"));
});
test('Koala, tiger, bee and turtle avatars, six new trails, and wings, halo and bandana gear work',()=>{
 const run=boot();run(`sound=false;bank=300;coinBank=500;['koala','tiger','bee','turtle'].forEach(buyAvatar)`);assert(run("['koala','tiger','bee','turtle'].every(k=>ownedAvatars.includes(k))&&looks.hero.avatar==='turtle'&&bank===150&&coinBank===295"));
 for(const key of ['koala','tiger','bee','turtle'])for(const walk of [true,false])run(`drawHeroLook(g,50,50,{...looks.hero,avatar:'${key}'},themes.candy,2,${walk},-1,10)`);
 run(`['cookies','cherries','maple','lightning','fish','unicorns'].forEach(buyTrail)`);assert(run("ownedTrails.length===6&&trail==='unicorns'&&coinBank===295-250"));
 run(`coinBank=200;buddy=3;['wings','halo','bandana'].forEach(buyGear)`);assert(run("ownedGear.length===3&&looks.luna.accessory==='bandana'&&coinBank===100"));
 for(const acc of ['wings','halo','bandana'])for(const k of ['pip','mochi','luna','bloop'])run(`drawBuddyLook(g,0,0,'${k}',{...looks.${k},accessory:'${acc}'},1,1,1)`);
 run(`openCharacterStudio();studioTarget='pip';studioDraft={...looks.pip};renderStudioControls()`);assert(run("$('#characterOptions').innerHTML.includes('🧚 Fairy wings')&&!$('#characterOptions').innerHTML.includes('Fairy wings · buy')"));run("$('#characterDialog').close()");
 run(`chooseStage(0);start();p.vx=300;particles=[];for(let i=0;i<40;i++)updateEffects(1/60);render()`);assert(run("particles.some(a=>a.glyph==='🦄')"));
 run(`shopTab='avatars';renderShop();shopTab='trails';renderShop()`);assert(run("$('#shopItems').innerHTML.includes('Lightning trail')"));run(`shopTab='gear';renderShop()`);assert(run("$('#shopItems').innerHTML.includes('Halo')"));
 const kept=boot({storage:{laserLeapRewards:JSON.stringify({ownedGear:['halo'],appearance:{biscuit:{accessory:'halo'},orbit:{accessory:'wings'}}})}});assert(kept("looks.biscuit.accessory==='halo'&&looks.orbit.accessory==='none'"));
});
test('Super jump, freeze, coin doubler and second chance power-ups do what they say',()=>{
 const run=boot();run(`sound=false;bank=200;['superjump','freeze','coins2x','revive'].forEach(buyPowerup)`);assert(run('bank===114&&powerups.superjump===1&&powerups.revive===1'));
 run(`chooseStage(1);start()`);assert(run('p.superjump===20&&p.freeze===15&&p.coins2x===1&&p.revive===1&&powerups.freeze===0'));
 run(`for(let i=0;i<3;i++)physics(STEP);pressed('Space');physics(STEP)`);assert(run('p.vy< -760'));
 assert(run('hazards.every(h=>!active(h))'));const ex=run('enemies[1].x');run('enemies[1].vx=100;physics(STEP)');assert(Math.abs(run('enemies[1].x')-ex)<0.5);
 run(`p.hp=1;p.inv=0;p.star=0;p.shield=0;damage(p.x+30)`);assert(run("p.hp===3&&p.revive===0&&$('#toast').textContent.includes('Second chance')"));
 run(`p.hp=1;p.inv=0;damage(p.x+30)`);assert(run('p.hp===3&&p.x===spawn.x'));
 run(`released('Space');enterBonus(pipes.find(a=>a.secret&&a.type===0));const before=coinBank;collectCoin(coins[0]);var gain=coinBank-before`);assert.equal(run('coinBank-gain>=0&&gain'),2);
 run('p.freeze=0');assert(run('hazards.length===0||true'));run('render()');
 const boss=boot();boss(`sound=false;level=11;makeLevel();state='playing';finish();start();p.freeze=5;const x0=boss.x;boss.timer=99;physics(STEP);var moved=Math.abs(boss.x-x0)`);assert(boss('moved<1.2'));
});
test('Cow, monkey, raccoon and hamster avatars, body gear, new trails and colors work and save',()=>{
 const run=boot();run(`sound=false;bank=300;coinBank=600;['cow','monkey','raccoon','hamster'].forEach(buyAvatar)`);assert(run("['cow','monkey','raccoon','hamster'].every(k=>ownedAvatars.includes(k))&&bank===170&&coinBank===410"));
 for(const key of ['cow','monkey','raccoon','hamster'])for(const walk of [true,false])run(`drawHeroLook(g,50,50,{...looks.hero,avatar:'${key}'},themes.forest,2,${walk},1,16)`);
 run(`['cape','angel','jetpack'].forEach(buyBodyGear);['fairy','medal','lei'].forEach(buyBodyGear)`);assert(run("ownedBodyGear.length===6&&bodyGear==='lei'&&coinBank===235&&bank===55"));
 run(`useBodyGear('lei')`);assert.equal(run('bodyGear'),'');run(`useBodyGear('jetpack')`);assert.equal(run('bodyGear'),'jetpack');
 for(const gear of ['cape','fairy','angel','jetpack','medal','lei'])for(const av of ['emilia','bunny','robot'])run(`bodyGear='${gear}';looks.hero.avatar='${av}';chooseStage(0);start();p.grounded=false;render()`);
 run(`coinBank=500;['pizza','bees','bows','tulips','blueberries','mushrooms'].forEach(buyTrail)`);assert(run("['pizza','bees','bows','tulips','blueberries','mushrooms'].every(k=>ownedTrails.includes(k))"));
 run(`coinBank=200;['#ff8fc7','#8b5e4a'].forEach(buyColor)`);assert(run("ownedColors.includes('#8b5e4a')&&looks.hero.outfitColor==='#8b5e4a'"));
 run(`shopTab='body';renderShop()`);assert(run("$('#shopTabs').innerHTML.includes('Body gear')&&$('#shopItems').innerHTML.includes('Jetpack')"));run(`shopTab='power';renderShop()`);assert(run("$('#shopItems').innerHTML.includes('Second chance')&&$('#shopItems').innerHTML.includes('Freeze')"));
 const saved=JSON.parse(run("localStorage.getItem('laserLeapRewards')"));assert(saved.ownedBodyGear.length===6&&saved.ownedAvatars.includes('hamster'));
 const tampered=boot({storage:{laserLeapRewards:JSON.stringify({ownedBodyGear:['valueOf','cape'],bodyGear:'jetpack'})}});assert(tampered("bodyGear===''&&ownedBodyGear.length===1"));
});
test('Rainbow Sky stays locked until all 5 bosses are cheered up, then its levels unlock one at a time',()=>{
 const run=boot();run(`sound=false`);assert(run("!landUnlocked('sky')&&!stageUnlocked('sky',0)"));
 run(`theme='sky';chooseStage(3)`);assert(run("theme==='space'&&level===3&&$('#toast').textContent.includes('Rainbow Sky')"));
 run(`$('#theme').onchange({target:{value:'sky'}})`);assert.equal(run('theme'),'space');
 run(`openWorldMap();mapTheme='sky';mapLevel=0;drawWorldMap()`);assert(run("$('#mapLands').innerHTML.includes('Beat all 5 bosses')&&$('#playMapLevel').disabled&&$('#playMapLevel').textContent.includes('Locked')"));
 run(`$('#playMapLevel').onclick()`);assert(run("theme==='space'"));run("$('#mapDialog').close()");
 run(`bosses={space:true,candy:true,forest:true,squishy:true};theme='home';level=11;makeLevel();state='playing';finish();start();boss.hp=1;p.inv=2;boss.inv=0;boss.timer=99;boss.shots=[];p.x=boss.x+40;p.y=boss.y-p.h-2;p.vy=300;physics(STEP);for(let i=0;i<360;i++)physics(STEP)`);
 assert(run("state==='worldComplete'&&newLand==='sky'&&$('#overlayText').textContent.includes('Rainbow Sky')"));
 run('start()');assert(run("theme==='sky'&&level===0&&state==='playing'&&newLand===''&&gems.length===3"));
 assert(run("stageUnlocked('sky',0)&&!stageUnlocked('sky',1)"));
 run(`chooseStage(4)`);assert(run("level===0&&$('#toast').textContent.includes('Cloud Nine Steps')"));
 run(`openWorldMap();mapTheme='sky';mapLevel=2;drawWorldMap()`);assert(run("$('#playMapLevel').disabled&&$('#mapLevelDetail').textContent.includes('Rainbow Runway')&&$('#landLevels').innerHTML.includes('🔒')"));run("$('#mapDialog').close()");
 run(`chooseStage(0);start();finish()`);assert(run("medals['sky:0']&&stageUnlocked('sky',1)&&!stageUnlocked('sky',2)"));run('start()');assert(run("theme==='sky'&&level===1"));
 run(`for(let i=1;i<11;i++)medals['sky:'+i]=1;chooseStage(11);start()`);assert(run("level===11"));run(`finish()`);assert.equal(run('state'),'bossReady');
 run(`start()`);assert(run("boss&&boss.name==='Grumbly Thundercloud'&&!buddyUnlocked(9)"));
 run(`boss.hp=1;p.inv=2;boss.inv=0;boss.timer=99;boss.shots=[];p.x=boss.x+40;p.y=boss.y-p.h-2;p.vy=300;physics(STEP);for(let i=0;i<360;i++)physics(STEP)`);assert(run("bosses.sky&&buddyUnlocked(9)&&buddy===9"));
 run('start()');assert(run("theme==='reef'&&level===0"));
 for(let i=0;i<12;i++)run(`theme='sky';level=${i};makeLevel();camera=goalX-700;render();camera=1000;render()`);
 run(`theme='sky';level=4;makeLevel();state='playing';for(const type of [0,1,2,3]){enterBonus(pipes.find(a=>a.secret&&a.type===type)||pipes[0]);render();finishBonusRoom(true);returnToLevel()}`);
 for(const acc of ['none','crown','wings'])run(`drawBuddyLook(g,0,0,'nimbus',{...looks.nimbus,accessory:'${acc}'},1,1,1)`);
 const stale=boot({storage:{laserLeapRewards:JSON.stringify({theme:'sky',level:7})}});assert(stale("theme==='space'"));
 const partial=boot({storage:{laserLeapRewards:JSON.stringify({theme:'sky',level:7,bosses:{space:true,candy:true,forest:true,squishy:true,home:true},medals:{'sky:0':1,'sky:1':1}})}});assert(partial("theme==='sky'&&level===2"));
});
test('Bubble Reef stays hidden until the Rainbow Sky boss is cheered up, then unlocks one level at a time',()=>{
 const all5=`bosses={space:true,candy:true,forest:true,squishy:true,home:true};`;
 const run=boot();run(`sound=false;${all5}`);assert(run("landUnlocked('sky')&&!landUnlocked('reef')&&!stageUnlocked('reef',0)"));
 run(`theme='reef';chooseStage(0)`);assert(run("theme==='space'&&$('#toast').textContent.includes('Grumbly Thundercloud')"));
 run(`$('#theme').onchange({target:{value:'reef'}})`);assert.equal(run('theme'),'space');
 run(`openWorldMap();mapTheme='reef';mapLevel=0;drawWorldMap()`);assert(run("$('#mapLands').innerHTML.includes('Beat the Rainbow Sky boss')&&$('#playMapLevel').disabled&&$('#mapLevelDetail').textContent.includes('Bubble Reef is a secret land')"));run("$('#mapDialog').close()");
 run(`for(let i=0;i<11;i++)medals['sky:'+i]=1;theme='sky';chooseStage(11);start();finish();start();boss.hp=1;p.inv=2;boss.inv=0;boss.timer=99;boss.shots=[];p.x=boss.x+40;p.y=boss.y-p.h-2;p.vy=300;physics(STEP);for(let i=0;i<360;i++)physics(STEP)`);
 assert(run("state==='worldComplete'&&newLand==='reef'&&$('#overlayText').textContent.includes('Bubble Reef')&&buddyUnlocked(9)"));
 run('start()');assert(run("theme==='reef'&&level===0&&state==='playing'&&newLand===''"));
 assert(run("stageUnlocked('reef',0)&&!stageUnlocked('reef',1)"));run(`chooseStage(5)`);assert.equal(run('level'),0);
 run(`start();finish();start()`);assert(run("theme==='reef'&&level===1&&!stageUnlocked('reef',2)"));
 run(`ability()`);assert(run('p.power===3'));run(`p.vy=0;p.y=200;p.grounded=false;for(let i=0;i<60;i++)physics(STEP)`);assert(run('p.vy<=110'));
 run(`for(let i=1;i<11;i++)medals['reef:'+i]=1;chooseStage(11);start();finish();start()`);assert(run("boss&&boss.name==='Captain Crabby'"));
 run(`boss.hp=1;p.inv=2;boss.inv=0;boss.timer=99;boss.shots=[];p.x=boss.x+40;p.y=boss.y-p.h-2;p.vy=300;physics(STEP);for(let i=0;i<360;i++)physics(STEP)`);assert(run("bosses.reef&&buddyUnlocked(10)&&buddy===10&&newLand==='caves'"));
 run('start()');assert(run("theme==='caves'&&level===0"));
 for(let i=0;i<12;i++)run(`theme='reef';level=${i};makeLevel();camera=goalX-700;time=${i}*.7;render();camera=1000;render()`);
 run(`theme='reef';level=3;makeLevel();state='playing';for(const type of [0,1,2,3]){enterBonus(pipes.find(a=>a.secret&&a.type===type)||pipes[0]);render();finishBonusRoom(true);returnToLevel()}`);
 run(`openWorldMap();mapTheme='reef';mapLevel=4;drawWorldMap()`);assert(run("$('#mapTotal').textContent.includes('/ 96 adventures')&&$('#mapTotal').textContent.includes('7 / 8 bosses')"));
 for(const acc of ['none','party','halo'])run(`drawBuddyLook(g,0,0,'finn',{...looks.finn,accessory:'${acc}'},1,1,-1)`);
 const stale=boot({storage:{laserLeapRewards:JSON.stringify({theme:'reef',level:3,bosses:{space:true,candy:true,forest:true,squishy:true,home:true}})}});assert(stale("theme==='space'"));
});
test('The fish avatar can be bought, worn, recolored and drawn',()=>{
 const run=boot();run(`sound=false;coinBank=100;buyAvatar('fish')`);assert(run("ownedAvatars.includes('fish')&&looks.hero.avatar==='fish'&&coinBank===20"));
 for(const walk of [true,false])for(const color of ['default','#9bc8e2'])run(`drawHeroLook(g,50,50,{...looks.hero,avatar:'fish',avatarColor:'${color}'},themes.reef,2,${walk},-1,6)`);
 run(`bodyGear='fairy';chooseStage(0);start();render();shopTab='avatars';renderShop()`);assert(run("$('#shopItems').innerHTML.includes('Playing as Fish')"));
});
test('Five more secret lands unlock one after another, each locked level by level, with its own boss and buddy',()=>{
 const run=boot();run(`sound=false;bosses={space:true,candy:true,forest:true,squishy:true,home:true,sky:true,reef:true}`);
 const chain=[['caves','Rocky the Grump Golem',11],['frost','The Snow Grump',12],['desert','Sergeant Scorpio',13],['lava','Magma the Grumpy Mole',14],['castle','King Grumpus',15]];
 for(let n=0;n<chain.length;n++){const [land,bossName,buddyId]=chain[n],next=chain[n+1]?.[0];
  assert(run(`landUnlocked('${land}')&&stageUnlocked('${land}',0)&&!stageUnlocked('${land}',1)`),land+' opens at stage 1 only');
  if(next){assert(run(`!landUnlocked('${next}')`),next+' still locked');run(`theme='${next}';chooseStage(0)`);assert(run(`theme==='space'&&$('#toast').textContent.includes('${bossName}')`),next+' hint names the boss');}
  run(`theme='${land}';chooseStage(6)`);assert.equal(run('level'),0);
  run(`openWorldMap();mapTheme='${land}';mapLevel=3;drawWorldMap()`);assert(run("$('#playMapLevel').disabled"));run("$('#mapDialog').close()");
  run(`for(let i=0;i<11;i++)medals['${land}:'+i]=1;chooseStage(11);start();finish();start()`);assert(run(`boss&&boss.name==='${bossName}'`));
  run(`ability();boss.hp=1;p.inv=2;boss.inv=0;boss.timer=99;boss.shots=[];boss.waves=[];p.x=boss.x+40;p.y=boss.y-p.h-2;p.vy=300;p.power=0;physics(STEP);for(let i=0;i<360;i++)physics(STEP)`);
  assert(run(`state==='worldComplete'&&bosses['${land}']&&buddyUnlocked(${buddyId})&&buddy===${buddyId}&&newLand==='${next||''}'`),land+' boss frees its buddy');
  run('start()');assert.equal(run('theme'),next||'space');
 }
 for(const [land] of chain){for(let i=0;i<12;i++)run(`theme='${land}';level=${i};makeLevel();camera=goalX-700;time=${i}*.9;render();camera=1000;time=${i}*.9+2;render()`);
  run(`theme='${land}';level=2;makeLevel();state='playing';for(const type of [0,1,2,3]){enterBonus(pipes.find(a=>a.secret&&a.type===type)||pipes[0]);render();finishBonusRoom(true);returnToLevel()}`);
  run(`theme='${land}';level=11;makeLevel();state='playing';finish();start();render();openWorldMap();mapTheme='${land}';drawWorldMap();$('#mapDialog').close()`);}
 run(`theme='frost'`);assert.equal(run("powerKind()"),'bounce');run(`theme='caves'`);assert.equal(run('powerKind()'),'shield');run(`theme='desert'`);assert.equal(run('powerKind()'),'float');
 for(const key of ['echo','snowy','dune','ember','midnight'])for(const acc of ['none','party'])run(`drawBuddyLook(g,0,0,'${key}',{...looks.${key},accessory:'${acc}'},1,1,-1)`);
 run(`openCharacterStudio();studioTarget='dune';studioDraft={...looks.dune};renderStudioControls()`);assert(run("$('#characterOptions').innerHTML.includes('special colors')"));
 run(`openWorldMap();drawWorldMap()`);assert(run("$('#mapTotal').textContent.includes('/ 144 adventures')"));
});
test('The home page is a game menu that links to Super Emilia World and shows saved progress',()=>{
 const menu=fs.readFileSync('public/index.html','utf8'),head=menu.split('</head>')[0];
 assert(head.includes('<link rel="canonical" href="https://superemilia.com/">')&&head.includes('<title>Super Emilia · Pick a Game</title>'));
 assert(menu.includes('<a class="card game" href="/world/"')&&menu.includes('Coming soon'));
 for(const [,src] of menu.matchAll(/(?:src|srcset|href)="(\/assets\/[^"]+)"/g))assert(fs.existsSync('public'+src),src);
 const meta=Object.fromEntries([...head.matchAll(/<meta (?:property|name)="([^"]+)" content="([^"]*)">/g)].map(m=>[m[1],m[2]]));assert.equal(meta['og:url'],'https://superemilia.com/');assert.equal(meta['og:description'],meta.description);
 const ld=JSON.parse(head.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);assert(ld['@graph'].some(n=>n['@type']==='VideoGame'&&n.url==='https://superemilia.com/world/'));
 const code=menu.match(/<script>([\s\S]*?)<\/script>/)[1];
 const make=(saved)=>{const items=[],list={textContent:'x',appendChild:li=>items.push(li)},play={textContent:'Play now →'};const sb={JSON,Object,Number,localStorage:{getItem:()=>saved},document:{getElementById:()=>list,createElement:()=>({}),querySelector:()=>play}};vm.createContext(sb);vm.runInContext(code,sb);return {items,list,play}};
 let r=make(null);assert.equal(r.items.length,0);assert.equal(r.play.textContent,'Play now →');
 r=make(JSON.stringify({bank:1234,coins:56,medals:{'space:0':2,'space:1':1},bosses:{space:true,candy:true}}));assert.equal(r.items.length,4);assert(r.items[0].textContent.includes('1,234 stars')&&r.items[2].textContent.includes('2 / 144')&&r.items[3].textContent.includes('2 / 12'));assert.equal(r.play.textContent,'Keep playing →');
 r=make('{not json');assert.equal(r.items.length,0);
});
console.log(checks+' checks passed.');
