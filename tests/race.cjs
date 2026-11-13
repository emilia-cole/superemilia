const fs=require('fs'),vm=require('vm'),assert=require('assert');
const html=fs.readFileSync(process.argv[2]||'public/race/index.html','utf8');
const script=html.match(/<script>([\s\S]*?)<\/script>/)[1];
// Load the game's logic without a browser: the page skips its screen code when there is no document.
function load(storage={}){const sandbox={console,Math,Number,JSON,Array,Object,String,Set,localStorage:{getItem:k=>storage[k]??null,setItem:(k,v)=>storage[k]=v}};vm.createContext(sandbox);vm.runInContext(script,sandbox);return code=>vm.runInContext(code,sandbox)}
let checks=0;const test=(name,fn)=>{fn();console.log('✓ '+name);checks++};
// A robot driver: steer toward a spot on the road, step around obstacles, and use items right away.
const BOT=`function bot(r,skill){const P=r.player,ahead=P.z+P.v*.35,c=centerAt(r.track,ahead);let aim=c;
 if(skill>0)for(const h of crossed(r,P.z,P.z+260)){if(h.it.type==='obstacle'&&!r.taken[h.lap+':'+h.i]&&Math.abs(c+h.it.x-P.x)<46)aim=c+h.it.x+(h.it.x>0?-70:70);else if(skill>1&&h.it.type!=='obstacle')aim=c+h.it.x}
 const d=aim-P.x;if(P.item)useItem(r);return{left:d<-12,right:d>12}}
function runRace(i,kartId,skill,seed){let s=seed;const rand=()=>{s=(s*1103515245+12345)%2147483648;return s/2147483648};const r=makeRace(i,KARTS.find(k=>k.id===kartId),DRIVERS[0],rand);let t=0;while(!r.finished&&t<200){stepRace(r,1/60,bot(r,skill));t+=1/60}return{place:r.place,time:t,finished:r.finished,rivalsDone:r.rivals.filter(v=>v.done!==null).length}}`;

test('Six tracks unlock one at a time by finishing in the top 3',()=>{
 const run=load();assert.equal(run('TRACKS.length'),6);
 assert(run('trackOpen(0,{})&&!trackOpen(1,{})'));assert(run("trackOpen(1,{candy:3})&&!trackOpen(1,{candy:4})&&!trackOpen(2,{candy:1})"));
 assert.equal(run('placeName(1)'),'1st');assert.equal(run('placeName(2)'),'2nd');assert.equal(run('placeName(3)'),'3rd');assert.equal(run('placeName(4)'),'4th');
 assert.equal(JSON.stringify(run('layout(2)')),JSON.stringify(run('layout(2)')),'each track always has the same layout');
 assert(run('TRACKS.every((t,i)=>layout(i).length>15&&layout(i).every(it=>Math.abs(it.x)<ROAD&&it.z>0&&it.z<LAP))'));
});
test('The countdown comes first, the kart drives itself, and the road stays in a safe range',()=>{
 const run=load();run('var r=makeRace(0,KARTS[0],DRIVERS[0])');
 const ev=[];for(let k=0;k<60*3+2;k++)ev.push(...run('stepRace(r,1/60,{})'));assert.deepEqual(ev.filter(e=>e==='tick'||e==='go'),['tick','tick','go']);
 assert(run('r.player.z<5'),'no moving during the countdown');run('for(let k=0;k<60;k++)stepRace(r,1/60,{})');assert(run('r.player.z>100&&r.player.v>200'));
 run('for(let k=0;k<600;k++)stepRace(r,1/60,{right:true})');assert(run('Math.abs(playerOffset(r))<=ROAD+70.01'),'a fence stops you leaving the track');
 assert(run('TRACKS.every(t=>{for(let z=0;z<12000;z+=50)if(Math.abs(centerAt(t,z))>t.curve*1.6)return false;return true})'));
});
test('Boost pads speed you up, obstacles spin you, and a shield blocks one hit',()=>{
 const run=load();run("var r=makeRace(0,KARTS[0],DRIVERS[0]);r.countdown=0;r.player.v=400;r.items=[{z:300,x:0,type:'boost'},{z:600,x:0,type:'obstacle'},{z:900,x:0,type:'box'},{z:1200,x:0,type:'obstacle'}];var drive=()=>{r.player.x=centerAt(r.track,r.player.z);return stepRace(r,1/60,{})};var until=z=>{const ev=[];while(r.player.z<z)ev.push(...drive());return ev}");
 assert(run('until(320).includes("boost")&&r.player.boost>0'));assert(run('until(620).includes("spin")&&r.player.spin>0'));
 const ev=run('until(920)');assert(ev.includes('item'));assert(run("['boost','shield','rocket'].includes(r.player.item)"));
 run("r.player.item='shield'");assert.equal(run('useItem(r)'),'shield');assert(run('r.player.shield>0&&r.player.item===null'));assert(run('until(1220).includes("blocked")&&r.player.spin===0'));
 assert.equal(run('useItem(r)'),null,'no item, nothing happens');
});
test('A careful driver can finish every track, and the other racers finish too',()=>{
 const run=load();run(BOT);
 for(let i=0;i<6;i++){const r=run(`runRace(${i},'buggy',1,${i+1})`);assert(r.finished,'finished track '+i);assert(r.time>25&&r.time<60,'a race takes about half a minute: '+r.time.toFixed(1));}
 // a good driver in the starting kart usually makes the top 3 on the first track; the best kart helps on the last one
 let top=0;for(let s=1;s<=10;s++)if(run(`runRace(0,'buggy',2,${s})`).place<=3)top++;assert(top>=8,'first track is friendly: '+top+'/10');
 let last=0;for(let s=1;s<=10;s++)if(run(`runRace(5,'gold',2,${s})`).place<=3)last++;assert(last>=6,'Rainbow Road is winnable with a fast kart: '+last+'/10');
 let lazy=0;for(let s=1;s<=6;s++)if(run(`runRace(5,'buggy',0,${s})`).place===1)lazy++;assert(lazy<6,'Rainbow Road is a challenge for the starting kart');
});
test('Races pay coins, keep the best finish, and coins buy karts and drivers',()=>{
 const run=load();run('var s=defaultSave()');
 let r=run("recordRace(s,'candy',2)");assert(r.coins===35&&r.better&&r.unlocked.id==='beach');assert(run('s.coins===35&&s.best.candy===2&&s.races===1'));
 r=run("recordRace(s,'candy',4)");assert(r.coins===8&&!r.better&&r.unlocked===null);assert.equal(run('s.best.candy'),2);
 r=run("recordRace(s,'candy',1)");assert(r.coins===50&&r.better&&r.unlocked===null,'beach was already open');
 assert.equal(run('trophyCount(s.best)'),1);
 assert(run("buy(s,'kart','bubble')&&s.kart==='buggy'&&owns(s,'kart','bubble')"));assert(!run("buy(s,'kart','bubble')"));assert(!run("buy(s,'kart','gold')"),'not enough coins');assert(run("owns(s,'driver','cat')&&!owns(s,'driver','dragon')"));
 assert(run('KARTS.every((k,i)=>i===0||(k.speed>=KARTS[i-1].speed&&k.price>KARTS[i-1].price))'),'pricier karts are faster');
});
test('Saves keep coins, trophies and karts, and ignore broken or unknown data',()=>{
 const good={coins:99,races:12,best:{candy:1,beach:3,moon:1,snow:7},owned:['kart:rocket','driver:dragon','kart:tank','x'],kart:'rocket',driver:'dragon',sound:false};
 const run=load({superEmiliaRace:JSON.stringify(good)});run('var s=loadSave()');
 assert(run("s.coins===99&&s.races===12&&s.best.candy===1&&s.best.beach===3&&!s.best.moon&&!s.best.snow&&s.kart==='rocket'&&s.driver==='dragon'&&s.sound===false"));
 assert.deepEqual([...run('s.owned')],['kart:rocket','driver:dragon']);
 const cheat=load({superEmiliaRace:JSON.stringify({kart:'gold',driver:'unicorn'})});assert(cheat("loadSave().kart==='buggy'&&loadSave().driver==='cat'"),'you cannot drive what you have not bought');
 const bad=load({superEmiliaRace:'{oops'});assert(bad('loadSave().coins===0'));
});
console.log(checks+' race checks passed.');
