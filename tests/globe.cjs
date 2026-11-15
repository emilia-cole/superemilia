const fs=require('fs'),vm=require('vm'),assert=require('assert');
const html=fs.readFileSync(process.argv[2]||'public/globe/index.html','utf8');
const script=html.match(/<script>([\s\S]*?)<\/script>/)[1];
// Load the game's logic without a browser: the page skips its screen code when there is no document.
function load(storage={}){const sandbox={console,Math,Number,JSON,Array,Object,String,Set,localStorage:{getItem:k=>storage[k]??null,setItem:(k,v)=>storage[k]=v}};vm.createContext(sandbox);vm.runInContext(script,sandbox);return code=>vm.runInContext(code,sandbox)}
let checks=0;const test=(name,fn)=>{fn();console.log('✓ '+name);checks++};

test('You start with the Winter Village, two scenes, white snow, and a wood base',()=>{
 const run=load();run('var s=defaultSave()');assert.deepEqual([...run('ownedItems(s).map(i=>i[0])')],['🏠','🌲','⛄','🦌','🐧','⭐']);
 assert(run("owns(s,'scene','day')&&owns(s,'scene','night')&&!owns(s,'scene','space')&&owns(s,'snow','white')&&!owns(s,'snow','rainbow')&&owns(s,'base','wood')&&!owns(s,'pack','castle')"));
 assert.equal(run('new Set(PACKS.flatMap(p=>p.items.map(i=>i[0]))).size'),run('PACKS.flatMap(p=>p.items).length'),'every item is in only one pack');
});
test('Things go inside the glass only, up to 24',()=>{
 const run=load();run('var g=newGlobe()');assert(run("addItem(g,'🏠',50,60)"));assert(!run("addItem(g,'🏠',3,3)"),'outside the ball');assert(!run("addItem(g,'🍕',50,50)"),'not a globe item');
 for(let i=0;i<23;i++)run("addItem(g,'⭐',50,40)");assert(!run("addItem(g,'⭐',50,40)"));assert.equal(run('g.items.length'),24);
 assert(run("globeInside(g).includes('🏠')&&!globeInside(g).includes('NaN')"));
});
test('Shaking earns snowflakes (up to 12 a shake), and snowflakes unlock things',()=>{
 const run=load();assert.deepEqual([0,24,25,99,300,9999].map(d=>run(`shakeReward(${d})`)),[0,0,1,3,12,12]);run('var s=defaultSave();s.flakes=55');
 assert(run("buy(s,'pack','castle')&&s.flakes===15&&owns(s,'pack','castle')&&ownedItems(s).some(i=>i[0]==='🐉')"));assert(!run("buy(s,'pack','castle')"));assert(!run("buy(s,'scene','aurora')"));
 assert(run("buy(s,'base','red')&&s.flakes===0"));assert(!run("buy(s,'snow','white')"),'free things cannot be bought');
});
test('Putting a globe on the shelf gives 10 snowflakes and keeps the newest 30',()=>{
 const run=load();run('var s=defaultSave(),g=newGlobe()');assert.equal(run('shelve(s,g)'),0,'an empty globe is not shelved');run("addItem(g,'⛄',50,70)");assert.equal(run('shelve(s,g)'),10);
 assert(run('s.shelf.length===1&&s.made===1&&s.flakes===10'));run("g.items[0].x=40");assert.equal(run('s.shelf[0].items[0].x'),50,'the shelf keeps its own copy');for(let i=0;i<40;i++)run('shelve(s,g)');assert.equal(run('s.shelf.length'),30);
});
test('Saves keep the globes and ignore broken or unknown data',()=>{
 const run=load({superEmiliaGlobe:JSON.stringify({flakes:33,shakes:9,made:4,owned:['pack:castle','pack:castle','scene:night','snow:plaid',7],shelf:[{scene:'space',snow:'gold',base:'red',items:[{e:'🐉',x:50,y:50},{e:'🍕',x:50,y:50},{e:'⛄',x:1,y:1}]},{items:[]}],current:{scene:'aurora',snow:'rainbow',base:'gold',items:[{e:'🏰',x:50,y:60}]},sound:false})});
 run('var s=loadSave()');assert(run("s.flakes===33&&s.shakes===9&&s.made===4&&s.sound===false"));assert.deepEqual([...run('s.owned')],['pack:castle']);
 assert(run("s.shelf.length===1&&s.shelf[0].scene==='space'&&s.shelf[0].items.length===1"));assert(run("s.current.scene==='day'&&s.current.snow==='white'&&s.current.base==='wood'&&s.current.items[0].e==='🏰'"),'locked looks go back to the free ones');
 assert(load({superEmiliaGlobe:'{oops'})('loadSave().flakes===0'));
});
console.log(checks+' globe checks passed.');
