const fs=require('fs'),vm=require('vm'),assert=require('assert');
const html=fs.readFileSync(process.argv[2]||'public/zoo/index.html','utf8');
const script=html.match(/<script>([\s\S]*?)<\/script>/)[1];
// Load the game's logic without a browser: the page skips its screen code when there is no document.
function load(storage={}){const sandbox={console,Math,Number,JSON,Array,Object,String,Set,localStorage:{getItem:k=>storage[k]??null,setItem:(k,v)=>storage[k]=v}};vm.createContext(sandbox);vm.runInContext(script,sandbox);return code=>vm.runInContext(code,sandbox)}
let checks=0;const test=(name,fn)=>{fn();console.log('✓ '+name);checks++};

test('The zoo has 9 animals, 9 pens, and you start with a bunny and a monkey',()=>{
 const run=load();assert.equal(run('ANIMALS.length'),9);assert.equal(run('PENS.length'),9);assert(run('ANIMALS.every(a=>FOODS[a.food]&&HOMES[a.home])'));
 assert.deepEqual([...run('defaultSave().animals.map(a=>a.id)')],['bunny','monkey']);assert(run('ANIMALS.every((a,i)=>i===0||a.price>=ANIMALS[i-1].price)'));
});
test('Animals get hungry and bored, and poop a while after eating',()=>{
 const run=load();run('var s=defaultSave();s.animals[0].food=50');assert(run('feed(s,0,"carrot",()=>.5).coins===2&&s.animals[0].food===100&&s.coins===2&&s.fed===1'));
 run('tickZoo(s,5,()=>.5)');assert.equal(run('s.animals[0].poop.length'),0,'not yet');run('tickZoo(s,5,()=>.5)');assert.equal(run('s.animals[0].poop.length'),1);
 assert(run('s.animals[0].food<90&&s.animals[1].fun<70'));run('tickZoo(s,500)');assert(run('s.animals.every(a=>a.food===0&&a.fun===0)'),'never below zero');
 run('var t=defaultSave();t.animals[0].poop=[[0,0],[0,0],[0,0]];t.animals[0].digest=.1;tickZoo(t,1)');assert.equal(run('t.animals[0].poop.length'),3,'at most 3 poops');
});
test('Wrong food gets a hint, full animals do not pay, and the ball makes them happy',()=>{
 const run=load();run('var s=defaultSave()');assert(run('feed(s,0,"banana").wrong&&s.coins===0'));run('s.animals[0].food=95');assert(run('feed(s,0,"carrot").full&&s.coins===0'));
 assert(run('play(s,1).coins===2&&s.animals[1].fun===100&&s.coins===2'));assert(run('play(s,1).full'));assert(!run('feed(s,5,"carrot").ok'),'empty pen');
});
test('Scooping poop pays, and clean, fed, happy animals bring more coins from visitors',()=>{
 const run=load();run('var s=defaultSave();s.animals[0].poop=[[-.5,0],[.6,.4]]');assert.equal(run('scoop(s,0,0,0)'),0,'too far away');assert.equal(run('scoop(s,0,-.4,.1)'),1);assert.equal(run('s.coins'),1);
 run('s.animals.forEach(a=>{a.food=100;a.fun=100})');assert.equal(run('happiness(s.animals[1])'),100);assert.equal(run('happiness(s.animals[0])'),75,'poop makes animals less happy');
 assert.equal(run('visitorPay(s)'),4);run('scoop(s,0,.6,.4)');run('s.animals.forEach(a=>{a.food=0;a.fun=0})');assert.equal(run('payVisitor(s)'),2);assert.equal(run('s.visitors'),1);
});
test('The shop sells each animal once and needs enough coins',()=>{
 const run=load();run('var s=defaultSave();s.coins=30');assert(!run("buyAnimal(s,'bunny')"));assert(run("buyAnimal(s,'penguin')&&s.coins===5&&s.animals.length===3"));assert(!run("buyAnimal(s,'penguin')"));assert(!run("buyAnimal(s,'dragon')"));
 run('s.coins=9999');for(const id of ['giraffe','elephant','panda','lion','unicorn','dragon'])assert(run(`buyAnimal(s,'${id}')`),id);assert.equal(run('s.animals.length'),9);
});
test('Saves keep the zoo and ignore broken or unknown data',()=>{
 const run=load({superEmiliaZoo:JSON.stringify({coins:77,visitors:12,fed:'5',animals:[{id:'lion',food:500,fun:-3,poop:[[0,0],[9,9],'x',[1,1],[0,1]]},{id:'lion'},{id:'yeti'}],sound:false})});run('var s=loadSave()');
 assert(run('s.coins===77&&s.visitors===12&&s.fed===5&&s.sound===false'));assert.deepEqual([...run('s.animals.map(a=>a.id)')],['bunny','monkey','lion']);
 assert(run('s.animals[2].food===100&&s.animals[2].fun===0&&s.animals[2].poop.length===3&&s.animals[2].poop[1][0]===1'));
 const bad=load({superEmiliaZoo:'{oops'});assert(bad('loadSave().animals.length===2'));
});
console.log(checks+' zoo checks passed.');
