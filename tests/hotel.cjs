const fs=require('fs'),vm=require('vm'),assert=require('assert');
const html=fs.readFileSync(process.argv[2]||'public/hotel/index.html','utf8');
const script=html.match(/<script>([\s\S]*?)<\/script>/)[1];
// Load the game's logic without a browser: the page skips its screen code when there is no document.
function load(storage={}){const sandbox={console,Math,Number,JSON,Array,Object,String,Set,Infinity,localStorage:{getItem:k=>storage[k]??null,setItem:(k,v)=>storage[k]=v}};vm.createContext(sandbox);vm.runInContext(script,sandbox);return code=>vm.runInContext(code,sandbox)}
let checks=0;const test=(name,fn)=>{fn();console.log('✓ '+name);checks++};

test('A new hotel has 3 plain rooms, and new things to ask for arrive on later days',()=>{
 const run=load();run('var s=loadSave()');assert(run("s.rooms.length===3&&s.rooms.every(r=>r==='plain')&&s.coins===0&&s.day===1"));
 assert.deepEqual([...run('itemsOn(1).map(i=>i.id)')],['cookie','pillow','teddy']);assert.equal(run('itemsOn(9).length'),run('ITEMS.length'));
 assert.equal(run('goalFor(1)'),4);assert.equal(run('goalFor(30)'),10);assert.equal(run('roomPrice(3)'),40);
});
test('Guests check in, ask for things, and get happier when served fast',()=>{
 const run=load();run("var s=defaultSave();s.themes.push('ocean');s.rooms[1]='ocean';var rooms=s.rooms.map(t=>({theme:t,guest:null}))");
 run("var g=makeGuest(1,s,()=>.3);g.wish='ocean'");assert(run('g.wants>=2&&g.wants<=4&&g.happy===3&&!g.vip'));
 assert(run('checkIn(rooms,1,g)&&g.match&&g.happy===4'),'the room they wished for makes them happier');assert(!run('checkIn(rooms,1,makeGuest(1,s))'),'one guest per room');
 assert.equal(run("serve(rooms,1,'cookie').reason"),'nothing','they have not asked yet');
 run('tickRooms(rooms,5,1,s,()=>0)');assert.equal(run('g.request.item'),'cookie');
 assert.equal(run("serve(rooms,1,'pillow').reason"),'wrong');let r=run("serve(rooms,1,'cookie')");assert(r.ok&&r.fast&&!r.done);assert.equal(run('g.happy'),5);
 run('tickRooms(rooms,5,1,s,()=>.5)');run('tickRooms(rooms,PATIENCE+.1,1,s,()=>.5)');assert.equal(run('g.happy'),4,'waiting too long makes them grumpy');assert(run('g.request!==null'),'then they ask again');
});
test('Guests check out and pay more when they are happy, and the day ends after enough guests',()=>{
 const run=load();run("var s=defaultSave();var rooms=s.rooms.map(t=>({theme:t,guest:null}))");
 run("var g=makeGuest(1,s,()=>.3);checkIn(rooms,0,g);g.served=2;g.happy=5");const out=run('checkOut(s,rooms,0)');assert.equal(out.coins,5+6+10);assert(!out.dayDone);assert(run("rooms[0].guest===null&&s.guests===1&&s.today===1&&s.stayed[g.name]===1"));
 assert(run("payFor({served:2,happy:5,match:true,vip:true},{upgrades:['pool']})===5+6+10+5+15+5"));
 run("s.today=3;s.todayHappy=14");assert.equal(run('dayStars(s)'),3);run("s.todayHappy=9");assert.equal(run('dayStars(s)'),2);run('nextDay(s)');assert(run('s.day===2&&s.today===0'));
});
test('The shop builds rooms, sells themes to paint rooms with, and extras',()=>{
 const run=load();run('var s=defaultSave();s.coins=500');
 assert(run('buyRoom(s)&&s.rooms.length===4&&s.coins===460'));run('for(let k=0;k<10;k++)buyRoom(s)');assert.equal(run('s.rooms.length'),8);
 assert(!run("paintRoom(s,0,'space')"),'buy the theme first');run('s.coins=500');assert(run("buyTheme(s,'space')&&paintRoom(s,0,'space')&&paintRoom(s,1,'space')&&s.rooms[1]==='space'"));assert(!run("buyTheme(s,'space')"));
 assert(run("buyUpgrade(s,'bell')&&patienceFor(s)>PATIENCE"));assert(run("buyUpgrade(s,'mints')&&makeGuest(1,s).happy===4"));
});
test('Saves keep the hotel and ignore broken or unknown data',()=>{
 const good={day:4,today:2,todayHappy:8,coins:77,guests:20,stayed:{Mittens:3,'King Leo':1,Nobody:5},rooms:['ocean','moon','plain','space'],themes:['ocean','moon'],upgrades:['bell','jetpack'],sound:false};
 const run=load({superEmiliaHotel:JSON.stringify(good)});run('var s=loadSave()');
 assert(run("s.day===4&&s.today===2&&s.todayHappy===8&&s.coins===77&&s.guests===20&&s.stayed.Mittens===3&&s.stayed['King Leo']===1&&!s.stayed.Nobody&&s.sound===false"));
 assert.deepEqual([...run('s.rooms')],['ocean','plain','plain','plain'],'unknown or unbought themes become plain');assert.deepEqual([...run('s.upgrades')],['bell']);
 const bad=load({superEmiliaHotel:'{oops'});assert(bad('loadSave().rooms.length===3'));
 const weird=load({superEmiliaHotel:JSON.stringify({rooms:Array(20).fill('plain'),day:-1,today:50})});assert(weird("(()=>{const s=loadSave();return s.rooms.length===8&&s.day===1&&s.today===3})()"));
});
test('A room gets messy when a guest leaves, and the checklist says what to do first, next and last',()=>{
 const run=load();run("var s=defaultSave();var rooms=s.rooms.map(t=>({theme:t,guest:null,ready:true}));var g=makeGuest(1,s,()=>.3);checkIn(rooms,0,g);checkOut(s,rooms,0)");
 assert(run('rooms[0].ready===false&&rooms[0].jobs.length===4'));assert(!run('checkIn(rooms,0,makeGuest(1,s))'),'nobody can stay in a messy room');
 for(let k=0;k<50;k++){const day=1+k%8,list=run(`makeChecklist(${day}).map(j=>j.id)`);assert.equal(list[0],'bed','first, make the bed');assert(['mint','lamp','flowers'].includes(list[list.length-1]),'a finishing touch is last');assert.equal(list[list.length-2],'snacks');assert.equal(list.length,day>=4?5:4);assert.equal(new Set(list).size,list.length)}
 run("var jobs=[{id:'bed',done:false},{id:'chairs',done:false},{id:'snacks',done:false},{id:'mint',done:false}]");
 let r=run("doJob(jobs,'snacks')");assert(!r.ok&&r.reason==='later'&&r.next==='bed','snacks have to wait until the bed is made');
 assert.equal(run("doJob(jobs,'window').reason"),'fine','jobs not on the list are already done');
 assert(run("doJob(jobs,'bed').ok&&doJob(jobs,'chairs').ok&&doJob(jobs,'snacks').ok"));r=run("doJob(jobs,'mint')");assert(r.ok&&r.done);assert.equal(run("doJob(jobs,'bed').reason"),'finished');
 assert(run("Object.values(JOBS).every(j=>j.how&&j.text)"),'every job says how to do it');
});
test('Check-in asks you to type the guest name for the key card',()=>{
 const run=load();
 assert(run("nameMatches('mittens',{name:'Mittens'})&&nameMatches(' MITTENS ',{name:'Mittens'})&&!nameMatches('mitten',{name:'Mittens'})"));
 assert.equal(run("nameToType({name:'Princess Sparkle'})"),'Sparkle','long VIP names only need the last word');assert(run("nameMatches('leo',{name:'King Leo'})"));
 assert(run('GUESTS.concat(VIPS).every(g=>nameToType(g).length<=8)'),'every name to type is short');
});
test('Dragging things: drop spots and sweeping the dust',()=>{
 const run=load();
 assert(run('inZone(72,58,ZONES.table)&&!inZone(20,90,ZONES.table)&&inZone(15,52,ZONES.pillow)&&inZone(95,40,ZONES.door)'));
 assert.equal(run('sweptDust(DUST,24,92).length'),run('DUST.length')-1,'the broom sweeps the pile it touches');
 assert.equal(run('sweptDust(DUST,5,10).length'),run('DUST.length'),'sweeping the air does nothing');
 assert.equal(run('DUST.reduce((d,[x,y])=>sweptDust(d,x,y),DUST).length'),0,'every pile can be swept');
});
console.log(checks+' hotel checks passed.');
