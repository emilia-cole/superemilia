const fs=require('fs'),vm=require('vm'),assert=require('assert');
const html=fs.readFileSync(process.argv[2]||'public/salon/index.html','utf8');
const script=html.match(/<script>([\s\S]*?)<\/script>/)[1];
// Load the game's logic without a browser: the page skips its screen code when there is no document.
function load(storage={}){const sandbox={console,Math,Number,JSON,Array,Object,String,Set,localStorage:{getItem:k=>storage[k]??null,setItem:(k,v)=>storage[k]=v}};vm.createContext(sandbox);vm.runInContext(script,sandbox);return code=>vm.runInContext(code,sandbox)}
let checks=0;const test=(name,fn)=>{fn();console.log('✓ '+name);checks++};

test('The salon has 9 pets, 7 fur colors, 10 accessories and 5 steps',()=>{
 const run=load();assert.equal(run('PETS.length'),9);assert.equal(run('COLORS.length'),7);assert.equal(run('ACCS.length'),10);
 assert.deepEqual([...run('STEPS.map(s=>s.id)')],['wash','dry','brush','style','photo']);
 assert.deepEqual([...run('petsOpen(0).map(p=>p.id)')],['dog','cat','bunny']);assert.equal(run('petsOpen(3).length'),4);assert.equal(run('petsOpen(99).length'),9);
});
test('Scrubbing clears the spots the tool passes over, and only those',()=>{
 const run=load();run('var sp=[[40,40],[60,60]]');assert.equal(run('clearSpots(sp,40,41).length'),1);assert.equal(run('clearSpots(sp,50,50).length'),2,'between spots cleans nothing');
 run('var m=makeSpots(7)');assert.equal(run('m.length'),7);assert(run('m.every(([x,y])=>onPet(x,y))'),'mud is always on the pet');
 assert(!run('onPet(85,50)'),'the tool shelf is not on the pet');
});
test('Wishes only ask for colors and accessories you own',()=>{
 const run=load();run('var s=defaultSave()');for(let i=0;i<200;i++){const c=run('makeCustomer(s)');assert(['pink','blue'].includes(c.color));assert(['bow','flower'].includes(c.acc));assert(['dog','cat','bunny'].includes(c.pet))}
 run("s.owned=['color:rainbow','acc:crown']");const seen=new Set();for(let i=0;i<300;i++)seen.add(run('makeCustomer(s)').color+'/'+run('makeCustomer(s)').acc);assert([...seen].some(k=>k.startsWith('rainbow'))&&[...seen].some(k=>k.endsWith('crown')));
});
test('Matching the wish pays more coins and saves the photo',()=>{
 const run=load();run('var s=defaultSave(),w={pet:"cat",color:"pink",acc:"bow"}');
 assert.equal(run('payFor(w,{color:"blue",accs:[]}).coins'),8);
 assert.equal(run('payFor(w,{color:"pink",accs:[]}).coins'),14);
 assert.equal(run('payFor(w,{color:"blue",accs:[{id:"bow",x:40,y:40}]}).coins'),15);
 const r=run('finishPet(s,w,{color:"pink",accs:[{id:"bow",x:40,y:30},{id:"flower",x:44,y:60}]})');assert(r.color&&r.acc);assert.equal(r.coins,8+6+6+4+2);
 assert(run('s.coins===26&&s.served===1&&s.perfect===1&&s.photos.length===1&&s.photos[0].pet==="cat"'));
 for(let i=0;i<40;i++)run('finishPet(s,w,{color:"natural",accs:[]})');assert.equal(run('s.photos.length'),30,'the wall keeps the newest 30');
});
test('The shop sells colors and accessories once each',()=>{
 const run=load();run('var s=defaultSave();s.coins=40');assert(!run("buy(s,'color','pink')"),'pink is already yours');
 assert(run("buy(s,'color','gold')&&s.coins===10&&own(s,'color','gold')"));assert(!run("buy(s,'color','gold')"));assert(!run("buy(s,'acc','crown')"),'not enough coins');
 assert(run("buy(s,'acc','glasses')&&s.coins===0"));assert(!run("buy(s,'acc','nope')"));
});
test('Saves keep progress and ignore broken or unknown data',()=>{
 const run=load({superEmiliaSalon:JSON.stringify({coins:55,served:7,perfect:99,owned:['color:gold','color:gold','acc:crown','acc:spaceship',5],photos:[{pet:'fox',color:'gold',accs:[{id:'crown',x:40,y:30},{id:'laser'}]},{pet:'trex'}],sound:false})});
 run('var s=loadSave()');assert(run('s.coins===55&&s.served===7&&s.perfect===7&&s.sound===false'));assert.deepEqual([...run('s.owned')],['color:gold','acc:crown']);
 assert(run('s.photos.length===1&&s.photos[0].accs.length===1&&s.photos[0].accs[0].id==="crown"'));
 const bad=load({superEmiliaSalon:'{oops'});assert(bad('loadSave().coins===0&&loadSave().owned.length===0'));
});
console.log(checks+' salon checks passed.');
