const fs=require('fs'),vm=require('vm'),assert=require('assert');
const html=fs.readFileSync(process.argv[2]||'public/lab/index.html','utf8');
const script=html.match(/<script>([\s\S]*?)<\/script>/)[1];
// Load the game's logic without a browser: the page skips its screen code when there is no document.
function load(storage={}){const sandbox={console,Math,Number,JSON,Array,Object,String,Set,localStorage:{getItem:k=>storage[k]??null,setItem:(k,v)=>storage[k]=v}};vm.createContext(sandbox);vm.runInContext(script,sandbox);return code=>vm.runInContext(code,sandbox)}
let checks=0;const test=(name,fn)=>{fn();console.log('✓ '+name);checks++};

test('There are six experiments, each with a fact and a badge',()=>{
 const run=load();assert.deepEqual([...run('EXPERIMENTS.map(e=>e.id)')],['color','volcano','crystal','rocket','magnet','float']);
 assert(run("EXPERIMENTS.every(e=>e.fact.length>20&&typeof BADGES[e.id]==='function')"));assert.equal(run('badges(defaultSave()).length'),0);
});
test('Mixing paints makes the right color, whatever the order or amount',()=>{
 const run=load();const mix=p=>run(`(mixColor(${JSON.stringify(p)})||{}).id`);
 assert.equal(mix(['red','yellow']),'orange');assert.equal(mix(['yellow','red','red']),'orange');assert.equal(mix(['blue','yellow']),'green');assert.equal(mix(['red','blue']),'purple');
 assert.equal(mix(['red','white']),'pink');assert.equal(mix(['red','yellow','blue']),'brown');assert.equal(mix(['white','blue','yellow','red']),'tan');assert.equal(mix([]),undefined);
 assert.equal(run('MIXES.length'),15);assert.equal(run('new Set(MIXES.map(m=>[...m.of].sort().join())).size'),15,'every mix is different');
});
test('More baking soda and dish soap make bigger eruptions',()=>{
 const run=load();assert.deepEqual([[0,0],[1,0],[1,1],[2,0],[2,1],[3,0],[3,1],[5,1]].map(([a,b])=>run(`eruptionType(${a},${b})`)),[null,'small','medium','medium','big','big','mega','mega']);
});
test('More pumps send the rocket higher',()=>{
 const run=load();assert.deepEqual([0,1,2,3,5,8,9,10,14].map(n=>run(`rocketLevel(${n})`)),[-1,0,0,1,2,3,4,5,5]);
});
test('Discoveries are counted once and win badges',()=>{
 const run=load();run('var s=defaultSave()');
 assert(run("record.color(s,'orange')&&!record.color(s,'orange')&&!record.color(s,'plaid')"));
 assert(run("record.eruption(s,'small','red')&&!record.eruption(s,'small','red')&&record.eruption(s,'small','green')&&s.runs===3"));assert(!run("BADGES.volcano(s)"));
 run("record.eruption(s,'mega','red')");assert(run('BADGES.volcano(s)'));
 assert(run("record.rocket(s,2)&&!record.rocket(s,1)&&s.rocketBest===2"));assert(!run('record.rocket(s,-1)'));run('record.rocket(s,5)');assert(run('BADGES.rocket(s)'));
 run("['clear','pink','blue'].forEach(c=>record.crystal(s,c))");assert(run('BADGES.crystal(s)'));
 run("MAGNET_ITEMS.forEach(i=>record.magnet(s,i.id));FLOAT_ITEMS.forEach(i=>record.float(s,i.id));MIXES.slice(0,10).forEach(m=>record.color(s,m.id))");
 assert.equal(run('badges(s).length'),6);assert.equal(run("progressText(s,'magnet')"),'12 / 12 things tested');
});
test('Half the magnet things stick and the sink-or-float things are a mix',()=>{
 const run=load();assert.equal(run('MAGNET_ITEMS.filter(i=>i.mag).length'),6);assert.equal(run('FLOAT_ITEMS.filter(i=>i.floats).length'),6);
 assert.equal(run('pickRound(FLOAT_ITEMS,6).length'),6);assert.equal(run('new Set(pickRound(MAGNET_ITEMS,6).map(i=>i.id)).size'),6);
});
test('Saves keep discoveries and ignore broken or unknown data',()=>{
 const run=load({superEmiliaLab:JSON.stringify({colors:['orange','orange','plaid',3],eruptions:['mega','huge'],crystals:['gold'],rocketBest:99,magnets:['clip'],floats:['duck','x'],runs:-4,sound:false})});
 run('var s=loadSave()');assert.deepEqual([...run('s.colors')],['orange']);assert.deepEqual([...run('s.eruptions')],['mega']);assert(run("s.rocketBest===5&&s.runs===0&&s.sound===false&&s.floats.length===1"));
 assert(load({superEmiliaLab:'{oops'})('loadSave().rocketBest===-1'));
});
console.log(checks+' lab checks passed.');
