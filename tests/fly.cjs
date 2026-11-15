const fs=require('fs'),vm=require('vm'),assert=require('assert');
const html=fs.readFileSync(process.argv[2]||'public/fly/index.html','utf8');
const script=html.match(/<script>([\s\S]*?)<\/script>/)[1];
// Load the game's logic without a browser: the page skips its screen code when there is no document.
function load(storage={}){const sandbox={console,Math,Number,JSON,Array,Object,String,Set,localStorage:{getItem:k=>storage[k]??null,setItem:(k,v)=>storage[k]=v}};vm.createContext(sandbox);vm.runInContext(script,sandbox);return code=>vm.runInContext(code,sandbox)}
let checks=0;const test=(name,fn)=>{fn();console.log('✓ '+name);checks++};

test('Problems fit each level, and times tables put the table first',()=>{
 const run=load();for(let i=0;i<400;i++){const e=run("makeProblem('easy')");assert(e.answer>=0&&e.answer<=10);const m=run("makeProblem('medium')");assert(m.answer>=0&&m.answer<=20);const h=run("makeProblem('hard')");assert(h.answer>=0&&h.answer<=100);
  const t=run("makeProblem('times',Math.random,8)");assert(t.a===8&&t.b>=1&&t.b<=12&&t.answer===8*t.b&&t.text===t.a+' × '+t.b+' = ?')}
});
test('Three different rings, one with the answer, none below zero',()=>{
 const run=load();for(const lv of ['easy','medium','hard','times'])for(let i=0;i<300;i++){run(`var p=makeProblem('${lv}')`);const r=run('ringNumbers(p)');assert.equal(r.length,3);assert.equal(new Set(r).size,3);assert(r.includes(run('p.answer')));assert(r.every(n=>n>=0))}
});
test('Flying through a ring: close to its middle counts, between rings does not',()=>{
 const run=load();assert.equal(run('ringHit(0,0)'),1);assert.equal(run('ringHit(-3.2,.5)'),0);assert.equal(run('ringHit(3,-1)'),2);assert.equal(run('ringHit(1.6,0)'),-1,'between the middle and right rings');assert.equal(run('ringHit(0,2.2)'),-1,'too high');
});
test('A race saves the best score, adds up right answers, and unlocks flyers',()=>{
 const run=load();assert.deepEqual([6,7,10,11,13,14,15].map(n=>run(`starsFor(${n})`)),[0,1,1,2,2,3,3]);run('var s=defaultSave()');
 let r=run("finishRace(s,'easy',0,15,2400)");assert(r.stars===3);assert.deepEqual([...r.unlocked.map(f=>f.id)],[]);assert(run("s.best.easy===2400&&s.races===1&&s.correct===15&&s.finished===1"));
 r=run("finishRace(s,'times',7,10,1500)");assert.deepEqual([...r.unlocked.map(f=>f.id)],['heli']);assert(run("s.best.times7===1500&&s.correct===25&&s.finished===1"));
 run("finishRace(s,'easy',0,3,100)");assert.equal(run('s.best.easy'),2400,'best score stays');r=run("finishRace(s,'times',0,200,900)");assert(run("s.best.timesmix===900"));assert.equal(r.unlocked.length,5);
});
test('Saves keep progress and ignore broken or unknown data',()=>{
 const run=load({superEmiliaFly:JSON.stringify({races:3,correct:45,finished:9,best:{easy:1200,times7:800,space:99,timesmix:-3},flyer:'eagle',sound:false})});run('var s=loadSave()');
 assert(run("s.races===3&&s.correct===45&&s.finished===3&&s.best.easy===1200&&s.best.times7===800&&!('space' in s.best)&&!('timesmix' in s.best)&&s.flyer==='eagle'&&s.sound===false"));
 assert(load({superEmiliaFly:JSON.stringify({correct:5,flyer:'dragon'})})("loadSave().flyer==='plane'"),'a locked flyer cannot be picked');assert(load({superEmiliaFly:'{oops'})('loadSave().races===0'));
});
console.log(checks+' fly checks passed.');
