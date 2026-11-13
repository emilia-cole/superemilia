const fs=require('fs'),vm=require('vm'),assert=require('assert');
const html=fs.readFileSync(process.argv[2]||'public/vet/index.html','utf8');
const script=html.match(/<script>([\s\S]*?)<\/script>/)[1];
// Load the game's logic without a browser: the page skips its screen code when there is no document.
function load(storage={}){const sandbox={console,Math,Number,JSON,Array,Object,String,Set,localStorage:{getItem:k=>storage[k]??null,setItem:(k,v)=>storage[k]=v}};vm.createContext(sandbox);vm.runInContext(script,sandbox);return code=>vm.runInContext(code,sandbox)}
let checks=0;const test=(name,fn)=>{fn();console.log('✓ '+name);checks++};

test('Every problem uses real tools, and new problems arrive on later days',()=>{
 const run=load();
 assert(run('AILMENTS.every(a=>a.steps.length>0&&a.steps.every(t=>TOOLS[t]))'));assert(run('Object.keys(TOOLS).every(t=>AILMENTS.some(a=>a.steps.includes(t)))'),'every tool is useful');
 assert.equal(run('ailmentsOn(1).length'),3);assert(run('ailmentsOn(7).length===AILMENTS.length'));
 assert.deepEqual([...run('toolsOn(1)')],['thermometer','medicine','spray','bandage','sponge','dryer']);
 assert.equal(run('goalFor(1)'),4);assert.equal(run('goalFor(50)'),9);
});
test('Patients only have problems the clinic can fix that day, and get trickier later',()=>{
 const run=load();
 for(let k=0;k<300;k++){const p=run('makePatient(1)');assert.equal(p.problems.length,1);assert(['fever','scrape','muddy'].includes(p.problems[0].id));assert(!p.pet.rare)}
 let most=0,rare=0;for(let k=0;k<500;k++){const p=run('makePatient(9)');most=Math.max(most,p.problems.length);if(p.pet.rare)rare++;assert.equal(new Set(p.problems.map(x=>x.id)).size,p.problems.length,'no problem twice')}
 assert.equal(most,3);assert(rare>5&&rare<100,'rare visitors are rare: '+rare);
});
test('Tools must be used in order, and a wrong tool counts as a mistake',()=>{
 const run=load();run("var p={pet:PETS[0],problems:[{id:'fever',done:0},{id:'tangled',done:0}],mistakes:0}");
 assert.deepEqual([...run('neededTools(p)')],['thermometer','comb']);
 assert.equal(run("useTool(p,'medicine').ok"),false,'medicine before checking the fever');assert.equal(run('p.mistakes'),1);
 let r=run("useTool(p,'thermometer')");assert(r.ok&&!r.fixed&&!r.cured);r=run("useTool(p,'medicine')");assert(r.ok&&r.fixed&&!r.cured);
 r=run("useTool(p,'comb')");assert(r.ok&&r.cured);assert(run('isCured(p)'));assert.equal(run("useTool(p,'comb').ok"),false);
 run("var two={pet:PETS[0],problems:[{id:'ear',done:0},{id:'tooth',done:0}],mistakes:0}");run("useTool(two,'flashlight')");assert.deepEqual([...run('neededTools(two)')],['drops','flashlight'],'one flashlight use helps one problem');
});
test('Helping pets pays coins, fills the patient book, and finishes the day',()=>{
 const run=load();run('var s=defaultSave()');
 assert.equal(run('starsFor(0)'),3);assert.equal(run('starsFor(2)'),2);assert.equal(run('starsFor(5)'),1);
 run("var p={pet:PETS[0],problems:[{id:'fever',done:2}],mistakes:0}");let r=run('finishPatient(s,p)');assert.equal(r.coins,10);assert.equal(r.stars,3);assert(!r.dayDone);
 assert(run("s.coins===10&&s.treated===1&&s.today===1&&s.helped.Biscuit===1"));
 run("var dragon={pet:RARE_PETS[1],problems:[{id:'fever',done:2},{id:'scrape',done:2}],mistakes:3}");run("s.upgrades.push('lollipops','stickers')");assert.equal(run('payFor(dragon,s)'),4*2+2+15+2,'rare pets pay extra');
 run('for(let k=0;k<3;k++)r=finishPatient(s,p)');assert(run('r.dayDone'));run('nextDay(s)');assert(run('s.day===2&&s.today===0&&s.todayStars===0'));
 run('s.coins=100');assert(run("buyThing(s,'decor','fish')&&s.coins===65"));assert(!run("buyThing(s,'decor','fish')"));
});
test('Saves keep the clinic and ignore broken or unknown data',()=>{
 const good={day:5,today:3,todayStars:7,coins:120,treated:30,helped:{Biscuit:4,Sparkle:1,Nobody:9},decor:['plant','castle'],upgrades:['lollipops','jetpack'],sound:false};
 const run=load({superEmiliaVet:JSON.stringify(good)});run('var s=loadSave()');
 assert(run("s.day===5&&s.today===3&&s.todayStars===7&&s.coins===120&&s.treated===30&&s.helped.Biscuit===4&&s.helped.Sparkle===1&&!s.helped.Nobody&&s.sound===false"));
 assert.deepEqual([...run('s.decor')],['plant']);assert.deepEqual([...run('s.upgrades')],['lollipops']);
 const bad=load({superEmiliaVet:'{oops'});assert(bad("loadSave().day===1"));
 const weird=load({superEmiliaVet:JSON.stringify({day:-2,today:99,coins:'lots'})});assert(weird("(()=>{const s=loadSave();return s.day===1&&s.today===3&&s.coins===0})()"));
});
console.log(checks+' vet checks passed.');
