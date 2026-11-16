const fs=require('fs'),vm=require('vm'),assert=require('assert');
const html=fs.readFileSync(process.argv[2]||'public/house/index.html','utf8');
const script=html.match(/<script>([\s\S]*?)<\/script>/)[1];
// Load the game's logic without a browser: the page skips its screen code when there is no document.
function load(storage={}){const sandbox={console,Math,Number,JSON,Array,Object,String,Set,localStorage:{getItem:k=>storage[k]??null,setItem:(k,v)=>storage[k]=v}};vm.createContext(sandbox);vm.runInContext(script,sandbox);return code=>vm.runInContext(code,sandbox)}
let checks=0;const test=(name,fn)=>{fn();console.log('✓ '+name);checks++};

test('The house has 6 rooms, 71 different things in 7 packs, and every kind of thing',()=>{
 const run=load();assert.equal(run('ROOMS.length'),6);assert.equal(run('ITEMS.length'),71);assert.equal(run('new Set(ITEMS.map(i=>i.e)).size'),71,'no thing is listed twice');
 assert(run("ITEMS.every(i=>packOf(i.p)&&CATS.some(c=>c.id===i.c)&&i.z>0)"));assert.equal(run('PACKS.length'),7);assert.equal(run('MAX_STARS'),18);
 assert.deepEqual([...run("ITEMS.filter(i=>i.c==='p').map(i=>i.e)")],['👩','👨','👧','👦','👶','👵','👴','👸','🧚','🧙','🎅'],'the menu prize list of people matches');
});
test('Things go in a room, stay inside it, and only from unlocked packs',()=>{
 const run=load();run('var s=defaultSave()');assert(run("addItem(s,'living','🛋️',50,70)"));assert(!run("addItem(s,'living','🐰',50,70)"),'pet pack is locked');assert(!run("addItem(s,'living','🍔',50,70)"));assert(!run("addItem(s,'garage','🛋️',50,70)"));
 run("var it=addItem(s,'living','🐱',-20,200)");assert(run('it.x===3&&it.y===95&&s.placed===2'));
 run("for(let i=0;i<40;i++)addItem(s,'kitchen','🍽️',50,50)");assert.equal(run('s.rooms.kitchen.items.length'),30);
 assert.deepEqual([1,1,1,1,1].map(()=>run('resizeItem(it,1)')),[1.2,1.4,1.6,1.6,1.6]);assert.equal(run('resizeItem(it,-1)'),1.4);
 assert(run("removeItem(s,'living',it)&&!removeItem(s,'living',it)&&s.rooms.living.items.length===1"));
});
test('Stars: 3 things, 6 things, then 10 things with someone living there',()=>{
 const run=load();run('var s=defaultSave()');const add=e=>run(`addItem(s,'bedroom','${e}',50,60);settle(s,'bedroom')`);
 assert.equal(add('🛏️'),null);add('🪑');const r=add('🪴');assert.equal(r.stars,1);assert.equal(run('totalStars(s)'),1);
 add('📚');add('🖼️');assert.equal(add('🧸').stars,2);assert.deepEqual([...run("unlocksBetween(0,2).map(u=>u.kind)")],['wall']);
 ['💡','🕯️','⏰','🧺'].forEach(add);assert.equal(run('roomStars(s.rooms.bedroom)'),2,'10 things but nobody lives here');assert.equal(add('🐶').stars,3);
 run("s.rooms.bedroom.items=[];");assert.equal(run('settle(s,"bedroom")'),null);assert.equal(run('totalStars(s)'),3,'stars are kept after clearing');
 assert(run("ownsItem(s,'🐰')&&!ownsItem(s,'🎹')"));assert.equal(run('nextUnlock(s).id'),'toys');
});
test('Wallpaper and floors unlock with stars',()=>{
 const run=load();run('var s=defaultSave()');assert(run("setLook(s,'living','wall','pink')&&s.rooms.living.wall==='pink'"));assert(!run("setLook(s,'living','wall','stars')"));assert(!run("setLook(s,'living','floor','lava')"));
 run("s.rooms.attic.best=3;s.rooms.kitchen.best=3;s.rooms.living.best=3;s.rooms.bedroom.best=3;s.rooms.playroom.best=2");assert(run("setLook(s,'living','floor','marble')&&setLook(s,'living','wall','stars')"));
 assert.equal(run('unlocksBetween(17,18).map(u=>u.name).join()'),'🎄 Holiday Pack');
});
test('Saves keep the house and ignore broken, unknown, or locked data',()=>{
 const run=load({superEmiliaHouse:JSON.stringify({placed:9,night:true,sound:false,rooms:{living:{best:2,wall:'dots',floor:'marble',items:[{e:'🛋️',x:200,y:50,s:9,f:true},{e:'🍔',x:5,y:5},{e:'🦄',x:50,y:50},null]},attic:{best:7,wall:'stars'},garage:{best:3}}})});
 run('var s=loadSave()');assert(run("s.placed===9&&s.night===true&&s.sound===false"));assert(run("s.rooms.living.best===2&&s.rooms.attic.best===3&&totalStars(s)===5"));
 assert(run("s.rooms.living.wall==='dots'&&s.rooms.living.floor==='wood'&&s.rooms.attic.wall==='cream'"),'locked looks go back');
 assert.deepEqual([...run("s.rooms.living.items.map(i=>i.e)")],['🛋️'],'unknown and locked things are dropped');assert(run("s.rooms.living.items[0].x===97&&s.rooms.living.items[0].s===1.6&&s.rooms.living.items[0].f===true"));
 assert(load({superEmiliaHouse:'{oops'})('totalStars(loadSave())===0'));
});
console.log(checks+' house checks passed.');
