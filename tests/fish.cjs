const fs=require('fs'),vm=require('vm'),assert=require('assert');
const html=fs.readFileSync(process.argv[2]||'public/fish/index.html','utf8');
const script=html.match(/<script>([\s\S]*?)<\/script>/)[1];
// Load the game's logic without a browser: the page skips its screen code when there is no document.
function load(storage={}){const sandbox={console,Math,Number,JSON,Array,Object,String,Set,localStorage:{getItem:k=>storage[k]??null,setItem:(k,v)=>storage[k]=v}};vm.createContext(sandbox);vm.runInContext(script,sandbox);return code=>vm.runInContext(code,sandbox)}
let checks=0;const test=(name,fn)=>{fn();console.log('✓ '+name);checks++};

test('Every fishing spot has common, uncommon, rare and legendary fish',()=>{
 const run=load();assert.equal(run('SPOTS.length'),6);
 assert(run("SPOTS.every(s=>['common','uncommon','rare','legendary'].every(r=>FISH.some(f=>f.spot===s.id&&f.rarity===r)))"));
 assert.equal(run('new Set(FISH.map(f=>f.id)).size'),run('FISH.length'),'fish ids are all different');
 assert(run('FISH.every(f=>f.size[0]>0&&f.size[1]>f.size[0])'));assert(run('SPOTS.every((s,i)=>i===0||s.price>SPOTS[i-1].price)'));
});
test('Bites come from the spot you fish at, and golden bait brings rarer fish',()=>{
 const run=load();const count=(spot,gold)=>{const c={};for(let k=0;k<4000;k++){const f=run(`pickCatch('${spot}',${gold})`);c[f.rarity]=(c[f.rarity]||0)+1;if(f.rarity!=='treasure')assert.equal(f.spot,spot)}return c};
 const plain=count('ocean',false),gold=count('ocean',true);
 assert(plain.common>plain.rare*3,'common fish are common');assert(plain.treasure>100&&plain.treasure<600,'treasure sometimes');
 assert(gold.legendary>plain.legendary*2&&gold.rare>plain.rare,'golden bait helps: '+JSON.stringify({plain,gold}));
 for(let k=0;k<200;k++){const sz=run("sizeFor(FISH[0])");assert(sz>=4&&sz<=9)}
 assert(run("valueFor(FISH.find(f=>f.id==='whale'),1500)>valueFor(FISH.find(f=>f.id==='whale'),900)"),'bigger fish are worth more');
 assert(run("valueFor(FISH.find(f=>f.rarity==='legendary'),FISH.find(f=>f.rarity==='legendary').size[0])>valueFor(FISH[0],9)"));
});
test('Tapping fast reels a fish in, and stopping lets it get away',()=>{
 const run=load();
 // 6 taps a second lands a common fish with the starter rod
 run("var r=startReel(FISH[0],RODS[0]);for(let t=0;t<10&&!r.done;t+=1/6){reelTick(r,1/6);reelTap(r)}");assert(run('r.done&&r.won'));
 run("var r2=startReel(FISH[0],RODS[0]);for(let t=0;t<30&&!r2.done;t+=.1)reelTick(r2,.1)");assert(run('r2.done&&!r2.won&&r2.progress===0'),'no taps, the fish swims away');
 // a legendary fish needs a better rod or very fast taps
 const taps=(fish,rod,perSec)=>run(`(()=>{const r=startReel(FISH.find(f=>f.id==='${fish}'),RODS.find(x=>x.id==='${rod}'));for(let t=0;t<20&&!r.done;t+=1/${perSec}){reelTick(r,1/${perSec});reelTap(r)}return r.won})()`);
 assert(!taps('whale','stick',1),'a whale needs more than one tap a second');assert(taps('whale','stick',3),'3 taps a second lands even a whale');assert(taps('whale','magic',2.5),'the magic rod helps');
 for(const f of ['minnow','babyshark','shark','seadragon'])assert(taps(f,'stick',3),f+' can be landed at 3 taps a second');
 assert(run("startReel(FISH.find(f=>f.id==='minnow'),RODS[0])").step*5>=60,'a minnow takes only about 5 taps');
 assert(run("biteWait(RODS[3],()=>.5)<biteWait(RODS[0],()=>.5)"),'better rods get bites faster');
});
test('Catches fill the fish book and pay coins; coins buy spots, rods, bait and decorations',()=>{
 const run=load();run('var s=defaultSave()');
 let r=run("recordCatch(s,FISH[0],6)");assert(r.first&&!r.biggest&&r.value>0);r=run("recordCatch(s,FISH[0],8)");assert(!r.first&&r.biggest);r=run("recordCatch(s,FISH[0],5)");assert(!r.biggest);
 assert(run("s.book.minnow.count===3&&s.book.minnow.big===8&&s.caught===3&&speciesCaught(s)===1"));
 run("recordCatch(s,TREASURE[2],0)");assert(run("speciesCaught(s)===1&&s.book.chest.count===1"),'treasure is not a fish');
 run('s.coins=200');assert(run("buySpot(s,'lake')"));assert(run("spotOpen(s,'lake')&&!spotOpen(s,'ocean')&&spotOpen(s,'pond')"));assert(!run("buySpot(s,'lake')"));
 assert(run("buyRod(s,'bamboo')&&currentRod(s).id==='bamboo'"));assert(run("buyBait(s)&&s.bait===3"));assert(run("buyDecor(s,'castle')"));assert(!run("buyDecor(s,'castle')"));
});
test('Saves keep the fish book and ignore broken or unknown data',()=>{
 const good={coins:50,caught:9,book:{minnow:{count:3,big:8},yeti:{count:1,big:1},koi:{count:0}},spots:['river','moon'],spot:'river',rods:['pro','laser'],rod:'pro',bait:2,decor:['coral','rocket'],sound:false};
 const run=load({superEmiliaFish:JSON.stringify(good)});run('var s=loadSave()');
 assert(run("s.coins===50&&s.caught===9&&s.book.minnow.big===8&&!s.book.yeti&&!s.book.koi&&s.spot==='river'&&s.rod==='pro'&&s.bait===2&&s.sound===false"));
 assert.deepEqual([...run('s.spots')],['river']);assert.deepEqual([...run('s.decor')],['coral']);
 const cheat=load({superEmiliaFish:JSON.stringify({spot:'lagoon',rod:'magic'})});assert(cheat("loadSave().spot==='pond'&&loadSave().rod==='stick'"),'you cannot use what you have not bought');
 const bad=load({superEmiliaFish:'{oops'});assert(bad('loadSave().coins===0'));
});
test('Sharks can bite at Lily Pond and at the ocean',()=>{
 const run=load();assert(run("FISH.some(f=>f.icon==='🦈'&&f.spot==='pond')&&FISH.some(f=>f.icon==='🦈'&&f.spot==='ocean')"));
 let n=0;for(let k=0;k<1500;k++)if(run("pickCatch('pond',false).id")==='babyshark')n++;assert(n>60,'a baby shark bites now and then: '+n);
 assert(run("(()=>{const r=startReel(FISH.find(f=>f.id==='babyshark'),RODS[0]);for(let t=0;t<10&&!r.done;t+=1/7){reelTick(r,1/7);reelTap(r)}return r.won})()"),'a baby shark is easy to land');
});
test('Every legendary fish takes about 9 seconds to reel in with steady tapping',()=>{
 const run=load();
 const secs=run(`FISH.filter(f=>f.rarity==='legendary').map(f=>{const r=startReel(f,RODS[0]);let t=0;while(!r.done&&t<30){t+=1/3;reelTick(r,1/3);reelTap(r)}return r.won?t:99})`);
 assert.equal(secs.length,6);for(const t of secs)assert(t>=8&&t<=10,'legendary fish take about 9 seconds at 3 taps a second: '+t.toFixed(1));
});
console.log(checks+' fish checks passed.');
