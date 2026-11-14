const fs=require('fs'),vm=require('vm'),assert=require('assert');
const html=fs.readFileSync(process.argv[2]||'public/potion/index.html','utf8');
const script=html.match(/<script>([\s\S]*?)<\/script>/)[1];
// Load the game's logic without a browser: the page skips its screen code when there is no document.
function load(storage={}){const sandbox={console,Math,Number,JSON,Array,Object,String,Set,localStorage:{getItem:k=>storage[k]??null,setItem:(k,v)=>storage[k]=v}};vm.createContext(sandbox);vm.runInContext(script,sandbox);return code=>vm.runInContext(code,sandbox)}
let checks=0;const test=(name,fn)=>{fn();console.log('✓ '+name);checks++};

test('Every recipe uses real ingredients, and no two recipes are the same mix',()=>{
 const run=load();assert(run('RECIPES.length>=20'));
 assert(run('RECIPES.every(r=>r.mix.length>=2&&r.mix.length<=3&&r.mix.every(m=>ingredient(m)))'));
 assert.equal(run('new Set(RECIPES.map(r=>keyFor(r.mix))).size'),run('RECIPES.length'),'each mix makes one potion');
 assert.equal(run('new Set(RECIPES.map(r=>r.id)).size'),run('RECIPES.length'));
 assert(run('INGREDIENTS.every(i=>RECIPES.some(r=>r.mix.includes(i.id)))'),'every ingredient is used');
});
test('Mixing works in any order, and a wrong mix makes Oops Goop',()=>{
 const run=load();
 assert.equal(run("brew(['leaf','bubble']).id"),'float');assert.equal(run("brew(['bubble','leaf']).id"),'float');
 assert.equal(run("brew(['moon','star','mushroom']).id"),'wizard');assert.equal(run("brew(['leaf','leaf']).id"),'mess');assert.equal(run("brew(['leaf'])"),null,'one ingredient is not a potion yet');
});
test('The starting ingredients can make potions, and finding potions unlocks more ingredients',()=>{
 const run=load();const start=run('ingredientsOpen(0).map(i=>i.id)');assert.equal(start.length,4);
 assert(run(`RECIPES.filter(r=>r.mix.every(m=>${JSON.stringify(start)}.includes(m))).length`)>=4,'plenty to discover at the start');
 // every ingredient can be unlocked by discovering potions that only need ingredients unlocked before it
 assert(run(`(()=>{const s=defaultSave();for(let round=0;round<30;round++){const open=ingredientsOpen(s.found.length).map(i=>i.id);const r=RECIPES.find(r=>!s.found.includes(r.id)&&r.mix.every(m=>open.includes(m)));if(!r)break;recordPotion(s,r.id)}return s.found.length===RECIPES.length})()`),'you can discover every potion in some order');
 run('var s=defaultSave()');let r=run("recordPotion(s,'float')");assert(r.first&&run('s.coins===5&&s.made===1'));r=run("recordPotion(s,'float')");assert(!r.first&&run('s.coins===5&&s.made===2'));
 r=run("recordPotion(s,'purple')");assert.deepEqual(r.unlocked.map(i=>i.id),['feather','berry']);assert.deepEqual(run("recordPotion(s,'mess')").unlocked.length,0);
});
test('Stirring counts how far the spoon goes around the cauldron',()=>{
 const run=load();assert(Math.abs(run('turnBetween(0,Math.PI/2)')-Math.PI/2)<1e-9);assert(Math.abs(run('turnBetween(3,-3)')-(2*Math.PI-6))<1e-9,'crossing the left side counts the short way');
 assert(run('(()=>{let t=0,a=0;for(let k=1;k<=40;k++){const b=Math.atan2(Math.sin(k*Math.PI/10),Math.cos(k*Math.PI/10));t+=turnBetween(a,b);a=b}return t>=STIR_NEEDED})()'),'two circles is enough');
});
test('Customers ask for potions you know, and pay when they get the right one',()=>{
 const run=load();run('var s=defaultSave()');assert.equal(run('makeOrder(s)'),null,'no customers until you know 3 potions');
 run("['float','purple','shrink'].forEach(id=>recordPotion(s,id))");const o=run('makeOrder(s)');assert(['float','purple','shrink'].includes(o.id)&&o.pay>0);
 run('var o=makeOrder(s,()=>0)');const c=run('s.coins');assert(!run("serveOrder(s,o,'mess')"));assert(run('serveOrder(s,o,o.id)'));assert(run('s.coins>'+c+'&&s.orders===1'));
 assert.equal(run("clueFor(RECIPES.find(r=>r.id==='love'),defaultSave())"),'flower','a clue only shows ingredients you have');
 run('s.coins=100');assert(run("buyBuddy(s,'dino')&&s.buddy==='dino'&&s.coins===20"));assert(!run("buyBuddy(s,'dino')"));
});
test('Saves keep discoveries and ignore broken or unknown data',()=>{
 const run=load({superEmiliaPotion:JSON.stringify({found:['float','float','nope','unicorn'],made:9,coins:33,orders:2,buddies:['cat','yeti'],buddy:'cat',sound:false})});run('var s=loadSave()');
 assert.deepEqual([...run('s.found')],['float','unicorn']);assert(run("s.made===9&&s.coins===33&&s.orders===2&&s.buddy==='cat'&&s.sound===false"));assert.deepEqual([...run('s.buddies')],['cat']);
 const cheat=load({superEmiliaPotion:JSON.stringify({buddy:'dino'})});assert(cheat("loadSave().buddy==='frog'"));
 const bad=load({superEmiliaPotion:'{oops'});assert(bad('loadSave().found.length===0'));
});
console.log(checks+' potion checks passed.');
