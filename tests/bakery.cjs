const fs=require('fs'),vm=require('vm'),assert=require('assert');
const html=fs.readFileSync(process.argv[2]||'public/bakery/index.html','utf8');
const script=html.match(/<script>([\s\S]*?)<\/script>/)[1];
// Load the game's logic without a browser: the page skips its screen code when there is no document.
function load(storage={}){const sandbox={console,Math,Number,JSON,Array,Object,String,Boolean,Set,Map,localStorage:{getItem:k=>storage[k]??null,setItem:(k,v)=>storage[k]=v}};vm.createContext(sandbox);vm.runInContext(script,sandbox);return code=>vm.runInContext(code,sandbox)}
let checks=0;const test=(name,fn)=>{fn();console.log('✓ '+name);checks++};

test('Each day asks for more customers and a little less waiting, with no fail state',()=>{
 const run=load();
 assert.equal(run('goalFor(1)'),5);assert.equal(run('goalFor(4)'),8);assert.equal(run('goalFor(50)'),14);
 assert(run('patienceFor(1)')>run('patienceFor(8)'));assert.equal(run('patienceFor(99)'),26);
 assert(run('pathDone(4)&&pathDone(8)&&!pathDone(5)'));
});
test('Orders only use treats the bakery has unlocked, and toppings start on day 3',()=>{
 const run=load();run('var unlocked=defaultSave().unlocked');
 for(let i=0;i<60;i++){const o=run(`makeOrder(1,unlocked)`);assert(['cupcake','cookie'].includes(o.base));assert(['strawberry','chocolate'].includes(o.frosting));assert.equal(o.topping,'none')}
 let tops=new Set();for(let i=0;i<200;i++)tops.add(run('makeOrder(5,unlocked).topping'));assert(tops.has('sprinkles')&&tops.has('cherry')&&tops.has('none'));assert(!tops.has('star'));
 run("unlocked.bases.push('donut');unlocked.toppings.push('star')");let bases=new Set();for(let i=0;i<300;i++)bases.add(run('makeOrder(6,unlocked).base'));assert(bases.has('donut'));
});
test('A treat must be baked and match the order exactly to be served',()=>{
 const run=load(),order="({base:'cupcake',frosting:'strawberry',topping:'cherry'})";
 assert(run(`treatMatches({base:'cupcake',frosting:'strawberry',topping:'cherry',baked:true},${order})`));
 assert(!run(`treatMatches({base:'cupcake',frosting:'strawberry',topping:'cherry',baked:false},${order})`));
 assert(!run(`treatMatches({base:'cupcake',frosting:'chocolate',topping:'cherry',baked:true},${order})`));
 assert(!run(`treatMatches({base:'cupcake',frosting:'strawberry',baked:true},${order})`));
 assert(run(`treatMatches({base:'cookie',frosting:'chocolate',baked:true},{base:'cookie',frosting:'chocolate',topping:'none'})`));
});
test('Prices reward fancier treats, quick service and grown-up pets',()=>{
 const run=load();
 const plain=run("priceFor({base:'cookie',frosting:'chocolate',topping:'none'},0,0)"),fancy=run("priceFor({base:'cake',frosting:'mint',topping:'strawberry'},0,0)");assert(fancy>plain);
 assert.equal(run("priceFor({base:'cookie',frosting:'chocolate',topping:'none'},1,0)"),plain+4);
 assert.equal(run("priceFor({base:'cookie',frosting:'chocolate',topping:'none'},0,3)"),plain+3);
 assert.equal(run('petBonus({stage:0})'),0);assert.equal(run('petBonus({stage:3})'),3);assert.equal(run('petBonus({stage:3,sparkle:true})'),4);
});
test('A mystery egg hatches into a surprise pet, then grows from baby to kid to grown-up',()=>{
 const run=load();run('var egg=newEgg()');assert(run('egg.stage===0&&egg.type===-1'));
 assert.equal(run('growPet(egg,5).length'),0);
 assert.deepEqual(run(`[...growPet(egg,1,(()=>{const v=[0.31,0.05,0.5];let i=0;return()=>v[i++%3]})())]`),['hatch']);
 assert(run("egg.stage===1&&egg.type>=0&&egg.type<PETS.length&&egg.name.length>0&&egg.sparkle===true"));
 assert.deepEqual(run('[...growPet(egg,12)]'),['grow']);assert.equal(run('egg.stage'),2);
 assert.deepEqual(run('[...growPet(egg,100)]'),['grow']);assert(run('egg.stage===3&&egg.growth===0'));
 assert.equal(run('growPet(egg,5).length'),0);
 run('var fast=newEgg()');assert.deepEqual(run('[...growPet(fast,6+12+20)]'),['hatch','grow','grow']);
 const kinds=new Set();for(let i=0;i<400;i++)kinds.add(run('(()=>{const e=newEgg();growPet(e,6);return e.type})()'));assert(kinds.size>15,'many kinds of pets can hatch');
});
test('Saves keep progress and ignore broken or unknown data',()=>{
 const good={day:9,coins:321,totalServed:40,unlocked:{bases:['donut','pizza'],frostings:['mint'],toppings:['star','toString']},decor:['plant','plant','spaceship'],pets:[{stage:3,type:1,name:'Sprinkles',sparkle:true,egg:'#d5e8ff'},{stage:0,growth:2,egg:'#nope'}],active:1,relaxed:true,sound:false};
 const run=load({mysteryEggBakery:JSON.stringify(good)});run('var s=loadSave()');
 assert(run("s.day===9&&s.coins===321&&s.totalServed===40&&s.relaxed===true&&s.sound===false&&s.active===1"));
 assert.deepEqual(run('[...s.unlocked.bases]'),['cupcake','cookie','donut']);assert.deepEqual(run('[...s.unlocked.toppings]'),['none','sprinkles','cherry','star']);assert.deepEqual(run('[...s.decor]'),['plant']);
 assert(run("s.pets.length===2&&s.pets[0].stage===3&&s.pets[0].type===1&&s.pets[0].sparkle&&s.pets[1].stage===0&&s.pets[1].egg==='#ffd3e2'"));
 const bad=load({mysteryEggBakery:'{oops'});assert(bad('(()=>{const s=loadSave();return s.day===1&&s.coins===0&&s.pets.length===1&&s.pets[0].stage===0})()'));
 const weird=load({mysteryEggBakery:JSON.stringify({day:-4,coins:'lots',pets:[],active:9})});assert(weird('(()=>{const s=loadSave();return s.day===1&&s.coins===0&&s.pets.length===1&&s.active===0})()'));
 const hatched=load({mysteryEggBakery:JSON.stringify({pets:[{stage:2,type:999}]})});assert(hatched('loadSave().pets[0].type===0'));
});
test('Every treat, topping, egg and pet can be drawn without errors',()=>{
 const run=load(),gradient={addColorStop(){}},calls={n:0};
 const ctx=new Proxy({createLinearGradient:()=>gradient},{get:(t,k)=>k in t?t[k]:(()=>{calls.n++})});
 const drawAll=run(`(c)=>{for(const b of Object.keys(BASES))for(const f of [undefined,...Object.keys(FROSTINGS)])for(const t of Object.keys(TOPPINGS))for(const baked of [true,false])drawTreat(c,{base:b,frosting:f,topping:t,baked},50,50,1);
  for(const color of EGG_COLORS)for(const p of [0,.5,.9])drawEgg(c,50,50,1,color,p,1);
  for(let type=0;type<PETS.length;type++)for(let stage=0;stage<4;stage++)drawPet(c,{stage,type,growth:1,egg:EGG_COLORS[0],sparkle:stage%2===0},50,50,1,2);return true}`);
 assert(drawAll(ctx));assert(calls.n>1000);
});
console.log(checks+' bakery checks passed.');
